# Proje Kapsamı

> **Bu dosya canlı bir dokümandır ve boru hattının TEK doğruluk kaynağıdır.**
> Sen yazarsın; `cto`, `product_owner` ve `tech_scout` rolleri okuyup
> zenginleştirir — eksikleri işaretler, öneri ekler, varsayımları açık yazar.
> Her güncelleme öncesi önceki sürüm `workspace/.history/` altına kopyalanır.
>
> **İŞARET: `(zorunlu)`** — Bir satırın sonuna `(zorunlu)` yazarsan o satır
> kesin karar sayılır. Motor bu satırları çıkarıp her rolün prompt'unun en
> başına "ZORUNLU KISITLAR" bloğu olarak koyar; roller onları sorgulayamaz,
> alternatif öneremez. Teknik olarak imkânsızsa alternatif seçmek yerine
> çıktıda `> **ÇATIŞMA:**` satırıyla sana bildirirler.
>
> **Kritik ayrım:** Kararını verdiğin şeyleri **5. Kısıtlar**'a `(zorunlu)` ile
> yaz. **7. Açık Sorular**'a yazdığın her şeyi model KENDİ karara bağlar —
> orayı sadece gerçekten sormak istediklerin için kullan.
>
> Rollerin eklediği bölümler `<!-- rol: xxx -->` ile işaretlenir.

## 1. Vizyon / Çözülen Problem

Elektrikli araç (EV) kullanıcılarının sahada onlarca farklı şarj ağı operatörü (CPO - ZES, Trugo, Eşarj, Voltrun, Sharz.net vb.) için 30-35 ayrı mobil uygulama yüklemek, her birine ayrı profil ve bakiye tanımlamak, yolda istasyon ararken uygulamalar arasında kaybolmak zorunda kalması ciddi bir kullanıcı deneyimi krizidir.

Doğrudan CPO lisansı almak (EPDK sermaye ve soket kotası şartları) veya doğrudan ödeme kuruluşu olmak (TCMB / BDDK lisanslama ve denetim süreçleri) projeyi 1-2 yıl bürokrasiye ve yüksek sermaye maliyetlerine boğmaktadır.

**elektriklioto.com (Faz 1)**; EPDK lisanslama bariyerlerine takılmadan, kullanıcıyı uygulama çöplüğünden kurtaran **merkezi bir e-Mobilite Hizmet Sağlayıcısı (EMP) ve Bilgi Hub'ı** olarak konumlanır. Platform hem **mobil uygulama** hem de **web platformu (elektriklioto.com)** üzerinden:
- Tek harita üzerinden tüm ağların soket tipleri (Type 2 AC / CCS DC), güç değerleri (kW), anlık doluluk ve operasyonel durumlarını sunar.
- Rota planlaması ve akıllı soket filtreleme sağlar.
- Mobil tarafta şarj başlatma aşamasında ilgili operatörün uygulamasına doğru soket parametreleriyle doğrudan atlayan derin bağlantı (**Deep-Linking & Auto-fill**) köprüsü kurar.
- Web tarafında SEO uyumlu istasyon rehberi, il/ilçe bazlı şarj rehberleri ve masaüstü rota ön planlaması sunar.
- Arka planda toplanan kitle-kaynaklı (crowdsourced) arıza/erişim verileriyle çalışmayan istasyonları dinamik olarak işaretler.

## 2. Hedef Kullanıcı

- **Bireysel Elektrikli Araç Sahipleri:** Telefonunda onlarca şarj uygulaması bulundurmaktan yorulmuş, yola çıkmadan önce en yakın/uygun istasyonu tek ekranda (web veya mobil) görmek isteyenler.
- **Web Üzerinden Rota ve İstasyon Arayan Sürücüler:** Google aramaları üzerinden (örn: "Bolu tüneli hızlı şarj istasyonları") `elektriklioto.com` sayfalarına ulaşıp güncel tarife ve soket durumlarını inceleyen kullanıcılar.
- **Şehirlerarası Yolculuk Yapan Sürücüler:** Güzergah üzerindeki yüksek hızlı (DC / 120kW+) şarj noktalarını batarya seviyesine ve soket uygunluğuna göre planlamak isteyenler.
- **Filo ve Ticari EV Sürücüleri:** Zaman kaybetmeden çalışır durumda olan soketleri filtreleyip doğrudan şarj operasyonunu başlatmak isteyen profesyonel kullanıcılar.

## 3. Kapsam İçi

- **Çoklu Platform Mobil İstemci (Flutter - iOS & Android):**
  - **Dinamik İstasyon Haritası:** Kümeleme (clustering) destekli, akıcı harita deneyimi (Mapbox / Google Maps SDK).
  - **Gelişmiş Filtreleme:** Güç (AC 22kW, DC 60kW, DC 120kW+), Soket Tipi (CCS, CHAdeMO, Type 2), Operatör (ZES, Trugo, Eşarj vb.), Anlık Uygunluk Durumu ve Tesis Tipi (AVM, Otoyol Dinlenme Tesisi, Otel vb.).
  - **İstasyon & Soket Detay Ekranı:** Canlı tarife bilgisi, soket meşguliyet durumu, kullanıcı yorum/puanları, istasyon fotoğrafları.
  - **Akıllı Derin Bağlantı (Deep-Linking Engine):** Seçilen soket için ilgili operatörün uygulamasına hedef soket ID'si ile doğrudan atlama (URL Scheme / App Links / Universal Links) veya mağaza yönlendirmesi.
- **Web Platformu (`elektriklioto.com`):**
  - **SEO Uyumlu İstasyon Dizin Sayfaları:** İl, ilçe, otoyol ve operatör kırılımlı dinamik rotalar (Örn: `/istanbul/kadikoy/sarj-istasyonlari`, `/zes/istasyon-123`).
  - **İnteraktif Web Haritası:** Masaüstü ve mobil web tarayıcılarında çalışan hafif, responsive harita deneyimi.
  - **Masaüstünden Mobil Uygulamaya Köprü:** Web istasyon detayında mobil uygulamayı açan akıllı banner / QR kod ile telefona aktarım mekanizması.
- **Kitle Kaynaklı (Crowdsourced) Arıza & Geri Bildirim Sistemi:**
  - Kullanıcıların "İstasyon arızalı", "Kablo kilitli", "Soket önünde benzinli araç park etmiş (ICEing)" bildirimleri yapabilmesi.
  - Bildirim skoru eşiği aştığında istasyonun haritada "Arızalı / Riskli" olarak etiketlenmesi.
- **Backend & Veri Toplama Katmanı (Aggregator Core):**
  - **Modüler Backend:** Node.js / TypeScript mimarisi (Fastify). Hem mobil istemciye hem web uygulamasına tek `/api/v1` üzerinden hizmet verir.
  - **Veri Toplayıcı (Aggregator Worker):** Açık veri kaynakları, kamuya açık harita API'leri ve izinli CPO uç noktalarından periyodik istasyon konumu, tarife ve durum verilerini çeken zamanlanmış senkronizasyon işleri.
  - **Veritabanı (PostgreSQL + PostGIS):** Coğrafi sorgular için PostGIS uzantısı entegre edilmiş ilişkisel model.
- **Favoriler ve Rota Üstü İstasyon Rehberi:**
  - Sık kullanılan istasyonları favorileme ve durum değişikliğinde anlık bildirim (Push Notification - APNs/FCM).

<!-- rol: cto -->
- **İstemci-Sunucu Sözleşmesi (kapsama dahil sayılmalı):** REST + JSON üzerinde sürümlenmiş `/api/v1` yüzeyi; OpenAPI 3.1 şeması backend'de tek kaynak olarak tutulur. Hem Flutter istemcisi hem de Web ön yüzü API istemci kodları (DTO'lar) bu şemadan otomatik üretilir. Elle yazılmış istemci modelleri yasaktır.
- **Web SSR / SSG ve SEO Mimarisi:** Web platformu istasyon katalog sayfaları için Server-Side Rendering (SSR) veya Incremental Static Regeneration (ISR) kullanmalıdır; dinamik harita bileşeni ise client-only olarak hydrate edilir.
- **Coğrafi Delta ve Dinamik Viewport API'si:** Web ve mobil istemciler tüm Türkiye istasyon havuzunu tek seferde indirmez. Harita `bbox` (bounding box) ve zoom seviyesine göre PostGIS `ST_MakeEnvelope` ile filtrelenmiş veriyi çeker; meşguliyet durumları `?since=<timestamp>` ile delta çekilir.
- **Sözleşme Uyum Testi (kapsama dahil):** OpenAPI şemasından üretilen istemciler ile backend arasında CI'da koşan kontrat testi (spectral / openapi-diff) zorunludur; şema değişip istemci üretilmediğinde build kırılır.
- **Deep-Link Fallback ve Konfigürasyon Katmanı:** Operatör URL şemaları backend konfigürasyonu olarak yönetilir; mobil güncelleme gerektirmeden bozuk şemalar düzeltilebilir.

<!-- rol: cto -->
- **Kimlik Modeli — Anonim Öncelikli Cihaz Kaydı:** Harita, filtre ve istasyon detayı hesap açmadan çalışır; favori ve arıza bildirimi için cihaz bazlı anonim token (device attestation ile bağlanmış) yeterlidir. E-posta/telefon toplama Faz 1'de yalnızca push izni ve favori senkronizasyonu isteyen kullanıcı için opsiyoneldir — bu, KVKK yüzeyini asgaride tutar.
- **Kanonik İstasyon Kimliği ve Kaynak Birleştirme (Entity Resolution):** Aynı fiziksel istasyon birden fazla kaynaktan (açık veri + operatör ucu + kullanıcı katkısı) farklı ID'lerle gelir. Kapsama, koordinat yakınlığı + operatör + soket imzası ile eşleştiren ve kalıcı `station_uid` üreten bir birleştirme modülü ile çakışmaları çözen bir yönetim ekranı dahildir. Bu modül olmadan "veri tazeliği" ve "arıza etiketi" ölçütleri anlamsızdır.
- **Tarife Verisinin Statüsü:** Fiyat alanları "bilgi amaçlı, kaynak ve zaman damgalı" olarak modellenir; her tarife kaydı `source`, `fetched_at` ve `confidence` taşır ve arayüzde son güncelleme zamanı gösterilir. Bu, EMP konumlandırmasıyla uyumlu ve yanlış fiyat kaynaklı sorumluluk riskini düşüren tek yoldur.

<!-- rol: cto -->
- **Tohumlama (seed) hattı kapsama dahildir:** `istasyonlar.json` → normalize → `station_uid` üretimi → `geom` (SRID 4326) yazımı adımları, elle çalıştırılan bir betik değil, tekrar edilebilir ve idempotent bir `seed` komutu olarak repoda yaşar; aynı dosya iki kez yüklendiğinde kayıt sayısı değişmez (`istasyon_no` üzerinde `UNIQUE` + upsert).
- **Veri Kalitesi Kapısı (seed öncesi doğrulama):** 16.788 kaydın `lat`/`lon` alanları Türkiye sınır kutusu (`ST_MakeEnvelope(25.5,35.5,45.0,42.5)`) dışında kalıyorsa, `lat`/`lon` yer değiştirmişse veya `(0,0)` ise kayıt reddedilir ve `seed_rejects` tablosuna gerekçesiyle yazılır. Reddedilen kayıt sessizce düşürülmez; sayısı seed raporunda gösterilir.
- **Marka Sözlüğü (179 marka) ayrı bir varlıktır:** Operatör adı serbest metin olarak istasyon satırında tutulmaz; `operator` tablosuna normalize edilir (slug + görünen ad + eşanlamlılar). Deep-link konfigürasyonu, SEO operatör rotaları (`/zes/...`) ve filtre listesi bu tek tablodan beslenir.

<!-- rol: cto -->
- **Tasarım Token Senkronizasyon Hattı (kapsama dahil):** Web ve mobilin tek tasarım dilini paylaşması kısıtı için, `tasarim_sistemi.md` içindeki renk, tipografi, aralık ve bileşen token'larını tek kaynaklı JSON/YAML'dan hem Nuxt CSS değişkenlerine hem Flutter Dart sınıflarına dönüştüren otomatik derleme betiği repositoride yaşar.
- **Sunucu Tarafı Kümeleme ve Viewport Optimizasyonu (MVT / BBox):** 16.788 istasyonun tamamının istemciye GeoJSON olarak indirilmesi mobilde ve webde bellek krizine yol açar. Düşük zoom seviyelerinde PostGIS `ST_SnapToGrid` ile kümelenmiş özet veri veya MVT (Mapbox Vector Tile) üretilerek istemci yükü hafifletilir.

## 4. Kapsam Dışı

- **Doğrudan Uygulama İçi Ödeme Alma (In-app Billing):** TCMB / BDDK lisanslama süreçlerine ve PCI-DSS maliyetlerine takılmamak adına Faz 1'de ödeme aracılığı yapılmaz; ödeme ilgili operatörün kendi uygulamasında tamamlanır.
- **Fiziksel İstasyon Donanım Kontrolü (OCPP / CPMS):** Sahada şarj ünitesi işletilmeyeceği için OCPP donanım protokolü katmanı Faz 1'de yer almaz.
- **Doğrudan OCPI v2.2.1 Çift Yönlü Protokol Entegrasyonu:** Operatörlerle resmi B2B masasına oturup sözleşme imzalanana kadar Faz 1 kapsamına dahil edilmez; Faz 2'ye aktarılmıştır.
- **Kendi Başına Elektrik Satışı / Faturalandırma:** EPDK Şarj Ağı İşletmeci Lisansı gerektiren hiçbir ticari işlem yapılmaz.
- Masaüstü native uygulamaları (Windows/macOS native istemciler kapsam dışıdır; masaüstü ihtiyacı web üzerinden karşılanır).
- **Geocoding (adres → koordinat çevrimi):** İstasyon koordinatları veri kaynağıyla birlikte gelecektir; adres metninden koordinat üretme hattı kurulmaz.

<!-- rol: cto -->
- **Mikroservis parçalanması ilk sürümde kapsam dışıdır:** Tek deploy edilebilir `api` süreci + tek `worker` süreci (modüler monolit). Servis sınırları kod içinde modül olarak çizilir.
- **Canlı Telemetri / WebSocket Streaming:** Harita soket durumları için istemci tarafında kalıcı WebSocket bağlantısı açılmaz; HTTP delta-polling veya Server-Sent Events (SSE) kullanılır.

<!-- rol: cto -->
- **Sunucu Tarafı Rota Optimizasyon Motoru kapsam dışıdır:** Faz 1'de kendi yönlendirme (routing/isochrone) motoru işletilmez; rota geometrisi harici bir yönlendirme servisinden alınır, platform yalnızca bu geometri üzerinde PostGIS `ST_DWithin` ile istasyon eşleştirmesi yapar.
- **Kullanıcı Üretimli Fotoğraf Moderasyonu (otomatik):** Faz 1'de görsel içerik yükleme yalnızca kuyruklanır ve manuel onaydan geçer; otomatik görüntü sınıflandırma/moderasyon modeli kapsam dışıdır.

<!-- rol: cto -->
- **Soket seviyesi (connector) envanteri Faz 1'de üretilmez:** Soket tipi/güç verisi kaynakta yokken `connector` satırları uydurulmaz. Şema soket tablosunu içerir ancak boş kalır; filtre ve "soket seçimi" akışları veri geldiğinde açılmak üzere kapalı doğar.

## 5. Kısıtlar

- **Platform Alan Adı ve Marka elektriklioto.com olacaktır. (zorunlu)** Tüm web yönlendirmeleri, SEO varlıkları ve API domain yapılanması bu alan adı altında kurgulanır.
- **Mobil istemci Flutter ile geliştirilecektir. (zorunlu)** iOS ve Android için tek kod tabanı kullanılır.
- **Web platformu Nuxt.js / Vue.js ile SSR/SSG uyumlu geliştirilecektir. (zorunlu)** SEO, hız ve modern web standartları için Nuxt çatısı kullanılır; backend Fastify API'sini tüketir.
- **Backend Node.js / TypeScript ile yazılacaktır. (zorunlu)** Fastify framework zorunludur; alternatif framework'ler değerlendirme dışıdır.
- **Veritabanı Docker konteyneri üzerinde çalışan PostgreSQL + PostGIS olacaktır. (zorunlu)** `postgis/postgis:16-3.4` sürümü sabitlenmiş imaj ve depoya işlenmiş `docker-compose.yml` ile ayağa kaldırılır. Bağlantı bilgileri ortam değişkenlerinden okunur, koda gömülmez.
- **Sistem hiçbir aşamada kendisini "Lisanslı Şarj Operatörü" olarak konumlandıramaz. (zorunlu)** Platform yasal olarak bir e-Mobilite Asistanı / EMP adayı statüsündedir; EPDK lisansına tabi elektrik satışı yapılamaz.
- **KVKK / GDPR ve Konum Gizliliği: (zorunlu)** Kullanıcının GPS konumu yalnızca anlık harita merkezleme ve en yakın istasyon sorgusu için geçici (in-memory) kullanılır; sunucu tarafında kullanıcıya bağlı geçmiş güzergah/koordinat kaydı tutulamaz.
- **Veritabanı Şema Göçü: (zorunlu)** Veritabanı değişiklikleri yalnızca sürümlenmiş migration dosyalarıyla yapılır; üretimde elle DDL kapsam dışıdır.

- **Görsel ve etkileşim tasarımı Faz 1'in birincil çıktısıdır. (zorunlu)** Bu ürün bir web sitesi ve bir mobil uygulamadır; tasarım geçiştirilecek bir adım değil, üzerinde tartışılıp iyileştirilecek bir süreçtir. Hiçbir arayüz görevi, onaylanmış tasarım sistemi ve arayüz spesifikasyonu üretilmeden kodlanamaz.
- **Arayüz geliştiricisi görsel karar veremez. (zorunlu)** Renk, tipografi, boşluk, köşe yarıçapı, gölge, ikon ve bileşen durumu değerlerinin tamamı `tasarim_sistemi.md`'deki token'lardan gelir. Sistemde karşılığı olmayan değer uydurulamaz; eksik `// TASARIM EKSİĞİ:` olarak işaretlenir.
- **Tasarım denetimden geçmeden yapım aşamasına geçilemez. (zorunlu)** `design_critic` rolü `VERDICT: APPROVED` verene kadar tasarım revize edilir. Erişilebilirlik tabanı WCAG 2.1 AA'dır (gövde metni kontrast ≥ 4.5:1, dokunma hedefi ≥ 44x44pt).
- **Web ve mobil tek tasarım dilini paylaşır. (zorunlu)** Aynı tasarım token'ı Nuxt tarafında CSS değişkeni, Flutter tarafında Dart sabiti olarak birebir karşılık bulur; iki platform görsel olarak ayrışamaz.
- **Faz 1 istasyon veri tabanı `istasyonlar.json` ile tohumlanır. (zorunlu)** EPDK Şarj İstasyonları Sorgulama Sistemi'nden alınmış 16.788 istasyon ve 179 marka içerir; resmî `istasyon_no` (`ŞRJ/xxxx`) kanonik istasyon kimliğinin çapasıdır. Ölçülmüş alan envanteri: `workspace/docs/veri_kaynagi_epdk.md`.
- **İstasyon koordinatı mevcut kabul edilir. (zorunlu)** `istasyonlar.json`'un zenginleştirilmiş sürümü her kayıtta `lat` ve `lon` taşıyacaktır; `geom` bu alanlardan üretilir. Adresten koordinat türetme (geocoding) kapsam dışıdır, planlanmaz.
- **Soket tipi, güç, tarife ve anlık doluluk verisi Faz 1 başlangıcında YOKTUR. (zorunlu)** Şema bu alanları `NULL` kabul eder ve arayüz bu alanlar boşken de anlamlı görünmek zorundadır; tasarımda her biri için "veri yok" durumu tanımlı olmalıdır. Bu alanlar varmış gibi ekran tasarlanamaz.

<!-- rol: cto -->
- **KURULUM GEREKİYOR: Docker & PostGIS imajı.** Veritabanı native Postgres değil, spatial indeksleri (`GIST(geom)`) ve coğrafi fonksiyonları destekleyen `postgis/postgis:16-3.4` imajı ile çalışmak zorundadır.
- **Arka plan işleri için ayrı süreç sınırı:** Veri kazıma/senkronizasyon ve bildirim işleri API sürecinin içinde koşturulamaz; bağımsız bir `worker` süreci zorunludur.
- **Dış bağımlılık sınırı (Kuyruk):** İlk sürümde Redis/RabbitMQ eklenmez. İş kuyruğu PostgreSQL üzerinde `FOR UPDATE SKIP LOCKED` deseniyle koşturulur.
- **Dış Veri Çekme Hız Limiti & Saygılı Kazıma:** Harici operatör uç noktalarından veri çeken worker'lar, kaynakların IP engeline takılmaması için exponential backoff, rate-limiting ve proxy rotasyonu kurallarına uymak zorundadır.
- **Zaman Damgası Bölümleme (Partitioning):** Fiyat geçmişi ve kitle-kaynaklı arıza logları zaman serisi tablolarda tutulmalı, en az aylık partition stratejisi uygulanmalıdır.
- **Performans bütçesi:** p95 < 40ms hedefi sunucu içi işlem süresidir (ağ RTT hariç); mobilde 60 FPS harita kaydırması için GeoJSON parse işlemleri UI thread dışında (Isolate) yapılır.

<!-- rol: cto -->
- **Arıza doğrulaması ile konum gizliliği kısıtının uzlaştırılması:** Arıza bildiriminde 50 m yakınlık şartı, ham koordinat gönderilerek değil, istemcinin hesapladığı mesafe + sunucunun istasyon koordinatına göre doğruladığı tek seferlik `proximity_proof` ile sağlanır. Bildirim kaydında kullanıcı koordinatı değil, yalnızca `station_uid` ve doğrulama sonucu saklanır — böylece "kullanıcıya bağlı koordinat kaydı tutulamaz" kısıtı ihlal edilmez.
- **Flutter sürüm sabitleme:** Ortamda `flutter 3.27.1` ve `fvm 3.2.1` ölçülmüştür; mobil derleme sürümü `.fvmrc` ile depoya sabitlenir, geliştirici makinesinin global Flutter sürümüne güvenilmez.
- **Paket yöneticisi tekliği:** Ortamda `pnpm 10.20.0` ölçülmüştür; backend ve web tek pnpm workspace'i altında yönetilir, `npm install` ile lockfile üretilmesi CI'da reddedilir.
- **KURULUM GEREKİYOR: Harita karo (tile) sağlayıcı hesabı ve API anahtarı.** Mapbox/Google Maps SDK ortam envanterinde ölçülemez bir dış servistir; anahtar olmadan hem web hem mobil harita ekranı çalışmaz, anahtarlar ortam değişkeni olarak yönetilir ve istemci derlemesine gömülmez.
- **KURULUM GEREKİYOR: APNs/FCM kimlik bilgileri.** Push bildirimi başarı ölçütü, Apple Developer ve Firebase proje kimlik bilgileri tedarik edilmeden doğrulanamaz; bu tedarik edilene kadar favori bildirimi "uygulama içi bildirim listesi" ile sınırlıdır.

<!-- rol: cto -->
- **Kanonik kimlik çapası tek yönlüdür:** `station_uid` dahili ve kalıcıdır; `istasyon_no` (`ŞRJ/xxxx`) ise üzerinde `UNIQUE` kısıt bulunan doğal anahtardır. Dış API yüzeyinde ve SEO URL'lerinde `istasyon_no` doğrudan teşhir edilmez, slug üzerinden çözümlenir — resmî numaranın değişmesi kalıcı bağlantıları kırmamalıdır.
- **`ŞRJ/` önekinde Unicode tuzağı:** `Ş` karakteri nedeniyle karşılaştırma, indeksleme ve URL üretimi NFC normalize edilmiş metin üzerinde yapılır; slug üretiminde Türkçe harf katlaması (`İ→i`, `ı→i`) tek bir yardımcı fonksiyonda toplanır, her modülde yeniden yazılmaz.
- **`geom` türetilmiş sütundur:** `lat`/`lon` kaynak gerçeği, `geom geography(Point,4326)` ise migration içinde bu alanlardan üretilir ve `GIST` ile indekslenir; ikisi el ile ayrı ayrı güncellenemez.
- **Java 17 yalnızca Android derlemesi içindir:** Ortamda ölçülen `openjdk 17.0.17` Android Gradle zinciri için yeterlidir; backend tarafında JVM bağımlılığı üretilmez.

<!-- rol: cto -->
- > **ÇATIŞMA:** "Mobil istemci Flutter ile geliştirilecektir. (zorunlu)" kısıtı teknik olarak imkânsızdır. Ortam raporunda `flutter` ve `dart` komutları "Exec format error" nedeniyle BOZUK durumdadır. İstemcinin geliştirilebilmesi için onarım gereklidir.
<!-- rol: cto -->
- > **ÇATIŞMA:** "Paket yöneticisi tekliği: Ortamda pnpm 10.20.0 ölçülmüştür" kısıtı ortam gerçeğiyle uyuşmamaktadır. Güncel ortam raporunda `pnpm` YOK olarak listelenmiştir. Paylaşımlı workspace mimarisi için KURULUM GEREKİYOR: pnpm.

<!-- rol: cto -->
- **Eksik Veri Tipi Sözleşmesi (Nullable DTO Kısıtı):** Soket, güç ve tarife alanlarının Faz 1'de bulunmaması kısıtı doğrultusunda, backend API yanıtlarında `null` değerler için varsayılan uydurma değer dönülmez; OpenAPI şemasında bu alanlar açıkça `nullable` tanımlanır ve istemcilerde "veri yok" durumunu zorunlu kılan TypeScript/Dart tipleri üretilir.

## 6. Başarı Ölçütleri

- **Harita Yanıt Hızı:** 20 km çapındaki istasyon sorgularının (PostGIS spatial query) veritabanı yanıt süresi p95 < 40ms olmalıdır.
- **Yönlendirme Başarısı (Deep-Link Accuracy):** Mobilde haritadan seçilen popüler operatörler için (ZES, Trugo, Eşarj) ilgili uygulamanın hedef istasyon/soket ekranına doğru açılma oranı > %90.
- **Web SEO ve Yüklenme Hızı:** `elektriklioto.com` istasyon sayfalarında Google Lighthouse SEO skoru > 90, First Contentful Paint (FCP) < 1.2 saniye olmalıdır.
- **Veri Tazeliği (Data Freshness):** Dinamik istasyon/soket durumlarının operatör kaynaklarıyla senkronizasyon gecikmesi < 15 dakika.
- **Hafiflik ve Akıcılık:** Mobil uygulamanın soğuk açılış süresi (Cold Start) < 1.8 saniye; harita gezinimi sıfır takılma (jank-free / 60 FPS).

<!-- rol: cto -->
- **Yük Altında Spatial Ölçüm:** p95 < 40ms hedefi; Türkiye genelindeki en az 15.000 soket ve tohumlanmış 500.000 durum kaydı bulunan veritabanında, eşzamanlı 250 mobil/web istemcisinin harita kaydırma (viewport bounding box) yükü altında doğrulanacaktır.
- **Yanlış Arıza İhbar Tavanı (False Positive):** Kullanıcı bildirimleriyle "Arızalı" etiketlenen istasyonların hatalı kapatılma oranı <= %3 olmalıdır. Doğrulama, kullanıcının GPS konumu ile istasyon konumu yakınlığı (< 50 metre) şartıyla filtrelenerek sağlanır.
- **Çevrimdışı Harita Dayanıklılığı:** Ağ bağlantısı koptuğunda mobil istemci çökmez; Hive önbelleğindeki son bilinen istasyon pinlerini çevrimdışı modda göstermeye devam eder.

<!-- rol: cto -->
- **Kaynak Kesintisine Dayanıklılık:** Herhangi bir tekil veri kaynağı 24 saat boyunca yanıt vermediğinde platform hata vermez; istasyon kaydı "son güncelleme: X saat önce" rozetiyle sunulmaya devam eder ve kaynak sağlığı panelinde alarm üretilir.
- **Entity Resolution Doğruluğu:** Kaynak birleştirme sonrası mükerrer istasyon kaydı oranı, elle etiketlenmiş 300 istasyonluk doğrulama kümesinde <= %2 olmalıdır.

<!-- rol: cto -->
- **Tohumlama Bütünlüğü (Faz 1'in ilk ölçülebilir kapısı):** Temiz bir veritabanına `seed` çalıştırıldığında 16.788 kaydın en az %99'u yüklenmeli, reddedilen her kayıt gerekçesiyle raporlanmalı ve komut ikinci kez çalıştırıldığında satır sayısı değişmemelidir (idempotence).

<!-- rol: cto -->
- **Erişilebilirlik (A11y) ve Tasarım Uyumu Kapısı:** Tasarım denetimi gereği CI hattında çalışacak otomatik kontrollerde (Lighthouse a11y skoru ≥ 95 ve WCAG 2.1 AA kontrast oranı ≥ 4.5:1) sıfır ihlal kuralı aranır; dokunma hedefleri mobilde 48x48pt altına inemez.

## 7. Açık Sorular

<!-- Cevabını gerçekten bilmediğin, rollerin karar vermesini İSTEDİĞİN şeyler.
     Kararını verdiğin bir şeyi buraya yazma — model seni dinlemez, kendi seçer. -->

- **Web ve Mobil Paylaşımlı Rota Mekanizması:** Web sitesinde (`elektriklioto.com`) rota planlayan bir kullanıcının, planladığı rotayı tek tuşla/QR kodla mobil uygulamaya aktarma akışı nasıl kurgulanmalı?
- **Operatör Deep-Link Parametre Standartları:** Her CPO'nun mobil uygulaması harici şema parametresiyle (istasyon ID / soket ID) doğrudan başlatmayı destekliyor mu? Desteklemeyen operatörler için pano (clipboard) fallback'i kullanıcı deneyimini nasıl etkiler?
- **Kitle Kaynaklı Doğrulama Güvenliği:** Kötü niyetli kullanıcıların veya botların istasyonları kasıtlı olarak "arızalı" işaretlemesini engellemek için cihaz güvenilirlik skoru ve mesafe (GPS fence) kısıtı dışında hangi koruma katmanları eklenmeli?
- **Veri Toplama Hukuku ve Sürdürülebilirlik:** CPO'ların kamuya açık arayüzlerinin değişmesi veya IP bazlı engelleme getirmesi durumunda veri akışının kesintisizliği hangi proxy rotasyonu veya yedek açık veri servisleriyle garanti altına alınabilir?

- **Tasarım Dili ve Marka Kimliği:** elektriklioto.com hangi görsel tonu benimsemeli — teknik/mühendis odaklı mı (yoğun bilgi, kompakt), yoksa tüketici dostu mu (ferah, büyük dokunma hedefleri)? Harita yoğun bir ekranda bu iki yaklaşımın dengesi nasıl kurulmalı?
- **Koyu Tema Önceliği:** Sürücüler istasyonu çoğunlukla araç içinde ve sıklıkla gece kullanacak. Koyu tema varsayılan mı olmalı, yoksa sistem tercihini mi izlemeli?
- **Veri Yokluğunun Görsel Dili:** Soket tipi, güç ve tarife Faz 1'de boş olacak. Bu alanlar arayüzde nasıl gösterilmeli — hiç gösterilmesin mi, "bilinmiyor" rozeti mi, yoksa kullanıcıdan katkı isteyen bir çağrı mı?

<!-- rol: cto -->
- **Cevap (Rota Mekanizması Kararı):** Web'de planlanan rota koordinat ve istasyon ID dizisi içeren Base64 kodlanmış bir kısa URL'e dönüştürülüp QR kod aracılığıyla cihaz kamerasına sunulacak, doğrudan mobil uygulama içinde state olarak hydrate edilecektir.
<!-- rol: cto -->
- **Cevap (Deep-Link Standartları Kararı):** Desteklenmeyen operatörler için istasyon/soket kodu işletim sistemi panosuna (clipboard) otomatik kopyalanacak ve `clipboard_fallback: true` mantığıyla kullanıcıya "yapıştırabilirsiniz" yönergesi (toast) gösterilecektir.
<!-- rol: cto -->
- **Cevap (Doğrulama Güvenliği Kararı):** GPS fence ve cihaz attestation kısıtlarına ek olarak, API ağ geçidinde "token bucket" algoritmasıyla rate limiting uygulanacak ve şüpheli/spam istemci imzaları shadow-ban (sessiz red) listesine alınacaktır.
<!-- rol: cto -->
- **Cevap (Veri Toplama Sürdürülebilirliği Kararı):** Dış uç noktalara yapılacak anlık doluluk istekleri için 429/403 HTTP durum kodlarına duyarlı "Circuit Breaker" devresi eklenecek ve rastgele saniyeler (jitter) barındıran "Exponential Backoff" katmanı uygulanacaktır.
<!-- rol: cto -->
- **Cevap (Tasarım Dili ve Bilgi Hiyerarşisi Kararı):** Haritada tüketici dostu ferah dokunma hedefleri (≥ 48x48pt) ve sade küme pinleri kullanılacak; istasyon detayında ise kademeli açılma (progressive disclosure) ile teknik sürücü kartları sunulacaktır.
<!-- rol: cto -->
- **Cevap (Koyu Tema ve FOUC Önleme Kararı):** Sistem tercihi (`prefers-color-scheme`) varsayılan olacak, kullanıcıya Açık/Koyu/Sistem seçeneği verilecektir. Web SSR'da tema çerezden (cookie) okunup `<html>` etiketine hydration öncesi enjekte edilerek parlama (FOUC) engellenecektir.
<!-- rol: cto -->
- **Cevap (Veri Yokluğunun Görsel Dili Kararı):** Boş alanlar gizlenmeyecek veya uydurulmayacak; "Operatör Verisi Bekleniyor" nötr gri rozetiyle gösterilecek ve tıklandığında kitle kaynaklı katkı formunu tetikleyen çağrıya (CTA) dönüşecektir.
