# Backlog — elektriklioto.com (Faz 1)

> Sürüm: 1.0 · Tarih: 2026-09-06 · Sahip: Product Owner
> Kaynak: `proje_kapsami.md` + `workspace/docs/teknik_mimari_dokumani.md`. Her hikâye ölçülebilir kabul kriteri taşır; kriter yoksa hikâye "Hazır" sayılmaz.

**Öncelik lejantı:** **P0** = Faz 1 Bitti Tanımı için zorunlu · **P1** = Faz 1 kapsamında, MVP sonrası sertleştirme · **P2** = Faz 1 kapsamında ama en son sıra, Faz 2'ye kayabilir.

---

## Epic A — Coğrafi Keşif Çekirdeği (Harita)

**US-A1 (P0) — Viewport'a göre istasyon listeleme**
Kullanıcı olarak haritayı kaydırdığımda görünür alandaki istasyonları görmek istiyorum.
- AC1: `GET /stations?bbox=&zoom=` çağrısı yalnızca `ST_MakeEnvelope` ile kesişen kayıtları döner; tüm Türkiye tek seferde indirilmez.
- AC2: 15.000 soket / 500.000 durum kaydı tohumlanmış veritabanında, 250 eşzamanlı istemci yükü altında sunucu içi yanıt p95 < 40ms.
- AC3: zoom < 10'da tekil pin değil, `ST_SnapToGrid` kümesi döner; kümedeki istasyon sayısı rozet olarak gösterilir.

**US-A2 (P0) — Meşguliyet durumunu tazelemek**
Kullanıcı olarak haritadaki soket doluluk durumunun güncel olduğundan emin olmak istiyorum.
- AC1: `GET /availability?bbox=&since=` `since` parametresi eksikse 400 döner.
- AC2: Operatör kaynağı ile durum senkronizasyon gecikmesi < 15 dakika (worker periyodu 5 dk + 3 kaçırma toleransı ile ölçülür).
- AC3: Bir kaynak 24 saat yanıt vermezse istasyon haritadan silinmez; "son güncelleme: X saat önce" rozeti gösterilir.

**US-A3 (P1) — Mobil çevrimdışı dayanıklılık**
Kullanıcı olarak ağ bağlantım koptuğunda uygulamanın çökmemesini istiyorum.
- AC1: Ağ hatasında istemci Hive `station_pin` kutusundan son bilinen pinleri çizer; ekranda "çevrimdışı" bandı görünür.
- AC2: Çevrimdışı geçişte uygulama çökme (crash) oranı 0.
- AC3: Soğuk açılış, ilk kare önbellekten çizildiği için < 1.8 saniye.

**US-A4 (P1) — Harita akıcılığı**
Kullanıcı olarak harita kaydırırken takılma yaşamak istemiyorum.
- AC1: GeoJSON/DTO çözümleme `compute()` Isolate'inde çalışır; UI thread'de bloklayıcı iş yoktur.
- AC2: Orta seviye cihazda (ölçüm: son 3 nesil orta segment Android) kaydırma sırasında 60 FPS, jank oranı < %1 (Flutter DevTools ölçümü).

---

## Epic B — Filtreleme ve İstasyon Detayı

**US-B1 (P0) — Çoklu kriterli filtreleme**
Kullanıcı olarak güç, soket tipi, operatör ve tesis tipine göre filtrelemek istiyorum.
- AC1: `GET /stations` uç noktası `power`, `socket`, `operator`, `status` parametrelerini AND mantığıyla birleştirir.
- AC2: Aynı anda 4 filtre uygulandığında yanıt süresi p95 < 40ms hedefinden sapmaz (bench raporu `packages/db/bench/`).
- AC3: Sonuç 0 istasyon olduğunda boş liste + "filtreyi genişlet" önerisi gösterilir (hata değil).

**US-B2 (P0) — İstasyon/soket detay ekranı**
Kullanıcı olarak bir istasyona dokunduğumda tarife, doluluk ve yorumları görmek istiyorum.
- AC1: `GET /stations/:uid` yanıtında her tarife kaydı `source`, `fetched_at`, `confidence` alanlarını taşır; arayüzde "son güncelleme: …" metni zorunlu gösterilir.
- AC2: Geçersiz `uid` için 404 döner; `merged_into` dolu eski `uid` istekleri otomatik olarak güncel `uid`'e yönlendirilir (301 benzeri davranış).
- AC3: Detay ekranı ilk anlamlı içerik < 500ms içinde (önbellekli veri) render edilir.

---

## Epic C — Deep-Link Motoru

**US-C1 (P0) — Operatör uygulamasına doğrudan atlama**
Kullanıcı olarak seçtiğim soket için ilgili operatörün uygulamasını hedef ekranla açmak istiyorum.
- AC1: ZES, Trugo, Eşarj için `GET /deeplink/:socketId` doğru şema + parametre üretir; hedef istasyon/soket ekranına açılma oranı ölçülen 100 denemede > %90.
- AC2: Uygulama telefonda kurulu değilse mağaza sayfasına yönlendirilir; şema desteklenmiyorsa pano (clipboard) fallback + kullanıcıya "istasyon kodu kopyalandı" bildirimi gösterilir.
- AC3: Deep-link şema değişikliği yalnızca backend konfigürasyonu güncellenerek yapılır; mobil uygulama sürüm yükseltmesi gerekmez (canlıda doğrulanır: config değişimi sonrası mobil davranış anlık değişir).

---

## Epic D — Web Platformu ve SEO

**US-D1 (P0) — SEO uyumlu il/ilçe katalog sayfaları**
Kullanıcı olarak Google'da aradığımda ilgili şehir/ilçe şarj sayfasına ulaşmak istiyorum.
- AC1: `/[il]/[ilce]/sarj-istasyonlari` rotası ISR (`isr: 3600`) ile sunulur; sayfa kaynağında ilk 50 istasyon SSR gövdesinde gömülü gelir (view-source ile doğrulanır).
- AC2: Google Lighthouse SEO skoru > 90, FCP < 1.2 saniye (üretim benzeri ortamda, 3G Fast throttling ile ölçülür).
- AC3: Her katalog sayfasında geçerli `Place`/`LocalBusiness` JSON-LD ve kanonik URL bulunur (Rich Results Test hatasız).
- AC4: `sitemap.xml` tüm katalog uçlarını otomatik listeler; yeni il/ilçe eklendiğinde deploy sonrası sitemap'te 24 saat içinde görünür.

**US-D2 (P0) — İnteraktif web haritası**
Kullanıcı olarak masaüstünde de aynı harita deneyimini istiyorum.
- AC1: Harita bileşeni `ssr:false` client-only hydrate olur; harita kütüphanesi yalnızca görünüm alanına girince dinamik import edilir (network sekmesinde doğrulanır).
- AC2: Aynı `GET /stations` sözleşmesi kullanılır; mobil ile web arasında istasyon verisi tutarsızlığı 0.

**US-D3 (P1) — Masaüstünden mobile köprü**
Kullanıcı olarak web'de bulduğum istasyonu telefonuma aktarmak istiyorum.
- AC1: İstasyon detay sayfasında QR + akıllı banner bulunur; `https://elektriklioto.com/s/<uid>` Universal/App Link, uygulama kuruluysa istasyona, kurulu değilse mağazaya yönlendirir (iOS + Android ayrı ayrı test edilir).

**US-D4 (P1) — Rota aktarım köprüsü**
Kullanıcı olarak web'de planladığım rotayı mobile aktarmak istiyorum.
- AC1: `POST /handoff` en fazla 10 dakika geçerli, tek kullanımlık kod üretir; kod yalnızca rota geometrisi + istasyon UID listesi taşır, kullanıcı kimliği içermez (payload şema testi ile doğrulanır).
- AC2: 10 dakika sonra veya ikinci kullanımda kod 410/404 döner.

---

## Epic E — Kitle Kaynaklı Arıza Bildirimi

**US-E1 (P0) — Arıza/erişim bildirimi**
Kullanıcı olarak çalışmayan bir soketi bildirmek istiyorum.
- AC1: `POST /reports` yalnızca istemcinin ürettiği `proximity_proof` ile kabul edilir; ham GPS koordinatı gövdede yer almaz (şema testi kırılır).
- AC2: `distance_bucket ∈ {<50m}` doğrulanmadan kayıt oluşmaz.
- AC3: Bildirim skoru eşiği aşıldığında istasyon 15 dakika içinde haritada "Arızalı/Riskli" etiketiyle görünür.

**US-E2 (P0) — Yanlış pozitif tavanı**
Kullanıcı/operasyon olarak hatalı "arızalı" etiketlemenin sınırlı kalmasını istiyorum.
- AC1: Elle etiketlenmiş 300 bildirimlik doğrulama setinde hatalı kapatma oranı ≤ %3.
- AC2: Aynı cihazdan aynı istasyona 24 saat içinde 1'den fazla bildirim sayıma katılmaz (rate-limit testiyle doğrulanır).

**US-E3 (P2) — Görsel yükleme ve moderasyon**
Kullanıcı olarak istasyon fotoğrafı eklemek istiyorum.
- AC1: Yüklenen görsel manuel onay kuyruğuna düşer; onaylanmadan hiçbir kullanıcıya gösterilmez (yayın öncesi görünürlük testiyle doğrulanır).
- AC2: Onay bekleyen görsel sayısı ve ortalama bekleme süresi ops panelinde görünür.

---

## Epic F — Aggregator / Veri Toplama (Backend)

**US-F1 (P0) — Çoklu kaynaktan veri çekme**
Operasyon olarak en az 3 farklı kaynaktan istasyon verisi toplanmasını istiyorum.
- AC1: En az 3 connector (`fetch()/normalize()` sözleşmesine uygun) prod'da aktif ve `source_health` tablosunda `last_success_at` güncel.
- AC2: Kaynak başına eşzamanlılık 1–2 ile sınırlı; `source_policy` kotası aşıldığında istek gönderilmez (loglarda doğrulanır).
- AC3: Bir connector art arda hata aldığında exponential backoff uygular (2^n dk, tavan 60 dk) ve 8 denemede `dead` durumuna geçer.

**US-F2 (P0) — Kuyruk ve tekrar deneme**
Operasyon olarak veri işlerinin kaybolmadan tekrar denenmesini istiyorum.
- AC1: `job_queue` tablosu `FOR UPDATE SKIP LOCKED` ile çekilir; aynı işin iki worker tarafından eşzamanlı işlenmediği yük testiyle doğrulanır.
- AC2: Redis/RabbitMQ gibi ek bağımlılık yok; tek altyapı bileşeni PostgreSQL'dir (docker-compose'da doğrulanır).

**US-F3 (P1) — Kaynak sağlığı görünürlüğü**
Operasyon olarak bir kaynağın kesintide olduğunu anında görmek istiyorum.
- AC1: `/metrics` uç noktasında kaynak tazeliği ve `consecutive_failures` görünür.
- AC2: Bir kaynak 24 saat başarısız kaldığında alarm üretilir; bu süre boyunca ilgili istasyonlar silinmez, `freshness_seconds` artan bir sayaçla arayüze yansır.

---

## Epic G — Kanonik Kimlik ve Entity Resolution

**US-G1 (P0) — Çakışan kayıtların birleştirilmesi**
Operasyon olarak aynı fiziksel istasyonun tek kayıt olarak görünmesini istiyorum.
- AC1: `ST_DWithin(75m)` + operatör eşleşmesi + soket imzası Jaccard ≥ 0.6 sağlanan kayıtlar otomatik `station_uid` altında birleşir.
- AC2: Elle etiketlenmiş 300 istasyonluk doğrulama setinde mükerrer kayıt oranı ≤ %2.
- AC3: Eşik altındaki kayıtlar otomatik birleştirilmez, `resolution_conflict` kuyruğuna düşer.

**US-G2 (P0) — Manuel çözüm ekranı**
Operasyon olarak eşiğin altında kalan çakışmaları elle çözmek istiyorum.
- AC1: Yönetim ekranında bekleyen `resolution_conflict` sayısı ve her kayıt için yan yana karşılaştırma (koordinat, operatör, soket imzası) görünür.
- AC2: Bir çözüm kaydedildiğinde `station_uid` değişmez kalır; birleşme durumunda eski `uid` `merged_into` ile tombstone'lanır ve API üzerinden eski `uid` isteği yeni `uid`'e yönlenir.

---

## Epic H — Kimlik, Favoriler ve Gizlilik

**US-H1 (P0) — Hesapsız kullanım**
Kullanıcı olarak hesap açmadan haritayı ve detayları kullanmak istiyorum.
- AC1: Harita, filtre ve istasyon detayı `device_token` olmadan da tam işlevsel çalışır (uçtan uca test).
- AC2: Sunucu tarafında hiçbir tabloda kullanıcıya bağlı geçmiş koordinat/güzergah kaydı yoktur; bu şema testinde otomatik doğrulanır (`fault_report`/`favorites` tablolarında `geometry` sütunu varsa test kırılır).

**US-H2 (P1) — Favoriler ve bildirim**
Kullanıcı olarak sık kullandığım istasyonları favorileyip durum değişikliğinde haber almak istiyorum.
- AC1: `GET/PUT /favorites` cihaz token'ına bağlı çalışır; hesap zorunlu değildir.
- AC2: APNs/FCM kimlik bilgileri sağlanana kadar bildirim uygulama içi listeyle sınırlıdır; kimlikler tedarik edildiğinde push bildirimi favorideki istasyon durum değişiminden itibaren 5 dakika içinde iletilir.

**US-H3 (P1) — Silme hakkı**
Kullanıcı olarak cihazıma ait verileri sildirmek istiyorum.
- AC1: `DELETE /device` çağrısı sonrası favoriler ve bildirim ilişkisi kalıcı silinir.
- AC2: `fault_report` kayıtlarında `device_token` NULL'lanır, sayım bütünlüğü (toplam bildirim sayısı) değişmez.

---

## Epic I — Sözleşme, Migration ve Ops Altyapısı

**US-I1 (P0) — Tek doğruluk kaynağı API sözleşmesi**
Geliştirici olarak web ve mobil istemcilerin elle yazılmamasını istiyorum.
- AC1: `packages/contracts/openapi.json` CI'da yeniden üretilir; mevcut dosyayla fark varsa build kırılır.
- AC2: Web (`openapi-typescript`) ve mobil (`openapi-generator` dart-dio) istemci kodu üretilmiş dosyalarda elle değişiklik yapılmışsa `git diff --exit-code` CI adımı kırılır.

**US-I2 (P0) — Versiyonlu migration**
Geliştirici olarak veritabanı değişikliklerinin izlenebilir olmasını istiyorum.
- AC1: Her migration `node-pg-migrate` ile CI'da boş şema üzerinde uygulanır ve geri alınabilirliği (`down`) doğrulanır.
- AC2: Üretimde DDL yalnızca deploy adımı içinde, migration dosyası üzerinden çalışır; elle DDL çalıştıran bir yol yoktur.

**US-I3 (P0) — Sıfırdan ayağa kalkış**
Yeni geliştirici olarak boş makinede sistemi çalıştırabilmek istiyorum.
- AC1: `docker compose up` + `pnpm db:migrate && pnpm db:seed` komut zinciri hatasız tamamlanır ve `GET /healthz`, `GET /readyz` 200 döner.

**US-I4 (P1) — Performans regresyon takibi**
Operasyon olarak p95 hedefinin zamanla bozulmadığından emin olmak istiyorum.
- AC1: `EXPLAIN (ANALYZE, BUFFERS)` çıktıları `packages/db/bench/` altında versiyonlanır; her sürümde 15.000 soket / 500.000 durum kaydı üzerinde viewport sorgusu p95 < 40ms doğrulanır, aşımda CI uyarı verir.

---

## Sıra Dışı Bırakılanlar (Backlog'a Alınmadı)

Kapsam dışı maddeler (`proje_kapsami.md` §4) — uygulama içi ödeme, OCPP, OCPI v2.2.1, otomatik görsel moderasyonu, WebSocket, mikroservis parçalanması, sunucu tarafı routing motoru — bu backlog'a hikâye olarak alınmamıştır; Faz 2 kapsam gözden geçirmesinde yeniden değerlendirilir.
