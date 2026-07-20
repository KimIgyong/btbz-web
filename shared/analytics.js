/*!
 * btbzAnalytics — GA4 래퍼 (동의 기반 · UTM 세분화 · 전환 추적)
 * ----------------------------------------------------------------------------
 * - Consent Mode v2: 기본 전부 'denied'. 사용자가 동의해야만 쿠키/수집 시작.
 * - UTM 세분화: first-touch(영구) + last-touch(세션) 어트리뷰션 + 채널 자동 분류.
 * - 전환: subscribe / download(=결제 대체 1차 전환) / generate_lead. purchase 스텁 준비.
 *
 * 설정: <script>로 로드하기 전에 window.BTBZ_GA4 = { measurementId:'G-XXXXXXX' } 지정.
 *       (또는 아래 DEFAULT_ID 상수를 직접 교체)
 *
 * 프레임워크 없음(순수 vanilla). www.btbz.ai / modora.btbz.ai 양쪽에 그대로 배포.
 */
(function (window, document) {
  'use strict';

  var CFG = window.BTBZ_GA4 || {};
  // 각 페이지가 window.BTBZ_GA4.measurementId로 지정. 미지정 시 도메인별 스트림 기본값.
  var DEFAULT_IDS = {
    'modora.btbz.ai': 'G-Z1N8PGJ9ED',
    'www.btbz.ai': 'G-4LE1ZNX2WN',
    'btbz.ai': 'G-4LE1ZNX2WN'
  };
  var MEASUREMENT_ID = CFG.measurementId || DEFAULT_IDS[window.location.host] || 'G-XXXXXXXXXX';
  var DEBUG = !!CFG.debug;

  var LS_CONSENT = 'btbz-analytics-consent'; // 'granted' | 'denied'
  var LS_FIRST = 'btbz-attribution-first';   // 최초 유입(영구)
  var SS_LAST = 'btbz-attribution-last';     // 최근 유입(세션)

  function log() {
    if (DEBUG && window.console) console.log.apply(console, ['[btbzAnalytics]'].concat([].slice.call(arguments)));
  }
  function lsGet(k) { try { return window.localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { window.localStorage.setItem(k, v); } catch (e) {} }
  function ssGet(k) { try { return window.sessionStorage.getItem(k); } catch (e) { return null; } }
  function ssSet(k, v) { try { window.sessionStorage.setItem(k, v); } catch (e) {} }

  // gtag 부트스트랩 (스크립트는 동의 후에만 실제 로드)
  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = window.gtag || gtag;

  // ── 1) Consent Mode v2 — 기본 전부 거부 ──────────────────────────────────
  gtag('consent', 'default', {
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    analytics_storage: 'denied',
    functionality_storage: 'granted',
    security_storage: 'granted',
    wait_for_update: 500
  });
  gtag('js', new Date());

  var gtagLoaded = false;
  function loadGtagScript() {
    if (gtagLoaded || !isConfigured()) return;
    gtagLoaded = true;
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(MEASUREMENT_ID);
    document.head.appendChild(s);
    // IP 익명화 · UTM 자동수집 억제(우리가 세분화해서 직접 첨부하므로 정확도↑)
    gtag('config', MEASUREMENT_ID, {
      anonymize_ip: true,
      send_page_view: false // page_view는 어트리뷰션 첨부 후 직접 발사
    });
    log('gtag 로드', MEASUREMENT_ID);
  }

  function isConfigured() {
    if (/G-X{6,}/.test(MEASUREMENT_ID) || !/^G-[A-Z0-9]+$/.test(MEASUREMENT_ID)) {
      log('측정 ID 미설정 — 수집 비활성. window.BTBZ_GA4.measurementId 지정 필요.');
      return false;
    }
    return true;
  }

  // ── 2) UTM 캡처 & 채널 세분화 ────────────────────────────────────────────
  // 도메인용(referrer 호스트명 매칭 — 뒤에 '.' 필요)
  var SEARCH_ENGINES = /(google|bing|yahoo|naver|daum|duckduckgo|baidu|yandex|ecosia)\./i;
  var SOCIAL_SITES = /(facebook|instagram|twitter|x\.com|t\.co|linkedin|youtube|tiktok|threads|kakao|band\.us|blog\.naver|cafe\.naver|reddit|pinterest)\./i;
  // 이름용(utm_source 토큰 매칭 — 정확 일치)
  var SEARCH_NAMES = /^(google|bing|yahoo|naver|daum|duckduckgo|baidu|yandex|ecosia|search)$/i;
  var SOCIAL_NAMES = /^(facebook|fb|meta|instagram|ig|twitter|x|linkedin|youtube|tiktok|threads|kakao|kakaotalk|band|reddit|pinterest)$/i;

  function parseQuery() {
    var q = {};
    var s = window.location.search.replace(/^\?/, '');
    if (!s) return q;
    s.split('&').forEach(function (pair) {
      var kv = pair.split('=');
      if (!kv[0]) return;
      try { q[decodeURIComponent(kv[0])] = decodeURIComponent((kv[1] || '').replace(/\+/g, ' ')); }
      catch (e) { q[kv[0]] = kv[1] || ''; }
    });
    return q;
  }

  // GA4 기본 채널 그룹핑을 단순화(+한국 검색/소셜 포함)해 분류
  function classifyChannel(a) {
    var medium = (a.utm_medium || '').toLowerCase();
    var source = (a.utm_source || '').toLowerCase();
    var ref = a.referrer || '';
    var paid = /^(cpc|ppc|paid|paidsearch|paid-search|cpm|banner|display)$/.test(medium) || a.gclid || a.fbclid || a.msclkid;

    if (medium === 'email' || source === 'newsletter') return 'Email';
    if (paid && (SEARCH_NAMES.test(source) || SEARCH_ENGINES.test(source) || SEARCH_ENGINES.test(ref) || a.gclid)) return 'Paid Search';
    if (paid && (SOCIAL_NAMES.test(source) || SOCIAL_SITES.test(source) || /social/.test(medium) || a.fbclid)) return 'Paid Social';
    if (paid) return 'Paid Other';
    if (/^(social|social-network|social-media|sns)$/.test(medium) || SOCIAL_NAMES.test(source) || SOCIAL_SITES.test(source)) return 'Organic Social';
    if (/^(affiliate|partner)$/.test(medium)) return 'Affiliate';
    if (medium === 'referral') return 'Referral';
    if (a.utm_source || a.utm_medium || a.utm_campaign) return 'Other Campaign';
    if (ref) {
      if (SOCIAL_SITES.test(ref)) return 'Organic Social';   // blog/cafe.naver 등은 소셜 우선
      if (SEARCH_ENGINES.test(ref)) return 'Organic Search';
      return 'Referral';
    }
    return 'Direct';
  }

  function captureAttribution() {
    var q = parseQuery();
    var ref = '';
    try {
      ref = document.referrer || '';
      // 내부 유입(자기 사이트)은 referrer로 치지 않음
      if (ref && ref.indexOf(window.location.host) !== -1) ref = '';
    } catch (e) {}

    var touch = {
      utm_source: q.utm_source || '',
      utm_medium: q.utm_medium || '',
      utm_campaign: q.utm_campaign || '',
      utm_term: q.utm_term || '',
      utm_content: q.utm_content || '',
      gclid: q.gclid || '',
      fbclid: q.fbclid || '',
      msclkid: q.msclkid || '',
      referrer: ref,
      landing_page: window.location.pathname,
      ts: new Date().toISOString()
    };
    touch.channel = classifyChannel(touch);

    var hasCampaign = touch.utm_source || touch.utm_medium || touch.utm_campaign ||
                      touch.gclid || touch.fbclid || touch.channel !== 'Direct';

    // last-touch: 이번 방문에 캠페인 신호가 있을 때만 세션에 갱신
    if (hasCampaign || !ssGet(SS_LAST)) ssSet(SS_LAST, JSON.stringify(touch));
    // first-touch: 최초 1회만 영구 저장
    if (!lsGet(LS_FIRST) && (hasCampaign || true)) lsSet(LS_FIRST, JSON.stringify(touch));

    return touch;
  }

  function readJSON(raw) { try { return raw ? JSON.parse(raw) : null; } catch (e) { return null; } }

  function attributionParams() {
    var first = readJSON(lsGet(LS_FIRST)) || {};
    var last = readJSON(ssGet(SS_LAST)) || {};
    return {
      // 최근 유입(전환 귀속 기본)
      source: last.utm_source || '(direct)',
      medium: last.utm_medium || '(none)',
      campaign: last.utm_campaign || '(not set)',
      term: last.utm_term || '',
      content: last.utm_content || '',
      channel_group: last.channel || 'Direct',
      // 최초 유입(교차 확인용)
      first_source: first.utm_source || '(direct)',
      first_medium: first.utm_medium || '(none)',
      first_campaign: first.utm_campaign || '(not set)',
      first_channel_group: first.channel || 'Direct'
    };
  }

  // ── 3) 이벤트 발사 ───────────────────────────────────────────────────────
  var queue = [];
  function consentGranted() { return lsGet(LS_CONSENT) === 'granted'; }

  function send(name, params) {
    var payload = {};
    var attr = attributionParams();
    for (var k in attr) payload[k] = attr[k];
    if (params) for (var p in params) payload[p] = params[p];

    if (!consentGranted()) { log('동의 전 — 큐 보관:', name, payload); queue.push([name, payload]); return; }
    if (!isConfigured()) return;
    loadGtagScript();
    gtag('event', name, payload);
    log('event', name, payload);
  }

  function flushQueue() {
    if (!consentGranted() || !isConfigured()) return;
    loadGtagScript();
    // 어트리뷰션을 사용자 속성으로도 등록(세그먼트 분석 편의)
    var attr = attributionParams();
    gtag('set', 'user_properties', {
      channel_group: attr.channel_group,
      first_channel_group: attr.first_channel_group,
      utm_source: attr.source,
      utm_campaign: attr.campaign
    });
    while (queue.length) { var it = queue.shift(); gtag('event', it[0], it[1]); log('flush', it[0]); }
  }

  // ── 4) 공개 API ──────────────────────────────────────────────────────────
  var api = {
    /** 쿠키 배너에서 '동의' 시 호출 — 분석 목적만 승인(광고 관련은 미사용이므로 denied 유지) */
    grantConsent: function () {
      lsSet(LS_CONSENT, 'granted');
      gtag('consent', 'update', { analytics_storage: 'granted' });
      loadGtagScript();
      flushQueue();
      api.trackPageView();
      log('동의 승인 (analytics_storage만)');
    },
    /** 쿠키 배너에서 '거부' 시 호출 */
    denyConsent: function () {
      lsSet(LS_CONSENT, 'denied');
      gtag('consent', 'update', {
        ad_storage: 'denied', ad_user_data: 'denied',
        ad_personalization: 'denied', analytics_storage: 'denied'
      });
      queue.length = 0;
      log('동의 거부');
    },
    /** 'granted' | 'denied' | null(미결정) */
    getConsent: function () { return lsGet(LS_CONSENT); },

    /** 방침 페이지 "쿠키 설정 변경" 링크용 — 선택을 초기화하고 배너를 다시 표시 */
    resetConsent: function () {
      try { window.localStorage.removeItem(LS_CONSENT); } catch (e) {}
      gtag('consent', 'update', { analytics_storage: 'denied' });
      window.location.reload();
    },

    /** 범용 이벤트 */
    trackEvent: function (name, params) { send(name, params || {}); },

    /** 페이지뷰(어트리뷰션 첨부) */
    trackPageView: function (params) {
      send('page_view', Object.assign({
        page_location: window.location.href,
        page_title: document.title,
        page_path: window.location.pathname
      }, params || {}));
    },

    // ── 전환 퍼널 (PROJECT-INVENTORY.md §5) ──
    trackDownloadPageView: function () { send('view_download_page', {}); },
    trackBeginDownload: function (p) { send('begin_download', p || {}); },          // 마이크로 전환
    trackSubscribe: function (p) { send('subscribe', Object.assign({ method: 'download_modal' }, p || {})); }, // ✅ 전환
    trackDownload: function (p) {                                                    // ✅ 1차 전환(결제 대체)
      send('download', Object.assign({ value: 1, currency: 'USD' }, p || {}));
    },
    trackLead: function (p) { send('generate_lead', p || {}); },                    // ✅ 문의 전환
    trackReview: function (p) { send('submit_review', p || {}); },                  // 마이크로 전환

    /** 향후 유료화 시 호출 — GA4 표준 purchase */
    trackPurchase: function (p) {
      p = p || {};
      send('purchase', {
        transaction_id: p.transaction_id || '',
        value: p.value || 0,
        currency: p.currency || 'KRW',
        items: p.items || []
      });
    },

    /** 현재 어트리뷰션 스냅샷(디버깅용) */
    attribution: attributionParams
  };

  // Object.assign 폴리필(구형 브라우저 대비)
  if (typeof Object.assign !== 'function') {
    Object.assign = function (t) { for (var i = 1; i < arguments.length; i++) { var s = arguments[i]; for (var k in s) if (Object.prototype.hasOwnProperty.call(s, k)) t[k] = s[k]; } return t; };
  }

  // ── 부팅 ─────────────────────────────────────────────────────────────────
  captureAttribution();
  if (consentGranted()) {           // 이전 방문에서 이미 동의한 사용자
    api.grantConsent();
  }
  window.btbzAnalytics = api;
  log('초기화 완료. consent=', api.getConsent());

})(window, document);
