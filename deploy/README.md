# btbz CMS 배포 가이드 / Deployment guide

대상 서버: Ubuntu + nginx/1.18 (modora.btbz.ai · www.btbz.ai 서빙 중)

## 0. 사전 확인 (필수 — REQ Q-3)
- [ ] `sudo nginx -T | grep -A20 'server_name www.btbz.ai'` 로 **기존 www.btbz.ai 설정과 웹루트 위치를 확인**한다.
      기존 `/` 콘텐츠는 절대 건드리지 않고 `/admin`·`/api` location만 추가한다.

## 1. 백엔드 설치
```bash
# 빌드 (로컬 또는 서버, Node 20)
cd server && npm ci && npm run build

# 서버 배치
sudo mkdir -p /opt/btbz-cms
sudo cp -r dist node_modules package.json /opt/btbz-cms/
sudo install -d -o www-data -g www-data /var/lib/btbz-cms

# 환경변수 — .env.example 참고, 실값은 서버에서만 작성
sudo vi /opt/btbz-cms/.env && sudo chmod 600 /opt/btbz-cms/.env
```
`.env` 필수 항목: `PORT=3100`, `DB_PATH=/var/lib/btbz-cms/btbz-cms.sqlite`, `JWT_SECRET`(랜덤 64자+),
`SMTP_USER`/`SMTP_PASS`(Gmail 앱 비밀번호), `MAIL_TO`, `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`.

```bash
sudo cp deploy/btbz-cms.service /etc/systemd/system/
sudo systemctl daemon-reload && sudo systemctl enable --now btbz-cms
curl -s 127.0.0.1:3100/api/reviews   # {"items":[],"total":0} 이면 정상
```
첫 기동 시 마이그레이션이 자동 실행되고 `SEED_ADMIN_EMAIL` 계정이 생성된다(최초 로그인 시 비밀번호 변경 강제).

## 2. 정적 파일
```bash
# modora.btbz.ai — 기존 웹루트에 갱신된 index/download/privacy + 신규 reviews.html 복사
# www.btbz.ai   — admin/ 폴더를 /var/www/btbz-web/admin 등으로 복사
```

## 3. nginx
`deploy/nginx-btbz-cms.conf`의 location 블록을 두 도메인 server 블록에 추가 후:
```bash
sudo nginx -t && sudo systemctl reload nginx
```

## 4. 백업
```bash
sudo cp deploy/backup-btbz-cms.sh /opt/btbz-cms/deploy/ && sudo chmod +x /opt/btbz-cms/deploy/backup-btbz-cms.sh
sudo crontab -e   # 15 4 * * * /opt/btbz-cms/deploy/backup-btbz-cms.sh
```

## 5. 릴리즈 체크 (PLN §8)
- [ ] admin 최초 로그인 → 비밀번호 변경 강제 확인
- [ ] 문의 전송 → MAIL_TO 수신 + 어드민 목록 확인
- [ ] 다운로드 3종 클릭 → 통계 기록 확인, **백엔드 중지 상태에서도 다운로드되는지** 확인
- [ ] 후기 작성 → 승인 → reviews.html 노출 확인
- [ ] privacy.html §7(웹사이트 수집 항목) 노출 확인
