#!/bin/sh
# Daily database backup script.
# Encrypts with gpg symmetric (PII safety), 30-day retention, Telegram upload.
#
# Restore:  gpg --decrypt --passphrase "$BACKUP_ENCRYPTION_KEY" \
#               imkon_lms_YYYYMMDD.sql.gz.gpg | gunzip | psql ...

set -e

BACKUP_DIR="/backups"
DATE=$(date +%Y%m%d_%H%M%S)
RAW_FILE="$BACKUP_DIR/imkon_lms_${DATE}.sql.gz"
BACKUP_FILE="$RAW_FILE.gpg"
RETENTION_DAYS=30

echo "$(date): Starting backup..."

if [ -z "${BACKUP_ENCRYPTION_KEY:-}" ]; then
    echo "$(date): ERROR - BACKUP_ENCRYPTION_KEY env not set" >&2
    exit 1
fi

pg_dump -h "$PGHOST" -U "$PGUSER" -d "$PGDATABASE" | gzip > "$RAW_FILE"

if [ ! -s "$RAW_FILE" ]; then
    echo "$(date): ERROR - Raw dump is empty!"
    rm -f "$RAW_FILE"
    exit 1
fi

# Encrypt and discard plaintext dump. Pipe the passphrase via stdin (fd 0) so
# it never appears in /proc/<pid>/cmdline.
printf '%s' "$BACKUP_ENCRYPTION_KEY" | gpg --symmetric --batch --yes \
    --cipher-algo AES256 --passphrase-fd 0 \
    --output "$BACKUP_FILE" "$RAW_FILE"
rm -f "$RAW_FILE"

if [ ! -s "$BACKUP_FILE" ]; then
    echo "$(date): ERROR - Encrypted backup is empty!" >&2
    exit 1
fi

SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
echo "$(date): Backup created: $BACKUP_FILE ($SIZE)"

# Retention cleanup.
find "$BACKUP_DIR" -name "imkon_lms_*.sql.gz.gpg" -mtime +$RETENTION_DAYS -delete
find "$BACKUP_DIR" -name "imkon_lms_*.sql.gz" -mtime +1 -delete  # legacy/orphan plaintext

if [ -n "${TELEGRAM_BOT_TOKEN:-}" ] && [ -n "${TELEGRAM_CHAT_ID:-}" ]; then
    CAPTION="💾 Imkon LMS Backup (encrypted)
📅 $DATE
📦 Size: $SIZE"

    curl -s -F "chat_id=$TELEGRAM_CHAT_ID" \
         -F "caption=$CAPTION" \
         -F "document=@$BACKUP_FILE" \
         "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendDocument" > /dev/null \
        && echo "$(date): Sent to Telegram" \
        || echo "$(date): WARNING - Telegram send failed"
fi

echo "Current backups:"
ls -lh "$BACKUP_DIR"/imkon_lms_*.sql.gz.gpg 2>/dev/null || echo "None"
