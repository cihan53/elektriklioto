# Paket Seçim Raporu — elektriklioto.com (Faz 1)

> Sürüm: 1.0 · Tarih: 2026-09-06 · Sahip: Tech Scout
> Girdi: `proje_kapsami.md`, `teknoloji_stack_karari.md`, `teknik_mimari_dokumani.md`, `backlog.md`, `ortam_raporu.md`.
> Karar kuralı: **varsayılan tercih hazır pakettir.** "KENDİMİZ YAZ" yalnızca (a) alan-özgü iş kuralı, (b) uygun bakımlı paket yok, (c) paketin getirdiği bağımlılık/lisans yükü faydayı aşıyorsa seçilir.
> Sürümler 2026-09-06 tarihinde npm registry `latest` ve pub.dev API'sinden **doğrudan okunmuştur**. Yayın tarihi yalnızca pub.dev paketleri için API'den alınmıştır; npm paketlerinin tekil yayın tarihleri sabitleme (`pnpm add -E`) adımında `pnpm view <pkg> time` ile teyit edilecektir.

---

## 1. Backend (Node 22.21.0 / TypeScript)

| Yetenek | Karar | Lisans | Bakım | Ağırlık |
|---|---|---|---|---|
| HTTP framework | **PAKET KULLAN: fastify 5.12.3** *(zorunlu)* | MIT | aktif, 5.x hattı | 15 doğrudan bağımlılık |
| Şema + doğrulama | **PAKET KULLAN: zod 4.5.4** | MIT | aktif | 0 bağımlılık |
| Zod→Fastify→OpenAPI köprüsü | **PAKET KULLAN: fastify-type-provider-zod 7.0.0** | MIT | aktif | peer: zod ≥4.1.5, fastify ^5.5.0, @fastify/swagger ≥9.5.1 |
| OpenAPI 3.1 üretimi | **PAKET KULLAN: @fastify/swagger 9.8.1** | MIT | Fastify org | hafif |
| DB sürücüsü | **PAKET KULLAN: postgres 3.4.9 (postgres.js)** | Unlicense | aktif | **0 bağımlılık** |
| Sorgu/tip katmanı | **PAKET KULLAN: drizzle-orm 0.45.2** | Apache-2.0 | aktif, sık sürüm | 0 çalışma-zamanı bağımlılığı |
| Migration koşucusu | **PAKET KULLAN: node-pg-migrate 9.0.0** | MIT | aktif | hafif — bkz. §5.1 |
| Şema drift kontrolü | **PAKET KULLAN: drizzle-kit 0.31.10** (yalnızca `generate`/`check`) | MIT | aktif | dev-only |
| İş kuyruğu | **PAKET KULLAN: pg-boss 12.30.0** | MIT | aktif | 3 bağımlılık (`pg`, `cron-parser`, `serialize-error`) — bkz. §5.2 |
| Hız sınırlama (gelen) | **PAKET KULLAN: @fastify/rate-limit 11.2.0** | MIT | Fastify org | hafif |
| Süreç içi önbellek | **PAKET KULLAN: lru-cache 11.5.2** | BlueOak-1.0.0 | aktif | 0 bağımlılık |
| Dış HTTP istemcisi | **PAKET YOK — Node yerleşik `undici`** | MIT (Node) | çekirdek | 0 |
| Yapılandırılmış log | **PAKET YOK — Fastify yerleşik `pino`** | MIT | çekirdek | zaten fastify bağımlılığı |
| Modül sınırı zorlama | **PAKET KULLAN: dependency-cruiser 18.2.0** | MIT | aktif | dev-only |
| Test | **PAKET KULLAN: vitest 5.0.0** | MIT | aktif | dev-only |
| Yük testi | **PAKET KULLAN: autocannon 8.0.0** | MIT | aktif (Fastify ekibi) | dev-only, **k6 kurulumunu gereksiz kılar** |
| OpenAPI lint / breaking-change | **PAKET KULLAN: @stoplight/spectral-cli 6.16.3** | Apache-2.0 | aktif | dev-only |

`lru-cache` **BlueOak-1.0.0** lisanslıdır; OSI onaylı ve izin verici (permissive) olsa da bazı kurumsal lisans tarayıcıları "bilinmeyen" işaretler — SPDX beyaz listesine elle eklenmelidir. `postgres.js` **Unlicense** (kamu malı) olup atıf gerektirmez.

---

## 2. Web (Nuxt 3 — zorunlu)

| Yetenek | Karar | Lisans | Not |
|---|---|---|---|
| Çatı | **PAKET KULLAN: nuxt 3.21.11** *(zorunlu; `3x` dist-tag'inin son sürümü)* | MIT | `latest` etiketi 4.5.2'dir; 3.x hattı ayrı etiketten sabitlenir |
| Harita | **PAKET KULLAN: maplibre-gl 6.7.0** | BSD-3-Clause | ~1 MB gzip → yalnızca dinamik import |
| Sitemap | **PAKET KULLAN: @nuxtjs/sitemap 7.x hattı** | MIT | 8.5.0 `@nuxt/kit ^4.5.2` bağımlıdır → **Nuxt 3 ile kurulmaz** |
| JSON-LD / Schema.org | **PAKET KULLAN: nuxt-schema-org, Nuxt 3 uyumlu son minor** | MIT | 6.3.1 Nuxt 4 hattıdır |
| Stil | **PAKET KULLAN: tailwindcss 4.3.3** + `@tailwindcss/vite` | MIT | `@nuxtjs/tailwindcss` modülü v3 hattına bağlıdır, kullanılmaz |
| API istemci tipleri | **PAKET KULLAN: openapi-typescript 7.13.0** | MIT | üretim çıktısı depoya işlenir |
| HTTP çağrısı | **PAKET YOK — Nuxt yerleşik `ofetch`** | MIT | ek bağımlılık yok |

> **Varsayım:** `@nuxtjs/sitemap` ve `nuxt-schema-org` için Nuxt 3 uyumlu son minor sürümler kurulum sırasında `pnpm view <pkg> versions` + `@nuxt/kit` peer aralığı okunarak sabitlenecektir; bu iki modülün Nuxt 3 desteği yalnızca bakım modundadır.

---

## 3. Mobil (Flutter 3.27.1 / Dart 3.6.0 — zorunlu pin)

Ölçülen Dart 3.6.0, ekosistemin güncel hattının **gerisindedir**. Aşağıdaki sürümler bu pin'e göre seçilmiştir:

| Yetenek | Karar (bu pin ile kurulabilen) | Güncel sürüm | Engel |
|---|---|---|---|
| Harita | **PAKET KULLAN: maplibre_gl 0.25.0** (BSD-3) | 0.27.0 (2026-08-19) | 0.26.0+ Dart ≥3.7, 0.26.2+ Flutter ≥3.29 |
| Durum yönetimi | **PAKET KULLAN: flutter_riverpod 2.6.1** (MIT, 2024-10-22) | 3.4.3 (2026-09-03) | 3.x Dart ^3.12 ister |
| Model/kod üretimi | **PAKET KULLAN: freezed 2.5.x + json_serializable** (MIT) | freezed 4.0.1 (2026-08-29) | 4.x Dart ≥3.13 ister |
| HTTP | **PAKET KULLAN: dio 5.11.1** (MIT, 2026-09-04) | — | Dart ≥2.18 → uyumlu ✅ |
| Yerel önbellek | **PAKET KULLAN: hive_ce 2.19.3** (Apache-2.0, 2026-02-03) | — | Dart ^3.4 → uyumlu ✅ |
| Push | **PAKET KULLAN: firebase_messaging 16.6.0** (BSD-3, 2026-08-24) | — | Dart ^3.6, Flutter ≥3.27.0 → **sınırda uyumlu** ✅ |
| Güvenli depolama | **PAKET KULLAN: flutter_secure_storage** (BSD-3) | — | sürüm kurulumda sabitlenir |
| Lint | **PAKET KULLAN: very_good_analysis** (MIT) | — | Dart 3.6 uyumlu son majör seçilir |
| Dart API istemcisi | **PAKET KULLAN: @openapitools/openapi-generator-cli 2.41.0** (Apache-2.0) | — | 15 npm bağımlılığı + ~30 MB jar indirir; **java 17.0.17 ölçülü** ✅ |

> **RİSK — Flutter sürüm pin'i ekosistem borcu üretiyor:** `maplibre_gl`, `riverpod` ve `freezed` en güncel hatlarından 1–2 majör geride sabitlenmek zorundadır; `firebase_messaging` alt sınırı tam olarak Flutter 3.27.0'dır, yani bir sonraki minor sürümünde pin dışına çıkma olasılığı yüksektir. Flutter 3.29+ hattına geçilmesi bu üç sabitlemeyi de kaldırır. **Karar CTO'ya aittir**; bu rapor her iki durumda da kurulabilir sürüm setini vermiştir.

---

## 4. KENDİMİZ YAZ kararları (gerekçeli)

| Yetenek | Gerekçe (tek cümle) | Tahmini boyut |
|---|---|---|
| **Entity resolution / `station_uid`** | Eşleştirme kuralı (75 m + operatör + soket imzası Jaccard ≥ 0.6) alan-özgüdür; genel amaçlı record-linkage kütüphaneleri PostGIS'i kullanmaz ve eşik/kuyruk davranışını dayatamaz. | ~250 satır + SQL |
| **Connector sözleşmesi (`fetch`/`normalize`)** | Her CPO kaynağı biriciktir; soyutlama zaten 20 satırlık bir arayüzdür, paket getirmek fayda üretmez. | ~50 satır + kaynak başına adaptör |
| **Deep-link şema motoru** | Operatör URL şablonları backend konfigürasyonundan gelir; ihtiyaç basit şablon ikamesi + fallback zinciridir. | ~120 satır |
| **`proximity_proof` HMAC + nonce** | `node:crypto` yeterlidir; kriptografi paketi eklemek saldırı yüzeyi büyütür. | ~60 satır |
| **Giden istek token-bucket / backoff** | `undici.Agent` eşzamanlılık sınırını, `pg-boss` tekrar denemeyi zaten verir; kalan kota mantığı `source_policy` tablosuna bağlı ~40 satırdır. | ~40 satır |
| **Viewport kümeleme** | `ST_SnapToGrid` ile veritabanında yapılır; istemci tarafı kümeleme paketi gereksizdir. | SQL |

---

## 5. Çözülmesi gereken iki tutarsızlık

### 5.1 Migration aracı — `teknoloji_stack_karari.md` ↔ `teknik_mimari_dokumani.md` çelişiyor

Stack dokümanı **Drizzle Kit**, mimari dokümanı ve `backlog.md` US-I2/AC1 **node-pg-migrate** diyor. Ayırt edici teknik gerçek: **`drizzle-kit` geri alma (down) migration'ı üretmez**; US-I2/AC1 "`down` doğrulanır" kabul kriterini karşılayamaz.
**Karar: PAKET KULLAN `node-pg-migrate` 9.0.0** (up/down, CI'da boş şema üzerinde koşum) migration koşucusu olarak; `drizzle-orm` sorgu/tip katmanı, `drizzle-kit` yalnızca `check` ile şema-kod drift kapısı olarak kalır. Bu, iki dokümanı da tek yorumda birleştirir.

### 5.2 İş kuyruğu — kendi `SKIP LOCKED`'ımız yerine `pg-boss`

`pg-boss` 12.30.0 zaten PostgreSQL üzerinde `FOR UPDATE SKIP LOCKED` ile çalışır; kısıttaki "ek broker yok / tek altyapı bileşeni PostgreSQL" kuralını ihlal etmez ve exponential backoff, dead-letter, cron zamanlama, tekil-iş (singleton) kilidi hazır gelir — bunlar US-F2 ve US-F1/AC3'ün tam kapsamıdır.
İki uyarı: (1) `pg-boss` kendi şemasını başlangıçta otomatik oluşturur → `migrate: false` ile açılıp şema sürümlenmiş migration'a taşınmalıdır (zorunlu göç kısıtı); (2) `pg` sürücüsünü getirir, yani worker sürecinde `postgres.js` yanında ikinci bir sürücü bulunur.
**Karar: PAKET KULLAN `pg-boss` 12.30.0**, `migrate:false` + versiyonlu şema ile. Bu iki uyarı kurulumda pratik çıkmazsa geri dönüş yolu kendi `job_queue` tablomuzdur (~200 satır) ve mimari zaten bunu tarif etmiştir.

---

## 6. Lisans ve tedarik özeti

- Tüm seçimler izin verici (MIT / Apache-2.0 / BSD-3-Clause / Unlicense / BlueOak-1.0.0). **Copyleft (GPL/AGPL) paket yoktur.** BSD-3 ve Apache-2.0 paketleri için uygulama içi "Açık Kaynak Lisansları" ekranı zorunludur (MapLibre atıf şartı dâhil).
- **KURULUM GEREKİYOR:** harita karo (tile) sağlayıcı API anahtarı — MapLibre açık kaynaktır, karo kaynağı değildir.
- **KURULUM GEREKİYOR:** APNs sertifikası + Firebase proje kimlik bilgileri; sunucu tarafı gönderim için `firebase-admin` (Apache-2.0) eklenecek, sürümü kurulumda sabitlenecektir.
- **k6 kurulumu gereksizdir**: `autocannon` 8.0.0 pnpm bağımlılığı olarak p95 ölçümünü karşılar.
- **OpenAPI Generator**: npm dağıtımı (`@openapitools/openapi-generator-cli` 2.41.0) seçilmiştir; jar'ı kendi indirir, ölçülü `java 17.0.17` üzerinde koşar, ayrı elle kurulum adımı kalmaz.

## 7. Sabitleme politikası

Tüm npm bağımlılıkları `pnpm add -E` ile **tam sürüm** olarak, tüm Dart bağımlılıkları `pubspec.yaml`'da tam sürümle yazılır ve `pubspec.lock` depoya işlenir. Sürüm yükseltmeleri yalnızca haftalık toplu PR ile, CI'daki sözleşme (`openapi.json` diff), bench (p95 < 40 ms) ve `flutter analyze` kapılarından geçerek yapılır.
