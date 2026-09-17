
# elektriklioto.com Mobile (iOS & Android)

elektriklioto.com Flutter tabanlı mobil istemci uygulaması.

## Mimari ve Özellikler
- **Tasarım Sistemi**: `tasarim_sistemi.md` token sabitleri (`AppColors`, `AppTypography`, `AppSpacing`, `AppRadius`, `AppElevation`, `AppTouchTarget`).
- **Sıfır Konum Saklama (KVKK)**: GPS koordinatları sunucuya gönderilmez, sadece bellek içi filtrelenir. Yakınlık kanıtı (HMAC-SHA256) cihazda hesaplanır (<50m).
- **Harita & Kümeleme**: BBox tabanlı MapLibre GL ve kümeleme desteği (300ms debounce).
- **Eksik Veri Modeli**: Operatör verisi bekleyen soket/güç/tarife bilgileri için nötr gri rozet ve `[+ Bilgi Ekle]` CTA (min 48x48 pt).
- **Çevrimdışı Önbellek**: Hive CE ile BBox istasyon sorguları ve favoriler yerel cihazda önbelleğe alınır.
- **CPO Derin Bağlantı**: Operatör uygulamalarına direkt yönlendirme, uygulama yüklü değilse panoya istasyon kodu kopyalama.
