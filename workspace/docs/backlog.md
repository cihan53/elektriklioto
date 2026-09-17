# Ürün İş Listesi (Product Backlog): elektriklioto.com

> **Belge Sürümü:** 1.0.0-faz1  
> **Durum:** Onaylandı (Önceliklendirilmiş Canlı Backlog)  
> **Rol:** Product Owner  
> **Girdi Kaynakları:** `proje_kapsami.md`, `workspace/docs/teknik_mimari_dokumani.md`

---

## 1. Zorunlu Kısıtlar, Çatışmalar ve Varsayımlar

Aşağıdaki maddeler sistemin temel kısıtlarıdır; hiçbir kullanıcı hikâyesi bu ilkeleri ihlal edemez:

- **Alan Adı ve Marka:** `elektriklioto.com` tüm web, API (`api.elektriklioto.com`) ve mobil varlıkların tek çatısıdır (zorunlu).
- **Web Çatısı:** Nuxt.js / Vue.js (SSR/SSG uyumlu) Fastify API'sini tüketir (zorunlu).
- **Backend Çatısı:** Node.js / TypeScript üzerinde Fastify framework (zorunlu).
- **Veritabanı:** `postgis/postgis:16-3.4` sürümü Docker üzerinde çalışır; `docker-compose.yml` ile yönetilir (zorunlu).
- **Lisans Sınırı:** Platform hiçbir aşamada "Lisanslı Şarj Operatörü" statüsü alamaz; EPDK elektrik satışı ve faturalama yapamaz (zorunlu).
- **Konum Gizliliği:** Kullanıcı GPS koordinatları sunucuda saklanamaz; anlık in-memory işlenir, geçmiş güzergah tutulamaz (zorunlu).
- **Şema Göçü:** Üretimde elle DDL yasaktır; yalnızca sürümlenmiş migration dosyaları kullanılır (zorunlu).
- **Tasarım Bütünlüğü:** `tasarim_sistemi.md` token'ları tek kaynaktır; Nuxt CSS ve Flutter Dart çıktıları tek derleme betiğiyle senkronize edilir (zorunlu).
- **Tohum Veri:** EPDK 16.788 istasyon ve 179 marka içeren `istasyonlar.json` kanonik çapadır; `lat`/`lon` mevcut kabul edilir, geocoding yapılmaz (zorunlu).
- **Eksik Veri:** Soket tipi, güç, tarife ve canlı doluluk Faz 1 başlangıcında `NULL` kabul edilir; sistem bu alanlar boşken çalışacak şekilde modellenir (zorunlu).

> **ÇATIŞMA:** "Mobil istemci Flutter ile geliştirilecektir. (zorunlu)" kısıtı teknik olarak imkânsızdır. Ortam raporunda `flutter` ve `dart` komutları "Exec format error" nedeniyle BOZUK durumdadır. İstemcinin geliştirilebilmesi için onarım gereklidir.

> **ÇATIŞMA:** "Paket yöneticisi tekliği: Ortamda pnpm 10.20.0 ölçülmüştür" kısıtı ortam gerçeğiyle uyuşmamaktadır. Güncel ortam raporunda `pnpm` YOK olarak listelenmiştir. Paylaşımlı workspace mimarisi için KURULUM GEREKİYOR: pnpm.

> **Varsayım:** Flutter ortamı ARM64 ikilileriyle onarılana ve `pnpm` kurulana kadar, backend ve web modülleri ortamda ölçülen `node v22.21.0` ve `npm 10.9.4` ile geliştirilmeye başlanacaktır. Mobil görevler (Epic 4) ortam onarımı tamamlanana kadar bloke durumdadır.

---

## 2. Önceliklendirme ve Sürüm Stratejisi

Backlog, değer üretimi ve teknik bağımlılık zincirine göre **MoSCoW** yöntemiyle sıralanmış sprint dilimlerine bölünmüştür:
- **P0 (Must Have - Sprint 0 & 1):** Veri tabanı, tohumlama, tasarım token senkronizasyonu, çekirdek BBox API ve OpenAPI şeması.
- **P0 (Must Have - Sprint 2):** Web SSR istasyon katalogları, SEO altyapısı ve interaktif web haritası.
- **P0 / P1 (Must/Should - Sprint 3):** Mobil harita, deep-linking motoru ve web-mobil rota aktarım köprüsü.
- **P1 (Should Have - Sprint 4):** Proximity proof arıza bildirimi, anonim cihaz güvenliği, PostgreSQL iş kuyruğu ve veri tazeliği izleme.

---

## 3. Epics ve Ölçülebilir Kullanıcı Hikâyeleri

### EPIC 1: Çekirdek Altyapı, Veri Tabanı ve Tasarım Sistemi (Sprint 0 - P0)

#### US-01: Docker Tabanlı PostGIS Veritabanı ve Sürümlenmiş Migration Hattı
- **Öncelik:** P0 (Must Have)
- **Hikâye:** Bir backend geliştiricisi olarak, spatial coğrafi fonksiyonları ve ilişkisel şemayı güvenle çalıştırmak için Docker üzerinde PostGIS veritabanı ve sürümlenmiş migration hattı kurmak istiyorum.
- **Karar & Gerekçe:** `postgis/postgis:16-3.4` resmi imajı `docker-compose.yml` içinde sabitlenir. Şema değişiklikleri yalnızca sıralı SQL migration dosyalarıyla yürütülür; elle DDL çalıştırılamaz.
- **Alternatif:** *Native Postgres + Harici Eklenti:* Konteynerizasyon taşınabilirliği ve versiyon uyumsuzluğu riski nedeniyle elendi.
- **Ölçülebilir Kabul Kriterleri:**
  1. `docker compose up -d postgres` komutu hatasız tamamlanmalı ve `pg_isready` denetimi 5 saniye içinde 0 dönmelidir.
  2. Migration komutu çalıştırıldığında `station`, `operator`, `connector`, `station_report`, `tariff_history` ve `seed_rejects` tabloları eksiksiz oluşmalıdır.
  3. `station` tablosunda `geom geography(Point,4326)` sütunu bulunmalı ve `CREATE INDEX idx_station_geom ON station USING GIST(geom);` indeksi başarıyla doğrulanmalıdır.
  4. Migration geriye alma (rollback) testi temiz veritabanında 0 hata ile çalışmalıdır.

#### US-02: `istasyonlar.json` Doğrulama, Normalizasyon ve Idempotent Tohumlama (Seed Runner)
- **Öncelik:** P0 (Must Have)
- **Hikâye:** Bir sistem yöneticisi olarak, EPDK'dan alınan 16.788 istasyonu ve 179 markayı mekânsal doğrulama kapısından geçirerek veritabanına aktaran idempotent bir tohumlama aracı istiyorum.
- **Karar & Gerekçe:** `istasyon_no` (`ŞRJ/xxxx`) doğal anahtarı üzerinde `UNIQUE` kısıt bulunur; tohumlama upsert mantığıyla çalışır. Koordinatları Türkiye sınır kutusu (`ST_MakeEnvelope(25.5, 35.5, 45.0, 42.5, 4326)`) dışında kalan veya geçersiz olanlar `seed_rejects` tablosuna yazılır.
- **Alternatif:** *Doğrudan ham SQL Dump:* Hatalı koordinatları ve Unicode uyumsuzluklarını filtreleyemediği için elendi.
- **Ölçülebilir Kabul Kriterleri:**
  1. `npm run seed` komutu temiz veritabanında çalıştırıldığında 16.788 kaydın en az %99'u (≥ 16.620 istasyon) `station` tablosuna aktarılmalıdır.
  2. Reddedilen kayıtlar `seed_rejects` tablosuna `istasyon_no`, `raw_payload` ve `rejection_reason` ile kaydedilmeli ve terminalde özet rapor basılmalıdır.
  3. Tohumlama komutu art arda iki kez çalıştırıldığında `station` tablosundaki satır sayısı ve `id` değerleri değişmemelidir (Tam Idempotence).
  4. EPDK'daki 179 tekil marka `operator` tablosuna normalize edilmeli ve `operator_id` ile istasyonlara bağlanmalıdır.
  5. Unicode normalizasyonu (NFC) uygulanmalı; `ŞRJ/` öneki ve Türkçe karakterler (`ı, İ, ş, ğ`) bozulmadan saklanmalıdır.

#### US-03: Tasarım Token Senkronizasyon Derleme Hattı (Tokens -> CSS & Dart)
- **Öncelik:** P0 (Must Have)
- **Hikâye:** Bir arayüz geliştiricisi olarak, Nuxt ve Flutter istemcilerinde tek bir tasarım dilini garantilemek için `tasarim_sistemi.md` token'larını otomatik koda dönüştüren derleme betiği istiyorum.
- **Karar & Gerekçe:** Görsel değerler merkezi `tokens.json` dosyasında tutulur; derleme betiği web için `tokens.css`, mobil için `tokens.dart` üretir. Elle CSS/Dart değeri yazımı yasaktır.
- **Alternatif:** *İki tarafta elle sabit tanımlama:* Tasarım tutarsızlığı ve bakım maliyeti nedeniyle elendi.
- **Ölçülebilir Kabul Kriterleri:**
  1. `npm run build:tokens` komutu tek çalıştırmada `packages/design-tokens/dist/tokens.css` ve `packages/design-tokens/dist/tokens.dart` dosyalarını üretmelidir.
  2. Renk kontrastları WCAG 2.1 AA tabanını (metin kontrastı ≥ 4.5:1) sağlamayan hiçbir token renk paletine dahil edilmemelidir.
  3. Dokunma hedefleri mobil için minimum 48x48pt (`min_touch_target: 48`) token'ı olarak doğrulanmalıdır.
  4. CI hattında token derleme çıktısı ile kaynak `tokens.json` arasında fark tespit edilirse build kırılmalıdır.

---

### EPIC 2: Çekirdek Backend API ve Coğrafi Servisler (Sprint 1 - P0)

#### US-04: Viewport Bounding Box (BBox) Mekânsal İstasyon Listeleme API'si
- **Öncelik:** P0 (Must Have)
- **Hikâye:** Bir mobil/web kullanıcısı olarak, harita ekranında yalnızca baktığım coğrafi alandaki (viewport) istasyonları hızlıca listelemek istiyorum.
- **Karar & Gerekçe:** API tüm Türkiye verisini tek seferde basmaz; `GET /api/v1/stations?bbox=min_lon,min_lat,max_lon,max_lat&zoom=12` parametresiyle PostGIS `ST_MakeEnvelope` ve `ST_Intersects` sorgusu çalıştırır. Zoom < 10 seviyesinde `ST_SnapToGrid` ile kümelenmiş özet veri döner.
- **Alternatif:** *Tüm istasyonları istemciye GeoJSON indirmek:* 16.788 kaydın bellek şişmesine (OOM) yol açması nedeniyle elendi.
- **Ölçülebilir Kabul Kriterleri:**
  1. 20 km çapındaki BBox sorgularında sunucu içi veritabanı yanıt süresi p95 < 40ms olmalıdır (250 eşzamanlı sanal kullanıcı yükü altında).
  2. BBox koordinat parametreleri WGS 84 sınırları dışında veya eksik verildiğinde API HTTP 400 Bad Request dönmelidir.
  3. Zoom < 10 olduğunda API istasyon bazlı değil, `cluster_count` ve `center_geom` içeren küme nesneleri dönmelidir.
  4. Ağ koptuğunda veya sunucu hatasında istemci tarafına anlamlı HTTP 503/500 JSON hata gövdesi iletilmelidir.

#### US-05: OpenAPI 3.1 Şema Sözleşmesi ve Tip Güvenli İstemci Üretimi
- **Öncelik:** P0 (Must Have)
- **Hikâye:** Bir istemci geliştiricisi olarak, backend modelleri ile tam senkronize kalmak ve tip hatası yapmamak için OpenAPI 3.1 şemasından otomatik DTO sınıfları üretmek istiyorum.
- **Karar & Gerekçe:** Fastify rotaları `zod`/`typebox` şemalarıyla tanımlanır; `/documentation/json` üzerinden OpenAPI 3.1 spesifikasyonu üretilir. Web (TypeScript) ve mobil (Dart) istemci kodları bu şemadan derlenir.
- **Alternatif:** *İstemcide elle TypeScript/Dart arayüzleri yazmak:* Şema kayması (schema drift) riski nedeniyle elendi.
- **Ölçülebilir Kabul Kriterleri:**
  1. `npm run generate:api-client` komutu Nuxt için TypeScript DTO'larını ve Flutter için Dart model sınıflarını hatasız üretmelidir.
  2. CI hattında çalışan `spectral lint` ve `openapi-diff` kontrollerinde 0 hata ve 0 breaking-change tespit edilmelidir.
  3. Backend rotalarındaki şema değişikliği istemci kodları güncellenmeden CI'dan geçememelidir.

#### US-06: İstasyon Detay ve Nullable Veri Modeli API'si
- **Öncelik:** P0 (Must Have)
- **Hikâye:** Bir kullanıcı olarak, seçtiğim bir şarj istasyonunun detaylı konum, adres, operatör ve mevcut durum bilgilerini incelemek istiyorum.
- **Karar & Gerekçe:** EPDK verisinde soket tipi, güç, tarife ve anlık doluluk bulunmadığından bu alanlar API yanıtında `null` döner; uydurma veri girilmez. Arayüz "Operatör Verisi Bekleniyor" rozetiyle render edilir.
- **Alternatif:** *Varsayılan 22kW AC / 0.00 TL mock değerler basmak:* Yanıltıcı bilgi ve yasal risk nedeniyle kesinlikle yasaklandı.
- **Ölçülebilir Kabul Kriterleri:**
  1. `GET /api/v1/stations/{slug}` çağrısı geçerli istasyon için HTTP 200 ile dönmeli ve yanıt süresi p95 < 30ms olmalıdır.
  2. `connector_types`, `power_kw`, `current_tariff` alanları null olduğunda JSON çıktısında `null` olarak yer almalı; OpenAPI şemasında `nullable: true` olarak doğrulanmalıdır.
  3. Yanıtta operatörün adı, logosu, doğrulanmış adresi ve en son güncelleme zaman damgası (`updated_at`) bulunmalıdır.

#### US-07: Operatör Sözlüğü ve Akıllı Deep-Link / Clipboard Fallback Motoru
- **Öncelik:** P0 (Must Have)
- **Hikâye:** Bir mobil sürücü olarak, istasyon detayından tek tuşla ilgili operatörün mobil uygulamasına ilgili soket/istasyon açılmış şekilde geçmek; uygulama desteklemiyorsa istasyon kodunun panoma kopyalanmasını istiyorum.
- **Karar & Gerekçe:** Operatörlerin şema formatları (`zes://station/{id}`, `trugo://charge?station={id}`) `operator.deep_link_config` içinde tutulur. Desteklenmeyen veya bilinmeyen durumlarda API `clipboard_fallback: true` bayrağı döner.
- **Alternatif:** *Her operatör için sabit kodlanmış deep-link yazmak:* Operatör şema değişikliklerinde mobil uygulama güncellemesi gerektirdiği için elendi.
- **Ölçülebilir Kabul Kriterleri:**
  1. ZES, Trugo ve Eşarj operatörleri için üretilen deep-link URL'leri hedef uygulamayı istasyon ekranında açma başarı oranı > %90 olmalıdır.
  2. Deep-link desteklemeyen veya cihazda kurulu olmayan operatörler için istasyon kodu işletim sistemi panosuna (clipboard) otomatik kopyalanmalı ve kullanıcıya bilgilendirme bildirimi (toast) tetiklenmelidir.
  3. `GET /api/v1/operators` uç noktası 179 markanın slug, isim ve aktiflik durumunu p95 < 20ms sürede dönmelidir.

---

### EPIC 3: Web Platformu - Nuxt.js SSR / SSG & SEO (Sprint 2 - P0)

#### US-08: SEO Uyumlu Dinamik İl/İlçe ve İstasyon Dizin Sayfaları
- **Öncelik:** P0 (Must Have)
- **Hikâye:** Bir internet kullanıcısı olarak, Google'da arama yaptığımda (örn: "Kadıköy elektrikli şarj istasyonları") elektriklioto.com sayfalarına hızla ulaşıp güncel istasyonları görmek istiyorum.
- **Karar & Gerekçe:** `/{city}/{district}/sarj-istasyonlari` ve `/{operator}/{slug}` sayfaları Nuxt 3 Nitro motoru ile SSR/ISR olarak render edilir. JSON-LD şemaları (`ChargingStation`) dinamik gömülür.
- **Alternatif:** *Single Page Application (SPA - Client Render):* Google botları tarafından indekslenme zayıflığı ve SEO kaybı nedeniyle elendi.
- **Ölçülebilir Kabul Kriterleri:**
  1. Google Lighthouse SEO skoru ≥ 90 ve First Contentful Paint (FCP) < 1.2 saniye olmalıdır.
  2. Sayfa kaynak kodunda Schema.org `ElectricVehicleChargingStation` JSON-LD metadata bloğu doğrulanmalıdır.
  3. 81 il ve ilçeleri için statik/dinamik rota oluşturma hatasız tamamlanmalı; var olmayan istasyonlar için özel 404 sayfası dönmelidir.

#### US-09: İnteraktif Web Haritası (Client-Only) ve FOUC Korumalı Tema Sistemi
- **Öncelik:** P0 (Must Have)
- **Hikâye:** Bir web kullanıcısı olarak, tarayıcımda akıcı bir harita deneyimi yaşamak ve gece sürüşünde gözümü yormayacak koyu temayı parlama olmadan kullanmak istiyorum.
- **Karar & Gerekçe:** Harita bileşeni sunucu tarafında render edilmez (`<ClientOnly>`); tema tercihi çerezden okunarak hydration öncesinde `<html>` etiketine `class="dark"` olarak gömülür (FOUC önlenir).
- **Alternatif:** *Haritayı SSR ile render etmeye çalışmak:* Leaflet/Mapbox `window` nesnesi eksikliği nedeniyle sunucu çökmesine yol açtığı için elendi.
- **Ölçülebilir Kabul Kriterleri:**
  1. Sayfa yenilendiğinde hiçbir tema parlaması (FOUC - Flash of Unstyled Content) yaşanmamalı; çerezdeki tema 0ms gecikmeyle uygulanmalıdır.
  2. Masaüstü ve mobil tarayıcılarda harita kaydırma ve filtreleme etkileşimleri 60 FPS akıcılıkta çalışmalıdır.
  3. A11y denetiminde web arayüzü Lighthouse Accessibility skoru ≥ 95 ve WCAG 2.1 AA kontrast oranı ≥ 4.5:1 sağlamalıdır.

#### US-10: Web'den Mobil Uygulamaya Rota / İstasyon Aktarım Köprüsü (QR Kod)
- **Öncelik:** P0 (Must Have)
- **Hikâye:** Bir masaüstü web kullanıcısı olarak, incelediğim istasyonu veya ön planlama yaptığım rotayı tek tuşla/QR kodla telefonumdaki mobil uygulamaya aktarmak istiyorum.
- **Karar & Gerekçe:** Web arayüzü istasyon kimliğini ve rota koordinat dizisini Base64 kodlu kısa bir URL'e dönüştürür (`elektriklioto.com/r/{payload}`) ve modal içinde dinamik QR kod olarak sunar.
- **Alternatif:** *Kullanıcının hesap açıp buluttan senkronize etmesi:* Hesap açma zorunluluğu getirdiği ve KVKK yüzeyini artırdığı için elendi.
- **Ölçülebilir Kabul Kriterleri:**
  1. İstasyon detay sayfasındaki "Telefona Aktar" butonuna basıldığında ekranda dinamik SVG QR kod 100ms içinde belirmelidir.
  2. Mobil cihaz kamerasıyla QR okutulduğunda mobil uygulama doğrudan ilgili istasyon detayını veya rota görünümünü açmalıdır.
  3. Payload boyutu 2 KB sınırını aşmamalı ve URL parametreleri URL-safe base64 standardına uygun olmalıdır.

---

### EPIC 4: Mobil İstemci - Flutter Çapraz Platform (Sprint 3 - P0/P1)

> **Varsayım:** Bu epik kapsamındaki hikâyelerin geliştirilip test edilebilmesi için ortamdaki `flutter` ve `dart` komutlarının "Exec format error" hatasının giderilmesi (ARM64 SDK kurulumu) ön koşuldur.

#### US-11: Kümeleme Destekli Vektör Harita ve Filtreleme Ekranı
- **Öncelik:** P0 (Must Have)
- **Hikâye:** Bir EV sürücüsü olarak, mobil uygulamada harita üzerinde gezinirken istasyonların takılmadan kümelenmesini ve seçtiğim operatöre göre anında filtrelenmesini istiyorum.
- **Karar & Gerekçe:** Harita motoru olarak vektör karo destekli SDK kullanılır. Ağır GeoJSON parse işlemleri UI thread dışında `compute()` / Isolate ile yapılarak 60 FPS korunur.
- **Alternatif:** *Ana UI thread üzerinde GeoJSON parse:* 1000+ pin olduğunda harita kaydırmada kare atlaması (jank) yarattığı için elendi.
- **Ölçülebilir Kabul Kriterleri:**
  1. Mobil uygulamanın soğuk açılış süresi (Cold Start) < 1.8 saniye olmalıdır.
  2. Harita kaydırma ve zoom işlemlerinde frame drop yaşanmamalı; ortalama 60 FPS akıcılık korunmalıdır.
  3. Dokunma hedefleri minimum 48x48pt (`min_touch_target`) boyutunda olmalı, sürüş güvenliğini tehlikeye atmamalıdır.
  4. Operatör filtre çubuğundan marka seçildiğinde haritadaki pinler < 200ms içinde filtrelenmelidir.

#### US-12: Mobil İstasyon Detay Kartı, Boş Veri Rozeti ve Tek Tıkla Yönlendirme
- **Öncelik:** P0 (Must Have)
- **Hikâye:** Bir sürücü olarak, haritada seçtiğim istasyonun alt çekmecesini (bottom sheet) açıp durumunu görmek ve "Şarja Başla" dediğimde ilgili CPO uygulamasına geçmek istiyorum.
- **Karar & Gerekçe:** Soket, güç ve tarife boşken "Operatör Verisi Bekleniyor" gri rozeti gösterilir; uydurma veri sunulmaz. "Uygulamada Aç" butonu ilgili deep-link'i tetikler, yoksa panoya kopyalar.
- **Alternatif:** *Boş alanları gizlemek:* Kullanıcıda teknik arıza algısı yarattığı için açık rozet yaklaşımı seçildi.
- **Ölçülebilir Kabul Kriterleri:**
  1. Haritada pine tıklandığında istasyon alt çekmecesi (bottom sheet) < 150ms içinde akıcı animasyonla açılmalıdır.
  2. Soket/güç bilgisi eksik olduğunda arayüzde kırılma olmadan `Operatör Verisi Bekleniyor` rozeti görüntülenmelidir.
  3. ZES, Trugo, Eşarj için deep-link atlaması işletim sistemi seviyesinde başarıyla tetiklenmeli; uygulama yoksa mağaza yönlendirmesi veya clipboard fallback çalışmalıdır.

#### US-13: Çevrimdışı Harita Dayanıklılığı ve Hive Önbellek Desteği
- **Öncelik:** P1 (Should Have)
- **Hikâye:** Bir sürücü olarak, tünelde veya baz istasyonunun çekmediği otoyol kesitinde ağ bağlantım kopsa dahi haritadaki son istasyonları görebilmek istiyorum.
- **Karar & Gerekçe:** İstemci son ziyaret edilen viewport istasyon özetlerini yerel Hive anahtar-değer deposunda önbelleğe alır. Çevrimdışı modda harita boşaltılmaz, "Çevrimdışı Mod" uyarısıyla son veri sunulur.
- **Alternatif:** *Yalnızca bellek içi RAM önbellek:* Uygulama arka plana atıldığında verinin kaybolması nedeniyle elendi.
- **Ölçülebilir Kabul Kriterleri:**
  1. Cihaz uçak moduna alındığında uygulama çökmeksizin açılmalı ve Hive'da saklanan son istasyon pinleri ekranda görünmelidir.
  2. Arayüzün üst kısmında kalıcı "Çevrimdışı moddasınız - Son bilinen veriler gösteriliyor" uyarı çubuğu görüntülenmelidir.
  3. İnternet bağlantısı geri geldiğinde 3 saniye içinde sessiz delta güncellemesi yapılmalıdır.

---

### EPIC 5: Kitle Kaynaklı Arıza Bildirimi ve Konum Gizliliği (Sprint 4 - P1)

#### US-14: Sıfır Konum Saklama (Zero-Storage) ve Proximity Proof Tabanlı Arıza İhbarı
- **Öncelik:** P1 (Should Have)
- **Hikâye:** Bir sürücü olarak, çalışmayan bir istasyonu ("Arızalı", "Kablo Kesik", "ICEing") topluluğa bildirmek; bunu yaparken kişisel konum geçmişimin sunucuda kaydedilmeyeceğinden emin olmak istiyorum.
- **Karar & Gerekçe:** Kullanıcının ham GPS koordinatları kesinlikle sunucuya gönderilmez veya saklanmaz. İstemci istasyon ile mesafesini lokalde doğrular ve sunucuya tek kullanımlık `proximity_proof` belirteci iletir. Veritabanına sadece `station_uid`, arıza türü ve `proximity_verified: true` bayrağı yazılır.
- **Alternatif:** *Kullanıcı GPS koordinatını sunucu veritabanına kaydetmek:* Zorunlu KVKK ve konum gizliliği kısıtını ihlal ettiği için kesinlikle reddedildi.
- **Ölçülebilir Kabul Kriterleri:**
  1. `station_report` tablosu şemasında kullanıcı koordinatı (`lat`, `lon`, `geom`), IP adresi veya kullanıcı kimlik sütunu kesinlikle bulunmamalıdır (Sıfır Konum Saklama denetimi).
  2. Kullanıcı istasyona 50 metreden daha uzaksa istemci arıza bildirim formunu "İstasyon yakınında değilsiniz" uyarısıyla kilitlemelidir.
  3. `proximity_verified: true` olan geçerli bildirimlerin sayısı belirlenen eşiği (örn: 3 bağımsız ihbar) aştığında istasyon haritada otomatik "Arızalı / Riskli" rozeti almalıdır.
  4. Yanlış arıza ihbar oranı (False Positive) ≤ %3 sınırında tutulmalıdır.

#### US-15: Anonim Cihaz Doğrulaması (Device Attestation) ve Shadow-Ban Motoru
- **Öncelik:** P1 (Should Have)
- **Hikâye:** Bir platform yöneticisi olarak, kötü niyetli botların veya kullanıcıların asılsız arıza ihbarlarıyla haritayı manipüle etmesini engellemek istiyorum.
- **Karar & Gerekçe:** İşlemler için kullanıcıdan e-posta/şifre istenmez; mobil cihaz kimliği Apple App Attest / Play Integrity üzerinden anonim `device_token` ile doğrulanır. Şüpheli cihazlar shadow-ban listesine alınır (istek başarılı döner ancak istasyon puanını etkilemez).
- **Alternatif:** *SMS OTP ile telefon doğrulaması:* Giriş bariyeri yaratması, SMS maliyeti ve KVKK yükümlülüğü nedeniyle Faz 1'den çıkarıldı.
- **Ölçülebilir Kabul Kriterleri:**
  1. Bildirim uç noktası `@fastify/rate-limit` ile dakikada maksimum 5 istek sınırına tabi olmalı; aşımda HTTP 429 dönmelidir.
  2. Shadow-ban uygulanan bir cihazdan gelen arıza bildirimleri HTTP 201 Created döner ancak `is_suppressed: true` olarak işaretlenir ve istasyonun arıza skoruna etki etmez.
  3. Kullanıcı oturum açma veya kayıt zorunluluğu olmadan anonim token ile favori ve bildirim kaydedebilmelidir.

---

### EPIC 6: Veri Toplama, İş Kuyruğu ve Dayanıklılık (Sprint 4 - P1)

#### US-16: PostgreSQL `FOR UPDATE SKIP LOCKED` Tabanlı Asenkron İş Kuyruğu
- **Öncelik:** P1 (Should Have)
- **Hikâye:** Bir sistem mimarı olarak, periyodik veri çekme ve kitle kaynaklı rapor işleme görevlerini API sürecini kilitlemeden arka planda güvenle tüketmek istiyorum.
- **Karar & Gerekçe:** Faz 1'de Redis veya RabbitMQ eklenmez; PostgreSQL üzerinde `sys_job_queue` tablosu açılarak `FOR UPDATE SKIP LOCKED` deseniyle çalışan bağımsız bir `worker` süreci koşturulur.
- **Alternatif:** *Redis + BullMQ:* Ekstra bellek ve konteyner bağımlılığı getirdiği için Faz 1 kapsamından elendi.
- **Ölçülebilir Kabul Kriterleri:**
  1. `worker` süreci `api` sürecinden bağımsız bir Docker konteynerinde veya işletim sistemi sürecinde çalışmalıdır.
  2. Eşzamanlı 4 worker çalışırken aynı iş kaydı birden fazla kez işlenmemeli (kilit çakışması 0 olmalıdır).
  3. Başarısız olan işler üstel geri çekilme (exponential backoff) ile 3 defaya kadar tekrar denenmeli, ardından `failed` durumuna alınmalıdır.

#### US-17: Dış Veri Senkronizasyonu, Circuit Breaker ve Saygılı Kazıma
- **Öncelik:** P1 (Should Have)
- **Hikâye:** Bir veri mühendisi olarak, izinli CPO uç noktalarından veri çekerken kaynakların IP engeline takılmamak ve sistem kesintilerinden etkilenmemek istiyorum.
- **Karar & Gerekçe:** Dış HTTP istekleri `opossum` Circuit Breaker ile sarmalanır; istekler arasına rastgele gecikmeler (jitter) ve rate-limiting uygulanır. 429/5xx hatalarında kaynak 15 dakika soğumaya alınır.
- **Alternatif:** *Gecikmesiz paralel agresif scraping:* IP banlanma ve hukuki risk nedeniyle kesinlikle yasaklandı.
- **Ölçülebilir Kabul Kriterleri:**
  1. Dış kaynak 5 ardışık HTTP 5xx veya 429 hatası verdiğinde Circuit Breaker "OPEN" durumuna geçmeli ve 15 dakika boyunca yeni istek yapmamalıdır.
  2. İstekler arasında rastgele 500ms - 2000ms gecikme (jitter) uygulanmalıdır.
  3. CPO verisi başarıyla çekildiğinde istasyonun son güncelleme zaman damgası güncellenmelidir.

#### US-18: Veri Kaynağı Sağlık İzleme ve 24 Saat Tazelik Rozeti
- **Öncelik:** P1 (Should Have)
- **Hikâye:** Bir EV sürücüsü olarak, incelediğim istasyonun verisinin ne kadar taze olduğunu bilmek; bayat veriye göre yola çıkıp mağdur olmamak istiyorum.
- **Karar & Gerekçe:** Herhangi bir veri kaynağından 24 saat boyunca güncelleme alınamadığında sistem hata vermez; arayüzde istasyon kartına "Son güncelleme: X saat önce" nötr gri rozeti eklenir ve dahili kaynak sağlığı tablosuna uyarı yazılır.
- **Alternatif:** *Bayat istasyonu haritadan tamamen silmek:* İstasyonun fiziksel varlığı devam ettiği için sürücüyü yanıltmamak adına silinmez, etiketlenir.
- **Ölçülebilir Kabul Kriterleri:**
  1. Son güncelleme zamanı > 24 saat olan istasyonlarda arayüzde `Son güncelleme: X gün/saat önce` ibaresi görüntülenmelidir.
  2. Veri kaynağı kesintiye uğradığında platform genel arama ve harita işlevlerini kesintisiz (%100 uptime) sürdürmelidir.
  3. Kaynak sağlığı paneli (veya logu), 24 saattir yanıt vermeyen kaynakları listelemelidir.

---

## 4. Tamamlanma Tanımı (Definition of Done - DoD)

Bir kullanıcı hikâyesinin tamamlandı (Done) kabul edilebilmesi için aşağıdaki kalite kapılarından eksiksiz geçmesi şarttır:

1. **Fonksiyonel ve Ölçülebilir Test:** Hikayedeki tüm kabul kriterleri otomatik entegrasyon veya uçtan uca (E2E) testlerle doğrulanmış olmalıdır.
2. **Performans Bütçesi:** Spatial sorgularda sunucu içi veritabanı yanıt süresi p95 < 40ms, mobil haritada 60 FPS akıcılık korunmalıdır.
3. **Erişilebilirlik ve Tasarım Bütünlüğü:** Lighthouse a11y skoru ≥ 95, metin kontrastı ≥ 4.5:1, mobil dokunma hedefi ≥ 48x48pt olmalı; `design_critic` onayı bulunmalıdır.
4. **Sözleşme Uyumu:** OpenAPI 3.1 şeması güncellenmiş ve istemci DTO'ları CI hattında hatasız derlenmiş olmalıdır (`spectral` 0 error).
5. **Güvenlik ve KVKK Denetimi:** Sunucu loglarında, önbelleğinde veya veritabanında kullanıcı GPS koordinat kaydı tutulmadığı statik analizle doğrulanmış olmalıdır.
6. **Lisans Sınırı Uyumu:** Arayüzde veya API çıktılarında "Lisanslı Şarj Operatörü" izlenimi verecek hiçbir ibare, faturalandırma veya doğrudan ödeme kodu bulunmamalıdır.
