# Kabul Kriterleri Dokümanı: elektriklioto.com (Faz 1)

> **Belge Sürümü:** 1.0.0-faz1  
> **Rol:** Product Owner  
> **Kapsam:** Faz 1 Tüm Kullanıcı Hikâyeleri ve Teknik Kabuller için Ölçülebilir Kriterler  
> **Doğruluk Kaynakları:** `proje_kapsami.md`, `workspace/docs/teknik_mimari_dokumani.md`

---

## 1. Zorunlu Kısıtlar, Çatışmalar ve Varsayımlar

Aşağıdaki maddeler sistemin temel kısıtlarıdır; tüm kabul kriterleri bu zemin üzerinde doğrulanır:
- **Alan Adı ve Marka:** `elektriklioto.com` tüm web, API (`api.elektriklioto.com`) ve mobil varlıkların tek çatısıdır (zorunlu).
- **Web Çatısı:** Nuxt.js / Vue.js (SSR/SSG uyumlu) Fastify API'sini tüketir (zorunlu).
- **Backend Çatısı:** Node.js / TypeScript üzerinde Fastify framework (zorunlu).
- **Veritabanı:** `postgis/postgis:16-3.4` Docker üzerinde çalışır; `docker-compose.yml` ile yönetilir (zorunlu).
- **Lisans Sınırı:** Platform hiçbir aşamada "Lisanslı Şarj Operatörü" statüsü alamaz; EPDK elektrik satışı ve faturalama yapamaz (zorunlu).
- **Konum Gizliliği:** Kullanıcı GPS koordinatları sunucuda saklanamaz; anlık in-memory işlenir, geçmiş güzergah tutulamaz (zorunlu).
- **Şema Göçü:** Üretimde elle DDL yasaktır; yalnızca sürümlenmiş migration dosyaları kullanılır (zorunlu).
- **Tasarım Bütünlüğü:** `tasarim_sistemi.md` token'ları tek kaynaktır; Nuxt CSS ve Flutter Dart çıktıları tek derleme betiğiyle senkronize edilir (zorunlu).
- **Tohum Veri:** EPDK 16.788 istasyon ve 179 marka içeren `istasyonlar.json` kanonik çapadır; `lat`/`lon` mevcut kabul edilir, geocoding yapılmaz (zorunlu).
- **Eksik Veri:** Soket tipi, güç, tarife ve canlı doluluk Faz 1 başlangıcında `NULL` kabul edilir; sistem bu alanlar boşken çalışacak şekilde modellenir (zorunlu).

> **ÇATIŞMA:** "Mobil istemci Flutter ile geliştirilecektir. (zorunlu)" kısıtı teknik olarak imkânsızdır. Ortam raporunda `flutter` ve `dart` komutları "Exec format error" nedeniyle BOZUK durumdadır. İstemcinin geliştirilebilmesi için derleme ortamının onarımı zorunludur.

> **ÇATIŞMA:** "Paket yöneticisi tekliği: Ortamda pnpm 10.20.0 ölçülmüştür" kısıtı ortam gerçeğiyle uyuşmamaktadır. Güncel ortam raporunda `pnpm` YOK olarak listelenmiştir. Paylaşımlı workspace mimarisi için KURULUM GEREKİYOR: pnpm.

> **Varsayım:** Flutter onarılana ve `pnpm` kurulana kadar, backend ve web modüllerinin kabul kriterleri ortamda kurulu Node v22 ve npm ile test edilebilir; mobil kabul testleri Flutter SDK onarımının hemen ardından CI üzerinde işletilecektir.

> **Varsayım:** `istasyonlar.json` dosyasındaki 16.788 kaydın en az %99'u geçerli Türkiye sınırları koordinatlarına sahiptir; geçersiz kalan en fazla %1'lik dilim `seed_rejects` tablosuna aktarılarak ayıklanacaktır.

---

## 2. Kalite Kapıları ve Bitiş Tanımı (Definition of Done - DoD)

Bir kullanıcı hikâyesinin veya teknik görevin tamamlanmış kabul edilmesi için aşağıdaki 6 kapıdan eksiksiz geçmesi şarttır:
1. **Sözleşme Kapısı:** OpenAPI 3.1 şemasında tanımlanmamış hiçbir rota kabul edilemez; `spectral lint` ve istemci kod üretiminde sıfır uyarı/hata kuralı geçerlidir.
2. **Spatial Performans Kapısı:** PostGIS BBox spatial sorgusu 250 eşzamanlı sanal kullanıcı ve 16.788 istasyon altında p95 < 40ms sürede yanıt vermelidir.
3. **Tasarım ve Erişilebilirlik Kapısı:** `tasarim_sistemi.md` token'ları dışında hardcoded stil değeri bulunamaz; WCAG 2.1 AA kontrast ≥ 4.5:1, dokunma alanı masaüstünde ≥ 44x44 CSS px, mobilde ≥ 48x48 pt olmalıdır.
4. **KVKK / Konum Gizliliği Kapısı:** API erişim loglarında, veritabanında veya kalıcı dosyalarda ham kullanıcı GPS koordinatı bulunamaz (otomatik test log taramasında sıfır eşleşme).
5. **Eksik Veri Güvenliği Kapısı:** Soket tipi, güç, tarife ve anlık doluluk `null` olduğunda sistem çökmez; "Operatör Verisi Bekleniyor" rozeti ve katkı çağrısı (CTA) render edilir.
6. **Test Otomasyon Kapısı:** Çekirdek modüllerde (seed, spatial bbox, proximity_proof, deep-link resolver) birim ve entegrasyon test kapsamı (coverage) ≥ %85 olmalıdır.

---

## 3. Epik 1: Veri Tohumlama ve Kanonik İstasyon Kimliği (Seed Pipeline)

### PO-101: `istasyonlar.json` İdempotent Tohumlama
- **Karar:** 16.788 EPDK kaydı tek bir idempotent CLI komutuyla (`npm run db:seed`) veritabanına aktarılır.
- **Gerekçe:** Tekrarlanan seed işlemlerinde veri kirliliğini ve çift kayıt oluşmasını engellemek.
- **Kabul Kriterleri:**
  - `GIVEN` temiz bir PostgreSQL + PostGIS veritabanı, `WHEN` `npm run db:seed` komutu ilk kez koşturulduğunda, `THEN` `station` tablosuna en az 16.620 (%99) kayıt başarıyla yazılmalıdır.
  - `GIVEN` tohumlama tamamlanmış bir veritabanı, `WHEN` aynı komut ikinci kez çalıştırıldığında, `THEN` tablo satır sayısı %0 değişmeli, hata üretmeden `ON CONFLICT DO UPDATE` (upsert) ile sonlanmalıdır.
  - `GIVEN` Türkiye sınır kutusu (`ST_MakeEnvelope(25.5, 35.5, 45.0, 42.5, 4326)`) dışında kalan, koordinatı `(0,0)` olan veya ters girilmiş (`lat > 45` vb.) kayıtlar, `WHEN` tohumlama çalıştığında, `THEN` ana tabloya alınmamalı, reddedilme gerekçesiyle birlikte `seed_rejects` tablosuna kaydedilmelidir.
  - `THEN` her kayıt için dahili birincil anahtar UUIDv7 (`station_uid`), EPDK resmî numarası ise `istasyon_no` (`ŞRJ/xxxx`) sütununda `UNIQUE` doğal anahtar olarak saklanmalıdır.
  - `THEN` `istasyon_no` ve istasyon adları Unicode NFC formatında normalize edilmelidir; Türkçe `Ş/ş`, `İ/i`, `I/ı`, `Ğ/ğ` karakterleri bozulmadan UTF-8 olarak saklanmalıdır.

### PO-102: 179 Operatör Marka Sözlüğü Normalizasyonu
- **Karar:** Operatör isimleri istasyon tablosunda serbest metin olarak tutulamaz; normalize `operator` tablosuna bağlanır.
- **Gerekçe:** Deep-link yönetimi, SEO operatör rotaları ve filtrelerin tek noktadan yönetilmesi.
- **Kabul Kriterleri:**
  - `GIVEN` tohumlama tamamlandığında, `THEN` `operator` tablosunda tam olarak 179 benzersiz marka kaydı bulunmalıdır.
  - `THEN` her operatör kaydı `slug` (URL uyumlu küçük harf), `name` (resmî unvan), `deep_link_config` (JSONB) ve `is_active` (boolean) alanlarını eksiksiz taşımalıdır.
  - `THEN` hiçbir `station` satırında `operator_id` alanı `NULL` olamaz; yabancı anahtar kısıtı (`FK`) doğrulanmalıdır.

---

## 4. Epik 2: Mekânsal Bounding Box (BBox) ve Kümeleme API'si

### PO-201: Viewport Tabanlı İstasyon ve Küme Listeleme
- **Karar:** Harita sorguları istemci ekran koordinatlarına (`bbox`) göre filtrelenir; düşük zoom seviyelerinde sunucu tarafı kümeleme uygulanır.
- **Gerekçe:** 16.788 istasyonun tek seferde istemciye aktarılmasının yaratacağı ağ ve bellek tıkanıklığını önlemek.
- **Kabul Kriterleri:**
  - `GIVEN` istemcinin gönderdiği harita koordinat kutusu (`bbox=min_lon,min_lat,max_lon,max_lat` ve `zoom`), `WHEN` `GET /api/v1/stations` çağrıldığında, `THEN` PostGIS spatial sorgusu (`ST_MakeEnvelope` ve `GIST` indeks kullanımıyla) p95 < 40ms sürede tamamlanmalıdır.
  - `GIVEN` 250 eşzamanlı sanal istemci (k6 performans testi), `WHEN` rastgele Türkiye koordinatlarında harita kaydırma sorguları gönderdiğinde, `THEN` HTTP 200 başarı oranı ≥ %99.9 olmalı ve p95 yanıt süresi 40ms sınırını aşmamalıdır.
  - `GIVEN` `zoom < 11` seviyesindeki harita istekleri, `WHEN` API'ye ulaştığında, `THEN` tekil istasyonlar yerine PostGIS `ST_SnapToGrid` ile üretilmiş küme özetleri (`cluster_id`, `count`, `center_geom`) dönmeli; dönen dizi boyutu 250 nesneyi geçmemelidir.
  - `GIVEN` hatalı koordinat parametreleri (ör. `min_lon > max_lon` veya sayısal olmayan girdi), `WHEN` API çağrıldığında, `THEN` API `400 Bad Request` yanıtı ve RFC 7807 problem detay formatında hata dönmelidir.

### PO-202: Zaman Damgalı Değişiklik Senkronizasyonu (Delta Polling)
- **Karar:** Açık harita ekranlarında canlı güncellemeler için tam veri yerine zaman damgası farkı (`since`) sorgulanır.
- **Gerekçe:** Gereksiz bant genişliği tüketimini önlemek.
- **Kabul Kriterleri:**
  - `GIVEN` `GET /api/v1/stations/delta?since={epoch_timestamp}` isteği, `WHEN` sunucuya iletildiğinde, `THEN` yalnızca belirtilen zamandan sonra güncellenen veya arıza durumu değişen istasyon kayıtları dönmelidir.
  - `GIVEN` değişiklik olmayan bir zaman damgası sorgulandığında, `THEN` boş bir liste ve `304 Not Modified` veya `200 OK []` dönmeli; gereksiz veritabanı yükü oluşmamalıdır.

---

## 5. Epik 3: Eksik Veri (Nullable DTO) ve Arayüz Dayanıklılığı

### PO-301: Nullable Veri Modeli ve "Operatör Verisi Bekleniyor" Durumu
- **Karar:** Soket tipi, güç (kW), tarife ve canlı doluluk alanları Faz 1'de kesinlikle uydurma (mock) değerlerle doldurulamaz; `null` döner.
- **Gerekçe:** Kullanıcıya hatalı bilgi vererek yolda bırakma riskini ve EMP itibar kaybını önlemek.
- **Kabul Kriterleri:**
  - `GIVEN` `GET /api/v1/stations/{id}` API yanıtı, `THEN` `connectors`, `power_kw`, `tariffs` ve `occupancy` alanları için açıkça `null` değeri taşımalıdır; şemada bu alanlar `nullable: true` tanımlanmalıdır.
  - `GIVEN` web veya mobil istasyon detay sayfası, `WHEN` ilgili alanlar `null` olarak yüklendiğinde, `THEN` sayfa veya bileşen kesinlikle çökmemeli (no runtime exception); alanın yerine nötr gri renkte "Operatör Verisi Bekleniyor" rozeti render edilmelidir.
  - `THEN` rozetin yanında "Bilgi Ekle / Bildir" aksiyon butonu yer almalı; tıklandığında kitle-kaynaklı katkı modalı açılmalıdır.
  - `GIVEN` arama ve filtreleme bileşenleri, `WHEN` kullanıcı "Yalnızca Boş Soketler" veya "120kW+ DC" filtresi seçtiğinde, `THEN` filtre alanında "Veri Hazırlanıyor" rozeti gösterilmeli ve sonuç listesinde kısıtlı arama uyarısı (toast) verilmelidir.

---

## 6. Epik 4: Akıllı Derin Bağlantı (Deep-Linking) ve Clipboard Fallback

### PO-401: CPO Mobil Derin Bağlantı Yönlendirmesi
- **Karar:** Kullanıcının seçtiği soket için ilgili operatörün uygulamasına doğrudan atlama bağlantısı tetiklenir; desteklenmeyen durumlarda pano (clipboard) kullanılır.
- **Gerekçe:** 30+ uygulama arasında kullanıcıyı soket arama zahmetinden kurtarmak.
- **Kabul Kriterleri:**
  - `GIVEN` kullanıcının cihazında ilgili operatörün uygulaması (ZES, Trugo, Eşarj) yüklü ise, `WHEN` "Operatörde Aç / Şarja Başla" butonuna basıldığında, `THEN` operatör uygulaması hedef istasyon/soket ekranı ile doğrudan açılmalıdır (başarı oranı ≥ %90).
  - `GIVEN` ilgili operatörün uygulaması cihazda yüklü değilse, `WHEN` butona basıldığında, `THEN` istemci en geç 300ms içinde doğrudan ilgili işletim sistemi mağazasına (App Store / Google Play) yönlendirmelidir.
  - `GIVEN` derin bağlantı şeması harici parametre desteklemeyen operatörler, `WHEN` kullanıcı yönlendirmeyi başlattığında, `THEN` istasyon kodu (`ŞRJ/xxxx`) otomatik olarak sistem panosuna (`clipboard`) kopyalanmalı, arayüzde "İstasyon kodu panoya kopyalandı, uygulamada yapıştırabilirsiniz" bildirimi (toast) gösterilmeli ve operatörün web/mağaza linki açılmalıdır.
  - `THEN` operatör URL şemaları mobil uygulamaya sabitlenemez (hardcoded); API'deki `operator.deep_link_config` üzerinden dinamik beslenmelidir.

---

## 7. Epik 5: Web Platformu (Nuxt 3 SSR, SEO ve Tema Yönetimi)

### PO-501: İl, İlçe ve İstasyon Sayfaları SEO & Performansı
- **Karar:** İstasyon ve il/ilçe katalog sayfaları Nuxt Nitro motoru üzerinden SSR/SSG ile sunulur; interaktif harita `<ClientOnly>` ile hydrate edilir.
- **Gerekçe:** Organik arama motoru trafiğini maksimize etmek ve arama botlarının içeriği eksiksiz dizine eklemesini sağlamak.
- **Kabul Kriterleri:**
  - `GIVEN` il/ilçe katalog sayfaları (`/istanbul/kadikoy/sarj-istasyonlari`) veya detay sayfaları (`/{operator}/{slug}`), `WHEN` HTTP GET isteği gönderildiğinde, `THEN` sunucudan dönen ham HTML yanıtı içinde istasyon listesi, adresler, dinamik OpenGraph meta etiketleri ve Schema.org `ChargingStation` JSON-LD yapılandırılmış verisi eksiksiz bulunmalıdır.
  - `GIVEN` Google Lighthouse mobil performans denetimi, `WHEN` herhangi bir istasyon sayfasında koşturulduğunda, `THEN` SEO Skoru ≥ 90, Erişilebilirlik Skoru ≥ 95, First Contentful Paint (FCP) < 1.2s ve Cumulative Layout Shift (CLS) < 0.1 olmalıdır.
  - `GIVEN` harita bileşeni, `THEN` yalnızca istemci tarafında (`<ClientOnly>`) ayağa kalkmalıdır; sunucu render aşamasında `window` veya `document` referans hatası vermemelidir.

### PO-502: Tema FOUC Önleme
- **Karar:** Koyu tema tercihi SSR aşamasında çerezden (cookie) veya sistem tercihinden okunup `<html>` etiketine render öncesi eklenir.
- **Gerekçe:** Gece sürüşü yapan kullanıcıların gözünü yoran beyaz parlama (FOUC) etkisini tamamen yok etmek.
- **Kabul Kriterleri:**
  - `GIVEN` istemci çerezinde `theme=dark` veya tarayıcıda `prefers-color-scheme: dark` ayarlı olduğunda, `WHEN` sayfa yüklendiğinde, `THEN` `<html>` etiketine `class="dark"` sunucu tarafında eklenmiş olmalı; sayfa açılışındaki parlama süresi tam olarak 0 ms olmalıdır.

---

## 8. Epik 6: Mobil İstemci Harita Akıcılığı ve Çevrimdışı Dayanıklılık

### PO-601: Harita Kaydırma Akıcılığı (60 FPS) ve Isolate Parsing
- **Karar:** API'den gelen büyük GeoJSON yanıtları Dart Isolate (`compute()`) ile ayrıştırılır.
- **Gerekçe:** Harita kaydırma sırasında ana UI thread'inin kilitlenmesini engellemek.
- **Kabul Kriterleri:**
  - `GIVEN` harita ekranında hızlı kaydırma (pan/zoom) yapılırken, `WHEN` 500+ istasyon içeren GeoJSON yanıtı işlendiğinde, `THEN` arayüz render hızı 60 FPS altına düşmemeli (jank süresi < 16.6ms) olmalıdır.
  - `GIVEN` mobil uygulamanın soğuk açılışı (cold start), `WHEN` uygulama simgesine basıldığında, `THEN` harita arayüzü ve ilk pinler en geç 1.8 saniye içinde ekranda etkileşime hazır hale gelmelidir.

### PO-602: Çevrimdışı Harita Dayanıklılığı
- **Karar:** Ziyaret edilen istasyon özetleri yerel Hive anahtar-değer deposunda saklanır.
- **Gerekçe:** Tünel, otoyol veya kırsal bölgelerde hücresel veri koptuğunda sürücünün ekransız kalmasını önlemek.
- **Kabul Kriterleri:**
  - `GIVEN` cihaz uçak moduna alındığında veya bağlantı koptuğunda, `WHEN` kullanıcı haritayı açtığında, `THEN` uygulama çökmemeli; önbellekteki son istasyonlar gösterilmeli ve ekranda "Çevrimdışı Mod - Veriler Güncel Olmayabilir" durum rozeti belirmelidir.

---

## 9. Epik 7: Kitle Kaynaklı Arıza Bildirimi, Proximity Proof ve Sıfır Konum Saklama

### PO-701: Proximity Proof Tabanlı Arıza Bildirimi ve Sıfır Konum Saklama
- **Karar:** Arıza bildirimi için kullanıcının istasyona yakınlığı (< 50 metre) istemcide hesaplanır; API'ye ham koordinat yerine tek kullanımlık `proximity_proof` iletilir.
- **Gerekçe:** KVKK uyarınca kullanıcının GPS geçmişini saklamadan sahte/kötü niyetli bildirimleri engellemek.
- **Kabul Kriterleri:**
  - `GIVEN` arıza bildirimi göndermek isteyen bir kullanıcı, `WHEN` cihaz GPS konumu ile istasyon konumu arasındaki mesafe < 50 metre ise, `THEN` istemci doğrulamayı tamamlamalı ve HMAC-SHA256 imzalı tek kullanımlık `proximity_proof` belirtecini API'ye göndermelidir.
  - `GIVEN` arıza bildirimi API'ye ulaştığında (`POST /api/v1/stations/{id}/reports`), `WHEN` kayıt başarıyla işlendiğinde, `THEN` veritabanı `station_report` tablosuna yalnızca `station_id`, `issue_type`, `proximity_verified: true` ve zaman damgası yazılmalıdır; kullanıcının enlem, boylam veya IP adresi kesinlikle veritabanına ya da log dosyalarına YAZILAMAZ.
  - `GIVEN` mesafe > 50 metre olduğunda, `WHEN` kullanıcı bildirim göndermeyi denerse, `THEN` arayüz kullanıcıya istasyonun yakınında olmadığını belirtmeli; bildirim istasyonun güvenilirlik skorunu etkilemeyen "doğrulanmamış" statüsüne alınmalıdır.
  - `GIVEN` son 2 saat içinde aynı istasyon için 3 bağımsız doğrulanmış arıza bildirimi yapıldığında, `THEN` istasyon haritada otomatik olarak "Arızalı / Riskli" uyarı rozeti almalıdır.
  - `THEN` kullanıcı bildirimleriyle arızalı işaretlenen istasyonların hatalı kapatılma oranı (false positive) doğrulama kümesinde ≤ %3 olmalıdır.

### PO-702: Anonim Cihaz Kimliği (Device Attestation) ve Spam Engelleme
- **Karar:** Favorileme ve bildirim için üyelik zorunluluğu aranmaz; anonim cihaz kimliği (`device_uid`) kullanılır.
- **Gerekçe:** Kullanıcı sürtünmesini ve KVKK veri saklama yükümlülüğünü en aza indirmek.
- **Kabul Kriterleri:**
  - `GIVEN` harita arama, filtreleme veya bildirim işlemleri, `THEN` kullanıcıdan zorunlu e-posta, isim veya telefon kaydı istememelidir; Apple App Attest veya Google Play Integrity API tabanlı `device_uid` ile işlem yapılmalıdır.
  - `GIVEN` tek bir `device_uid` veya IP adresi, `WHEN` 1 dakika içinde 5'ten fazla arıza bildirimi gönderirse, `THEN` Fastify rate-limiter tarafından `429 Too Many Requests` ile engellenmelidir; asılsız bildirim tekrarında cihaz sessizce shadow-ban listesine alınmalıdır.

---

## 10. Epik 8: Web'den Mobil Uygulamaya Rota Aktarımı

### PO-801: QR Kod ve Base64 URL ile Rota Senkronizasyonu
- **Karar:** Web sitesinde seçilen duraklar sıkıştırılmış Base64 URL'e ve dinamik QR koda dönüştürülerek mobil uygulamaya aktarılır.
- **Gerekçe:** Kullanıcı girişi ve bulut veritabanı senkronizasyonu kurmadan masaüstü-mobil köprüsü kurmak.
- **Kabul Kriterleri:**
  - `GIVEN` web harita arayüzünde seçilen durak listesi, `WHEN` "Telefona Aktar" butonuna basıldığında, `THEN` durakların `station_uid` dizisini içeren kısa URL (`elektriklioto.com/r/{base64}`) ve buna bağlı QR kod en geç 200ms içinde ekranda render edilmelidir.
  - `GIVEN` mobil cihaz kamerasıyla QR kod taratıldığında, `WHEN` mobil uygulama yüklü ise, `THEN` uygulama Universal Link / App Link üzerinden doğrudan açılmalı ve aktarılan istasyonlar harita üzerinde rota state'ine en geç 500ms içinde yüklenmelidir.
  - `GIVEN` mobil uygulama yüklü değilse, `WHEN` QR kod taratıldığında, `THEN` mobil web sayfası açılmalı ve sayfa tepesinde uygulamayı indirme bağlantısı (smart banner) sunulmalıdır.

---

## 11. Epik 9: Tasarım Token Senkronizasyonu ve WCAG 2.1 AA Erişilebilirlik

### PO-901: Tekil Tasarım Token Derleme Hattı
- **Karar:** Tüm görsel tasarım değerleri `packages/design-tokens/tokens.json` içinde tutulur; derleme betiği web CSS ve mobil Dart sınıflarını üretir.
- **Gerekçe:** Arayüz geliştiricinin keyfi görsel karar vermesini engellemek ve web-mobil tasarım birliğini garanti etmek.
- **Kabul Kriterleri:**
  - `GIVEN` `tokens.json` dosyasındaki renk, tipografi, boşluk ve yarıçap tanımları, `WHEN` `npm run build:tokens` komutu çalıştırıldığında, `THEN` web için `tokens.css` (CSS değişkenleri) ve mobil için `tokens.dart` (statik sınıflar) eksiksiz üretilmelidir.
  - `GIVEN` CI derleme hattı, `WHEN` web CSS veya mobil Dart kodlarında `tokens.json` içinde tanımlanmamış bir renk HEX kodu (`#xxxxxx`) veya piksel değeri tespit ederse, `THEN` linter hata vermeli ve CI derlemesi durdurulmalıdır.

### PO-902: WCAG 2.1 AA Erişilebilirlik ve Dokunma Alanı Doğrulaması
- **Karar:** Tasarım denetimi için WCAG 2.1 AA seviyesi taban kabul edilir.
- **Gerekçe:** Sürüş esnasında ve farklı ışık koşullarında güvenli ve erişilebilir kullanım sağlamak.
- **Kabul Kriterleri:**
  - `GIVEN` tüm tıklanabilir buton, kart ve ikonlar, `THEN` dokunma hedefi web arayüzünde en az 44x44 CSS pikseli, mobil arayüzde ise en az 48x48 pt olmalıdır.
  - `GIVEN` açık ve koyu temalardaki tüm metinler, `THEN` arka plan kontrast oranı gövde metinlerinde en az 4.5:1, büyük başlıklarda en az 3:1 olmalı; Lighthouse a11y denetiminde sıfır kontrast ihlali çıkmalıdır.

---

## 12. Epik 10: Dış Kaynak Senkronizasyonu ve Circuit Breaker

### PO-1001: Worker Dayanıklılığı ve Circuit Breaker
- **Karar:** Kamusal CPO uç noktalarından veri çeken worker görevleri `opossum` kütüphanesi ile korunan Circuit Breaker deseniyle çalışır.
- **Gerekçe:** Dış kaynakların çökmesi veya IP engeli getirmesi durumunda platformun kilitlenmesini önlemek.
- **Kabul Kriterleri:**
  - `GIVEN` harici CPO uç noktalarına yapılan istekler, `WHEN` hedef sunucu ardışık 5 istek boyunca HTTP 429 veya 5xx dönerse, `THEN` Circuit Breaker devreye girmeli (open circuit) ve ilgili CPO uç noktasına tüm istekler tam 15 dakika boyunca durdurulmalıdır.
  - `GIVEN` harici kaynaklara atılan istekler, `THEN` rastgele gecikmeler (jitter: 1000-3000ms) ve üstel geri çekilme (exponential backoff) kuralına uymalıdır.
  - `GIVEN` tekil bir CPO veri kaynağı 24 saat boyunca yanıt vermediğinde, `THEN` platform genelinde hata oluşmamalı; arayüzde ilgili istasyonlar "Son güncelleme: X saat önce" rozetiyle sunulmaya devam etmeli ve izleme panelinde kaynak sağlığı alarmı üretilmelidir.

---

## 13. Kabul Kriterleri Doğrulama Matrisi ve Otomasyon Özeti

Aşağıdaki matris, CI/CD boru hattında her sürüm öncesi otomatik olarak koşturulacak kapı testlerini özetler:

| Epik Kodu | Epik Tanımı | Birincil Doğrulama Yöntemi | Başarı / Red Kriteri |
|---|---|---|---|
| **EP-01** | Tohumlama & Normalizasyon | Idempotent Seed CLI Testi | Kayıt yükleme ≥ %99, Mükerrerlik = %0 |
| **EP-02** | Spatial BBox & API | k6 Yük Testi (250 VU) | p95 < 40ms, HTTP 200 ≥ %99.9 |
| **EP-03** | Nullable DTO Sözleşmesi | Spectral Lint / Jest Entegrasyon | Null alanlarda sahte/mock veri = 0 |
| **EP-04** | CPO Derin Bağlantı | Mobil E2E / URL Scheme Testi | Doğru ekran açılma başarısı ≥ %90 |
| **EP-05** | Web SEO & SSR | Lighthouse CI Denetimi | SEO ≥ 90, a11y ≥ 95, FCP < 1.2s |
| **EP-06** | Mobil 60 FPS & Hive | Flutter Driver / DevTools | 60 FPS (jank < 16.6ms), Cold Start < 1.8s |
| **EP-07** | Proximity Proof & KVKK | Coğrafi Test & Log Taraması | Ham GPS logu = 0, Yanlış ihbar ≤ %3 |
| **EP-08** | Rota QR Köprü | E2E Entegrasyon Testi | QR tarama → State yüklenme < 500ms |
| **EP-09** | Tasarım Token & A11y | Token Linter + Pa11y | Token dışı değer = 0, Kontrast ≥ 4.5:1 |
| **EP-10** | Circuit Breaker & Worker | Mock Server Simülasyonu | 5 hata → 15 dk sessizlik, IP ban = 0 |
