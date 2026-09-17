
# elektriklioto.com — Nuxt 3 Frontend (Web Platformu)

Bu modül, `elektriklioto.com` Faz 1 interaktif harita ve filtreleme arayüzünü sunar.

## Özellikler
- **MapLibre GL İnteraktif Harita:** `<ClientOnly>` kapsülüyle 60 FPS akıcı harita deneyimi ve BBox sorgu döngüsü.
- **Sunucu & İstemci Kümeleme:** Düşük yakınlaştırmada küme daireleri, yüksek yakınlaştırmada tekil istasyon pinleri.
- **Tasarım Sistemi Uyumlu:** `tasarim_sistemi.md` token'larıyla tam uyumlu CSS ve Tailwind tanımları.
- **Sıfır Konum Saklama (KVKK):** Ham GPS koordinatları sunucuya gönderilmez; yalnızca in-memory işlenir.
- **Eksik Veri Modeli:** Faz 1 EPDK veri setinde bulunmayan alanlar için nötr gri rozet ve katkı çağrısı (CTA).
- **0ms FOUC:** SSR/SSG uyumlu tema enjeksiyonuyla gecikmesiz gece modu desteği.

## Kurulum ve Çalıştırma
```bash
# Bağımlılıkları kur
npm install

# Geliştirme sunucusunu başlat (http://localhost:3000)
npm run dev

# Testleri koştur
npm test

# Üretim için derle
npm run build
```
