
#!/usr/bin/env bash
# ==============================================================================
# elektriklioto.com - Sprint 2 Sağlık Denetimi: Spatial BBox ve Kümeleme API'si
# ==============================================================================
set -euo pipefail

API_BASE="${API_BASE:-http://localhost:3000}"

echo "🩺 [S2 Healthcheck] BBox Spatial ve Kümeleme API denetleniyor..."

# 1. BBox Sorgusu (İstanbul Kadıköy Örneği)
STATUS_CODE=$(curl -s -o /dev/null -w "%{http_code}" "${API_BASE}/api/v1/stations?bbox=29.0,40.9,29.1,41.0&zoom=12" || true)

if [ "$STATUS_CODE" -eq 200 ]; then
  echo "✅ BBox Spatial İstasyon Sorgusu Başarılı (HTTP 200)"
else
  echo "⚠️  BBox Sorgusu HTTP $STATUS_CODE döndü (API başlatılmamış olabilir)."
fi

# 2. Düşük Zoom Kümeleme Sorgusu (zoom < 11)
STATUS_CODE_CLUSTER=$(curl -s -o /dev/null -w "%{http_code}" "${API_BASE}/api/v1/stations?bbox=26.0,36.0,44.0,42.0&zoom=8" || true)

if [ "$STATUS_CODE_CLUSTER" -eq 200 ]; then
  echo "✅ Düşük Zoom Sunucu Tarafı Kümeleme Başarılı (HTTP 200)"
else
  echo "⚠️  Kümeleme Sorgusu HTTP $STATUS_CODE_CLUSTER döndü."
fi
