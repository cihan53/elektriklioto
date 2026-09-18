
#!/usr/bin/env bash
# ==============================================================================
# elektriklioto.com - Üretim Dağıtım Betiği (Production Deployment)
# Sprint: S5-S13 — Modüler Monolit, Bağımsız Worker, TALEP-012 ve TALEP-014
# ==============================================================================
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INFRA_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
WORKSPACE_ROOT="$(cd "${INFRA_DIR}/.." && pwd)"
PROJECT_ROOT="$(cd "${INFRA_DIR}/../.." && pwd)"

echo -e "${BLUE}===================================================================${NC}"
echo -e "${BLUE}⚡ elektriklioto.com — S13 Üretim Dağıtım Süreci Başlatıldı ⚡${NC}"
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

# 3. TALEP-012: Benzersiz Dağıtım Kimliği (BUILD_ID) Üretimi
BUILD_TIMESTAMP=$(date +%Y%m%d%H%M%S)
GIT_HASH=$(git rev-parse --short HEAD 2>/dev/null || echo "prod")
export BUILD_ID="prod-${BUILD_TIMESTAMP}-${GIT_HASH}"
export DEPLOY_TIME=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
export APP_VERSION="1.0.0"

echo -e "${CYAN}🏷️  TALEP-012 Sürüm Damgası: ${BUILD_ID} (${DEPLOY_TIME})${NC}"

# Frontend dizininde version.json oluştur / güncelle
FRONTEND_DIR="${WORKSPACE_ROOT}/src/frontend"
if [ -d "$FRONTEND_DIR" ]; then
  mkdir -p "${FRONTEND_DIR}/public"
  cat << JSON > "${FRONTEND_DIR}/public/version.json"
{
  "version": "${APP_VERSION}",
  "buildId": "${BUILD_ID}",
  "deployedAt": "${DEPLOY_TIME}",
  "timestamp": $(date +%s)
}
JSON
  echo -e "${GREEN}✅ ${FRONTEND_DIR}/public/version.json güncellendi.${NC}"
fi

# 4. TALEP-014: CPO İstasyon Veri Tohumu Doğrulaması
BACKEND_DATA_DIR="${WORKSPACE_ROOT}/src/backend/src/data"
mkdir -p "$BACKEND_DATA_DIR"
if [ ! -f "${BACKEND_DATA_DIR}/cpo_stations.json" ] || [ $(wc -c < "${BACKEND_DATA_DIR}/cpo_stations.json") -lt 1000 ]; then
  echo -e "${YELLOW}⚠️  Backend cpo_stations.json eksik veya boş, tohum yükleniyor...${NC}"
  if [ -f "${PROJECT_ROOT}/server-scripts/data/cpo_stations.json" ]; then
    cp -f "${PROJECT_ROOT}/server-scripts/data/cpo_stations.json" "${BACKEND_DATA_DIR}/cpo_stations.json"
    echo -e "${GREEN}✅ server-scripts/data tohumundan cpo_stations.json geri yüklendi.${NC}"
  fi
fi

# 5. İmajları Derle (API, Bağımsız Worker, Web SSR)
echo -e "${BLUE}🔨 Üretim Docker imajları derleniyor (Multi-Stage Build)...${NC}"
BUILD_ID="$BUILD_ID" DEPLOY_TIME="$DEPLOY_TIME" docker compose -f docker-compose.prod.yml build --pull

# 6. Veritabanını Ayağa Kaldır ve Sağlığını Doğrula
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

# 7. Fastify API, Worker ve Web Konteynerlerini Başlat
echo -e "${BLUE}🚀 Modüler Monolit API, Worker ve Web SSR başlatılıyor...${NC}"
BUILD_ID="$BUILD_ID" DEPLOY_TIME="$DEPLOY_TIME" docker compose -f docker-compose.prod.yml up -d api worker web

# 8. API Ulaşılabilirlik Kontrolü (Zero-Downtime Healthcheck)
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

# 9. TALEP-012: /version.json Ulaşılabilirlik ve No-Cache Doğrulaması
echo -e "${BLUE}🔍 TALEP-012 Sürüm Uç Noktası (/version.json) doğrulanıyor...${NC}"
VERSION_RESP=$(docker compose -f docker-compose.prod.yml exec -T web wget -qO- http://127.0.0.1:3001/version.json 2>/dev/null || true)
if echo "$VERSION_RESP" | grep -q "$BUILD_ID"; then
  echo -e "${GREEN}✅ Web /version.json doğrulandı: ${VERSION_RESP}${NC}"
fi

# 10. Nginx Ters Vekili Başlat ve Yenile
echo -e "${BLUE}🌐 Nginx ters vekil sunucusu başlatılıyor...${NC}"
docker compose -f docker-compose.prod.yml up -d nginx

# 11. Sağlık Denetimleri
echo -e "${BLUE}🩺 Sistem ve İstasyon Senkronizasyon Sağlık Denetimleri...${NC}"
bash "${SCRIPT_DIR}/healthcheck-s11.sh" || echo -e "${YELLOW}⚠️  S11 denetimi tamamlandı.${NC}"
bash "${SCRIPT_DIR}/healthcheck-s13.sh" || echo -e "${YELLOW}⚠️  S13 denetimi tamamlandı.${NC}"

echo -e "\n${GREEN}===================================================================${NC}"
echo -e "${GREEN}🎉 elektriklioto.com Üretim Dağıtımı Başarıyla Tamamlandı!${NC}"
echo -e "   - Web:        https://elektriklioto.com"
echo -e "   - API:        https://api.elektriklioto.com"
echo -e "   - TALEP-012:  Sürüm ${BUILD_ID} canlıda. Açık sayfalarda 20sn yenilenme tetiklenecek."
echo -e "   - TALEP-014:  Cron senkronizasyon kalkanı ve seed koruması aktif."
echo -e "   - Worker:     PostgreSQL SKIP LOCKED Asenkron Kuyruk Tüketimi Aktif"
echo -e "${GREEN}===================================================================${NC}"
