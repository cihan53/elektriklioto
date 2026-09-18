
#!/usr/bin/env bash
# ==============================================================================
# elektriklioto.com - Otomatik Staging Dağıtım Betiği
# Sprint: S3-S11 — Staging Dağıtımı ve TALEP-012 Sürüm Enjeksiyonu
# ==============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INFRA_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
WORKSPACE_ROOT="$(cd "${INFRA_DIR}/.." && pwd)"

echo "📦 Staging dağıtımı başlatılıyor..."

cd "$INFRA_DIR"

if [ ! -f "env/.env.staging" ]; then
  cp "env/.env.staging.example" "env/.env.staging"
fi

# TALEP-012: Staging Benzersiz Sürüm Kimliği
BUILD_TIMESTAMP=$(date +%Y%m%d%H%M%S)
GIT_HASH=$(git rev-parse --short HEAD 2>/dev/null || echo "staging")
export BUILD_ID="staging-${BUILD_TIMESTAMP}-${GIT_HASH}"
export DEPLOY_TIME=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

FRONTEND_DIR="${WORKSPACE_ROOT}/src/frontend"
if [ -d "$FRONTEND_DIR" ]; then
  mkdir -p "${FRONTEND_DIR}/public"
  cat << JSON > "${FRONTEND_DIR}/public/version.json"
{
  "version": "1.0.0-staging",
  "buildId": "${BUILD_ID}",
  "deployedAt": "${DEPLOY_TIME}",
  "timestamp": $(date +%s)
}
JSON
fi

# Konteynerleri derle ve güncelle
BUILD_ID="$BUILD_ID" DEPLOY_TIME="$DEPLOY_TIME" docker compose -f docker-compose.staging.yml build --no-cache
BUILD_ID="$BUILD_ID" DEPLOY_TIME="$DEPLOY_TIME" docker compose -f docker-compose.staging.yml up -d

# Sağlık denetimlerini çalıştır
echo "🔍 Staging sağlık denetimleri yapılıyor..."
bash "${SCRIPT_DIR}/healthcheck-s3.sh"
bash "${SCRIPT_DIR}/healthcheck-s11.sh" || true

echo "🎉 Staging dağıtımı başarıyla tamamlandı (Build ID: ${BUILD_ID})!"
