# BTBZ 프로젝트 인벤토리 (2026-07-20 기준)

전체 페이지·기능·API를 한눈에 정리한 문서. GA4/전환 추적 설계의 기준이 된다.

## 1. 구성 개요

| 구분 | 도메인/경로 | 스택 | 웹루트 |
|---|---|---|---|
| 기업 랜딩 | `www.btbz.ai` | 정적 HTML/CSS/JS (프레임워크 없음) | `/var/www/btbz.ai/html` |
| 제품 사이트 | `modora.btbz.ai` | 정적 HTML/CSS/JS | `/var/www/modora.btbz.ai/html` |
| 어드민 콘솔 | `www.btbz.ai/admin/` | 정적 HTML + `admin.js` (JWT) | `/var/www/btbz.ai/html/admin` |
| CMS 백엔드 | `*/api/*` | NestJS + SQLite, systemd `btbz-cms` :3110 | `/home/btbz/btbz-cms` |

## 2. 페이지별 기능

### www.btbz.ai (기업 랜딩)
- `index.html` — Hero, Modora 제품 소개(→ modora.btbz.ai 링크), About, Contact(mailto). 전환 지점 없음(정보성).
- `404.html`, `robots.txt`, `sitemap.xml`, `og-image.png`, `favicon.ico`, `apple-touch-icon.png`.

### modora.btbz.ai (제품 사이트) — 한/영 토글
- `index.html` — 제품 랜딩. 스크린샷 라이트박스, **문의 모달**(`openInquiry()` → `POST /api/inquiries`).
- `download/download.html` — 다운로드 페이지. **핵심 전환 퍼널**:
  1. 로드 시 `POST /api/events/pageview {page:'download'}`
  2. 다운로드 버튼 클릭 → 구독 모달 오픈 (**begin_download** 지점)
  3. `proceedDownload()`: (선택) `POST /api/subscribers` → `POST /api/events/download` → 실제 파일 다운로드 (**download = 최종 전환**)
- `reviews.html` — 후기 목록(`GET /api/reviews`) + **작성 모달**(`POST /api/reviews`, 관리자 승인 후 게시).
- `privacy.html` — 개인정보처리방침(한/영). `404.html`, `robots.txt`, `sitemap.xml`, 이미지 등.

### admin/ (어드민 콘솔, JWT 보호)
- 로그인/비밀번호 변경, 문의·구독자·후기 관리, 통계 대시보드. 검색엔진·분석 대상 아님(`robots.txt`에서 `/admin/` 차단).

## 3. API 엔드포인트

**공개(Public)**
- `POST /api/inquiries` — 문의 (subject, body, senderEmail, website=honeypot)
- `POST /api/subscribers` — 이메일 구독 (email, website=honeypot)
- `POST /api/events/download` — 다운로드 이벤트 (file, platform, version)
- `POST /api/events/pageview` — 페이지뷰 (page)
- `GET /api/reviews` — 후기 목록(승인된 것)
- `POST /api/reviews` — 후기 작성 (nickname, content, rating, website=honeypot)

**어드민(JWT)**
- `POST /api/admin/login`, `POST /api/admin/change-password`
- `GET/PATCH /api/admin/inquiries[/:id]`
- `GET/DELETE /api/admin/subscribers`, `GET /api/admin/subscribers/export.csv`
- `GET/POST/PATCH/DELETE /api/admin/users`, `POST /api/admin/users/:id/temp-password`
- `GET /api/admin/stats/{summary,events,views}`
- `GET/PATCH/DELETE /api/admin/reviews`

## 4. 수집 개인정보 & 프라이버시 현황

| 데이터 | 저장 위치 | 비고 |
|---|---|---|
| 문의(제목·내용·이메일·IP) | `inquiries` | IP 익명화 저장 |
| 구독 이메일·IP | `subscribers` | 마케팅 동의 기반 |
| 다운로드/페이지뷰(IP·UA) | `download_events`, `page_views` | **IP 익명화**(`anonymizeIp`, GDPR REQ-260720) |
| 후기(닉네임·내용·별점·IP) | `reviews` | 관리자 승인 후 공개 |

- **봇 차단**: 모든 공개 폼에 `website` honeypot.
- **현재 프런트엔드**: 쿠키 0개, 외부 리소스 0개, 추적기 0개 → **쿠키 동의 배너 불필요** 상태.
- 개인정보처리방침에 "분석·광고 목적 수집 안 함" 명시.

## 5. 전환(Conversion) 정의 — 결제 기능 없음

**⚠️ 이 프로젝트에는 결제/구매 기능이 없다.** Modora는 무료 앱(`price:0`).
따라서 GA4 전환은 아래 실제 퍼널에 매핑한다.

| 단계 | GA4 이벤트 | 전환 여부 |
|---|---|---|
| 다운로드 페이지 진입 | `view_download_page` | - |
| 다운로드 버튼 클릭(모달) | `begin_download` | 마이크로 전환 |
| 이메일 구독 | `subscribe` | ✅ 전환 |
| **파일 다운로드 실행** | `download` | ✅ **1차 전환(결제 대체)** |
| 문의 전송 | `generate_lead` | ✅ 전환 |
| 후기 작성 | `submit_review` | 마이크로 전환 |
| (향후) 결제 | `purchase` | ✅ 준비된 스텁 |

향후 유료화 시 `btbzAnalytics.trackPurchase({value, currency, transaction_id})` 호출만 추가하면 결제 전환율이 바로 잡힌다.
