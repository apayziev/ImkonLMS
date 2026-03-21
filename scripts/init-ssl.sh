#!/bin/bash
# SSL initializatsiyasi — birinchi marta ishga tushiriladi
# Foydalanish: bash scripts/init-ssl.sh

set -e

DOMAIN="lms.imkonschool.uz"
EMAIL="admin@imkonschool.uz"

echo "=== SSL sertifikat olish: $DOMAIN ==="

# 1/4 — Vaqtinchalik self-signed sertifikat yaratish
# (nginx ishga tushishi uchun haqiqiy sertifikat kerak, lekin uni
# nginx ishga tushmasdan olish ham mumkin emas — shu muammoni hal qiladi)
echo "1/4 Vaqtinchalik sertifikat yaratilmoqda..."
docker compose -f docker-compose.prod.yml run --rm \
    --entrypoint sh certbot -c \
    "mkdir -p /etc/letsencrypt/live/$DOMAIN && \
     openssl req -x509 -nodes -newkey rsa:2048 -days 1 \
         -keyout /etc/letsencrypt/live/$DOMAIN/privkey.pem \
         -out /etc/letsencrypt/live/$DOMAIN/fullchain.pem \
         -subj '/CN=$DOMAIN' 2>/dev/null"

echo "2/4 Barcha servicelar ishga tushirilmoqda..."
docker compose -f docker-compose.prod.yml up -d --build
sleep 8

# 3/4 — Haqiqiy Let's Encrypt sertifikatini olish
echo "3/4 Let's Encrypt sertifikati olinmoqda..."
docker compose -f docker-compose.prod.yml run --rm \
    --entrypoint certbot certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    --email "$EMAIL" \
    --agree-tos \
    --no-eff-email \
    --force-renewal \
    -d "$DOMAIN"

# 4/4 — Nginx yangi sertifikat bilan reload
echo "4/4 Nginx qayta yuklanmoqda..."
docker compose -f docker-compose.prod.yml exec nginx nginx -s reload

echo ""
echo "=== Tayyor! https://$DOMAIN ===" 
