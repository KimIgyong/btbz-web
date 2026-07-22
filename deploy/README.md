# btbz CMS 배포 가이드 / Deployment guide

**상태: 2026-07-20 운영 배포 완료.** 아래는 실제 적용된 구성(as-built)이자 재배포 절차다.

- 서버: `211.110.140.172` (Ubuntu 22.04, nginx 1.18 — btbz.ai·modora.btbz.ai·메일 등 공용, ssh 호스트 `amb-mail`)
- 실행 계정: `btbz` + nvm Node v20.20.2 (서버 관례: 시스템 node 없음, 사용자별 nvm)
- 백엔드: `/home/btbz/btbz-cms` (systemd `btbz-cms.service`, 포트 **3110** — 3100은 ambCampaign 점유)
- DB: `/home/btbz/btbz-cms-data/btbz-cms.sqlite`
- 웹루트: www → `/var/www/btbz.ai/html` (+ `admin/`), modora → `/var/www/modora.btbz.ai/html`

## 재배포 절차

### 백엔드 갱신
```bash
rsync -az --exclude node_modules --exclude dist --exclude '.env' server/ amb-mail:/home/btbz/btbz-cms/
ssh amb-mail 'chown -R btbz:btbz /home/btbz/btbz-cms && sudo -u btbz bash -c \
  "export NVM_DIR=/home/btbz/.nvm && . \$NVM_DIR/nvm.sh && cd /home/btbz/btbz-cms && npm ci && npm run build" \
  && systemctl restart btbz-cms && sleep 2 && curl -s 127.0.0.1:3110/api/reviews'
```

> 신규 의존성이 추가되면 `npm ci` 대신 `npm install` 1회 필요(예: sanitize-html, @types/multer, @types/sanitize-html — Q&A 기능).

### 정적 파일 갱신
```bash
cd modora.btbz.ai
rsync -az index.html privacy.html reviews.html qna.html amb-mail:/var/www/modora.btbz.ai/html/
rsync -az download/download.html amb-mail:/var/www/modora.btbz.ai/html/download/   # 설치파일 폴더 — html만!
cd .. && rsync -az admin/ amb-mail:/var/www/btbz.ai/html/admin/
cd www.btbz.ai && rsync -az index.html robots.txt sitemap.xml 404.html og-image.png favicon.ico apple-touch-icon.png amb-mail:/var/www/btbz.ai/html/
```

### nginx
두 도메인 443 블록에 `nginx-btbz-cms.conf`의 `/api` location 이미 적용됨(백업: `/root/nginx-backup-*`).
변경 시: `nginx -t && systemctl reload nginx`.
- modora `/api` location에 `client_max_body_size 30M;` 적용됨(Q&A 파일 업로드 5MB×5 대비).

## 제품 Q&A 게시판 (2026-07-23 추가)
- 공개: `GET/POST /api/qna`, `GET /api/qna/:id`, `GET /api/qna/attachments/:id` (즉시 공개, 허니팟+스로틀 5/분).
- 관리자: `GET /api/admin/qna`, `PATCH`(숨김/게시)·`DELETE /api/admin/qna/:id`, `POST /api/admin/qna/:id/replies`, `DELETE /api/admin/qna/replies/:id`.
- 업로드 저장: `QNA_UPLOAD_DIR=/home/btbz/btbz-cms-data/qna-uploads` (.env, btbz 소유). 파일당 5MB·최대 5개, png/jpg=이미지 인라인·그 외=다운로드. 위험 확장자(html/svg/exe 등) 차단.
- 리치텍스트는 sanitize-html로 서버 새니타이즈(XSS 차단). 공개 응답에는 email/ip 미포함.
- 어드민 콘솔 ❓ 제품 Q&A: 답변 등록 시 게시판에 “개발자 답변”으로 표시.

## .env (서버에만, 600 권한 — `/home/btbz/btbz-cms/.env`)
`PORT=3110`, `DB_PATH`, `JWT_SECRET`(적용됨, 랜덤 96자), `MAIL_TO=fremdung@gmail.com`,
`SEED_ADMIN_EMAIL/PASSWORD`(시드 완료 — 최초 로그인 시 변경 강제),
`SEED_ADMIN_RECOVERY_EMAIL`(선택, 기본 `fremdung@gmail.com` — 복구 이메일 미설정 시 첫 관리자에 1회 백필),
`SMTP_HOST=smtp.gmail.com` / `SMTP_PORT=587` / `SMTP_USER=no-reply@amoeba.site` / `SMTP_PASS`(Gmail 앱 비밀번호 —
2026-07-20 설정·발송 검증 완료, mailSent=1 확인). 값 변경 시 `systemctl restart btbz-cms`.

## 관리자 비밀번호 분실 재발급 (2026-07-22 추가)
- 로그인 화면 "비밀번호를 잊으셨나요?" → `POST /api/admin/forgot-password {email,destination}` (공개, 10분 3회 스로틀).
  임시 비밀번호를 **이메일로만** 발송(응답 미노출), 계정 열거 방지 위해 항상 202. 로그인 후 새 비밀번호 설정 강제.
- `destination`: `primary`(가입 이메일) / `recovery`(복구 이메일, 미설정 시 가입 이메일로 폴백).
- 복구 이메일 설정: 콘솔 ⚙️ 설정 → `GET /api/admin/me`, `PATCH /api/admin/me/recovery-email {recoveryEmail}`(빈 값=해제).
- 현재 admin@btbz.ai 복구 이메일 = `fremdung@gmail.com`(백필 완료). SMTP 미설정 시 발송만 생략(계정 리셋은 진행).

## 백업 (2026-07-20 등록 완료)
- 스크립트: `/home/btbz/backup-btbz-cms.sh` (sqlite3 online backup + gzip, 30일 보관)
- 크론(btbz): `15 4 * * * DB_PATH=/home/btbz/btbz-cms-data/btbz-cms.sqlite BACKUP_DIR=/home/btbz/backups /home/btbz/backup-btbz-cms.sh >> /home/btbz/backups/backup.log 2>&1`
- 백업 위치: `/home/btbz/backups/btbz-cms-*.sqlite.gz` — 등록 시 1회 실행·integrity_check `ok` 확인

## 운영 확인 URL
- https://modora.btbz.ai — 문의 모달 / https://modora.btbz.ai/reviews.html — 후기
- https://modora.btbz.ai/download/download.html — 구독 모달 + 통계 수집
- https://www.btbz.ai/admin/ — 어드민 콘솔 (admin@btbz.ai, 최초 로그인 시 비밀번호 변경 강제)
