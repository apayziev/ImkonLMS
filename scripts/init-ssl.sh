#!/bin/bash
# SSL initializatsiyasi — birinchi marta ishga tushiriladi
# Foydalanish: bash scripts/init-ssl.sh

set -euo pipefail

DOMAIN="lms.imkonschool.uz"
EMAIL="admin@imkonschool.uz"
PROJECT="imkon-lms"

echo "=== SSL sertifikat olish: $DOMAIN ==="

# DNS tekshirish
echo "0/4 DNS tekshirish..."
IP=$(dig +short "$DOMAIN" 2>/dev/null || echo "")
if [ -z "$IP" ]; then
    echo "DNS hali faol emas! $DOMAIN IP ga ulanmagan."
    exit 1
fi
echo "    $DOMAIN -> $IP"

# Avval barcha containerlarni to'xtatish
echo "0/4 Barcha containerlar to'xtatilmoqda..."
docker compose -f docker-compose.prod.yml down 2>/dev/null || true

# Eski certbot volumeni tozalash (agar oldingi urinishlar bo'lsa)
echo "    Certbot volume tozalanmoqda..."
docker volume rm ${PROJECT}_certbot_certs ${PROJECT}_certbot_www 2>/dev/null || true

# 1/4 — Vaqtinchalik HTTP-only nginx ishga tushirish
# (SSL sertifikati bo'lmagan holda ishlashi uchun init.conf ishlatiladi)
echo "1/4 Vaqtinchalik nginx (HTTP-only) ishga tushirilmoqda..."
docker run -d --name nginx-ssl-init \
    -p 80:80 \
    -v "$(pwd)/nginx/init.conf:/etc/nginx/conf.d/default.conf:ro" \
    -v "${PROJECT}_certbot_www:/var/www/certbot" \
    nginx:1.27-alpine
sleep 3

# 2/4 — Let's Encrypt sertifikatini olish
echo "2/4 Let's Encrypt sertifikati olinmoqda..."
docker run --rm \
    -v "${PROJECT}_certbot_certs:/etc/letsencrypt" \
    -v "${PROJECT}_certbot_www:/var/www/certbot" \
    certbot/certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    --email "$EMAIL" \
    --agree-tos \
    --no-eff-email \
    -d "$DOMAIN"

# 3/4 — Vaqtinchalik nginxni to'xtatish
echo "3/4 Vaqtinchalik nginx to'xtatilmoqda..."
docker stop nginx-ssl-init && docker rm nginx-ssl-init

# 4/4 — Barcha servicelarni haqiqiy HTTPS config bilan ishga tushirish
echo "4/4 Barcha servicelar HTTPS bilan ishga tushirilmoqda..."
docker compose -f docker-compose.prod.yml up -d --build

echo ""
echo "=== Tayyor! https://$DOMAIN ==="
