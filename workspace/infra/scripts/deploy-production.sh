
#!/usr/bin/env bash
# ==============================================================================
# elektriklioto.com - Üretim Dağıtım Betiği (Production Deployment)
# Sprint: S5-S6 — Modüler Monolit ve Bağımsız Worker Süreci Üretim Dağıtımı
# ==============================================================================
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INFRA_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

echo -e "${BLUE}===================================================================${NC}"
echo -e "${BLUE}⚡ elektriklioto.com — S5-S6 Üretim Dağıtım Süreci Başlatıldı ⚡${NC}"
echo -e "${BLUE}===================================================================${NC}"

cd "$INFRA_DIR"

# 1. Üretim Ortam Dosyası Doğrulaması
if [ ! -f "env/.env.production" ]; then
  echo -e "${RED}❌ HATA: env/.env.production dosyası bulunamadı!${NC}"
  echo -e "${YELLOW}Lütfen env/.env.production.example dosyasını kopyalayarak güvenli anahtarları tanımlayın.${NC}"
  exit 1
fi

# Varsayılan parola denetimi
if grep -q "CHANGE_THIS_IN_PRODUCTION" "env/.env.production"; then
  echo -e "${RED}❌ HATA: env/.env.production içinde varsayılan parola bırakılmış! Lütfen değiştirin.${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Üretim ortam değişkenleri doğrulandı.${NC}"

# 2. Docker Daemon ve Compose Denetimi
if ! docker info >/dev/null 2>&1; then
  echo -e "${RED}❌ HATA: Docker daemon çalışmıyor!${NC}"
  exit 1
fi

# 3. İmajları Derle (API, Bağımsız Worker, Web)
echo -e "${BLUE}🔨 Üretim Docker imajları derleniyor (Multi-Stage Build)...${NC}"
docker compose -f docker-compose.prod.yml build --pull

# 4. Veritabanını Ayağa Kaldır ve Sağlığını Doğrula
echo -e "${BLUE}🐘 PostgreSQL + PostGIS (16-3.4) veritabanı başlatılıyor...${NC}"
docker compose -f docker-compose.prod.yml up -d postgres

echo -e "${BLUE}⏳ Veritabanı sağlık kontrolü bekleniyor...${NC}"
RETRIES=20
until docker compose -f docker-compose.prod.yml exec -T postgres pg_isready -U prod_db_user -d elektriklioto_prod >/dev/null 2>&1 || [ $RETRIES -eq 0 ]; do
  sleep 1
  RETRIES=$((RETRIES - 1))
done

if [ $RETRIES -eq 0 ]; then
  echo -e "${RED}❌ HATA: Veritabanı zaman aşımına uğradı!${NC}"
  exit 1
fi
echo -e "${GREEN}✅ Veritabanı hazır ve PostGIS aktif.${NC}"

# 5. Fastify API ve Bağımsız Worker Konteynerlerini Başlat
echo -e "${BLUE}🚀 Modüler Monolit API ve Bağımsız Asenkron Worker başlatılıyor...${NC}"
docker compose -f docker-compose.prod.yml up -d api worker web

# 6. API Ulaşılabilirlik Kontrolü (Zero-Downtime Healthcheck)
echo -e "${BLUE}🔍 API konteyner sağlığı (/health) denetleniyor...${NC}"
API_HEALTHY=false
for i in {1..15}; do
  if docker compose -f docker-compose.prod.yml exec -T api wget --spider -q http://127.0.0.1:3000/health >/dev/null 2>&1; then
    API_HEALTHY=true
    break
  fi
  sleep 2
done

if [ "$API_HEALTHY" = false ]; then
  echo -e "${RED}❌ HATA: Fastify API sağlık kontrolünden geçemedi! Geri alınıyor...${NC}"
  docker compose -f docker-compose.prod.yml logs api
  exit 1
fi
echo -e "${GREEN}✅ Fastify API (3000) sağlıklı yanıt veriyor.${NC}"

# 7. Nginx Ters Vekili Başlat ve Yenile
echo -e "${BLUE}🌐 Nginx ters vekil sunucusu başlatılıyor...${NC}"
docker compose -f docker-compose.prod.yml up -d nginx

# 8. S5 Nihai Sağlık Denetimi
echo -e "${BLUE}🩺 Sprint 5: Worker Kuyruğu, Devre Kesici ve Veri Tazeliği Denetimi...${NC}"
bash "${SCRIPT_DIR}/healthcheck-s5.sh"

echo -e "\n${GREEN}===================================================================${NC}"
echo -e "${GREEN}🎉 elektriklioto.com Üretim Dağıtımı Başarıyla Tamamlandı!${NC}"
echo -e "   - Web:     https://elektriklioto.com"
echo -e "   - API:     https://api.elektriklioto.com"
echo -e "   - Worker:  PostgreSQL SKIP LOCKED Asenkron Kuyruk Tüketimi Aktif"
echo -e "${GREEN}===================================================================${NC}"
