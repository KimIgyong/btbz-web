# Google Search Console 등록 가이드 / Registration Guide
### www.btbz.ai · modora.btbz.ai

> 작성: 2026-07-20 · 소요 시간 약 10~15분 (DNS 전파 대기 별도)
> EN — How to register both BTBZ domains in Google Search Console and submit sitemaps.

---

## 준비물
- 구글 계정 (fremdung@gmail.com 등 관리용 계정)
- **btbz.ai DNS를 관리하는 곳**(도메인 등록기관/네임서버 관리 콘솔) 로그인 — 권장 방식이 DNS TXT 인증이기 때문

---

## 1. 방식 선택 (권장: 도메인 속성 1개)

| 방식 | 커버 범위 | 인증 | 권장 |
|---|---|---|---|
| **도메인 속성 `btbz.ai`** | **모든 서브도메인**(www·modora 포함)+http/https 전부 | DNS TXT 레코드 | ✅ **권장 — 한 번 등록으로 둘 다 해결** |
| URL 접두어 `https://www.btbz.ai/` + `https://modora.btbz.ai/` (2개) | 각 주소만 | HTML 파일 업로드·메타태그 등 | DNS 접근이 어려울 때 대안 |

**EN** — A single Domain property `btbz.ai` (DNS TXT verification) covers every subdomain; otherwise add two URL-prefix properties.

---

## 2. 도메인 속성 등록 절차 (권장안)

1. https://search.google.com/search-console 접속 → 로그인.
2. 좌측 상단 속성 선택 → **속성 추가** → 왼쪽 **"도메인"** 칸에 `btbz.ai` 입력 → 계속.
3. 표시되는 **TXT 레코드 값 복사** (예: `google-site-verification=Abc123...`).
4. **DNS 관리 콘솔**에서 레코드 추가:
   - 유형: `TXT` · 호스트/이름: `@` (또는 빈칸/btbz.ai) · 값: 복사한 문자열 · TTL: 기본값
5. Search Console로 돌아와 **확인** 클릭.
   - "확인할 수 없음"이 뜨면 DNS 전파 대기(보통 몇 분~1시간, 최대 48시간) 후 재시도.
6. 인증 완료 → 속성 `btbz.ai` 생성됨. **www와 modora 데이터가 모두 이 속성에 잡힙니다.**

> 참고: 현재 서버 DNS(211.110.140.172)는 그대로 두고 **TXT 레코드만 추가**하는 것이므로 사이트 운영에 영향 없음.

---

## 3. sitemap 제출

속성 선택 → 좌측 **색인 생성 > Sitemaps** → 아래 두 개를 각각 입력 후 제출:

```
https://www.btbz.ai/sitemap.xml        (1개 URL)
https://modora.btbz.ai/sitemap.xml     (4개 URL — 홈·다운로드·후기·방침)
```

- 상태가 "가져올 수 없음"이면 몇 시간 뒤 재확인(신규 속성은 지연 흔함).
- 두 sitemap 모두 라이브 200 상태로 배포되어 있음(2026-07-20 검증).

---

## 4. 초기 색인 요청 (선택, 효과 좋음)

상단 검색창(URL 검사)에 아래 주소를 하나씩 넣고 → **색인 생성 요청**:

```
https://www.btbz.ai/
https://modora.btbz.ai/
https://modora.btbz.ai/download/download.html
```

하루 요청 한도가 있으니 핵심 페이지만. 나머지는 sitemap 크롤링으로 자연 수집됩니다.

---

## 5. 등록 후 확인 체크리스트 (1~2주 내)

- [ ] **색인 생성 > 페이지**: modora 4페이지가 "색인 생성됨"에 나타나는지
- [ ] **실적(Performance)**: `modora`, `비밀메모 앱` 등 검색 노출 시작 여부
- [ ] **URL 검사**로 https://modora.btbz.ai/ 조회 → "URL이 Google에 등록되어 있음" 확인
- [ ] 색인 제외 항목에 `/api/`·`/admin/`이 있어도 정상(robots.txt로 의도적 차단)

---

## 6. (선택) URL 접두어 방식 — DNS 접근이 어려울 때

1. 속성 추가 → **URL 접두어**에 `https://www.btbz.ai/` 입력.
2. 인증 방법 중 **"HTML 파일"** 선택 → `googleXXXX.html` 다운로드.
3. 파일을 웹루트에 업로드해야 함 — **이 단계는 요청 주시면 서버에 바로 올려드립니다** (www: `/var/www/btbz.ai/html/`, modora: `/var/www/modora.btbz.ai/html/`).
4. 확인 클릭 → `https://modora.btbz.ai/`도 같은 방식으로 반복 → 각 속성에서 sitemap 제출(§3).

---

## 추가 팁
- **네이버 서치어드바이저**(https://searchadvisor.naver.com)도 같은 요령(HTML 파일/메타태그 인증 + sitemap 제출)으로 등록하면 국내 검색 노출에 도움됩니다. 인증 파일 업로드가 필요하면 요청 주세요.
- Search Console 데이터는 등록 후 2~3일부터 쌓이기 시작합니다.
