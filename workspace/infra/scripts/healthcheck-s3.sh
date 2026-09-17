
#!/usr/bin/env bash
# ==============================================================================
# elektriklioto.com - Sprint 3 Sağlık Denetimi: Route Bridge & Operatörler
# ==============================================================================
set -euo pipefail

API_BASE="${API_BASE:-http://localhost:3000}"

echo "🩺 [S3 Healthcheck] Route Bridge, Deep-Link ve Operatör Modülleri..."

# 1. Operatör Sözlüğü
OP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${API_BASE}/api/v1/operators" || true)
if [ "$OP_STATUS" -eq 200 ]; then
  echo "✅ Operatör Marka Sözlüğü API Aktif (HTTP 200)"
else
  echo "⚠️  Operatör API HTTP $OP_STATUS döndü."
fi

# 2. Kök Sağlık Durumu
HEALTH_STATUS=$(curl -s "${API_BASE}/health" | grep -o '"status":"OK"' || true)
if [ -n "$HEALTH_STATUS" ]; then
  echo "✅ API /health Başarılı (status: OK)"
else
  echo "⚠️  API /health beklenen yanıtı vermedi."
fi
