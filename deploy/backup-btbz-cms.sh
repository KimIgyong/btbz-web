#!/usr/bin/env bash
# SQLite 일일 백업 — crontab 예: 15 4 * * * /opt/btbz-cms/deploy/backup-btbz-cms.sh
# 30일 보관, sqlite3 online backup 사용(쓰기 중에도 안전)
set -euo pipefail

DB="${DB_PATH:-/var/lib/btbz-cms/btbz-cms.sqlite}"
OUT_DIR="${BACKUP_DIR:-/var/backups/btbz-cms}"
KEEP_DAYS=30

mkdir -p "$OUT_DIR"
STAMP="$(date +%Y%m%d-%H%M%S)"
sqlite3 "$DB" ".backup '$OUT_DIR/btbz-cms-$STAMP.sqlite'"
gzip "$OUT_DIR/btbz-cms-$STAMP.sqlite"
find "$OUT_DIR" -name 'btbz-cms-*.sqlite.gz' -mtime +"$KEEP_DAYS" -delete
