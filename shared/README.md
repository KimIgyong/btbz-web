# btbzAnalytics — GA4 래퍼 통합 가이드

동의 기반 GA4 + UTM 세분화 + 전환 추적. 순수 vanilla JS라 `www.btbz.ai`·`modora.btbz.ai` 양쪽에 동일 파일로 배포한다.

## 파일
- `analytics.js` — GA4 래퍼 본체(Consent Mode v2, UTM 어트리뷰션, 이벤트/전환 API)
- `consent-banner.js` — 한/영 쿠키 동의 배너(analytics.js와 연동)

## 1. 사전 준비 (운영자가 직접)
1. **GA4 속성 생성** → 측정 ID `G-XXXXXXXXXX` 발급 (analytics.google.com).
2. GA4 관리 → **이벤트를 전환으로 표시**: `download`, `subscribe`, `generate_lead` (그리고 향후 `purchase`).
3. 맞춤 측정기준(사용자/이벤트 범위) 등록 권장: `channel_group`, `first_channel_group`, `source`, `medium`, `campaign`.

## 2. 페이지에 삽입 (각 HTML `</body>` 직전)
```html
<script>window.BTBZ_GA4 = { measurementId: 'G-XXXXXXXXXX' };</script>
<script src="/analytics.js" defer></script>
<script src="/consent-banner.js" defer></script>
```
> 측정 ID 미설정 시 래퍼는 **아무 것도 전송하지 않는다**(안전). 콘솔에 안내만 출력.
> 디버깅: `window.BTBZ_GA4 = { measurementId:'G-...', debug:true }`.

## 3. 전환 퍼널 훅 (이미 배포 스니펫에 반영됨)
| 위치 | 호출 |
|---|---|
| `download.html` 로드 | `btbzAnalytics.trackDownloadPageView()` |
| 다운로드 버튼 클릭(모달 오픈) | `btbzAnalytics.trackBeginDownload({platform, version})` |
| 구독 성공 | `btbzAnalytics.trackSubscribe()` |
| **파일 다운로드 실행(1차 전환)** | `btbzAnalytics.trackDownload({platform, version, file})` |
| 문의 전송 성공 | `btbzAnalytics.trackLead({form:'inquiry'})` |
| 후기 작성 성공 | `btbzAnalytics.trackReview({rating})` |
| (향후) 결제 완료 | `btbzAnalytics.trackPurchase({value, currency, transaction_id})` |

모든 이벤트에는 UTM 어트리뷰션(source/medium/campaign/channel_group + first-touch)이 자동 첨부되어 **트래픽 출처별 전환율**을 GA4에서 바로 분해할 수 있다.

## 4. UTM 세분화 규칙
- **first-touch**(최초 유입)는 `localStorage`에 영구, **last-touch**(최근 캠페인)는 `sessionStorage`에 저장.
- 전환은 기본 last-touch에 귀속, `first_*` 파라미터로 최초 유입도 교차 확인 가능.
- 채널 자동 분류: Paid Search / Paid Social / Organic Search / Organic Social / Email / Referral / Affiliate / Other Campaign / Direct (google·naver·daum·kakao 등 국내 매체 포함).
- 캠페인 링크 예: `https://modora.btbz.ai/download/?utm_source=naver&utm_medium=cpc&utm_campaign=launch_2607&utm_content=bannerA`

## 5. ⚠️ 개인정보/법적 필수 후속 작업
GA4는 쿠키를 설정하고 Google(미국)로 데이터를 전송하므로, 현재 "분석 미수집" 상태와 배치된다. **아래를 반드시 병행**해야 위반이 아니다.
1. **동의 배너 필수** — `consent-banner.js` 포함(포함되어 있으면 동의 전 아무 것도 수집 안 함).
2. **개인정보처리방침 갱신** — GA4 사용, 수집 항목(쿠키·기기·사용 데이터), 국외 이전(Google), 보관기간, opt-out 방법 명시. 현재 방침의 "분석 목적 수집 안 함" 문구 수정 필요.
3. GA4 설정에서 **데이터 보관기간** 및 **IP 익명화**(래퍼가 `anonymize_ip:true` 적용) 확인.
