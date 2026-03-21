#!/bin/bash
# SSL initializatsiyasi — birinchi marta ishga tushiriladi
# Foydalanish: bash scripts/init-ssl.sh

set -e

DOMAIN="lms.imkonschool.uz"
EMAIL="admin@imkonschool.uz"

echo "=== SSL sertifikat olish: $DOMAIN ==="

# Avval faqat nginx ishga tushirish (HTTP uchun)
docker compose -f docker-compose.prod.yml up -d nginx

echo "Nginx ishga tushdi, certbot boshlanyapti..."
sleep 3

# Sertifikat olish
docker compose -f docker-compose.prod.yml run --rm certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    --email "$EMAIL" \
    --agree-tos \
    --no-eff-email \
    -d "$DOMAIN"

echo "=== Sertifikat muvaffaqiyatli olindi! ==="
echo "Barcha servicelarni qayta ishga tushirish..."

docker compose -f docker-compose.prod.yml up -d

echo "=== Tayyor! https://$DOMAIN ===" 
