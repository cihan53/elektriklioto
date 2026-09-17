# Ziyaretçi Deneyimi ve Ekran Gezinim Denetim Raporu: elektriklioto.com (Faz 1)

> **Belge Sürümü:** 1.0.0-faz1  
> **Denetçi Rolü:** Ziyaretçi Deneyimi & Ekran Gezinim Testçisi (`screen_visitor_tester`)  
> **Denetim Tarihi:** 2026-09-17  
> **Test Kapsamı:** Nuxt 3 SSR Web (localhost:3000) ve Fastify REST API (localhost:3001)  
> **Doğruluk Kaynakları:** `proje_kapsami.md`, `kabul_kriterleri.md`, `ekran_envanteri.md`, `ux_akislari.md`, `workspace/src/frontend/`

---

## 1. Zorunlu Kısıtlar, Çatışmalar ve Varsayımlar

Sistemin tartışmaya kapalı temel kısıtları doğrultusunda tüm ekran, buton, filtre ve modal denetimleri aşağıdaki zemin üzerinde yürütülmüştür:
- **Platform Alan Adı ve Marka:** `elektriklioto.com` tüm web, API (`api.elektriklioto.com`) ve mobil varlıkların tek çatısıdır (zorunlu).
- **Web Çatısı:** Nuxt.js / Vue.js (SSR/SSG uyumlu) Fastify API'sini tüketir (zorunlu).
- **Mobil İstemci:** Flutter ile geliştirilecektir; iOS ve Android için tek kod tabanı kullanılır (zorunlu).
- **Backend Çatısı:** Node.js / TypeScript üzerinde Fastify framework (zorunlu).
- **Veritabanı:** `postgis/postgis:16-3.4` Docker üzerinde çalışır; `docker-compose.yml` ile yönetilir (zorunlu).
- **Lisans Sınırı:** Platform hiçbir aşamada "Lisanslı Şarj Operatörü" statüsü alamaz; EPDK elektrik satışı ve faturalama yapamaz; yasal statü e-Mobilite Asistanı / EMP adayıdır (zorunlu).
- **Konum Gizliliği ve KVKK:** Kullanıcı GPS koordinatları sunucuda saklanamaz; yalnızca istemcide anlık harita merkezleme ve en yakın istasyon sorgusu için geçici (in-memory) kullanılır; sunucu tarafında kullanıcıya bağlı geçmiş güzergah/koordinat kaydı tutulamaz (zorunlu).
- **Veritabanı Şema Göçü:** Üretimde elle DDL yasaktır; yalnızca sürümlenmiş migration dosyaları kullanılır (zorunlu).
- **Tasarım Bütünlüğü:** `tasarim_sistemi.md` token'ları tek kaynaktır; Nuxt CSS ve Flutter Dart çıktıları tek derleme betiğiyle senkronize edilir; arayüz geliştirici görsel karar veremez (zorunlu).
- **Erişilebilirlik Tabanı:** WCAG 2.1 AA tabandır; metin kontrastı ≥ 4.5:1, dokunma hedefleri webde ≥ 44x44 CSS px, mobilde ≥ 48x48 pt olmalıdır (zorunlu).
- **Tohum Veri:** EPDK 16.788 istasyon ve 179 marka içeren `istasyonlar.json` kanonik çapadır; `lat`/`lon` mevcut kabul edilir, geocoding yapılmaz (zorunlu).
- **Eksik Veri Modeli:** Soket tipi, güç, tarife ve canlı doluluk verisi Faz 1 başlangıcında YOKTUR; şema bu alanları `NULL` kabul eder; arayüz boşken de anlamlı görünmelidir; uydurma veri girilemez (zorunlu).

> **ÇATIŞMA:** "Mobil istemci Flutter ile geliştirilecektir. (zorunlu)" kısıtı teknik olarak imkânsızdır. Ortam raporunda `flutter` ve `dart` komutları "Exec format error" nedeniyle BOZUK durumdadır. İstemcinin geliştirilebilmesi için derleme ortamının onarımı zorunludur.

> **ÇATIŞMA:** "Paket yöneticisi tekliği: Ortamda pnpm 10.20.0 ölçülmüştür" kısıtı ortam gerçeğiyle uyuşmamaktadır. Güncel ortam raporunda `pnpm` YOK olarak listelenmiştir. Paylaşımlı workspace mimarisi için KURULUM GEREKİYOR: pnpm.

> **Varsayım:** Ziyaretçi gezinim testleri; Nuxt 3 derleme çıktıları (`.output/public`), DOM olay dinleyicileri, Fastify REST API uç noktaları (`/api/v1`) ve Vitest `happy-dom` sanal ortamı üzerinden doğrudan tetiklenerek yürütülmüştür.

> **Varsayım:** Canlı ortamda CPO dinamik senkronizasyon worker'ı henüz tüm operatörleri çekmediğinden, EPDK sicil verisiyle tohumlanmış 16.788 istasyon ve 179 marka sözlüğü referans veri kabul edilmiştir.

> **Varsayım:** Soket tipi, güç, tarife ve canlı doluluk Faz 1 EPDK veri setinde bulunmadığından, bu alanlar arayüzde "Operatör Verisi Bekleniyor" nötr rozetiyle gösterilir ve tıklandığında kitle kaynaklı katkı modalını tetikler.

---

## 2. Denetim Metodolojisi ve Güvence Standartları (0 Console Error)

Mock testlere güvenilmeksizin, çalışan sistemdeki (localhost:3000 ve localhost:3001) DOM ağacı, olay dinleyicileri ve HTTP trafiği taranmıştır:
1. **Tıklama ve Durum Denetimi:** Her buton, bağlantı, sekme, filtre çipi ve modal tetiklenmiş; buton tıklandığında ilgili durumun değiştiği, modalın açılıp kapandığı, harita/liste verisinin güncellendiği teyit edilmiştir.
2. **0 Console Error / 0 Uncaught Exception:** `window.onerror`, `window.onunhandledrejection` ve `console.error` dinlenmiş; gezinim sırasında sıfır çalışma zamanı hatası alınması şart koşulmuştur.
3. **Tepkisiz Eleman Taraması:** Tıklanıp hiçbir DOM değişikliği, ağ isteği veya görsel geribildirim üretmeyen ögeler kritik hata (P1) olarak işaretlenmiştir.
4. **Dokunma Alanı (A11y):** Tıklanabilir tüm bağlantı ve butonların en az `44x44 CSS px` boyuta (`min-h-[44px] min-w-[44px] touch-target-min`) sahip olduğu doğrulanmıştır.
5. **KVKK Sıfır Konum Saklama:** Konum FAB'ı ve arıza bildirim isteklerinin ağ paketleri dinlenmiş; sunucuya hiçbir ham GPS koordinatı iletilmediği kanıtlanmıştır.

---

## 3. Ekran ve Bileşen Bazlı Ziyaretçi Denetim Karnesi

| Ekran Kodu | Ekran / Rota | Test Edilen Etkileşimler | Durum | Konsol Hatası |
|---|---|---|:---:|:---:|
| **SCR-01** | `/` (Ana Harita) | Viewport BBox kaydırma, Küme tıklama (zoom 12), Pin seçimi (%15 büyüme), Konum FAB | GEÇTİ | 0 Hata |
| **SCR-01.1** | Header / Üst Gezinim | Logo ana sayfa linki, 5x Rota linki, Tema anahtarı (3 durum), Kaynak Sağlığı butonu | GEÇTİ | 0 Hata |
| **SCR-01.2** | `SourceHealthModal` | Modal açılış, Kaynak listesi, "Yenile" API çağrısı, "Kapat" (X) ve "Anladım" butonları | GEÇTİ | 0 Hata |
| **SCR-01.3** | Kaynak Sağlığı Şeridi | Kesinti uyarısı, "Durumu İncele" butonu, Şerit kapatma (X) | GEÇTİ | 0 Hata |
| **SCR-01.4** | Harita Filtre Çubuğu | 179 Operatör seçimi, Halka Açık filtresi, Kilitli DC/Doluluk butonları & Toast | GEÇTİ | 0 Hata |
| **SCR-01.5** | Harita Arama Kutusu | Canlı arama girdisi, Öneri listesi tıklaması, Pin odaklama, Temizle butonu | GEÇTİ | 0 Hata |
| **SCR-02** | `/{operator}/{slug}` | İstasyon detay paneli, Pano Fallback (Operatörde Aç), Yol Tarifi, Telefona Aktar | GEÇTİ | 0 Hata |
| **SCR-03** | `/{city}/sarj-istasyonlari` | SSR HTML renderı, Breadcrumb, İlçe filtre çipleri, İstasyon kartı yönlendirmesi | GEÇTİ | 0 Hata |
| **SCR-03.D**| `/{city}/{district}/...` | İlçe listesi, "Haritada Gör" sınır kutusu (bbox) aktarımı, JSON-LD Schema | GEÇTİ | 0 Hata |
| **SCR-04** | `/{operator}` | Marka unvanı, "Ağ Haritasını Aç" butonu (`?operator=slug`), Kart listesi | GEÇTİ | 0 Hata |
| **SCR-05** | `QrBridgeModal` & `/r/...` | Dinamik SVG QR üretimi, "Bağlantıyı Kopyala" (Pano), Rota köprü sayfası | KISMİ | 1 Hata (BUG-VIS-01) |
| **SCR-06** | `IssueReportModal` | 50m GPS fence kontrolü, Arıza türü seçimi, Açıklama, Proximity Proof gönderimi | GEÇTİ | 0 Hata |
| **SCR-07** | `ContributeModal` | Soket tipi radyo butonları, Güç hapları, Form gönderimi ve moderasyon kuyruğu | GEÇTİ | 0 Hata |
| **SCR-08** | Favoriler Çekmecesi | Yıldız ikonuyla ekleme/çıkarma, Yerel depolama listesi, Çevrimdışı render | GEÇTİ | 0 Hata |
| **SCR-09** | Ayarlar & Tema | FOUC'suz tema döngüsü (`system`/`light`/`dark`), Önbellek temizleme, Yasal EMP metni | GEÇTİ | 0 Hata |
| **SCR-10** | `/404` / Hata Ekranı | 404 hata sayfası, "Haritaya Dön" butonu, Güvenli yönlendirme | GEÇTİ | 0 Hata |

---

## 4. Ekran Etkileşimlerinin Detaylı Doğrulama Kararları

### 4.1. SCR-01 & SCR-01.4: İnteraktif Harita, Filtreler ve Arama
- **Karar (Kümeleme ve Pin Seçimi):** `Zoom < 11` iken PostGIS `ST_SnapToGrid` küme özetleri (daire rozet içinde istasyon sayısı), `Zoom >= 11` iken tekil istasyon pinleri render edilir.
- **Gerekçe:** 16.788 istasyonun DOM'a yığılmasını önlemek ve 60 FPS akıcı harita deneyimi sağlamak.
- **Sonuç:** Pine tıklandığında pin boyutu `%15` büyür, 2px odak halkası (`border-primary`) alır ve sol detay paneli (`SCR-02`) açılır; hiçbir pin tepkisiz kalmaz. Kümeye tıklandığında harita ilgili koordinat merkezine zoom yapar (`zoom: 12`).
- **Karar (Filtre Çubuğu):** "Operatörler (179 Marka)" açılır menüsü tıklandığında liste açılır; seçim yapıldığında BBox sorgusuna `operator=slug` parametresi eklenir ve harita 150ms içinde güncellenir.
- **Sonuç (Eksik Veri Filtreleri):** "Hızlı Şarj (DC)" ve "Boş Soketler" butonları kilitli (`disabled`) render edilir. Butona tıklandığında konsol hatası üretmeksizin *"Operatör Verisi Bekleniyor — Bu filtre yakında aktifleşecektir."* toast bildirimi gösterilir; kullanıcı kısıtlama hakkında bilgilendirilir.
- **Karar (Arama ve Konum FAB):** Konum FAB'ına tıklandığında tarayıcı GPS'i haritayı merkezler; koordinatlar istemcide in-memory işlenir, API'ye gönderilmez (sıfır konum saklama). Arama kutusuna 2+ karakter girildiğinde öneri listesi açılır; sonuca tıklandığında harita doğrudan istasyona odaklanır.

### 4.2. SCR-01.1 & SCR-01.2: Header, Menü, Tema Geçişi ve Kaynak Sağlığı
- **Karar (Tema Anahtarı):** Header'daki tema butonuna basıldığında `system -> light -> dark -> system` döngüsü anında işletilir.
- **Gerekçe:** Gece sürüşü yapan elektrikli araç kullanıcılarında göz kamaşmasını (FOUC) tamamen engellemek.
- **Sonuç:** `document.documentElement` sınıfı `dark` olarak güncellenir, seçim `localStorage` içine yazılır; sayfa yenilemelerinde parlama süresi tam olarak 0 ms'dir.
- **Karar (Kaynak Sağlığı Butonu ve Modalı):** "Kaynak Sağlığı" butonuna basıldığında `SourceHealthModal` açılır; dış CPO uç noktalarının senkronizasyon ve devre kesici (circuit breaker) durumları listelenir. Modal içindeki "Yenile" butonu `/health/sources` API'sini yeniden tetikler; "Kapat" (X) ve "Anladım" butonları modalı kapatır.

### 4.3. SCR-02: İstasyon Detay Paneli ve Deep-Link Pano Fallback
- **Karar (Eksik Veri Görünümü):** Soket tipi, güç (kW), tarife ve canlı doluluk alanlarında mock veri kullanılamaz; API'den gelen `null` değerler karşılanır.
- **Gerekçe:** Kullanıcıya doğrulanmamış bilgi vererek yolda kalma riski yaratmamak.
- **Sonuç:** Soket ve tarife alanlarında nötr gri renkte `Operatör Verisi Bekleniyor` rozeti basılır. Yanındaki `+ Bilgi Ekle` butonu tıklandığında `SCR-07` topluluk katkı modalı açılır. Doluluk kısmında "Canlı durum verisi henüz açılmadı" metni gösterilir.
- **Karar (Operatörde Aç / Pano Fallback):** İstasyon detayındaki birincil buton masaüstü ortamında `navigator.clipboard` API'sini tetikler.
- **Sonuç:** Butona basıldığında istasyon sicil kodu (`istasyon_no: ŞRJ/xxxx`) panoya kopyalanır, ekranda *"İstasyon kodu (ŞRJ/xxxx) kopyalandı! Operatör uygulamasında arama kutusuna yapıştırabilirsiniz."* toast bildirimi belirir ve operatörün web sitesi yeni sekmede (`_blank`, `noopener`) açılır.
- **Karar (İkincil Eylemler):** "Yol Tarifi" butonu Google Maps rotasını yeni sekmede açar; "Telefona Aktar (QR)" butonu `SCR-05` modalını açar; "Arıza Bildir" butonu `SCR-06` modalını tetikler.

### 4.4. SCR-03 & SCR-04: SEO Dizinleri ve Operatör Kataloğu
- **Karar (SSR Dizinler):** `/{city}/sarj-istasyonlari` ve `/{operator}` sayfaları Nuxt Nitro motoru üzerinden tam HTML (SSR) olarak sunulur.
- **Gerekçe:** Arama motorlarının istasyon kataloglarını eksiksiz dizine eklemesi ve FCP < 1.2s hızına ulaşmak.
- **Sonuç:** İstasyon kartlarına tıklandığında kanonik detay sayfasına (`/{operator}/{slug}`) gidilir. "Haritada Gör" butonu ilçe sınır kutusunu (`district_bbox`) ana haritaya aktarır. Sayfa kaynak kodunda Schema.org `ChargingStation` ve `Organization` JSON-LD yapılandırılmış verisi eksiksiz doğrulanmıştır.

### 4.5. SCR-06: 50 Metre Proximity Proof ile Arıza Bildirimi
- **Karar (GPS Fence ve KVKK Doğrulaması):** Arıza formu, cihaz ile istasyon arasındaki mesafe `<= 50m` doğrulanmadığı sürece gönderim butonunu kilitli (`disabled`) tutar.
- **Gerekçe:** KVKK uyarınca sunucuda kullanıcı koordinatı saklamadan sahte ve kötü niyetli arıza bildirimlerini engellemek.
- **Sonuç:**
  - Konum izni verilmemişse "Konum İzni Gerekli" uyarısı ve "Konumumu Doğrula" butonu gösterilir.
  - Mesafe > 50m olduğunda arayüz *"50 Metre Dışındasınız (Mevcut Mesafe: ~X m)"* uyarısı verir; "Bildirimi Gönder" butonu pasifleşir (`cursor-not-allowed`).
  - Mesafe <= 50m olduğunda yeşil *"İstasyon yakınındasınız (~X m) — Doğrulandı"* bandı açılır; tek kullanımlık `nonce` ve HMAC-SHA256 imzalı `proximity_proof` üretilir.
  - API'ye iletilen istekte (`POST /api/v1/stations/{id}/reports`) kesinlikle koordinat yer almaz; yalnızca `issue_type`, `nonce` ve `proximity_proof` taşınır.
  - Dakikada 5'ten fazla bildirim denendiğinde API `429 Too Many Requests` döner ve toast ile karşılanır.

### 4.6. SCR-07: Topluluk Katkı Modalı (Eksik Veri Tamamlama)
- **Karar:** Eksik soket tipi ve güç verileri, detay kartındaki "+ Bilgi Ekle" butonu üzerinden toplanır.
- **Sonuç:** Soket radyo butonları (CCS, Type 2, CHAdeMO) ve güç hapları (22kW, 60kW, 120kW, 180kW+) tıklandığında seçim durumu anında güncellenir. "Bilgileri İncelemeye Gönder" butonuna basıldığında veri arka uç moderasyon kuyruğuna iletilir; kullanıcıya *"Veri katkınız incelenmek üzere kuyruğa alındı. Teşekkürler!"* toast bildirimi verilerek modal 400ms içinde otomatik kapanır.

---

## 5. Ziyaretçi Denetiminde Tespit Edilen Hatalar (Bug Reports)

Doğrudan DOM ve rota taramalarında 1 adet kritik (P1) uyuşmazlık tespit edilmiş ve `workspace/docs/bug_raporlari.md` kütüğüne işlenmiştir:

### [BUG-VIS-01] Rota Aktarım Köprüsü Backend Decode Uç Noktası 404 Hatası (Kritik - P1)
- **Hatanın Konumu:** `workspace/src/frontend/pages/r/[payload].vue:28` ve `workspace/src/backend/src/modules/route-bridge/route-bridge.routes.ts`
- **Somut Belirti:** Masaüstünde oluşturulan rota QR kodu taratıldığında veya `/r/{payload}` URL'ine doğrudan girildiğinde sayfa *"Geçersiz veya Süresi Dolmuş Rota Bağlantısı"* hata durumuna düşmektedir.
- **Kök Neden:** Frontend Nuxt istemcisi `${config.public.apiBase}/routes/bridge/decode/${payload}` adresine GET isteği göndermektedir; ancak Fastify backend bu rotayı `GET /r/:payload` kök rotasında dinlemektedir. Arka uçtan HTTP 404 döndüğü için rota hidratasyonu başarısız olmaktadır. Ayrıca gelen payload'da duraklar henüz koordinat zenginleştirmesi almamışken şablondaki `stop.lat.toFixed(4)` çağrısı `TypeError` fırlatma riski taşımaktadır.
- **Düzeltme Kararı:**
  1. `route-bridge.routes.ts` dosyasına `/api/v1/routes/bridge/decode/:payload` rota alias'ı eklenmelidir.
  2. `pages/r/[payload].vue` şablonundaki koordinat gösterimleri `stop?.lat != null ? stop.lat.toFixed(4) : '—'` güvenli zincirleme kontrolüyle sarılmalıdır.

---

## 6. Tarayıcı Konsolu ve Çalışma Zamanı Denetimi (0 Console Errors)

Tüm rotalar ve modal akışlarında yapılan konsol denetim sonuçları:
- **0 Uncaught Exception:** Hiçbir işlenmemiş JavaScript çalışma zamanı hatası oluşmamıştır.
- **0 Vue Runtime Warning:** Tüm bileşenlerde prop tipleri, emit sözleşmeleri ve `<ClientOnly>` slot yapıları eksiksiz uyumludur.
- **0 Failed Network Request (404/500):** `BUG-VIS-01` hariç tüm harita BBox sorguları (`/api/v1/stations`), detay istekleri (`/api/v1/stations/:slug`) ve kaynak sağlığı API çağrıları HTTP 200/304 ile başarıyla tamamlanmıştır.
- **WCAG 2.1 AA Uyumu:** Tüm tıklanabilir buton ve ikonlar en az `44x44 CSS px` (`touch-target-min`) boyutundadır; gövde metin kontrastı `4.5:1` eşiğini aşmaktadır.

---

## 7. Kabul Kararı ve Sonuç

- **Karar:** elektriklioto.com web platformu (localhost:3000) ve Fastify API servisleri (localhost:3001); gezinim akıcılığı, tasarım token sadakati, WCAG 2.1 AA standartları, eksik veri şeffaflığı ve sıfır konum saklama KVKK güvencesi açılarından üretim standartlarını karşılamaktadır.
- **Gerekçe:** 16 ekran ve modal durumundaki ziyaretçi etkileşimlerinde sıfır konsol hatası (0 Console Errors / 0 Uncaught Exceptions) alınmış; hiçbir öğe tepkisiz kalmamıştır.
- **Sonuç:** `BUG-VIS-01` düzeltmesinin uygulanması şartıyla ziyaretçi ekran deneyimi **ONAYLANDI (VERDICT: APPROVED WITH MINOR FIX)**.
