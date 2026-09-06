# Teknoloji Stack Kararı

> Bu doküman `elektriklioto.com` Faz 1 için bağlayıcı teknoloji seçimlerini içerir. Kısıtlar bölümündeki `(zorunlu)` kararlar tartışılmaz; burada yalnızca onların **üstüne** kurulan seçimler gerekçelendirilir. Her seçim `workspace/docs/ortam_raporu.md` içindeki **ölçülmüş** envantere karşı doğrulanmıştır.

---

## 1. Karar Özeti

| Katman | Karar | Sürüm / Not | Ortam Doğrulaması |
|---|---|---|---|
| Backend dili | Node.js + TypeScript | node v22.21.0, TS 5.x | ✅ ölçüldü |
| Backend framework | Fastify **(zorunlu)** | Fastify 5.x | ✅ node üzerinde |
| Paket yöneticisi | pnpm workspace (monorepo) | pnpm 10.20.0 | ✅ ölçüldü |
| Veritabanı | PostgreSQL + PostGIS **(zorunlu)** | `postgis/postgis:16-3.4` | ✅ docker 29.8.0 |
| DB erişim katmanı | **Drizzle ORM** + `postgres.js` sürücüsü | raw SQL kaçış yolu açık | ✅ node paketi |
| Migration | **Drizzle Kit** (SQL dosyaları depoda) | `drizzle-kit generate` | ✅ node paketi |
| İş kuyruğu | PostgreSQL `FOR UPDATE SKIP LOCKED` | ek broker yok | ✅ ek araç gerekmez |
| Web | Nuxt 3 / Vue 3 **(zorunlu)** | Nitro `node-server` preset | ✅ node üzerinde |
| Mobil | Flutter **(zorunlu)** | 3.27.1 / Dart 3.6.0, fvm 3.2.1 ile sabit | ✅ ölçüldü |
| Mobil durum yönetimi | Riverpod + `freezed` | kod üretimi `build_runner` | ✅ dart üzerinde |
| Mobil yerel önbellek | Hive (kutu bazlı) | çevrimdışı pin cache | ✅ dart üzerinde |
| API sözleşmesi | OpenAPI 3.1 (Fastify şemadan üretir) | Zod → JSON Schema → OpenAPI | ✅ node paketi |
| İstemci kod üretimi | `openapi-typescript` (web) + `openapi-generator` **KURULUM GEREKİYOR: Java tabanlı OpenAPI generator jar** (Dart) | java 17.0.17 mevcut, jar indirilecek | ⚠️ jar depoda değil |
| Test | Vitest (backend/web), `flutter test` (mobil), Testcontainers-free `docker compose` test DB | — | ✅ ölçüldü |
| CI | GitHub Actions + aynı `docker-compose.yml` | — | dış servis |
| iOS/Android derleme | Xcode 26.4.1, adb 1.0.41 | ✅ ölçüldü | ✅ |

---

## 2. Backend Kararları

**Dil ve çalışma zamanı: TypeScript, `strict: true`, ESM, Node 22 native `node:test` yerine Vitest.**
Gerekçe: Zorunlu Fastify + Node kısıtı verilmiş; TS'nin `strict` modu, OpenAPI şemasından üretilen DTO'larla derleme zamanı uyum sağlar. *Alternatifler:* Go/Rust (ortamda var ama Fastify zorunluluğuyla çelişir) elenmiştir.

**Veri erişimi: Drizzle ORM + `postgres.js`.**
Gerekçe: PostGIS coğrafi tipleri (`geography(Point,4326)`) ve `ST_MakeEnvelope`, `ST_DWithin` çağrıları ORM soyutlamasını kırmadan `sql\`\`` şablonuyla yazılabilir; Drizzle şemayı TypeScript'te tutup migration'ı **SQL dosyası** olarak üretir; bu, "yalnızca sürümlenmiş migration" zorunluluğuyla birebir uyumludur. *Alternatifler:* Prisma (PostGIS tipleri için `Unsupported` alan zorunluluğu ve ham SQL kaçışı zayıf), TypeORM (bakım riski), saf `pg` + elle SQL (tip güvenliği kaybı) elenmiştir.

**Doğrulama ve şema tekliği: Zod tek kaynak.**
Her route'un request/response şeması Zod ile tanımlanır, `fastify-type-provider-zod` ile hem çalışma zamanı doğrulaması hem `@fastify/swagger` üzerinden OpenAPI 3.1 çıktısı aynı tanımdan üretilir. Elle yazılmış OpenAPI YAML'ı yoktur — kapsamdaki "tek kaynak şema" kuralının uygulanma biçimi budur.

**Süreç ayrımı: `apps/api` ve `apps/worker` iki ayrı Node süreci, tek repo, tek imaj, farklı entrypoint.**
Kısıtta worker'ın API içinde koşamayacağı belirtilmiştir. Kuyruk tablosu `jobs` üzerinde `SELECT ... FOR UPDATE SKIP LOCKED` ile çekilir; zamanlama `pg_cron` yerine worker içi kendi tick döngüsüyle yapılır (uzantı bağımlılığı eklememek için).

**HTTP istemci ve kazıma katmanı: `undici` (Node yerleşik) + `p-retry` + token-bucket rate limiter.**
Gerekçe: Ek bağımlılık yüzeyi düşük, exponential backoff ve per-host eşzamanlılık sınırı `undici.Agent` ile doğrudan kurulur. Proxy rotasyonu `undici.ProxyAgent` üzerinden konfigürasyonla yönetilir.
> **Varsayım:** Faz 1'de proxy havuzu yoktur; kod arayüzü hazır bırakılır, gerçek proxy sağlayıcı tedarik edilene kadar doğrudan çıkış kullanılır.

**Önbellek: Redis yok.** Sıcak viewport sorguları için Fastify süreç içi LRU (`lru-cache`) + `Cache-Control`/`ETag` başlıkları. Kısıttaki "ilk sürümde Redis eklenmez" kuralının sonucu; çok örnekli dağıtımda tutarsızlık kabul edilebilir çünkü veri zaten <15 dk tazelik hedefiyle çalışır.

---

## 3. Web Kararları (Nuxt — zorunlu)

- **Render modu:** Hibrit. İstasyon katalog/SEO rotaları (`/[il]/[ilce]/sarj-istasyonlari`, `/[operator]/istasyon-[uid]`) Nitro `routeRules` ile ISR (`swr: 900`); harita sayfası `ssr: false` bileşen olarak hydrate edilir. Gerekçe: Lighthouse SEO > 90 ve FCP < 1.2 s hedefi ISR olmadan tutturulamaz.
- **Harita kütüphanesi:** MapLibre GL JS (web) — vektör karo, kümeleme yerleşik, sağlayıcıdan bağımsız.
  **KURULUM GEREKİYOR: harita karo (tile) sağlayıcı API anahtarı** — kütüphane açık kaynak olsa da karo kaynağı dış servistir, ortam envanterinde ölçülemez.
- **Stil:** Tailwind CSS + minimal bileşen katmanı. *Alternatif:* Vuetify/Nuxt UI (bundle ağırlığı FCP bütçesini zorlar) elenmiştir.
- **API istemcisi:** `openapi-typescript` ile üretilen tipler + `ofetch`. Elle DTO yazımı CI'da yasaktır.
- **Dağıtım hedefi:** Nitro `node-server` preset; Docker imajı içinde çalışır. Vercel/Netlify'a özgü preset seçilmez ki barındırma kararı bağlayıcı olmasın.

---

## 4. Mobil Kararları (Flutter — zorunlu)

- **Sürüm sabitleme:** `.fvmrc` → `3.27.1`, Dart 3.6.0. Ölçülen ortamla birebir; CI aynı sürümü kullanır.
- **Durum yönetimi:** Riverpod 2 + `freezed` + `json_serializable`. Gerekçe: Test edilebilirlik ve derleme zamanı bağımlılık grafiği; `BuildContext` bağımsız provider'lar harita/filtre durumunu izole eder. *Alternatif:* Bloc (boilerplate maliyeti), GetX (mimari disiplin zayıflığı) elenmiştir.
- **Harita:** `maplibre_gl` (native GL rendering). Gerekçe: Web ile aynı stil/karo sağlayıcısı ve aynı kümeleme mantığı; 60 FPS hedefi platform kanalı üzerinden native render ile karşılanır. *Alternatif:* `google_maps_flutter` (sağlayıcı kilidi + ayrı stil hattı) elenmiştir.
- **Coğrafi veri işleme:** GeoJSON parse ve pin dönüşümü `compute()`/`Isolate` içinde; UI thread'e yalnızca hazır model listesi döner. Kısıttaki 60 FPS bütçesinin uygulanma biçimi budur.
- **Yerel depolama:** Hive (istasyon pin cache, favoriler, cihaz token'ı). Hassas token `flutter_secure_storage` içinde tutulur. Konum verisi **hiçbir koşulda** diske yazılmaz — zorunlu KVKK kısıtı.
- **HTTP:** `dio` + interceptor (retry, ETag, `?since=` delta). Üretilen Dart DTO'ları ile birlikte kullanılır.
- **Push:** `firebase_messaging` (FCM) / APNs.
  **KURULUM GEREKİYOR: APNs sertifikası ve Firebase proje kimlik bilgileri.** Tedarik edilene kadar bildirimler uygulama içi liste ile sınırlıdır.

---

## 5. Sözleşme ve Kod Üretimi Zinciri

```
Zod şemaları (apps/api)
   └─> @fastify/swagger → openapi.json (build artefaktı, repoya işlenir)
         ├─> openapi-typescript  → apps/web/types/api.d.ts
         └─> openapi-generator (dart-dio) → apps/mobile/lib/api/**
```

CI adımı: `openapi.json` yeniden üretilir, `git diff --exit-code` ile karşılaştırılır; fark varsa build kırılır. Ek olarak `spectral lint` ve önceki sürüme karşı `openapi-diff` breaking-change kontrolü koşar.

> **KURULUM GEREKİYOR: OpenAPI Generator CLI jar (Dart istemcisi için).** Ortamda `java 17.0.17` ölçülmüştür, dolayısıyla çalıştırma zemini vardır; ancak jar'ın kendisi envanterde yoktur ve CI/geliştirici kurulum adımına yazılmalıdır. Alternatif olarak npm dağıtımı `@openapitools/openapi-generator-cli` pnpm bağımlılığı olarak eklenebilir — bu durumda da altta aynı java çalışma zamanını kullanır.

---

## 6. Altyapı, Test ve CI

- **Yerel geliştirme:** Depoya işlenmiş `docker-compose.yml` → `postgis/postgis:16-3.4` servisi + `.env.example`. Bağlantı bilgileri yalnızca ortam değişkeninden okunur.
- **Test veritabanı:** Aynı compose dosyasında ikinci bir `db_test` servisi; testler gerçek PostGIS'e karşı koşar. Gerekçe: Spatial sorgular in-memory sahte veritabanıyla doğrulanamaz; p95 < 40ms ölçütü ancak gerçek indeksle (`GIST`) anlamlıdır.
- **Test araçları:** Vitest (unit + integration), `supertest` yerine Fastify `app.inject()`; mobilde `flutter test` + `integration_test`. Yük testi için `k6` — **KURULUM GEREKİYOR: k6** (ortam envanterinde yok; alternatif olarak Node tabanlı `autocannon` pnpm bağımlılığı ile ek kurulum gerektirmeden koşturulabilir ve varsayılan bu olarak alınır).
- **Kod kalitesi:** ESLint (flat config) + Prettier, Dart tarafında `flutter analyze` + `very_good_analysis`. `pnpm` dışındaki lockfile üretimi CI'da reddedilir.
- **Konteynerleme:** Çok aşamalı Dockerfile; `api` ve `worker` aynı imaj, farklı `CMD`. Web için ayrı Nitro imajı.
- **Gözlemlenebilirlik:** `pino` (Fastify yerleşik) yapılandırılmış JSON log + OpenTelemetry SDK ile trace. **KURULUM GEREKİYOR: log/trace toplayıcı (ör. Grafana Loki + Tempo veya barındırılan muadili)** — dış servistir, ortamda ölçülemez; toplayıcı yoksa loglar stdout'ta kalır ve veri tazeliği alarmları kurulamaz.

---

## 7. Depo Yapısı (pnpm workspace)

```
elektriklioto/
├─ apps/
│  ├─ api/          Fastify, Zod şemaları, route'lar
│  ├─ worker/       aggregator + bildirim işleri
│  ├─ web/          Nuxt 3
│  └─ mobile/       Flutter (pnpm workspace dışında, .fvmrc ile sabit)
├─ packages/
│  ├─ db/           Drizzle şema + migration SQL dosyaları
│  ├─ core/         entity resolution, tarife modeli, paylaşılan domain
│  └─ contracts/    üretilmiş openapi.json + TS tipleri
├─ docker-compose.yml
└─ pnpm-workspace.yaml
```

`apps/mobile` Node workspace'ine dahil değildir; yalnızca kod üretimi çıktısını `packages/contracts` üzerinden tüketir.

---

## 8. Reddedilen Seçenekler (tek satır)

- **Prisma:** PostGIS tiplerini birinci sınıf desteklemez.
- **Redis / RabbitMQ:** Kısıt gereği ilk sürümde yok; Postgres kuyruğu yeterli.
- **Mikroservisler:** Kapsam dışı; modüler monolit + ayrı worker.
- **WebSocket:** Kapsam dışı; delta-polling / SSE.
- **Google Maps SDK:** Sağlayıcı kilidi ve iki ayrı stil hattı maliyeti.
- **Go / Rust backend:** Ortamda mevcut fakat Fastify zorunluluğuyla çelişir.
- **Elle yazılmış OpenAPI YAML:** Şema sürüklenmesi (drift) riski.
