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

### 정적 파일 갱신
```bash
cd modora.btbz.ai
rsync -az index.html privacy.html reviews.html amb-mail:/var/www/modora.btbz.ai/html/
rsync -az download/download.html amb-mail:/var/www/modora.btbz.ai/html/download/   # 설치파일 폴더 — html만!
cd .. && rsync -az admin/ amb-mail:/var/www/btbz.ai/html/admin/
```

### nginx
두 도메인 443 블록에 `nginx-btbz-cms.conf`의 `/api` location 이미 적용됨(백업: `/root/nginx-backup-*`).
변경 시: `nginx -t && systemctl reload nginx`.

## .env (서버에만, 600 권한 — `/home/btbz/btbz-cms/.env`)
`PORT=3110`, `DB_PATH`, `JWT_SECRET`(적용됨, 랜덤 96자), `MAIL_TO=fremdung@gmail.com`,
`SEED_ADMIN_EMAIL/PASSWORD`(시드 완료 — 최초 로그인 시 변경 강제),
`SMTP_HOST=smtp.gmail.com` / `SMTP_PORT=587` / `SMTP_USER=no-reply@amoeba.site` / `SMTP_PASS`(Gmail 앱 비밀번호 —
2026-07-20 설정·발송 검증 완료, mailSent=1 확인). 값 변경 시 `systemctl restart btbz-cms`.

## 백업
`backup-btbz-cms.sh` 크론 등록 필요 시:
```bash
ssh amb-mail 'apt-get install -y sqlite3'   # 스크립트가 sqlite3 CLI 사용
# crontab: 15 4 * * * DB_PATH=/home/btbz/btbz-cms-data/btbz-cms.sqlite /home/btbz/backup-btbz-cms.sh
```

## 운영 확인 URL
- https://modora.btbz.ai — 문의 모달 / https://modora.btbz.ai/reviews.html — 후기
- https://modora.btbz.ai/download/download.html — 구독 모달 + 통계 수집
- https://www.btbz.ai/admin/ — 어드민 콘솔 (admin@btbz.ai, 최초 로그인 시 비밀번호 변경 강제)
