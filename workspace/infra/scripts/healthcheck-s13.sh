
#!/usr/bin/env bash
# ==============================================================================
# elektriklioto.com - Sprint 13 Sağlık Denetimi (Healthcheck)
# Görev: [TALEP-014] Cron Senkronizasyon Scripti ve İstasyon Veri Doğrulaması
# ==============================================================================
set -euo pipefail

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INFRA_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
PROJECT_ROOT="$(cd "${INFRA_DIR}/../.." && pwd)"

echo -e "${CYAN}===================================================================${NC}"
echo -e "${CYAN}🩺 Sprint 13: TALEP-014 Cron Senkronizasyonu ve Veri Kalkanı Denetimi 🩺${NC}"
echo -e "${CYAN}===================================================================${NC}"

FAILED_CHECKS=0

# 1. Betiklerin Varlığı ve Çalıştırma İzinleri Denetimi
echo -n "1. Cron senkronizasyon ve ETL betiklerinin varlığı... "
CRON_SCRIPT="${PROJECT_ROOT}/server-scripts/cron_daily_sync.sh"
ETL_SCRIPT="${PROJECT_ROOT}/server-scripts/import_cpo_stations.py"

if [ -f "$CRON_SCRIPT" ] && [ -f "$ETL_SCRIPT" ]; then
  echo -e "${GREEN}BAŞARILI (Betikler mevcut)${NC}"
else
  echo -e "${RED}BAŞARISIZ (server-scripts altında betikler eksik)${NC}"
  FAILED_CHECKS=$((FAILED_CHECKS + 1))
fi

# 2. Python Sözdizimi ve Geriye Dönük Uyumluluk (Python 3.6+) Denetimi
echo -n "2. Python sözdizimi ve import_cpo_stations.py uyumluluk testi... "
if python3 -m py_compile "$ETL_SCRIPT" 2>/dev/null; then
  echo -e "${GREEN}BAŞARILI (Sözdizimi hatasız)${NC}"
else
  echo -e "${RED}BAŞARISIZ (Python sözdizim hatası)${NC}"
  FAILED_CHECKS=$((FAILED_CHECKS + 1))
fi

# 3. Sıfır-Kayıt Güvenlik Kalkanı (Zero-Record Guard) Testi
echo -n "3. Sıfır-kayıt güvenlik kalkanı (0 istasyon ezilme koruması)... "
ZERO_TEST_OUTPUT=$(python3 -c "
import sys
sys.path.insert(0, '${PROJECT_ROOT}/server-scripts')
import import_cpo_stations
try:
    import_cpo_stations.save_stations_atomically([])
except SystemExit as e:
    if e.code == 1:
        print('GUARD_TRIGGERED_OK')
" 2>/dev/null || true)

if echo "$ZERO_TEST_OUTPUT" | grep -q "GUARD_TRIGGERED_OK"; then
  echo -e "${GREEN}BAŞARILI (0 istasyon durumunda dosya ezilmiyor, koruma aktif)${NC}"
else
  echo -e "${RED}BAŞARISIZ (Güvenlik kalkanı tetiklenmedi)${NC}"
  FAILED_CHECKS=$((FAILED_CHECKS + 1))
fi

# 4. Tohum ve Güncel cpo_stations.json Veri Bütünlüğü Denetimi (>1000 İstasyon)
echo -n "4. cpo_stations.json veri bütünlüğü ve kayıt sayısı denetimi... "
DATA_FILE="${PROJECT_ROOT}/workspace/src/backend/src/data/cpo_stations.json"
COUNT=0
if [ -f "$DATA_FILE" ]; then
  COUNT=$(python3 -c "import json; d=json.load(open('${DATA_FILE}', encoding='utf-8')); print(len(d))" 2>/dev/null || echo "0")
fi

if [ "$COUNT" -ge 1000 ]; then
  echo -e "${GREEN}BAŞARILI (${COUNT} istasyon hazır, >1000)${NC}"
else
  echo -e "${RED}BAŞARISIZ (İstasyon sayısı yetersiz: ${COUNT})${NC}"
  FAILED_CHECKS=$((FAILED_CHECKS + 1))
fi

# 5. cron_daily_sync.sh Bash Sözdizimi Denetimi
echo -n "5. cron_daily_sync.sh Bash sözdizimi denetimi... "
if bash -n "$CRON_SCRIPT"; then
  echo -e "${GREEN}BAŞARILI (Bash sözdizimi geçerli)${NC}"
else
  echo -e "${RED}BAŞARISIZ (Bash sözdizim hatası)${NC}"
  FAILED_CHECKS=$((FAILED_CHECKS + 1))
fi

# 6. cPanel Dağıtım Arşivi Tohum Kontrolü (deploy.yml denetimi)
echo -n "6. GitHub Actions deploy.yml veri tohumu paketleme denetimi... "
DEPLOY_YML="${PROJECT_ROOT}/.github/workflows/deploy.yml"
if grep -q "server-scripts/" "$DEPLOY_YML" && grep -q "workspace/src/backend/src/data" "$DEPLOY_YML"; then
  echo -e "${GREEN}BAŞARILI (Veri dizinleri dağıtım arşivine dahil)${NC}"
else
  echo -e "${RED}BAŞARISIZ (deploy.yml içinde veri dizini eksik)${NC}"
  FAILED_CHECKS=$((FAILED_CHECKS + 1))
fi

echo -e "${CYAN}-------------------------------------------------------------------${NC}"
if [ $FAILED_CHECKS -eq 0 ]; then
  echo -e "${GREEN}🎉 TALEP-014 S13 Sağlık Denetimi Başarıyla Tamamlandı! Sıfır hata.${NC}"
  exit 0
else
  echo -e "${RED}❌ TALEP-014 S13 Sağlık Denetiminde ${FAILED_CHECKS} adet hata bulundu!${NC}"
  exit 1
fi
