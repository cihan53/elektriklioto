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

## 4. Kapsam Dışı

- **Doğrudan Uygulama İçi Ödeme Alma (In-app Billing):** TCMB / BDDK lisanslama süreçlerine ve PCI-DSS maliyetlerine takılmamak adına Faz 1'de ödeme aracılığı yapılmaz; ödeme ilgili operatörün kendi uygulamasında tamamlanır.
- **Fiziksel İstasyon Donanım Kontrolü (OCPP / CPMS):** Sahada şarj ünitesi işletilmeyeceği için OCPP donanım protokolü katmanı Faz 1'de yer almaz.
- **Doğrudan OCPI v2.2.1 Çift Yönlü Protokol Entegrasyonu:** Operatörlerle resmi B2B masasına oturup sözleşme imzalanana kadar Faz 1 kapsamına dahil edilmez; Faz 2'ye aktarılmıştır.
- **Kendi Başına Elektrik Satışı / Faturalandırma:** EPDK Şarj Ağı İşletmeci Lisansı gerektiren hiçbir ticari işlem yapılmaz.
- Masaüstü native uygulamaları (Windows/macOS native istemciler kapsam dışıdır; masaüstü ihtiyacı web üzerinden karşılanır).

<!-- rol: cto -->
- **Mikroservis parçalanması ilk sürümde kapsam dışıdır:** Tek deploy edilebilir `api` süreci + tek `worker` süreci (modüler monolit). Servis sınırları kod içinde modül olarak çizilir.
- **Canlı Telemetri / WebSocket Streaming:** Harita soket durumları için istemci tarafında kalıcı WebSocket bağlantısı açılmaz; HTTP delta-polling veya Server-Sent Events (SSE) kullanılır.

## 5. Kısıtlar

- **Platform Alan Adı ve Marka elektriklioto.com olacaktır. (zorunlu)** Tüm web yönlendirmeleri, SEO varlıkları ve API domain yapılanması bu alan adı altında kurgulanır.
- **Mobil istemci Flutter ile geliştirilecektir. (zorunlu)** iOS ve Android için tek kod tabanı kullanılır.
- **Web platformu Nuxt.js / Vue.js ile SSR/SSG uyumlu geliştirilecektir. (zorunlu)** SEO, hız ve modern web standartları için Nuxt çatısı kullanılır; backend Fastify API'sini tüketir.
- **Backend Node.js / TypeScript ile yazılacaktır. (zorunlu)** Fastify framework zorunludur; alternatif framework'ler değerlendirme dışıdır.
- **Veritabanı Docker konteyneri üzerinde çalışan PostgreSQL + PostGIS olacaktır. (zorunlu)** `postgis/postgis:16-3.4` sürümü sabitlenmiş imaj ve depoya işlenmiş `docker-compose.yml` ile ayağa kaldırılır. Bağlantı bilgileri ortam değişkenlerinden okunur, koda gömülmez.
- **Sistem hiçbir aşamada kendisini "Lisanslı Şarj Operatörü" olarak konumlandıramaz. (zorunlu)** Platform yasal olarak bir e-Mobilite Asistanı / EMP adayı statüsündedir; EPDK lisansına tabi elektrik satışı yapılamaz.
- **KVKK / GDPR ve Konum Gizliliği: (zorunlu)** Kullanıcının GPS konumu yalnızca anlık harita merkezleme ve en yakın istasyon sorgusu için geçici (in-memory) kullanılır; sunucu tarafında kullanıcıya bağlı geçmiş güzergah/koordinat kaydı tutulamaz.
- **Veritabanı Şema Göçü: (zorunlu)** Veritabanı değişiklikleri yalnızca sürümlenmiş migration dosyalarıyla yapılır; üretimde elle DDL kapsam dışıdır.

<!-- rol: cto -->
- **KURULUM GEREKİYOR: Docker & PostGIS imajı.** Veritabanı native Postgres değil, spatial indeksleri (`GIST(geom)`) ve coğrafi fonksiyonları destekleyen `postgis/postgis:16-3.4` imajı ile çalışmak zorundadır.
- **Arka plan işleri için ayrı süreç sınırı:** Veri kazıma/senkronizasyon ve bildirim işleri API sürecinin içinde koşturulamaz; bağımsız bir `worker` süreci zorunludur.
- **Dış bağımlılık sınırı (Kuyruk):** İlk sürümde Redis/RabbitMQ eklenmez. İş kuyruğu PostgreSQL üzerinde `FOR UPDATE SKIP LOCKED` deseniyle koşturulur.
- **Dış Veri Çekme Hız Limiti & Saygılı Kazıma:** Harici operatör uç noktalarından veri çeken worker'lar, kaynakların IP engeline takılmaması için exponential backoff, rate-limiting ve proxy rotasyonu kurallarına uymak zorundadır.
- **Zaman Damgası Bölümleme (Partitioning):** Fiyat geçmişi ve kitle-kaynaklı arıza logları zaman serisi tablolarda tutulmalı, en az aylık partition stratejisi uygulanmalıdır.
- **Performans bütçesi:** p95 < 40ms hedefi sunucu içi işlem süresidir (ağ RTT hariç); mobilde 60 FPS harita kaydırması için GeoJSON parse işlemleri UI thread dışında (Isolate) yapılır.

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

## 7. Açık Sorular

<!-- Cevabını gerçekten bilmediğin, rollerin karar vermesini İSTEDİĞİN şeyler.
     Kararını verdiğin bir şeyi buraya yazma — model seni dinlemez, kendi seçer. -->

- **Web ve Mobil Paylaşımlı Rota Mekanizması:** Web sitesinde (`elektriklioto.com`) rota planlayan bir kullanıcının, planladığı rotayı tek tuşla/QR kodla mobil uygulamaya aktarma akışı nasıl kurgulanmalı?
- **Operatör Deep-Link Parametre Standartları:** Her CPO'nun mobil uygulaması harici şema parametresiyle (istasyon ID / soket ID) doğrudan başlatmayı destekliyor mu? Desteklemeyen operatörler için pano (clipboard) fallback'i kullanıcı deneyimini nasıl etkiler?
- **Kitle Kaynaklı Doğrulama Güvenliği:** Kötü niyetli kullanıcıların veya botların istasyonları kasıtlı olarak "arızalı" işaretlemesini engellemek için cihaz güvenilirlik skoru ve mesafe (GPS fence) kısıtı dışında hangi koruma katmanları eklenmeli?
- **Veri Toplama Hukuku ve Sürdürülebilirlik:** CPO'ların kamuya açık arayüzlerinin değişmesi veya IP bazlı engelleme getirmesi durumunda veri akışının kesintisizliği hangi proxy rotasyonu veya yedek açık veri servisleriyle garanti altına alınabilir?
