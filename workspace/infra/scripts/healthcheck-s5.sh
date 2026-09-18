
#!/usr/bin/env bash
# ==============================================================================
# elektriklioto.com - Sprint 5 Sağlık Denetimi (Healthcheck)
# Kapsam: PostgreSQL SKIP LOCKED Kuyruk, Circuit Breaker ve Veri Tazeliği
# ==============================================================================
set -euo pipefail

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

API_BASE="${API_BASE:-http://localhost:3000}"

echo -e "${CYAN}===================================================================${NC}"
echo -e "${CYAN}🩺 Sprint 5 Asenkron Worker & Veri Tazeliği Sağlık Denetimi 🩺${NC}"
echo -e "${CYAN}===================================================================${NC}"

FAILED_CHECKS=0

# 1. Temel API Sağlık Denetimi
echo -n "1. Fastify API /health kontrolü... "
HEALTH_RESP=$(curl -s -w "\n%{http_code}" "${API_BASE}/health" || echo -e "\n000")
HTTP_CODE=$(echo "$HEALTH_RESP" | tail -n 1)
BODY=$(echo "$HEALTH_RESP" | head -n -1)

if [ "$HTTP_CODE" -eq 200 ] && echo "$BODY" | grep -q '"status":"OK"'; then
  echo -e "${GREEN}BAŞARILI (HTTP 200, status: OK)${NC}"
else
  echo -e "${RED}BAŞARISIZ (HTTP $HTTP_CODE)${NC}"
  FAILED_CHECKS=$((FAILED_CHECKS + 1))
fi

# 2. PostgreSQL SKIP LOCKED Kuyruk Durumu Denetimi (US-16)
echo -n "2. PostgreSQL FOR UPDATE SKIP LOCKED İş Kuyruğu Durumu... "
QUEUE_RESP=$(curl -s -w "\n%{http_code}" "${API_BASE}/api/v1/health/queue" || echo -e "\n000")
QUEUE_CODE=$(echo "$QUEUE_RESP" | tail -n 1)
QUEUE_BODY=$(echo "$QUEUE_RESP" | head -n -1)

if [ "$QUEUE_CODE" -eq 200 ]; then
  echo -e "${GREEN}BAŞARILI (HTTP 200)${NC}"
  echo -e "   ${CYAN}Kuyruk Metrikleri:${NC} $QUEUE_BODY"
else
  echo -e "${RED}BAŞARISIZ (HTTP $QUEUE_CODE)${NC}"
  FAILED_CHECKS=$((FAILED_CHECKS + 1))
fi

# 3. CPO Veri Kaynakları & Circuit Breaker Durumu Denetimi (US-18)
echo -n "3. CPO Veri Kaynakları Sağlığı ve Devre Kesici Durumu... "
SOURCES_RESP=$(curl -s -w "\n%{http_code}" "${API_BASE}/api/v1/health/sources" || echo -e "\n000")
SOURCES_CODE=$(echo "$SOURCES_RESP" | tail -n 1)
SOURCES_BODY=$(echo "$SOURCES_RESP" | head -n -1)

if [ "$SOURCES_CODE" -eq 200 ]; then
  echo -e "${GREEN}BAŞARILI (HTTP 200)${NC}"
  echo -e "   ${CYAN}Kaynak Tazelik Durumu:${NC} $SOURCES_BODY"
else
  echo -e "${RED}BAŞARISIZ (HTTP $SOURCES_CODE)${NC}"
  FAILED_CHECKS=$((FAILED_CHECKS + 1))
fi

# 4. GADM 4.1 Geocoding ve CBS Rotaları Denetimi (Sprint 4 Regresyon)
echo -n "4. GADM 4.1 CBS ve Geocoding Servisleri... "
GADM_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${API_BASE}/api/v1/gadm/provinces" || echo "000")
if [ "$GADM_STATUS" -eq 200 ]; then
  echo -e "${GREEN}BAŞARILI (HTTP 200)${NC}"
else
  echo -e "${YELLOW}UYARI (GADM rotası HTTP $GADM_STATUS döndü)${NC}"
fi

echo -e "\n${CYAN}===================================================================${NC}"
if [ $FAILED_CHECKS -eq 0 ]; then
  echo -e "${GREEN}🎉 Tüm Sprint 5 Asenkron Worker & Veri Tazeliği Denetimleri Başarılı!${NC}"
  exit 0
else
  echo -e "${RED}❌ $FAILED_CHECKS adet denetim başarısız oldu!${NC}"
  exit 1
fi
