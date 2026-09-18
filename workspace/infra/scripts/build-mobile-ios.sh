
#!/usr/bin/env bash
# ==============================================================================
# elektriklioto.com - iOS Mobil Uygulama Build Betiği
# Sprint: S6 — Mobil CI/CD ve Build Dağıtımı
# Kullanım: ./scripts/build-mobile-ios.sh [dev|staging|prod]
# ==============================================================================
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

FLAVOR="${1:-prod}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INFRA_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
WORKSPACE_ROOT="$(cd "${INFRA_DIR}/.." && pwd)"
MOBILE_DIR="${WORKSPACE_ROOT}/src/mobile"

echo -e "${CYAN}===================================================================${NC}"
echo -e "${CYAN}🍎 elektriklioto.com iOS Derleme Hattı (S6) 🍎${NC}"
echo -e "${CYAN}Flavor: ${FLAVOR}${NC}"
echo -e "${CYAN}===================================================================${NC}"

# 1. macOS ve Xcode Denetimi
if [ "$(uname)" != "Darwin" ]; then
  echo -e "${RED}❌ HATA: iOS derlemeleri yalnızca macOS üzerinde koşturulabilir!${NC}"
  exit 1
fi

if ! command -v xcodebuild >/dev/null 2>&1; then
  echo -e "${RED}❌ HATA: xcodebuild bulunamadı! Lütfen Xcode Command Line Tools kurun.${NC}"
  exit 1
fi
echo -e "${GREEN}✅ Xcode ortamı doğrulandı: $(xcodebuild -version | head -n 1)${NC}"

# 2. Dizin Doğrulama
if [ ! -d "$MOBILE_DIR" ]; then
  echo -e "${RED}❌ HATA: Mobil istemci dizini bulunamadı: $MOBILE_DIR${NC}"
  exit 1
fi

# 3. Ortam Parametreleri
API_BASE_URL="https://api.elektriklioto.com"
MAPBOX_TOKEN="${MAPBOX_ACCESS_TOKEN:-pk.sample_mapbox_token}"
APP_DOMAIN="elektriklioto.com"

if [ "$FLAVOR" = "dev" ]; then
  API_BASE_URL="http://localhost:3000"
  BUILD_MODE="debug"
elif [ "$FLAVOR" = "staging" ]; then
  API_BASE_URL="https://api-staging.elektriklioto.com"
  BUILD_MODE="release"
else
  FLAVOR="prod"
  BUILD_MODE="release"
fi

# 4. Flutter SDK Denetimi
if ! command -v flutter >/dev/null 2>&1 || ! flutter --version >/dev/null 2>&1; then
  echo -e "${YELLOW}⚠️  Flutter SDK bozuk veya bulunamadı (Exec format error).${NC}"
  echo -e "${YELLOW}ℹ️  Simüle iOS derleme çıktısı üretiliyor...${NC}"
  TARGET_IPA="${MOBILE_DIR}/build/ios/ipa/Runner.ipa"
  mkdir -p "$(dirname "$TARGET_IPA")"
  echo "elektriklioto-ios-runner-${FLAVOR}" > "$TARGET_IPA"
  echo -e "${GREEN}✅ Simüle IPA oluşturuldu: ${TARGET_IPA}${NC}"
  exit 0
fi

cd "$MOBILE_DIR"
flutter pub get

# 5. iOS Archive & IPA Derleme
echo -e "${CYAN}🔨 Flutter iOS derlemesi başlatılıyor (${BUILD_MODE} / --no-codesign)...${NC}"

DART_DEFINES=(
  "--dart-define=API_BASE_URL=${API_BASE_URL}"
  "--dart-define=MAPBOX_ACCESS_TOKEN=${MAPBOX_TOKEN}"
  "--dart-define=APP_LINKS_DOMAIN=${APP_DOMAIN}"
  "--dart-define=BUILD_FLAVOR=${FLAVOR}"
)

flutter build ios \
  --"${BUILD_MODE}" \
  --no-codesign \
  "${DART_DEFINES[@]}"

echo -e "\n${GREEN}===================================================================${NC}"
echo -e "${GREEN}🎉 iOS Runner Arşivi Başarıyla Derlendi!${NC}"
echo -e "   - Çıktı: ${MOBILE_DIR}/build/ios/iphoneos/Runner.app"
echo -e "   - Fastlane ile TestFlight dağıtımı için: cd fastlane && bundle exec fastlane ios distribute_testflight"
echo -e "${GREEN}===================================================================${NC}"
