/*!
 * btbz 쿠키 동의 배너 — analytics.js와 연동 (GDPR/PIPA 사전 동의)
 * analytics.js 다음에 로드. 동의 미결정 시에만 표시. 한/영 자동.
 */
(function (window, document) {
  'use strict';
  var A = window.btbzAnalytics;
  if (!A) { if (window.console) console.warn('[consent-banner] analytics.js 먼저 로드 필요'); return; }
  if (A.getConsent()) return; // 이미 동의/거부 결정됨 → 배너 없음

  var ko = (navigator.language || 'ko').toLowerCase().indexOf('ko') === 0;
  var T = ko ? {
    msg: '이 사이트는 트래픽 분석을 위해 쿠키를 사용할 수 있습니다. 동의하시면 방문 통계 수집이 시작됩니다.',
    accept: '동의', decline: '거부', privacy: '개인정보처리방침'
  } : {
    msg: 'This site may use cookies for traffic analytics. If you accept, visit statistics collection begins.',
    accept: 'Accept', decline: 'Decline', privacy: 'Privacy Policy'
  };
  var PRIVACY_HREF = window.BTBZ_PRIVACY_HREF ||
    (location.host.indexOf('modora') === 0 ? '/privacy.html' : 'https://modora.btbz.ai/privacy.html');

  var css = [
    '#btbz-cc{position:fixed;left:16px;right:16px;bottom:16px;z-index:9999;max-width:720px;margin:0 auto;',
    'background:#0d1424;color:#e8ecf4;border:1px solid rgba(255,255,255,.12);border-radius:14px;',
    'padding:18px 20px;box-shadow:0 12px 40px rgba(0,0,0,.45);',
    'font-family:"Pretendard","Apple SD Gothic Neo","Noto Sans KR",-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;',
    'display:flex;gap:16px;align-items:center;flex-wrap:wrap;line-height:1.55;font-size:.92rem}',
    '#btbz-cc p{margin:0;flex:1 1 260px;color:#c7cede}',
    '#btbz-cc a{color:#7cd4fd;text-decoration:underline}',
    '#btbz-cc .btns{display:flex;gap:10px;flex:0 0 auto}',
    '#btbz-cc button{cursor:pointer;border-radius:9px;padding:9px 18px;font-weight:700;font-size:.9rem;border:1px solid transparent}',
    '#btbz-cc .ok{background:linear-gradient(120deg,#5b8cff,#7cd4fd);color:#04070f}',
    '#btbz-cc .no{background:transparent;color:#9aa5b8;border-color:rgba(255,255,255,.18)}',
    '@media(max-width:520px){#btbz-cc .btns{flex:1 1 100%}#btbz-cc button{flex:1}}'
  ].join('');

  function show() {
    var style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);

    var el = document.createElement('div');
    el.id = 'btbz-cc';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-label', ko ? '쿠키 동의' : 'Cookie consent');
    el.innerHTML =
      '<p>' + T.msg + ' <a href="' + PRIVACY_HREF + '">' + T.privacy + '</a></p>' +
      '<div class="btns">' +
      '<button type="button" class="no" id="btbz-cc-no">' + T.decline + '</button>' +
      '<button type="button" class="ok" id="btbz-cc-ok">' + T.accept + '</button>' +
      '</div>';
    document.body.appendChild(el);

    document.getElementById('btbz-cc-ok').addEventListener('click', function () { A.grantConsent(); el.remove(); });
    document.getElementById('btbz-cc-no').addEventListener('click', function () { A.denyConsent(); el.remove(); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', show);
  else show();
})(window, document);
