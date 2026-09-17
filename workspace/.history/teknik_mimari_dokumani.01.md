# Teknik Mimari Dokümanı — elektriklioto.com (Faz 1)

> Sürüm: 1.0 · Tarih: 2026-09-06 · Sahip: CTO
> Bu doküman `proje_kapsami.md` ve `workspace/docs/ortam_raporu.md` üzerine kuruludur. Teknoloji seçim gerekçeleri ayrı dosyadadır (`teknoloji_stack_karari.md`); burada **yapı, sınır ve akış** kararları yer alır.

---

## 1. Mimari Karar Özeti

| # | Karar | Tek satır gerekçe | Elenen alternatif |
|---|---|---|---|
| M1 | **Modüler monolit**: tek `api` süreci + tek `worker` süreci | Ekip küçük, veri modeli tek merkez; servis sınırı kodda modül olarak çizilir | Mikroservis (erken parçalanma maliyeti) |
| M2 | **pnpm workspace monorepo** (`apps/`, `packages/`) + ayrı Flutter dizini | Şema→istemci üretimi ve tip paylaşımı tek depo içinde atomik olur | Çoklu repo (sözleşme kayması) |
| M3 | **OpenAPI 3.1 tek doğruluk kaynağı**, Fastify şemalarından türetilir | Web ve mobil DTO'ları elle yazılmaz, CI'da drift kırılır | Elle yazılan istemci modelleri |
| M4 | **PostgreSQL tek altyapı bileşeni** (veri + kuyruk + cache tablosu) | Redis/RabbitMQ bağımlılığı Faz 1'de operasyon yükünü ikiye katlar | Redis + BullMQ |
| M5 | **Okuma yolu materialize edilmiş** `station_read_model` tablosu | Harita p95 < 40ms hedefi 6 tabloyu runtime join ederek tutturulamaz | Runtime join + view |
| M6 | **Kaynak verisi ham + kanonik iki katmanda** saklanır | Entity resolution hatası geri alınabilir olmalı; ham kayıt silinmez | Doğrudan kanonik yazma |
| M7 | **SSE + delta polling**, WebSocket yok | Durum değişimi seyrek ve tek yönlü; kalıcı bağlantı SSR sunucusunu şişirir | WebSocket |

---

## 2. Bileşen Topolojisi

```
                     ┌──────────────────────┐
   Flutter (iOS/And) │  Nuxt SSR (web)      │  arama motorları
        │            └──────────┬───────────┘
        │  HTTPS /api/v1        │ SSR fetch (internal)
        └───────────┬───────────┘
                    ▼
            ┌───────────────┐        ┌──────────────────┐
            │  apps/api     │        │  apps/worker     │
            │  (Fastify)    │        │  (aynı domain    │
            │  read-heavy   │        │   modülleri)     │
            └───────┬───────┘        └────────┬─────────┘
                    │  SQL                    │ SQL + dış HTTP
                    ▼                         ▼
            ┌────────────────────────────────────────────┐
            │ PostgreSQL 16 + PostGIS 3.4 (Docker)       │
            │ raw_* · canonical · read_model · job_queue │
            └────────────────────────────────────────────┘
```

Alt alan adları: `elektriklioto.com` (Nuxt), `api.elektriklioto.com` (Fastify), `cdn.elektriklioto.com` (statik/görsel). SSR sunucusu API'ye **iç ağdan** gider; tarayıcı yalnızca `api.` ile konuşur.

---

## 3. Depo Yapısı ve Modül Sınırları

```
elektriklioto/
├─ apps/
│  ├─ api/         # Fastify HTTP yüzeyi: route + şema + auth + rate-limit
│  ├─ worker/      # zamanlanmış işler, kuyruk tüketicisi
│  └─ web/         # Nuxt 3 (SSR + ISR)
├─ packages/
│  ├─ domain/      # saf iş kuralları, I/O yok (station, tariff, report, resolution)
│  ├─ db/          # sorgular, migration'lar, seed
│  ├─ connectors/  # her veri kaynağı için bir adaptör
│  ├─ contracts/   # OpenAPI 3.1 çıktısı + üretilen TS istemcisi
│  └─ config/      # ortam değişkeni şeması (zod), tek doğrulama noktası
├─ mobile/         # Flutter uygulaması (.fvmrc ile sabitli)
├─ docker-compose.yml
└─ pnpm-workspace.yaml
```

**Bağımlılık yönü (tek yönlü, CI'da `dependency-cruiser` ile zorlanır):**
`api|worker → domain → (hiçbir şey)` ve `api|worker → db|connectors → domain`.
`domain` katmanı Fastify, pg veya HTTP istemcisi import edemez. Bu kural, ileride bir modülü ayrı servise çıkarmanın tek ön koşuludur.

**Domain modülleri (gelecekteki servis sınırları):**
`stations` · `sockets` · `tariffs` · `availability` · `reports` (crowdsource) · `deeplinks` · `favorites` · `ingestion` · `resolution`.

---

## 4. Veri Mimarisi

### 4.1 Katmanlama

| Katman | Tablolar | Rol |
|---|---|---|
| Ham | `raw_station_snapshot(source, source_id, payload jsonb, fetched_at)` | Kaynaktan gelen değiştirilmemiş kayıt; asla UPDATE edilmez, append-only |
| Kanonik | `station`, `socket`, `operator`, `tariff`, `station_source_link` | `station_uid` merkezli birleştirilmiş gerçeklik |
| Okuma | `station_read_model` | Harita/liste için denormalize, GIST + BRIN indeksli |
| Zaman serisi | `availability_event`, `tariff_history`, `fault_report` | Aylık `PARTITION BY RANGE (occurred_at)` |
| Operasyon | `job_queue`, `source_health`, `resolution_conflict` | Kuyruk ve gözlemlenebilirlik |

### 4.2 Kanonik kimlik

`station_source_link(station_uid, source, source_id)` tablosu ham kayıtla kanonik varlığı bağlar. Eşleştirme skoru: `ST_DWithin(geom, 75m)` **AND** operatör eşleşmesi **AND** soket imzası (tip+güç çoklu kümesi) Jaccard ≥ 0.6. Skor eşiğin altındaysa kayıt `resolution_conflict` kuyruğuna düşer ve yönetim ekranında elle çözülür — otomatik birleştirme yapılmaz. `station_uid` bir kez üretildikten sonra **değişmez**; iki UID birleşirse `merged_into` alanı ile tombstone bırakılır, böylece mobil önbellekteki eski UID 301 benzeri bir yönlendirmeyle çözülür.

### 4.3 İndeks ve performans planı

- `station_read_model`: `GIST(geom)`, `BTREE(operator_id, max_power_kw)`, kısmi indeks `WHERE status <> 'decommissioned'`.
- Viewport sorgusu: `ST_MakeEnvelope(...,4326)` + `&&` operatörü; zoom < 10'da sunucu tarafı kümeleme (`ST_SnapToGrid` ile grid agregasyonu) döner, tekil pin dönmez.
- `availability_event`: `BRIN(occurred_at)` — partition başına küçük indeks.
- Ölçüm: `EXPLAIN (ANALYZE, BUFFERS)` çıktıları `packages/db/bench/` altında referans olarak versiyonlanır; p95 regresyonu CI'da 15.000 soket / 500.000 durum kaydı tohumlanmış veri üzerinde ölçülür.

> **Varsayım:** İstasyon sayısı Faz 1'de ≤ 25.000, soket ≤ 60.000. Bu ölçekte tek Postgres örneği yeterlidir; okuma replikası Faz 2 konusudur.

### 4.4 Migration

`node-pg-migrate` ile sürümlenmiş, ileri yönlü SQL dosyaları; her migration `pnpm db:migrate` ile CI'da boş şema üzerinde koşup geri alınabilirliği doğrular. Üretimde DDL yalnızca deploy adımı içinde çalışır. PostGIS uzantısı ilk migration'da `CREATE EXTENSION IF NOT EXISTS postgis` ile kurulur.

---

## 5. API Mimarisi

### 5.1 Yüzey

Sürümlenmiş `/api/v1`, REST + JSON. Fastify JSON Schema tanımlarından `@fastify/swagger` ile OpenAPI 3.1 üretilir; `packages/contracts/openapi.json` depoya işlenir ve CI'da yeniden üretilip diff alınır (fark varsa build kırılır).

| Uç nokta | Not |
|---|---|
| `GET /stations?bbox=&zoom=&power=&socket=&operator=&status=` | Harita ana sorgusu; zoom'a göre pin veya küme döner |
| `GET /stations/:uid` | Detay: soketler, tarife (`source`,`fetched_at`,`confidence`), son bildirimler |
| `GET /availability?bbox=&since=` | Delta çekme; `since` yoksa 400 |
| `GET /events/availability` (SSE) | Web haritası için opsiyonel canlı akış; düşerse polling'e geri döner |
| `POST /reports` | Arıza bildirimi + `proximity_proof` |
| `GET/PUT /favorites` | Cihaz token'ına bağlı |
| `GET /deeplink/:socketId` | Backend konfigürasyonundan üretilmiş şema + fallback |
| `GET /catalog/...` | SEO sayfaları için il/ilçe/otoyol kırılımı, uzun `s-maxage` |

### 5.2 Sözleşmeden istemci üretimi

- Web: `openapi-typescript` → tip + `ofetch` sarmalayıcı.
- Mobil: `openapi-generator` (dart-dio) → `mobile/lib/api/generated/`; üretilen kod elle düzenlenmez, CI'da `git diff --exit-code` ile doğrulanır.
- `spectral` lint + `openapi-diff` breaking-change kapısı: kırıcı değişiklik yalnızca `/api/v2` açarak yapılır.

### 5.3 Önbellek ve yük kontrolü

Katalog ve detay uçlarında `ETag` + `Cache-Control: s-maxage`; CDN önünde durur. `bbox` sorguları normalize edilmiş grid anahtarıyla (`@fastify/caching`, Postgres destekli kısa TTL tablosu) 30 sn önbelleklenir. `@fastify/rate-limit` ile IP + cihaz token bazlı kota; yazma uçlarında (`/reports`) kota daha sıkıdır.

---

## 6. Kimlik ve Gizlilik Mimarisi

- **Anonim öncelikli:** İlk açılışta cihaz `device_token` (opak UUID) alır; Play Integrity / App Attest doğrulaması `device_trust` skoruna yazılır. Harita ve detay token'sız da çalışır.
- **Konum:** GPS koordinatı **hiçbir uçta gövdede saklanmaz**. Viewport sorgusundaki `bbox` erişim loglarına yazılmaz (Fastify logger'da `bbox`, `lat`, `lon` alanları redaksiyonlu). Uygulama seviyesinde kullanıcı↔koordinat ilişkisi tutan tablo yoktur — bu, şema testinde otomatik kontrol edilir (`fault_report` ve `favorites` tablolarında `geometry` sütunu bulunması testi kırar).
- **Yakınlık kanıtı:** İstemci istasyon koordinatını zaten API'den almıştır; mesafeyi kendi hesaplar ve `proximity_proof = HMAC(server_nonce, station_uid, distance_bucket)` üretir. Sunucu yalnızca `distance_bucket ∈ {<50m}` bilgisini ve nonce geçerliliğini doğrular, koordinatı görmez.
- **Silme hakkı:** `DELETE /device` çağrısı favorileri ve bildirim ilişkisini siler, `fault_report` kayıtları `device_token` alanı NULL'lanarak anonimleştirilir (sayım bütünlüğü korunur).

---

## 7. Veri Toplama (Ingestion) Mimarisi

**Akış:** `scheduler → job_queue → connector → raw_snapshot → normalize → resolution → canonical → read_model refresh`.

- **Connector sözleşmesi:** her kaynak `fetch(): AsyncIterable<RawRecord>` + `normalize(raw): StationDraft` uygular; kaynağa özgü kod başka hiçbir yere sızmaz. Yeni kaynak eklemek = tek dosya.
- **Kuyruk:** `job_queue` tablosu, `SELECT ... FOR UPDATE SKIP LOCKED LIMIT n` ile çekilir; `attempts`, `run_after`, `last_error` alanları exponential backoff'u taşır (2^n dk, tavan 60 dk, 8 denemede `dead` durumuna geçer).
- **Saygılı kazıma:** kaynak başına eşzamanlılık 1–2, `source_policy` tablosunda tanımlı istek/dakika kotası, `robots`/ToS notu alanı, `If-Modified-Since`/`ETag` desteği, proxy havuzu ortam değişkeninden okunur.
- **Kaynak sağlığı:** her koşu `source_health(source, last_success_at, consecutive_failures, records)` günceller. 24 saat başarısızlıkta istasyonlar silinmez; `read_model.freshness_seconds` büyür ve arayüzde "son güncelleme" rozeti gösterilir — kaynak kesintisi kullanıcıya hata olarak yansımaz.
- **Tazelik hedefi:** durum (availability) işleri 5 dk periyot, statik istasyon meta verisi 24 saat. 15 dk hedefi 5 dk periyot + 3 kaçırma toleransıyla karşılanır.

---

## 8. Web (Nuxt) Mimarisi

- **Render modu route bazlı:** katalog/SEO sayfaları ISR (`routeRules: { '/**/sarj-istasyonlari': { isr: 3600 } }`), istasyon detayı ISR 600 sn, harita sayfası `ssr: false` bileşen ile client-only hydrate.
- **SEO:** her katalog sayfası `LocalBusiness`/`Place` JSON-LD, kanonik URL, `sitemap.xml` katalog uçlarından üretilir (`@nuxtjs/sitemap`), i18n Faz 1'de tek dil (`tr`) ama URL yapısı ileride `/en/` alacak şekilde ayrılmıştır.
- **FCP < 1.2 sn:** harita kütüphanesi yalnızca görünüm alanına girince dinamik import; kritik CSS satır içi; görseller `cdn.` üzerinden AVIF/WebP; SSR yanıtı yalnızca ilk 50 istasyonu gömer.
- **Web→mobil köprü:** istasyon sayfasında QR + akıllı banner, `https://elektriklioto.com/s/<uid>` Universal/App Link'i ile açılır; uygulama yoksa mağazaya, varsa doğrudan istasyona gider. Rota aktarımı için `POST /handoff` kısa ömürlü (10 dk, tek kullanımlık) kod üretir; kod yalnızca rota geometrisi + istasyon UID listesi taşır, kullanıcı kimliği taşımaz.

---

## 9. Mobil (Flutter) Mimarisi

- **Katmanlar:** `presentation (widget) → controller (Riverpod) → repository → (api client | local cache)`. Üretilen API istemcisi yalnızca repository katmanından çağrılır.
- **Önbellek:** Hive'da `station_pin` kutusu (uid, konum, operatör, güç, durum, `fetched_at`). Çevrimdışı açılışta pinler bu kutudan çizilir, üstte "çevrimdışı" bandı gösterilir.
- **Performans:** GeoJSON/DTO çözümleme ve kümeleme hesabı `compute()` ile ayrı Isolate'te; harita katmanı yalnızca hafif pin listesi alır. Soğuk açılış < 1.8 sn için ilk kare önbellekten çizilir, ağ isteği sonra gelir.
- **Sürüm sabitleme:** `.fvmrc` → Flutter 3.27.1 (ortamda ölçülü), Dart 3.6.0. iOS derlemesi Xcode 26.4.1, Android `adb` 1.0.41 ile doğrulanır.

> **Varsayım:** Harita SDK'sı olarak Mapbox tercih edilecektir; mimari, harita katmanını `MapAdapter` arayüzü arkasına aldığı için sağlayıcı değişimi tek pakette kalır.

---

## 10. Çalıştırma, Gözlemlenebilirlik, Güvenlik

- **Yerel/CI ortam:** `docker-compose.yml` içinde sabitlenmiş `postgis/postgis:16-3.4`; `api`, `worker`, `web` süreçleri host'ta pnpm ile koşar. Tüm bağlantı bilgileri `packages/config` içindeki zod şemasıyla doğrulanır; şema dışı/eksik değişkenle süreç **başlamaz**.
- **Loglama:** Fastify `pino` JSON log, `request_id` korelasyonu, konum alanları redaksiyonlu. Metrikler `/metrics` (Prometheus formatı): sorgu p50/p95, kaynak tazeliği, kuyruk derinliği, dead job sayısı.
- **Sağlık uçları:** `/healthz` (süreç), `/readyz` (DB + migration sürümü). Worker ayrı `/healthz` portu açar.
- **Güvenlik:** yazma uçlarında cihaz token + integrity doğrulaması, `@fastify/helmet`, sıkı CORS (yalnızca `elektriklioto.com` ve uygulama şemaları), tüm SQL parametrik, kullanıcı metni sunucuda sanitize edilip web'de düz metin olarak render edilir. Yüklenen görseller kuyruğa alınır, manuel onay öncesi yayınlanmaz.
- **Yedekleme:** günlük `pg_dump` + WAL arşivi; geri yükleme tatbikatı sürüm çıkışlarından önce bir kez koşulur.

---

## 11. Risk ve Karşılık

| Risk | Karşılık |
|---|---|
| Kaynak arayüzü değişir, connector kırılır | Şema doğrulama connector'da; kırılan kaynak `source_health` alarmı üretir, kanonik veri bozulmaz (ham katman koruyucu) |
| Entity resolution yanlış birleştirir | Otomatik birleştirme eşik altında yasak; `merged_into` ile geri alınabilir |
| Deep-link şeması bozulur | Şemalar backend konfigürasyonunda; mobil sürüm çıkmadan düzeltilir, fallback mağaza/pano |
| Bot ile sahte arıza bildirimi | `proximity_proof` + integrity attestation + cihaz güvenilirlik skoru + istasyon başına oran limiti |
| Postgres tek nokta | Faz 2'de okuma replikası; Faz 1'de günlük yedek + WAL |

---

## 12. Faz 1 Bitti Tanımı (mimari açıdan)

1. `docker compose up` + `pnpm db:migrate && pnpm db:seed` ile boş makinede çalışan sistem.
2. OpenAPI şeması üretiliyor, web ve mobil istemci kodu şemadan otomatik üretiliyor, CI drift kapısı yeşil.
3. Tohumlanmış 15.000 soketlik veride viewport sorgusu p95 < 40ms (bench çıktısı depoda).
4. En az 3 connector + entity resolution + `resolution_conflict` yönetim ekranı çalışır durumda.
5. Şema testi doğruluyor: hiçbir kullanıcı-bağlı tabloda koordinat sütunu yok.
