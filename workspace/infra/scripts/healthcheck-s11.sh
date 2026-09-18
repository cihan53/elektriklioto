
#!/usr/bin/env bash
# ==============================================================================
# elektriklioto.com - Sprint 11 Sağlık Denetimi (Healthcheck)
# Görev: [TALEP-012] Yeni Dağıtım Algılama (Version Polling) ve 20s Otomatik Yenilenme
# ==============================================================================
set -euo pipefail

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INFRA_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
WORKSPACE_ROOT="$(cd "${INFRA_DIR}/.." && pwd)"
FRONTEND_DIR="${WORKSPACE_ROOT}/src/frontend"

WEB_BASE="${WEB_BASE:-http://localhost:3001}"

echo -e "${CYAN}===================================================================${NC}"
echo -e "${CYAN}🩺 Sprint 11: TALEP-012 Sürüm Yönetimi ve Otomatik Yenileme Denetimi 🩺${NC}"
echo -e "${CYAN}===================================================================${NC}"

FAILED_CHECKS=0

# 1. Nginx No-Cache Yapılandırma Denetimi (production.conf & staging.conf)
echo -n "1. Nginx /version.json no-cache direktifi denetimi... "
NGINX_PROD="${INFRA_DIR}/nginx/production.conf"
NGINX_STAGING="${INFRA_DIR}/nginx/staging.conf"

if grep -q "location = /version.json" "$NGINX_PROD" && grep -q "no-store, no-cache" "$NGINX_PROD" && \
   grep -q "location = /version.json" "$NGINX_STAGING"; then
  echo -e "${GREEN}BAŞARILI (Nginx önbellek engelleme aktif)${NC}"
else
  echo -e "${RED}BAŞARISIZ (Nginx /version.json direktifleri eksik)${NC}"
  FAILED_CHECKS=$((FAILED_CHECKS + 1))
fi

# 2. Dockerfile.web BUILD_ID ve version.json Enjeksiyon Denetimi
echo -n "2. Dockerfile.web multi-stage sürüm enjeksiyonu denetimi... "
DOCKERFILE_WEB="${INFRA_DIR}/docker/Dockerfile.web"
if grep -q "ARG BUILD_ID" "$DOCKERFILE_WEB" && grep -q "version.json" "$DOCKERFILE_WEB"; then
  echo -e "${GREEN}BAŞARILI (Dockerfile.web BUILD_ID destekli)${NC}"
else
  echo -e "${RED}BAŞARISIZ (Dockerfile.web sürüm argümanları eksik)${NC}"
  FAILED_CHECKS=$((FAILED_CHECKS + 1))
fi

# 3. deploy-production.sh ve deploy-staging.sh Sürüm Doğrulama Denetimi
echo -n "3. Dağıtım betiklerinde TALEP-012 BUILD_ID üretimi... "
DEPLOY_PROD="${INFRA_DIR}/scripts/deploy-production.sh"
DEPLOY_STAGING="${INFRA_DIR}/scripts/deploy-staging.sh"
if grep -q "BUILD_ID=" "$DEPLOY_PROD" && grep -q "version.json" "$DEPLOY_PROD" && \
   grep -q "BUILD_ID=" "$DEPLOY_STAGING"; then
  echo -e "${GREEN}BAŞARILI (Dağıtım betikleri benzersiz BUILD_ID üretiyor)${NC}"
else
  echo -e "${RED}BAŞARISIZ (Dağıtım betiklerinde BUILD_ID üretimi eksik)${NC}"
  FAILED_CHECKS=$((FAILED_CHECKS + 1))
fi

# 4. Frontend / Yerel version.json Dosyası ve Şema Denetimi
echo -n "4. Yerel / Dağıtılmış version.json format ve şema denetimi... "
VERSION_FILE="${FRONTEND_DIR}/public/version.json"
if [ -f "$VERSION_FILE" ]; then
  if grep -q '"version"' "$VERSION_FILE" && grep -q '"buildId"' "$VERSION_FILE" && grep -q '"timestamp"' "$VERSION_FILE"; then
    echo -e "${GREEN}BAŞARILI ($(cat "$VERSION_FILE"))${NC}"
  else
    echo -e "${RED}BAŞARISIZ (version.json beklenen şemayı içermiyor)${NC}"
    FAILED_CHECKS=$((FAILED_CHECKS + 1))
  fi
else
  echo -e "${YELLOW}UYARI (Henüz derleme çalıştırılmamış, build sırasında otomatik üretilir)${NC}"
fi

# 5. Canlı Web /version.json HTTP Uç Noktası Denetimi (Eğer Web Servisi Açıksa)
echo -n "5. Canlı HTTP /version.json uç noktası (varsa)... "
HTTP_RESP=$(curl -s -w "\n%{http_code}" "${WEB_BASE}/version.json" 2>/dev/null || echo -e "\n000")
HTTP_CODE=$(echo "$HTTP_RESP" | tail -n 1)
HTTP_BODY=$(echo "$HTTP_RESP" | sed '$d')

if [ "$HTTP_CODE" -eq 200 ]; then
  echo -e "${GREEN}BAŞARILI (HTTP 200)${NC}"
  echo -e "   ${CYAN}Dönen Sürüm Verisi:${NC} $HTTP_BODY"
else
  echo -e "${YELLOW}BİLGİ (Yerel web servisi port ${WEB_BASE} üzerinde dinlemiyor, canli.sh başlatıldığında test edilir)${NC}"
fi

echo -e "\n${CYAN}===================================================================${NC}"
if [ $FAILED_CHECKS -eq 0 ]; then
  echo -e "${GREEN}🎉 TALEP-012 Sürüm Yönetimi ve Altyapı Denetimi Başarıyla Tamamlandı!${NC}"
  exit 0
else
  echo -e "${RED}❌ $FAILED_CHECKS adet denetim başarısız oldu!${NC}"
  exit 1
fi
