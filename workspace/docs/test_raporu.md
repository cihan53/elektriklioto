## Canlı Doğrulama ve Çalıştırma Talimatları

Geliştiricinin testleri ve servisleri yerel terminalinde birebir koşturabilmesi için gereken ortam hazırlığı, bağımlılık kurulumları ve çalıştırma komutları aşağıdadır:

### 1. Ön Koşul Servisler ve Portlar
- **PostgreSQL + PostGIS:** `postgis/postgis:16-3.4` Docker konteyneri 5432 portunda çalışıyor olmalıdır.
- **Fastify API Servisi:** 3000 veya boş bir yerel portta (örn. 3333) dinlemede olmalıdır.

```bash
# Docker PostGIS konteynerini başlatma / durum kontrolü
docker ps --filter "name=elektriklioto-postgres-dev"
# Çalışmıyorsa: docker compose up -d postgres
```

### 2. Backend Testlerini Koşturma (Vitest)
```bash
# Backend dizinine geçiş ve bağımlılık kurulumu
cd workspace/src/backend
npm install

# Tüm Vitest test paketini (Queue, Worker, Reports, Station, Health) koşturma
npm test

# Ayrıntılı (verbose) test raporu alma
npx vitest run --reporter=verbose
```

### 3. Mobil İstemci Testlerini Koşturma (Flutter)
```bash
# Mobil dizinine geçiş ve bağımlılık kurulumu
cd workspace/src/mobile
flutter pub get

# Tüm Flutter birim ve widget testlerini koşturma
flutter test test/map_bloc_test.dart test/deeplink_service_test.dart test/proximity_proof_test.dart test/station_detail_test.dart test/widget_test.dart --reporter=expanded
```

### 4. Canlı API Servisini Başlatma ve Canlı Ağ İstekleri
```bash
# Fastify API sunucusunu derleyip başlatma
cd workspace/src/backend
npm run build
PORT=3333 node dist/server.js

# Yeni bir terminalde canlı ağ/sınır testlerini koşturma:
# A) Dar BBox Testi
curl -s -i "http://localhost:3333/api/v1/stations?bbox=29.01,40.98,29.03,40.99"

# B) Geniş Desktop BBox Sınır Testi (Mevcut kodda 400 hatası üretir)
curl -s -i "http://localhost:3333/api/v1/stations?bbox=28.5,40.8,29.5,41.2"

# C) İstasyon Detayı ve Nullable Alan Kontrolü
curl -s "http://localhost:3333/api/v1/stations/kadikoy-moda-zes-1"

# D) Kaynak Sağlık ve İş Kuyruğu Durumu
curl -s "http://localhost:3333/api/v1/health/sources"
curl -s "http://localhost:3333/api/v1/health/queue"
```

---

## Zorunlu Kısıtlar, Çatışmalar ve Varsayımlar

- **Alan Adı ve Marka:** `elektriklioto.com` tüm web, API (`api.elektriklioto.com`) ve mobil varlıkların tek çatısıdır (zorunlu).
- **Web Çatısı:** Nuxt.js / Vue.js (SSR/SSG uyumlu) Fastify API'sini tüketir (zorunlu).
- **Mobil İstemci:** Flutter ile geliştirilecektir; tek kod tabanı kullanılır (zorunlu).
- **Backend Çatısı:** Node.js / TypeScript üzerinde Fastify framework (zorunlu).
- **Veritabanı:** `postgis/postgis:16-3.4` Docker konteyneri üzerinde çalışır; `docker-compose.yml` ile yönetilir (zorunlu).
- **Lisans Sınırı:** Platform hiçbir aşamada "Lisanslı Şarj Operatörü" statüsü alamaz; EPDK elektrik satışı ve faturalama yapamaz (zorunlu).
- **Konum Gizliliği ve KVKK:** Kullanıcı GPS konumu sunucuda saklanamaz; yalnızca in-memory işlenir, geçmiş koordinat tutulamaz (zorunlu).
- **Şema Göçü:** Üretimde elle DDL yasaktır; yalnızca sürümlenmiş migration dosyaları kullanılır (zorunlu).
- **Tasarım Bütünlüğü:** `tasarim_sistemi.md` token'ları tek kaynaktır; Nuxt CSS ve Flutter Dart çıktıları tek derleme betiğiyle senkronize edilir (zorunlu).
- **Tohum Veri:** EPDK 16.788 istasyon ve 179 marka içeren `istasyonlar.json` kanonik çapadır (`ŞRJ/xxxx`); `lat`/`lon` mevcut kabul edilir, geocoding yapılmaz (zorunlu).
- **Eksik Veri Modeli:** Soket tipi, güç, tarife ve canlı doluluk Faz 1 başlangıcında YOKTUR; şema bu alanları `NULL` kabul eder; uydurma veri girilemez (zorunlu).

> **ÇATIŞMA:** "Mobil istemci Flutter ile geliştirilecektir. (zorunlu)" kısıtında ortam raporundaki "Exec format error" çatışması yerel ortamda giderilmiş durumdadır. Sistemde kurulu `Flutter 3.27.1` ve `Dart 3.6.0` ile mobil testler doğrudan çalıştırılmıştır.

> **ÇATIŞMA:** "Paket yöneticisi tekliği: Ortamda pnpm 10.20.0 ölçülmüştür" kısıtı ortam gerçeğiyle uyuşmamaktadır. Sistemde `pnpm` bulunmadığından işlemler `npm 10.9.4` ile icra edilmiştir.

> **Varsayım:** Web istemcisi (`workspace/src/web`) kod tabanında henüz mevcut olmadığından, Epik 5 kapsamındaki SSR, Lighthouse SEO ve FOUC metrikleri "ÖLÇÜLEMEDİ" olarak işaretlenmiştir.

> **Varsayım:** `istasyonlar.json` tohumlama betiği (`npm run db:seed`) henüz kodlanmadığından, PostGIS spatial BBox sorgusu 16.788 gerçek kayıt yerine in-memory 4 istasyonluk mock veri üzerinde test edilmiştir.

---

## İçsel Doğrulama (Self-Test Bias) ve Sınır Değer (Boundary) İhlalleri

Geliştirici ajanların yazdığı mock testlerin ötesine geçilerek, `kabul_kriterleri.md` gereksinimleri canlı ağ istekleri ve uç parametrelerle denetlenmiş; şu kritik ihlaller tespit edilmiştir:

### 1. Keyfi BBox Tavanı İhlali (0.5 Derece Kısıtı)
- **Tespit Edilen Kod:** `workspace/src/backend/src/utils/geo.ts` satır 18:
  ```typescript
  if (lonDiff > 0.5 || latDiff > 0.5) return false;
  ```
- **Kabul Kriteri Çelişkisi (PO-201):** Sürücünün masaüstü geniş ekranda İstanbul genelini veya iki ili kapsayan harita aramasında (`lonDiff > 0.5`, örn: `bbox=28.5,40.8,29.5,41.2`), API `400 Bad Request` ("BBox sınırları geçersiz veya izin verilen maksimum alan (0.5 derece) aşıldı.") dönerek çökmektedir.
- **Sonuç:** Geliştiricinin koyduğu keyfi 0.5 derece tavanı `kabul_kriterleri.md`'de yer almamaktadır; geniş viewport sorgularını imkânsız kılmaktadır.

### 2. Düşük Zoom Seviyesinde Kümeleme (Clustering) Eksikliği
- **Kabul Kriteri Çelişkisi (PO-201):** `zoom < 11` seviyesindeki isteklerde PostGIS `ST_SnapToGrid` ile küme özeti (`cluster_id`, `count`, `center_geom`) dönülmesi zorunluyken, backend `zoom=9` çağrısında da tekil istasyon dizisi dönmektedir. Kümeleme endpoint ve şema düzeyinde hiç kodlanmamıştır.

### 3. Delta Senkronizasyon Uç Noktası Yokluğu
- **Kabul Kriteri Çelişkisi (PO-202):** `GET /api/v1/stations/delta?since={timestamp}` endpoint'i `station.routes.ts` içinde tanımlanmamıştır. Bu istek atıldığında `:slug` yakalayıcısına düşmekte ve `404 Not Found: İstasyon bulunamadı: delta` yanıtı vermektedir.

### 4. Mobil-Backend Rota ve Parametre Sözleşme Uyuşmazlığı
- **BBox Uç Noktası:** Mobil `StationService.fetchBBoxStations` `/stations/bbox` yoluna istek atmaktadır. Backend ise `GET /api/v1/stations` (kök) rotasını dinlemektedir. Canlıda `/stations/bbox` çağrısı `404 Not Found` almaktadır.
- **Arıza Bildirimi Uç Noktası:** Mobil `ReportService.submitIssueReport` `/stations/:id/report` (tekil) çağırmaktadır; backend `POST /api/v1/stations/:id/reports` (çoğul) beklemektedir (`404 Not Found`).
- **Kimlik ve Kanıt Eksikliği:** Mobil istemci arıza bildirimi yaparken `X-Device-Attestation` başlığını ve gövdede zorunlu `nonce` parametresini göndermemektedir (`401 Unauthorized` / `400 Bad Request`).
- **HMAC Algoritma Farkı:** Mobil `ProximityProofHelper` (`$stationId:$nonce` + statik gizli anahtar) ile backend `ProximityProofService` (`stationId + deviceUid + window + nonce` + env secret) formülleri uyuşmamaktadır.

---

## Kabul Kriterleri Doğrulama ve Ölçüm Sonuçları

| Epik Kodu | Kabul Kriteri | Beklenen Kriter | Ölçülen Durum | Sonuç |
|---|---|---|---|---|
| **EP-01** | PO-101 (Tohumlama) | `npm run db:seed` ile ≥ %99 kayıt yüklenmesi | Betik ve `istasyonlar.json` repoda mevcut değil | **BAŞARISIZ (Eksik Kod)** |
| **EP-01** | PO-102 (Operatörler) | 179 markanın `operator` tablosuna aktarımı | Bellekte yalnızca 5 mock operatör tanımlı | **BAŞARISIZ (Eksik Veri)** |
| **EP-02** | PO-201 (BBox Yanıtı) | p95 < 40ms spatial sorgu (PostGIS) | Bellek içi 4 istasyonda ~15ms; 16.788 veriyle k6 testi: ÖLÇÜLEMEDİ | **KISMEN BAŞARILI** |
| **EP-02** | PO-201 (Geniş BBox) | Geniş ekran viewport desteği | `lonDiff > 0.5` olan sorgularda 400 Bad Request hatası | **BAŞARISIZ (İçsel Hata)** |
| **EP-02** | PO-201 (Kümeleme) | `zoom < 11` için `ST_SnapToGrid` küme özeti | Zoom < 11 iken tekil istasyonlar dönüyor | **BAŞARISIZ (Eksik Kod)** |
| **EP-02** | PO-202 (Delta Polling) | `GET /stations/delta?since=...` | Rota tanımlı değil (404 İstasyon bulunamadı: delta) | **BAŞARISIZ (Eksik Rota)** |
| **EP-03** | PO-301 (Nullable DTO) | Soket/güç/tarife null; "Operatör Verisi Bekleniyor" rozeti | API null dönüyor; mobil widget testi rozeti doğruladı | **BAŞARILI** |
| **EP-04** | PO-401 (Deep-Link) | CPO şeması (ZES/Trugo/Eşarj); fallback pano | Native şemalar ve panoya kopyalama/toast doğrulandı | **BAŞARILI** |
| **EP-05** | PO-501 (Web SEO) | Lighthouse SEO ≥ 90, a11y ≥ 95, FCP < 1.2s | Web uygulaması kod tabanında yok | **ÖLÇÜLEMEDİ: Web Yok** |
| **EP-05** | PO-502 (Tema FOUC) | SSR çerezinden `class="dark"`, FOUC = 0ms | Web uygulaması kod tabanında yok | **ÖLÇÜLEMEDİ: Web Yok** |
| **EP-06** | PO-601 (60 FPS & Jank)| 500+ GeoJSON Isolate parsing, jank < 16.6ms | Gerçek cihaz profillemesi olmadan ölçülemedi | **ÖLÇÜLEMEDİ: Cihaz Yok** |
| **EP-06** | PO-602 (Çevrimdışı Hive)| Ağ kopmasında Hive önbelleğinden gösterme | `HiveStorageService` testleri başarıyla doğrulandı | **BAŞARILI** |
| **EP-07** | PO-701 (Proximity & KVKK)| Ham GPS kaydı yok; 3 ihbarda arıza etiketi | Backend HMAC/Replay/Eşik başarılı; Mobil sözleşmesi uyumsuz | **KISMEN BAŞARILI** |
| **EP-07** | PO-701 (False Positive) | Hatalı istasyon kapatma ≤ %3 | Gerçek kullanıcı saha verisi bulunmadığı için ölçülemedi | **ÖLÇÜLEMEDİ: Saha Yok** |
| **EP-07** | PO-702 (Anonim Cihaz) | `device_uid` ile işlem, 1 dk/5 ihbar rate limit | Fastify rate-limiter & shadow-ban birim testte doğrulandı | **BAŞARILI** |
| **EP-08** | PO-801 (Rota Köprüsü) | Base64URL encode/decode < 200ms, QR state | Backend encode/decode ~12ms başarılı; Mobil QR alıcı eksik | **KISMEN BAŞARILI** |
| **EP-09** | PO-901 (Token Hattı) | `tokens.json` derleme betiği ile CSS/Dart üretimi | `packages/design-tokens` yok; Dart elle yazılmış | **BAŞARISIZ (Eksik Hat)** |
| **EP-09** | PO-902 (Erişilebilirlik) | Dokunma alanı mobilde ≥ 48pt, webde ≥ 44px | `AppTouchTarget.minMobile` = 48pt mobilde doğrulandı | **BAŞARILI** |
| **EP-10** | PO-1001 (Circuit Breaker)| 5 hatada OPEN devre, 15 dk soğuma, jitter | 5 hatada OPEN, fast-fail, jitter (500-2000ms) doğrulandı | **BAŞARILI** |
| **EP-10** | PO-1001 (Veri Tazeliği) | 24 saat kesintide rozet; sistem %100 ayakta | "Son güncelleme: X gün önce" rozeti & kesintisizlik kanıtlandı | **BAŞARILI** |

---

## Ölçüm Özeti ve Metrik Karnesi

### 1. Test Süitleri Yürütme Metrikleri
- **Backend Vitest:** 6 test dosyası, 33 test çalıştırıldı. 33 test BAŞARILI (%100). Toplam yürütme süresi: **951 ms** (Test koşturma: 665 ms).
- **Mobil Flutter Test:** 5 test dosyası, 11 test çalıştırıldı. 11 test BAŞARILI (%100). Toplam yürütme süresi: **~3.2 s**.

### 2. Canlı HTTP Uç Noktaları Ölçümleri (Port: 3333)
- `GET /`: `200 OK`, `{"service":"elektriklioto-api","status":"HEALTHY"}` (Yanıt süresi: 4ms).
- `GET /api/v1/stations?bbox=29.01,40.98,29.03,40.99`: `200 OK`, 1 istasyon döndü (Yanıt süresi: 14ms).
- `GET /api/v1/stations?bbox=28.5,40.8,29.5,41.2`: `400 Bad Request` (0.5 derece sınır aşımı hatası).
- `GET /api/v1/stations/delta?since=...`: `404 Not Found` (Rota bulunamadı).
- `GET /api/v1/stations/kadikoy-moda-zes-1`: `200 OK`, `connector_types: null`, `power_kw: null`, `data_freshness` mevcut (Yanıt süresi: 8ms).
- `POST /api/v1/route-bridge/encode`: `201 Created`, Base64URL ve imza üretildi (Yanıt süresi: 12ms).
- `GET /r/:code`: `200 OK`, 2 durak başarıyla çözüldü (Yanıt süresi: 6ms).
- `GET /api/v1/health/sources`: `200 OK`, 4 kaynak raporlandı (1 bayat, 3 sağlıklı) (Yanıt süresi: 7ms).
- `GET /api/v1/health/queue`: `200 OK`, kuyruk istatistikleri döndü (Yanıt süresi: 3ms).

### 3. Güvenlik ve Lisans Sınırı Doğrulaması
- **X-Service-Type Başlığı:** Canlı yanıtlarda `e-Mobility Assistant / EMP Candidate` değeri eksiksiz doğrulandı.
- **Lisans Sınırı Taraması:** API yanıt gövdelerinde ve test çıktılarında `fatura`, `odeme`, `kwh_satis` gibi EPDK lisanslı operatör terimlerinin bulunmadığı (0 eşleşme) mühürlendi.
- **Konum Gizliliği (Zero-Storage):** `station_report` veri modeli ve arıza bildirim kayıtlarında enlem, boylam, koordinat veya IP sütunlarının bulunmadığı doğrulandı.

---

## Düzeltme Kararları ve Aksiyon Maddeleri

Aşağı akıştaki geliştirici rollere iletilmek üzere bağlayıcı kararlar:

1. **BBox 0.5 Derece Tavanının Kaldırılması (Karar):** `workspace/src/backend/src/utils/geo.ts` içindeki `lonDiff > 0.5 || latDiff > 0.5` engeli derhal kaldırılmalı; bunun yerine `zoom < 11` olduğunda PostGIS `ST_SnapToGrid` kümeleme sorgusunu çalıştıran çift modlu mimari kodlanmalıdır.
   - *Gerekçe:* Masaüstü ve bölgesel harita aramalarında uygulamanın 400 hatası vermesini engellemek.

2. **Mobil İstasyon Servis Rotalarının Düzeltilmesi (Karar):** `workspace/src/mobile/lib/services/station_service.dart` içindeki `/stations/bbox` çağrısı `/stations?bbox=...` olarak, `/stations/search` rotası ise backend ile uyumlu query yapısına dönüştürülmelidir.
   - *Gerekçe:* Canlıda harita kaydırıldığında mobil uygulamanın 404 alarak istasyonları gösterememesini engellemek.

3. **Arıza Bildirimi Sözleşme Eşitlemesi (Karar):** Mobil `ReportService` ve `IssueReportRequest` sınıfları güncellenmeli; hedef uç nokta `POST /api/v1/stations/:id/reports` yapılmalı, `X-Device-Attestation` başlığı, rastgele `nonce` ve backend formülüne uygun HMAC üretimi eklenmelidir.
   - *Gerekçe:* Sürücülerin sahada arıza bildirimi yaparken 404/401 hatalarıyla karşılaşmasını önlemek.

4. **Delta Senkronizasyon Rotasının Eklenmesi (Karar):** `workspace/src/backend/src/modules/stations/station.routes.ts` dosyasına `GET /delta` rotası eklenmeli; `since` parametresine göre son güncellenen istasyonları dönen servis mantığı yazılmalıdır.
   - *Gerekçe:* Mobil ve web istemcilerin gereksiz bant genişliği harcamadan canlı güncellemeleri çekebilmesi.

5. **Tohumlama Hattının (Seed Pipeline) İnşası (Karar):** `istasyonlar.json` (16.788 kayıt) ve 179 marka sözlüğü için `npm run db:seed` idempotent komutu yazılmalı; PostgreSQL PostGIS spatial indeksleri üzerinde 250 sanal kullanıcılı k6 yük testi icra edilmelidir.
   - *Gerekçe:* Sistemin gerçek dünya verileri altında p95 < 40ms spatial performans kapısını geçtiğinin kanıtlanması.

6. **Web Platformunun (Nuxt 3) Başlatılması (Karar):** `workspace/src/web` altında Nuxt 3 SSR projesi ayağa kaldırılmalı; Lighthouse SEO ≥ 90 ve sıfır FOUC kriterleri ölçümlenmelidir.
   - *Gerekçe:* Epik 5 kabul kriterlerinin ölçülebilir hale getirilmesi.
