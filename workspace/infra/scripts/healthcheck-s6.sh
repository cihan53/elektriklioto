
#!/usr/bin/env bash
# ==============================================================================
# elektriklioto.com - Sprint 6 Sağlık Denetimi: Mobil CI/CD ve Build Dağıtımı
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
MOBILE_DIR="${WORKSPACE_ROOT}/src/mobile"

echo -e "${CYAN}===================================================================${NC}"
echo -e "${CYAN}🩺 Sprint 6 Mobil CI/CD & Build Dağıtım Sağlık Denetimi 🩺${NC}"
echo -e "${CYAN}===================================================================${NC}"

FAILED_CHECKS=0

# 1. Mobil Dizin ve pubspec.yaml Denetimi
echo -n "1. Flutter mobil kod tabanı ve pubspec.yaml denetimi... "
if [ -d "$MOBILE_DIR" ] && [ -f "${MOBILE_DIR}/pubspec.yaml" ]; then
  APP_NAME=$(grep "^name:" "${MOBILE_DIR}/pubspec.yaml" | awk '{print $2}')
  APP_VER=$(grep "^version:" "${MOBILE_DIR}/pubspec.yaml" | awk '{print $2}')
  echo -e "${GREEN}BAŞARILI ($APP_NAME - v$APP_VER)${NC}"
else
  echo -e "${RED}BAŞARISIZ (Dizin veya pubspec eksik)${NC}"
  FAILED_CHECKS=$((FAILED_CHECKS + 1))
fi

# 2. Mobil Build Betikleri ve Çalıştırılabilirlik İzinleri
echo -n "2. Mobil Build Betikleri (Android & iOS) varlığı ve izinleri... "
if [ -x "${INFRA_DIR}/scripts/build-mobile-android.sh" ] && [ -x "${INFRA_DIR}/scripts/build-mobile-ios.sh" ]; then
  echo -e "${GREEN}BAŞARILI (Çalıştırılabilir)${NC}"
else
  echo -e "${RED}BAŞARISIZ (Betikler eksik veya çalıştırma izni yok)${NC}"
  FAILED_CHECKS=$((FAILED_CHECKS + 1))
fi

# 3. CI/CD Pipeline İş Akışı Yapılandırması
echo -n "3. Mobil CI/CD Pipeline (ci/mobile-ci.yml)... "
if [ -f "${INFRA_DIR}/ci/mobile-ci.yml" ]; then
  if grep -q "build-android:" "${INFRA_DIR}/ci/mobile-ci.yml" && grep -q "build-ios:" "${INFRA_DIR}/ci/mobile-ci.yml"; then
    echo -e "${GREEN}BAŞARILI (Android & iOS CI iş akışı tanımlı)${NC}"
  else
    echo -e "${RED}BAŞARISIZ (İş akışı içeriği eksik)${NC}"
    FAILED_CHECKS=$((FAILED_CHECKS + 1))
  fi
else
  echo -e "${RED}BAŞARISIZ (ci/mobile-ci.yml bulunamadı)${NC}"
  FAILED_CHECKS=$((FAILED_CHECKS + 1))
fi

# 4. Fastlane Otomasyon Yapılandırması (Appfile & Fastfile)
echo -n "4. Fastlane Dağıtım Otomasyonu (fastlane/)... "
if [ -f "${INFRA_DIR}/fastlane/Fastfile" ] && [ -f "${INFRA_DIR}/fastlane/Appfile" ]; then
  if grep -q "com.elektriklioto.app" "${INFRA_DIR}/fastlane/Appfile"; then
    echo -e "${GREEN}BAŞARILI (App ID: com.elektriklioto.app)${NC}"
  else
    echo -e "${YELLOW}UYARI (App ID doğrulanmadı)${NC}"
  fi
else
  echo -e "${RED}BAŞARISIZ (Fastlane dosyaları eksik)${NC}"
  FAILED_CHECKS=$((FAILED_CHECKS + 1))
fi

# 5. Dockerized Mobile Builder İmajı
echo -n "5. Dockerized Mobil Derleyici (docker/Dockerfile.mobile-builder)... "
if [ -f "${INFRA_DIR}/docker/Dockerfile.mobile-builder" ]; then
  if grep -q "FLUTTER_HOME" "${INFRA_DIR}/docker/Dockerfile.mobile-builder"; then
    echo -e "${GREEN}BAŞARILI (İzole Flutter/Android derleme imajı hazır)${NC}"
  else
    echo -e "${RED}BAŞARISIZ (Dockerfile içeriği eksik)${NC}"
    FAILED_CHECKS=$((FAILED_CHECKS + 1))
  fi
else
  echo -e "${RED}BAŞARISIZ (Dockerfile.mobile-builder eksik)${NC}"
  FAILED_CHECKS=$((FAILED_CHECKS + 1))
fi

# 6. Mobil Ortam Yapılandırma Şablonu (.env.mobile.example)
echo -n "6. Mobil Ortam Yapılandırması (env/.env.mobile.example)... "
if [ -f "${INFRA_DIR}/env/.env.mobile.example" ]; then
  if grep -q "API_BASE_URL" "${INFRA_DIR}/env/.env.mobile.example" && grep -q "MAPBOX_ACCESS_TOKEN" "${INFRA_DIR}/env/.env.mobile.example"; then
    echo -e "${GREEN}BAŞARILI (Tüm zorunlu değişkenler tanımlı)${NC}"
  else
    echo -e "${RED}BAŞARISIZ (Değişken tanımları eksik)${NC}"
    FAILED_CHECKS=$((FAILED_CHECKS + 1))
  fi
else
  echo -e "${RED}BAŞARISIZ (.env.mobile.example eksik)${NC}"
  FAILED_CHECKS=$((FAILED_CHECKS + 1))
fi

# 7. Yerel Flutter SDK Durumu ve Mimari Raporlama
echo -n "7. Yerel Flutter/Dart SDK Durumu... "
if command -v flutter >/dev/null 2>&1 && flutter --version >/dev/null 2>&1; then
  echo -e "${GREEN}ÇALIŞIYOR ($(flutter --version | head -n 1))${NC}"
else
  echo -e "${YELLOW}BOZUK (Exec format error — Dockerized build önerilir)${NC}"
fi

echo -e "\n${CYAN}===================================================================${NC}"
if [ $FAILED_CHECKS -eq 0 ]; then
  echo -e "${GREEN}🎉 Tüm Sprint 6 Mobil CI/CD & Build Dağıtım Denetimleri Başarılı!${NC}"
  exit 0
else
  echo -e "${RED}❌ $FAILED_CHECKS adet mobil denetim başarısız oldu!${NC}"
  exit 1
fi
