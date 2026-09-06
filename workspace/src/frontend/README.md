
# elektriklioto.com — Web (Nuxt 3)

Sprint S1 görev kapsamı: Nuxt 3 iskeleti, client-only MapLibre bileşeni,
`openapi-typescript` ile üretilen API istemci tipleri, bbox tabanlı pin/küme çizimi.

## Çalıştırma

```
pnpm install
pnpm dev
```

## API istemcisi üretimi

```
pnpm generate:api
```

Bu komut `packages/contracts/openapi.json` şemasını okuyup `types/api.d.ts` dosyasını
yeniden üretir (bkz. `teknik_mimari_dokumani.md` §5.2). Üretilen dosya elle düzenlenmez;
CI'da `git diff --exit-code` ile drift kontrol edilir (AC-32).

> **Varsayım:** Bu teslim `workspace/src/frontend/` yoluna yapılmıştır; kanonik depo
> yapısında (`teknik_mimari_dokumani.md` §3) bu paket `apps/web/` altında yer alır.
> `generate:api` betiğindeki göreli yol (`../../../packages/contracts/openapi.json`)
> depo bu yapıya taşındığında doğrudan çalışır; farklı bir yerleşimde yol güncellenmelidir.

> **Varsayım:** Harita karo servisi için henüz bir API anahtarı sağlanmadığından
> (bkz. `paket_secim_raporu.md` §6), varsayılan `mapStyleUrl` anahtarsız açık kaynaklı
> bir stile (`tiles.openfreemap.org`) işaret eder. Gerçek sağlayıcı belirlendiğinde
> `NUXT_PUBLIC_MAP_STYLE_URL` ortam değişkeniyle değiştirilir.

## Kapsam dışı (bu görev için)

Filtreleme arayüzü, istasyon detay ekranı, SEO katalog sayfaları (ISR/sitemap),
web→mobil köprüsü ve `/availability` delta akışı ayrı sprint görevlerindedir.
