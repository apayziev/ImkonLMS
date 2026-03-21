#!/bin/sh
# Daily database backup script
# Keeps last 7 days of backups, sends to Telegram if configured

set -e

BACKUP_DIR="/backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/imkon_lms_${DATE}.sql.gz"

echo "$(date): Starting backup..."

pg_dump -h "$PGHOST" -U "$PGUSER" -d "$PGDATABASE" | gzip > "$BACKUP_FILE"

if [ ! -s "$BACKUP_FILE" ]; then
    echo "$(date): ERROR - Backup file is empty!"
    rm -f "$BACKUP_FILE"
    exit 1
fi

SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
echo "$(date): Backup created: $BACKUP_FILE ($SIZE)"

# Remove backups older than 7 days
find "$BACKUP_DIR" -name "imkon_lms_*.sql.gz" -mtime +7 -delete

# Send to Telegram if configured
if [ -n "$TELEGRAM_BOT_TOKEN" ] && [ -n "$TELEGRAM_CHAT_ID" ]; then
    CAPTION="💾 Imkon LMS Backup
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
ls -lh "$BACKUP_DIR"/imkon_lms_*.sql.gz 2>/dev/null || echo "None"
