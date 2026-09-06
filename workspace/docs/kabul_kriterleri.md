> **Varsayım:** Bu doküman `proje_kapsami.md` (v.mevcut) ve `teknik_mimari_dokumani.md` (v1.0) referans alınarak üretilmiştir; iki doküman çelişirse mimari doküman teknik detayda, kapsam dokümanı iş kuralında esas alınmıştır.

# Kabul Kriterleri — elektriklioto.com (Faz 1)

Her madde "Verildiğinde / Olduğunda / O zaman" (Given/When/Then) formatında, sayısal veya ikili (evet/hayır) doğrulanabilir kriterler içerir. QA ve backlog'daki hikâyeler bu numaralara referans verir (AC-XX).

## 1. Harita & Viewport Sorgusu

- **AC-01** Verildiğinde bir `bbox` + `zoom` parametresi, `GET /stations` çağrıldığında → yanıt p95 < 40ms (sunucu içi işlem süresi, ağ RTT hariç), 15.000 soket / 500.000 durum kaydı tohumlanmış veri ve 250 eşzamanlı istemci yükü altında.
- **AC-02** Olduğunda `zoom < 10` → yanıt tekil pin değil, `ST_SnapToGrid` ile üretilmiş kümelenmiş (cluster) sonuç döner; kümedeki istasyon sayısı alanı zorunludur.
- **AC-03** Olduğunda ikinci bir `GET /availability?bbox=&since=<timestamp>` çağrısı → yalnızca `since` sonrası değişen kayıtlar döner; `since` parametresi eksikse yanıt kodu 400.
- **AC-04** Mobilde harita kaydırma sırasında ölçülen kare hızı ≥ 60 FPS (jank-free); GeoJSON/DTO çözümleme ana thread dışında (Isolate/`compute()`) çalıştığı için ana thread bloklanma süresi 0ms.
- **AC-05** Olduğunda ağ bağlantısı kesilir → mobil istemci çökmez; Hive `station_pin` kutusundaki son bilinen pinler "çevrimdışı" bandıyla gösterilmeye devam eder.

## 2. Filtreleme

- **AC-06** Verildiğinde güç (AC22/DC60/DC120+), soket tipi (CCS/CHAdeMO/Type2), operatör ve tesis tipi filtrelerinden herhangi bir kombinasyonu → `GET /stations` sorgu string'ine parametre olarak geçer ve yalnızca eşleşen istasyonlar döner (sunucu tarafı filtreleme; istemci tarafı post-filter yok).
- **AC-07** Olduğunda "yalnızca çalışır durumdaki soketler" filtresi aktif → `status = 'decommissioned'` olan kayıtlar hiçbir zaman dönmez (kısmi indeksle garanti altına alınan davranış).

## 3. İstasyon & Soket Detayı, Tarife Şeffaflığı

- **AC-08** Verildiğinde `GET /stations/:uid` → yanıt her tarife kaydında `source`, `fetched_at`, `confidence` alanlarını zorunlu olarak içerir; bu üç alandan biri eksikse şema doğrulaması yanıtı reddeder (kontrat testi).
- **AC-09** Olduğunda arayüzde tarife gösterilir → "son güncelleme: X" rozeti `fetched_at`'ten hesaplanarak her zaman görünür; rozet olmadan fiyat gösterilemez.
- **AC-10** Olduğunda bir kaynak 24 saat yanıt vermez → ilgili istasyon silinmez, `read_model.freshness_seconds` artar, arayüzde "son güncelleme: X saat önce" gösterilir ve kaynak sağlığı panelinde alarm oluşur; kullanıcıya hata mesajı gösterilmez.

## 4. Derin Bağlantı (Deep-Link)

- **AC-11** Verildiğinde ZES, Trugo veya Eşarj için soket seçimi → `GET /deeplink/:socketId` çağrısı, ilgili operatör uygulamasını doğru istasyon/soket ekranında açar; bu üç operatör için ölçülen başarı oranı > %90 (manuel test seti, ≥30 örnek/operatör).
- **AC-12** Olduğunda hedef uygulama cihazda kurulu değil → mağaza sayfasına yönlendirme yapılır (uygulama çökmez).
- **AC-13** Olduğunda bir operatörün URL şeması değişir → düzeltme yalnızca backend konfigürasyonu güncellenerek yapılır; mobil uygulama sürüm yükseltmesi gerekmez (dağıtım gerektirmeyen düzeltme kanıtlanır).

## 5. Web (Nuxt) SEO & Performans

- **AC-14** Verildiğinde herhangi bir `/{il}/{ilce}/sarj-istasyonlari` veya istasyon detay sayfası → Google Lighthouse SEO skoru > 90 ve First Contentful Paint < 1.2 sn (3G Fast throttling profili, mobil).
- **AC-15** Olduğunda sayfa kaynağı görüntülenir (view-source, JS çalışmadan) → SSR/ISR çıktısında istasyon adı, adres ve `LocalBusiness`/`Place` JSON-LD bloğu mevcuttur (client-only render değil).
- **AC-16** Olduğunda `sitemap.xml` istenir → tüm katalog uçları (il/ilçe/otoyol/operatör) otomatik üretilmiş listede yer alır; elle eklenen statik sitemap kabul edilmez.
- **AC-17** Olduğunda harita bileşeni yüklenir → yalnızca görünüm alanına girince dinamik import tetiklenir (network sekmesinde ilk yüklemede harita JS paketinin ayrı chunk olarak, viewport'a girmeden istenmediği doğrulanır).

## 6. Web → Mobil Köprü

- **AC-18** Verildiğinde web istasyon sayfasında QR kod veya akıllı banner → taranan/tıklanan bağlantı `https://elektriklioto.com/s/<uid>` Universal/App Link formatındadır; uygulama kuruluysa doğrudan istasyona, kurulu değilse mağazaya gider.
- **AC-19** Verildiğinde web'de planlanmış bir rota → "Mobile'a Aktar" eylemi `POST /handoff` çağırır; dönen kod 10 dakika içinde ve yalnızca bir kez kullanılabilir; kod yalnızca rota geometrisi + istasyon UID listesini taşır, herhangi bir kullanıcı kimliği alanı içermez (şema testiyle doğrulanır).
- **AC-20** Olduğunda handoff kodu süresi dolduktan sonra kullanılır → istek 410/404 ile reddedilir, rota aktarılmaz.

## 7. Kitle Kaynaklı Arıza Bildirimi

- **AC-21** Verildiğinde kullanıcı "arızalı" bildirimi gönderir → istek gövdesinde ham GPS koordinatı **yer almaz**; yalnızca `station_uid` ve istemcide hesaplanmış `proximity_proof = HMAC(server_nonce, station_uid, distance_bucket)` gönderilir (istek şeması testiyle koordinat alanı reddedilir).
- **AC-22** Olduğunda sunucu `proximity_proof`'u doğrular → yalnızca `distance_bucket ∈ {<50m}` ve nonce geçerliyse bildirim kabul edilir; 50m üzeri veya geçersiz nonce → 4xx.
- **AC-23** Olduğunda bildirim skoru eşiği aşar → istasyon haritada "Arızalı/Riskli" etiketiyle işaretlenir; eşik altı tekil bildirimler etiketlemez.
- **AC-24** Ölçüm: elle etiketlenmiş 300 istasyonluk doğrulama kümesinde hatalı ("arızalı" etiketlenip aslında çalışır) kapatılma oranı ≤ %3.
- **AC-25** Olduğunda kullanıcı görsel yükler → içerik doğrudan yayınlanmaz, manuel onay kuyruğuna düşer; onaylanmadan hiçbir görsel istasyon sayfasında görünmez.

## 8. Favoriler & Bildirim

- **AC-26** Verildiğinde cihaz token'ı ile favori eklenir → `GET/PUT /favorites` yalnızca `device_token` ile çalışır, e-posta/telefon zorunlu değildir.
- **AC-27** Olduğunda favorilenen istasyonun durumu değişir → APNs/FCM kimlik bilgileri sağlanmışsa push bildirimi gider; sağlanmamışsa (kurulum eksik varsayımı) bildirim yalnızca uygulama içi bildirim listesinde görünür — bu iki davranış açıkça ayrı test edilir.

## 9. Kimlik & KVKK / Konum Gizliliği

- **AC-28** Şema testi: `fault_report` ve `favorites` tablolarında `geometry`/koordinat sütunu **bulunmaz**; bulunursa CI kırılır (mimari dokümanda tanımlı otomatik kontrol).
- **AC-29** Olduğunda Fastify erişim logları incelenir → `bbox`, `lat`, `lon` alanları redaksiyonludur (ham koordinat log dosyasında görünmez).
- **AC-30** Verildiğinde `DELETE /device` çağrılır → favoriler ve bildirim ilişkisi silinir, ilgili `fault_report` kayıtlarında `device_token` NULL'lanır (kayıt sayımı değişmez, kimlik bağı kalmaz).

## 10. API Sözleşmesi & Sürüm Uyumu

- **AC-31** Olduğunda Fastify JSON şeması değişir ama `packages/contracts/openapi.json` yeniden üretilip commit edilmez → CI (`openapi-diff`) build'i kırar.
- **AC-32** Olduğunda mobil/web istemci kodu üretilmiş şemadan üretilmez veya elle düzenlenir → `git diff --exit-code` kontrolü CI'da başarısız olur.
- **AC-33** Olduğunda bir uç noktada kırıcı (breaking) değişiklik yapılır → `spectral`/`openapi-diff` kapısı `/api/v1` üzerinde build'i kırar; kırıcı değişiklik yalnızca `/api/v2` açılarak geçer.

## 11. Veri Toplama & Entity Resolution

- **AC-34** Olduğunda yeni bir kaynak eklenir → yalnızca tek bir connector dosyası (`fetch`+`normalize`) eklenerek çalışır; başka modülde değişiklik gerekmez.
- **AC-35** Olduğunda eşleştirme skoru (`ST_DWithin ≤75m` AND operatör eşleşmesi AND soket imzası Jaccard ≥0.6) eşik altında kalır → kayıt otomatik birleştirilmez, `resolution_conflict` kuyruğuna düşer ve yönetim ekranında görünür.
- **AC-36** Ölçüm: 300 istasyonluk elle etiketlenmiş doğrulama kümesinde mükerrer kayıt oranı ≤ %2.
- **AC-37** Olduğunda iki `station_uid` birleştirilir → eski UID `merged_into` ile tombstone bırakır; eski UID ile yapılan istek 301 benzeri yönlendirmeyle çözülür, 404 dönmez.
- **AC-38** Olduğunda bir kaynağa istek atılır → `source_policy` kotası, exponential backoff (2^n dk, tavan 60 dk, 8 denemede `dead`) uygulanır; kota aşımı IP engeline yol açmaz (canlı izleme: `source_health.consecutive_failures`).
- **AC-39** Tazelik: durum (availability) senkronizasyon gecikmesi < 15 dakika (5 dk periyot + 3 kaçırma toleransı ile ölçülür).

## 12. Veritabanı & Migration Disiplini

- **AC-40** Olduğunda `docker compose up` boş bir makinede çalıştırılır → `postgis/postgis:16-3.4` imajı ayağa kalkar, `pnpm db:migrate && pnpm db:seed` hatasız tamamlanır (Faz 1 Bitti Tanımı #1).
- **AC-41** Olduğunda üretimde elle bir DDL komutu çalıştırılmaya çalışılır → süreç/prosedür bunu engeller; tüm şema değişiklikleri yalnızca `node-pg-migrate` migration dosyası olarak PR'a girer ve CI'da boş şema üzerinde ileri+geri alınabilirlik testinden geçer.
- **AC-42** Olduğunda ortam değişkeni eksik/şema dışıysa (`packages/config` zod doğrulaması) → `api`/`worker` süreci **başlamaz** (sessizce yanlış bağlantı bilgisiyle ayağa kalkmaz).

## 13. Yasal Konumlandırma

- **AC-43** İçerik denetimi: mobil/web arayüzünde, uygulama mağazası açıklamalarında ve pazarlama metinlerinde "Lisanslı Şarj Operatörü" veya eşdeğeri bir ifade **geçmez**; metin taraması bu ifadeyi 0 sonuç döndürür.
- **AC-44** Olduğunda kullanıcı ödeme akışına girer → ödeme ekranı elektriklioto.com dışında, ilgili CPO'nun kendi uygulamasında açılır; platform hiçbir aşamada ödeme/tahsilat arayüzü sunmaz.

---

**Kapsam dışı doğrulama notu:** OCPP, OCPI v2.2.1 çift yönlü entegrasyon, mikroservis parçalanması, WebSocket streaming, sunucu tarafı rota motoru ve otomatik görsel moderasyonu için kabul kriteri **yazılmamıştır** — bunlar `proje_kapsami.md` §4'te Faz 1 dışına alınmıştır; bu maddelerin test edilmemesi kapsam dışı bırakılma kararının bir sonucudur, eksiklik değildir.
