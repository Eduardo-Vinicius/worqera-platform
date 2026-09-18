#!/usr/bin/env bash
# Weekly Mongo backup for Worqera PRD (retain 7 days).
# Example cron (host): 0 3 * * 0 /volumes/worqera/api/scripts/mongo-backup.sh
set -euo pipefail

CONTAINER="${WORQERA_MONGO_CONTAINER:-worqera-mongodb}"
OUT_DIR="${WORQERA_BACKUP_DIR:-/volumes/worqera/backups/mongo}"
RETENTION_DAYS="${WORQERA_BACKUP_RETENTION_DAYS:-7}"
STAMP="$(date -u +%Y%m%d-%H%M%S)"
DEST="${OUT_DIR}/${STAMP}"

mkdir -p "$OUT_DIR"
echo "[backup] dumping into ${DEST}"

docker exec "$CONTAINER" mongodump \
  --db worqera \
  --archive=/tmp/worqera-${STAMP}.archive \
  --gzip

docker cp "${CONTAINER}:/tmp/worqera-${STAMP}.archive" "${DEST}.archive.gz"
docker exec "$CONTAINER" rm -f "/tmp/worqera-${STAMP}.archive"

find "$OUT_DIR" -type f -name '*.archive.gz' -mtime "+${RETENTION_DAYS}" -delete || true
echo "[backup] ok ${DEST}.archive.gz"
