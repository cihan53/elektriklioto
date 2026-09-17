# Ekran Envanteri ve Arayüz Davranış Spesifikasyonu (Faz 1)

> **ÇATIŞMA:** "Mobil istemci Flutter ile geliştirilecektir. (zorunlu)" kısıtı teknik olarak imkânsızdır. Ortam raporunda `flutter` ve `dart` komutları "Exec format error" nedeniyle BOZUK durumdadır. İstemcinin geliştirilebilmesi için onarım gereklidir.
> **Varsayım:** Proje geliştirimine başlanmadan önce Flutter ortamındaki mimari uyumsuzluk (muhtemelen Rosetta veya x86/arm64 çakışması) çözülecektir.

---

## 1. Bilgi Mimarisi ve Gezinme Yapısı

İstemciler tek tasarım dilini (`tasarim_sistemi.md`) paylaşır; bilgi mimarisi platforma göre ayrışır.

### 1.1. Web (Nuxt.js) URL Hiyerarşisi (SSR/SSG Öncelikli)
- `/` — **Ana Sayfa:** SEO vitrini, arama kutusu, istatistikler ve operatör vitrini.
- `/harita` — **Tam Ekran Harita (Client-Only):** Bounding box (`bbox`) dinamik PostGIS haritası.
- `/kesfet/{il}` — **İl Rehberi (SSR):** İl bazlı istasyon agregasyonu ve ilçe dağılımı.
- `/kesfet/{il}/{ilce}/sarj-istasyonlari` — **İlçe Dizin Listesi (SSR):** İlçe bazlı SEO kartları.
- `/marka/{operator}` — **Operatör Dizin Sayfası (SSR):** 179 markanın ağ genişliği ve istasyon dökümü.
- `/istasyon/{istasyon_slug}` — **Kanonik İstasyon Detayı (SSR):** İstasyon verisi ve "Telefona Aktar" QR bileşeni.
- `/favoriler` — **Kullanıcı Listesi (CSR):** LocalStorage tabanlı favoriler.

### 1.2. Mobil (Flutter) Sekme ve Yığın (Stack) Mimarisi
- **Tab 1: Keşfet (Harita - Varsayılan)**
  - `Stack 1 (Kök):` Tam Ekran Dinamik Harita (60 FPS, PostGIS Bbox).
  - `Stack 2 (Overlay):` Filtre Paneli (Modal BottomSheet).
  - `Stack 3 (Modal Sheet):` İstasyon Hızlı Özet Kartı (Collapsible Persistent BottomSheet).
  - `Stack 4 (Push Route):` İstasyon Detay Ekranı.
  - `Stack 5 (Modal Route):` Arıza Bildirim Formu (GPS Fence <50m).
- **Tab 2: Favoriler**
  - `Stack 1 (Kök):` Çevrimdışı (Hive) Destekli Favori İstasyonlar.
  - `Stack 2 (Push Route):` İstasyon Detay Ekranı.
- **Tab 3: Ayarlar**
  - `Stack 1 (Kök):` Tema Tercihi, Anonim Cihaz ID, EPDK Yasal Beyanı, Önbellek Yönetimi.

---

## 2. Platform Ekran Dağılım Matrisi

| Ekran Kodu | Ekran Adı | Web (Nuxt) | Mobil (Flutter) | Platforma Özgü Davranış |
|---|---|:---:|:---:|---|
| **SCR-01** | Dinamik İstasyon Haritası | Var (`/harita`) | Var (`Tab 1`) | Mobilde GPS merkezli başlar; Web'de tam ekran client-only çalışır. |
| **SCR-02** | Filtre Paneli | Var (Açılır Panel) | Var (BottomSheet) | 179 marka ve halka açık/özel filtresi; soket/güç pasiftir. |
| **SCR-03** | İstasyon Hızlı Özet Kartı | Var (Harita Yanı) | Var (Alt Kart) | Mobilde alttan açılır; Web'de harita üstü yüzen karttır. |
| **SCR-04** | İstasyon Detay Ekranı | Var (`/istasyon/...`) | Var (`Stack 4`) | Web'de QR kod taşır; Mobilde CPO Deep-Link tetikler. |
| **SCR-05** | Arıza Bildirim Modalı | Yok | Var (`Modal Route`) | Mobilde <50m GPS konum kanıtı (`proximity_proof`) ile çalışır. |
| **SCR-06** | Favoriler Ekranı | Var (`/favoriler`) | Var (`Tab 2`) | Mobilde Hive ile çevrimdışı çalışır; Web'de LocalStorage kullanır. |
| **SCR-07** | Web Ana Sayfa | Var (`/`) | Yok | Web SEO giriş kapısı, marka logoları ve il dizinidir. |
| **SCR-08** | İl / İlçe SEO Dizinleri | Var (`/kesfet/...`) | Yok | Google botları için SSR üretilmiş statik dizindir. |
| **SCR-09** | Operatör Dizin Sayfası | Var (`/marka/...`) | Yok | 179 markanın istasyon dökümüdür. |
| **SCR-10** | Mobil Ayarlar & Bilgi | Yok | Var (`Tab 3`) | Anonim cihaz ID ve çevrimdışı önbellek kontrolünü sağlar. |

---

## 3. Harita ve Yoğun Veri Etkileşim Modeli (SCR-01)

16.788 istasyonun 60 FPS akıcılıkta sunumu için etkileşim modeli katı kurallara bağlanmıştır:

### 3.1. Kümeleme (Clustering) Eşikleri
- **Karar:** Zoom 3 – 11.99 arasında istasyonlar Supercluster ile kümelenir.
- **Gerekçe:** Binlerce pini DOM/Canvas elemanına dönüştürmeden 60 FPS performans sağlamak.
- **Alternatif:** Tüm pinleri doğrudan çizmek (Mobil istemciyi kilitlediği için reddedildi).
- **Görsel Durum:** Küme rozetinde dairesel sayaç (örn: `+128`) basılır; çap logaritmik büyür.
- **Tıklama Eylemi:** Kümeye dokunulduğunda harita kümenin `bbox` sınırlarına 250ms animasyonla yaklaşır.

### 3.2. Tekil Pin Gösterimi (Zoom ≥ 12)
- **Pin Anatomisi:** 179 markanın SVG logosu/rengi pinde taşınır (Trugo turkuaz, ZES mavi, Eşarj sarı/lacivert).
- **Seçim Davranışı:** Dokunulan pin 1.0x'den 1.25x'e büyür ve aktif vurgu halkası alır.
- **Kamera Dengeleme (Center Offset Padding):** Alt kart (BottomSheet) açıldığında alt %40 kapanır; harita hedef koordinatı ekranın üst %60'lık açık alanının merkezine kaydırır. Pin kart altında kalmaz.

### 3.3. Viewport Delta-Polling (PostGIS `bbox`)
- Harita sürükleme (Pan) bittiğinde 300ms gecikme (debounce) ile `[minLon, minLat, maxLon, maxLat]` koordinatları `/api/v1/stations?bbox=...` uç noktasına iletilir. PostGIS sorgusu sonucu dönen GeoJSON belleğe alınır, yalnızca yeni giren pinler ekrana basılır (p95 < 40ms).

---

## 4. Detaylı Ekran Envanteri

### SCR-01: Dinamik İstasyon Haritası
- **Amaç:** Çevredeki istasyonları kümeleme ve marka pinleriyle interaktif haritada sunmak.
- **Bağlı Hikaye / Kabul Kriteri:** Hikaye 4 / Kabul Kriteri 2 (PostGIS bbox p95 < 40ms, 60 FPS).
- **Platform:** Web (`/harita`) ve Mobil (`Tab 1 / Stack 1`).
- **Veri Alanları:**
  - `latitude`, `longitude` (PostGIS `geom` koordinatları)
  - `istasyon_adi` (İstasyon adı / tesis tabelası), `marka` (179 marka), `hizmet_sekli` (`Halka Açık` / `Özel`), `station_uid` (Kanonik kimlik)
  - > **VERİ YOK:** Soket Tipleri (CCS / Type 2) — Faz 1'de pin üzerinde gösterilemez.
  - > **VERİ YOK:** Güç Değeri (kW) — Hızlı/Yavaş ayrımı pin rengine yansıtılamaz.
  - > **VERİ YOK:** Anlık Doluluk Durumu — Pin üzerinde meşguliyet rozeti basılamaz.
  - > **VERİ YOK:** Tarife Fiyatı — Pin üzerinde fiyat basılamaz.
- **Eylemler:** Pan/Zoom, Pine dokunma (SCR-03 açar), Kümeye dokunma (zoom), "Konumuma Git" (GPS), "Filtrele" (SCR-02), "Arama Yap".
- **Durumlar:**
  - *Yükleniyor:* Sağ üst köşede minimal 16x16dp spinner; harita etkileşimi donmaz.
  - *Boş Durum:* `bbox` sınırlarında istasyon yoksa üstte uyarı çubuğu: *"Bu alanda kayıtlı şarj istasyonu bulunamadı."*
  - *Hata Durumu:* API 5xx yanıtında toast: *"İstasyonlar güncellenemedi. Çevrimdışı veriler gösteriliyor."*
  - *Çevrimdışı Durum:* Mobil istemcide Hive önbelleğindeki pinler gösterilir, üstte gri *"Çevrimdışı Mod"* rozeti belirir.

---

### SCR-02: Filtre Paneli
- **Amaç:** Haritadaki istasyonları marka ve erişim kriterlerine göre filtrelemek.
- **Bağlı Hikaye / Kabul Kriteri:** Hikaye 4 / Kabul Kriteri 2.
- **Platform:** Web (Açılır Panel) ve Mobil (Modal BottomSheet).
- **Veri Alanları:**
  - `marka_listesi` (179 operatörün alfabetik ve istasyon adedine göre listesi; ZES, Trugo, Eşarj en üstte)
  - `hizmet_sekli_filtresi` (Tümü / Yalnızca Halka Açık), `favoriler_toggle` (Yalnızca kaydettiklerim)
  - > **VERİ YOK:** Soket Tipi Filtresi (CCS, Type 2) — Görünür ancak pasiftir (disabled); *"Yakında"* rozeti taşır.
  - > **VERİ YOK:** Minimum Güç Filtresi (22kW, 60kW, 120kW+) — Pasiftir (disabled); *"Yakında"* rozeti taşır.
  - > **VERİ YOK:** Uygunluk / Müsaitlik Filtresi — Pasif durumdadır.
  - > **VERİ YOK:** Tarife Aralığı Filtresi — Arayüzde yer almaz.
- **Eylemler:** Marka arama, onay kutularını seçme/kaldırma, "Tümünü Seç"/"Temizle", "Halka Açık" switch, "Sonuçları Göster".
- **Durumlar:**
  - *Yükleniyor:* 4 satırlık skeleton liste.
  - *Boş Durum:* Marka bulunamazsa: *"Aradığınız kriterde operatör bulunamadı."*
  - *Hata Durumu:* Liste alınamazsa en popüler 5 operatör statik gösterilir.

---

### SCR-03: İstasyon Hızlı Özet Kartı
- **Amaç:** Haritadan kopmadan istasyon kimliği, mesafe ve yönlendirme özetini sunmak.
- **Bağlı Hikaye / Kabul Kriteri:** Hikaye 5 / Kabul Kriteri 8.
- **Platform:** Web (Harita Yan Kartı) ve Mobil (BottomSheet).
- **Veri Alanları:**
  - `istasyon_adi`, `marka`, `hizmet_sekli`, `adres` (İl ve ilçe)
  - `mesafe` (İn-memory GPS ile hesaplanan mesafe, örn: "2.4 km")
  - > **VERİ YOK:** Canlı Durum — Gri *"Durum Bilinmiyor"* rozeti basılır.
  - > **VERİ YOK:** Soket Detayları — *"Soket Detayı Yok"* uyarısı yer alır.
- **Eylemler:** Karta dokunma / yukarı kaydırma (SCR-04 Detay Ekranını açar), "Yol Tarifi" butonu (Harici haritayı açar), "Favoriye Ekle / Çıkar" kalp ikonu, "Kapat (X)" butonu.
- **Durumlar:**
  - *Yükleniyor:* Dokunulduğunda 100ms kart iskeleti (Skeleton Loader).
  - *Hata Durumu:* İstasyon verisi alınamazsa toast: *"İstasyon bilgisi alınamadı."*

---

### SCR-04: İstasyon Detay Ekranı
- **Amaç:** Kanonik istasyon bilgilerini sunmak ve operatör uygulamasına derin bağlantı (Deep-Link) kurmak.
- **Bağlı Hikaye / Kabul Kriteri:** Hikaye 5, 6, 9 / Kabul Kriteri 3 (Deep-link başarı > %90, panoya kopyalama fallback'i), Kabul Kriteri 5, 8.
- **Platform:** Web (`/istasyon/{istasyon_slug}`) ve Mobil (`Stack 4 - Tam Ekran`).
- **Veri Alanları:**
  - `istasyon_adi`, `marka`, `istasyon_no` (EPDK resmî `ŞRJ/xxxx` kodu)
  - `sarj_agi_isletmecisi`, `sarj_istasyonu_isletmecisi` (Lisans unvanları), `adres` (Açık adres), `hizmet_sekli`, `son_guncelleme`
  - `yasal_uyari` ("elektriklioto.com şarj ağı işletmecisi değildir; bilgiler EPDK veri tabanından derlenmiştir.")
  - > **VERİ YOK:** Soket Listesi — *"Bu istasyona ait soket tipi ve güç verisi henüz doğrulanmamıştır."* nötr bilgi kartı basılır.
  - > **VERİ YOK:** Şarj Gücü — *"— kW"* gri gösterilir.
  - > **VERİ YOK:** Tarife / Fiyat — *"Operatör güncel tarife bilgisi bulunmuyor"* kartı basılır.
  - > **VERİ YOK:** Canlı Doluluk — *"Durum Bilinmiyor"* gri rozetiyle gösterilir.
- **Eylemler:**
  - **Birincil Eylem (Mobil):** `[Operatör Adı]'nda Aç ve Şarjı Başlat` sticky butonu. Operatör URL scheme tetikler (`zes://station?id=ŞRJ/1234`). Parametre desteklenmezse istasyon kodu panoya kopyalanır, toast çıkar ve CPO uygulaması yalın açılır. Uygulama yüklü değilse mağazaya yönlendirir.
  - **Birincil Eylem (Web):** `Telefona Aktar (QR Kod)` modalını açma.
  - **İkincil Eylem:** `Sorun / Arıza Bildir` butonu (SCR-05 ekranına yönlendirir).
  - **Yardımcı Eylemler:** "Yol Tarifi Al", "İstasyonu Paylaş", "Favorilerime Ekle".
- **Durumlar:**
  - *Yükleniyor:* Web'de SSR anında gelir; Mobilde Shimmer iskelet animasyonu çalışır.
  - *Hata Durumu:* İstasyon bulunamazsa Web'de 404 sayfası, Mobilde *"İstasyon Bulunamadı"* ekranı basılır.

---

### SCR-05: Anonim Arıza ve Sorun Bildirim Modalı
- **Amaç:** İstasyonun yanında bulunan kullanıcılardan arıza, hasar veya işgal verisi toplamak.
- **Bağlı Hikaye / Kabul Kriteri:** Hikaye 7 / Kabul Kriteri 4 (GPS fence < 50m, kullanıcı koordinatı sunucuya iletilmez, anonim token).
- **Platform:** Yalnızca Mobil (`Modal Route`). (Web istemcisinde konum doğrulaması güvenilir olmadığı için kapsam dışıdır).
- **Veri Alanları:**
  - `istasyon_adi` ve `istasyon_no` (Bilgi başlığı)
  - `sorun_kategorisi` (Seçim: *İstasyon Çalışmıyor*, *Soket/Kablo Hasarlı*, *ICEing İşgali*, *Giriş Engelli*, *Diğer*)
  - `aciklama` (Opsiyonel metin, maks 200 karakter)
  - `proximity_proof` (İstemcide hesaplanan <50m mesafe kanıt bayrağı)
- **Eylemler:** Kategori seçimi, açıklama girme, "Bildirimi Gönder", "Vazgeç".
- **Durumlar:**
  - *GPS Mesafe Engeli (Ön Hata):* Mesafe > 50 metre ise form açılmaz: *"Yalnızca istasyonun 50 metre yakınındayken bildirim yapabilirsiniz. Uzaklık: [X] m."*
  - *Yükleniyor:* Gönder butonunda inline spinner; form kilitlenir.
  - *Başarı Durumu:* Modal kapanır: *"Bildiriminiz anonim olarak alındı. Teşekkür ederiz."*
  - *Hata Durumu (Rate Limit):* 429 yanıtında toast: *"Kısa süre önce bildirimde bulundunuz. Lütfen bekleyin."*

---

### SCR-06: Favoriler Ekranı
- **Amaç:** Kaydedilen istasyonlara çevrimdışı koşullarda dahi hızlı erişim sağlamak.
- **Bağlı Hikaye / Kabul Kriteri:** Kapsam İçi / Kabul Kriteri 8 (Çevrimdışı Dayanıklılık).
- **Platform:** Web (`/favoriler`) ve Mobil (`Tab 2`).
- **Veri Alanları:**
  - Favori istasyon kart listesi (`istasyon_adi`, `marka`, `adres`, `hizmet_sekli`, `mesafe`)
  - > **VERİ YOK:** Soket / Doluluk / Fiyat verisi kartlarda yer almaz.
- **Eylemler:** Karta dokunma (SCR-04 Detay Ekranını açar), Listeden çıkarma (Kaydırarak silme), "Haritada Göster" butonu (Haritayı favorilere odaklar).
- **Durumlar:**
  - *Boş Durum:* *"Henüz favori istasyonunuz yok. Haritadaki kalp ikonundan ekleyebilirsiniz."* [Haritaya Git].
  - *Çevrimdışı Durum:* Hive önbelleğindeki kayıtlar listelenir; kartlarda *"Önbellekten Gösteriliyor"* rozeti basılır.

---

### SCR-07: Web Ana Sayfa ve Arama Portalı
- **Amaç:** Organik arama motoru trafiğini karşılamak, ağ istatistiklerini ve marka dizinini sunmak.
- **Bağlı Hikaye / Kabul Kriteri:** Hikaye 8 / Kabul Kriteri 5 (Lighthouse SEO > 90, FCP < 1.2 sn).
- **Platform:** Yalnızca Web (`/`).
- **Veri Alanları:** Hero Arama Çubuğu, Ağ Sayacı (*"16.788 İstasyon, 179 Marka"*), İlk 15 Marka Vitrini, En Çok İstasyon Olan İller, Mini Harita Widget, Mobil İndirme QR ve butonları.
- **Eylemler:** İlçe arama, Marka logosuna tıklama (`/marka/...`), "Haritayı Aç" butonu (`/harita`).
- **Durumlar:** SSR ile HTML/CSS <1.2 sn basılır. Sonuç yoksa: *"Eşleşen sonuç bulunamadı."*

---

### SCR-08: İl ve İlçe SEO Dizin Sayfaları
- **Amaç:** "Kadıköy şarj istasyonları" gibi yerel arama sorgularını karşılamak.
- **Bağlı Hikaye / Kabul Kriteri:** Hikaye 8 / Kabul Kriteri 5 (Lighthouse SEO > 90).
- **Platform:** Yalnızca Web (`/kesfet/{il}` ve `/kesfet/{il}/{ilce}/sarj-istasyonlari`).
- **Veri Alanları:**
  - Breadcrumb (`Ana Sayfa > İstanbul > Kadıköy`), Bölge Başlığı ve Adet ("Kadıköy Şarj İstasyonları - 428 Nokta"), Operatör Dağılım Tablosu, İstasyon Kart Listesi (Adres, Marka, Detay Bağlantısı), JSON-LD Structured Data.
  - > **VERİ YOK:** Soket, güç ve doluluk kartlarda yer almaz.
- **Eylemler:** İstasyon kartına tıklama, komşu ilçelere geçiş, "Haritada Gör" (`/harita?bbox=...`).
- **Durumlar:** Statik HTML anında basılır. İstasyonsuz ilçede: *"Bu ilçede kayıtlı istasyon bulunmamaktadır."*

---

### SCR-09: Operatör (CPO) Dizin Sayfası
- **Amaç:** Belirli bir markaya ait istasyon ağı için profil ve istasyon dökümü sunmak.
- **Bağlı Hikaye / Kabul Kriteri:** Hikaye 8 / Kabul Kriteri 5.
- **Platform:** Yalnızca Web (`/marka/{operator}`).
- **Veri Alanları:** Marka Logosu, Görünen Adı, Lisans Sahibi Şirket Unvanı, Türkiye Toplam İstasyon Sayısı (Örn: "ZES - 1.940 İstasyon"), İllere Göre Dağılım Çizelgesi, Paginasyonlu İstasyon Kart Listesi, Halka Açık / Özel Tesis Oranı.
- **Eylemler:** İl filtresiyle süzme, İstasyon detayına tıklama, "Markayı Haritada Gör".
- **Durumlar:** Sunucuda tam HTML döner. Geçersiz markada 404 sayfasına yönlenir.

---

### SCR-10: Mobil Ayarlar ve Bilgi Ekranı
- **Amaç:** Tema tercihi, anonim cihaz kimliği ve yasal EPDK sorumluluk reddi beyanlarını sunmak.
- **Bağlı Hikaye / Kabul Kriteri:** Kapsam İçi / Zorunlu Kısıt ("Lisanslı Şarj Operatörü Değildir" ve "Konum Gizliliği").
- **Platform:** Yalnızca Mobil (`Tab 3`).
- **Veri Alanları:**
  - **Görünüm:** Koyu / Açık / Sistem (Segmented Control)
  - **Anonim Cihaz Kimliği:** SHA-256 token (E-postasız arıza bildirimi ve ayar takibi)
  - **Veri Kaynağı:** "İstasyon verileri EPDK Şarj İstasyonları Sorgulama Sistemi açık verilerinden derlenmiştir."
  - **Yasal Sorumluluk Reddi:** "elektriklioto.com, EPDK lisanslı bir şarj ağı işletmecisi değildir. Elektrik satışı veya faturalandırma yapmaz. Bağımsız bir e-Mobilite asistanıdır."
  - **Konum Gizliliği (KVKK):** "GPS konumunuz sunucuda ASLA saklanmaz; yalnızca geçici bellekte harita merkezleme için işlenir."
  - **Önbellek Boyutu:** Hive ve karo boyutu (Örn: "24.5 MB")
- **Eylemler:** Tema seçimi, "Önbelleği Temizle", "Açık Kaynak Lisansları".
- **Durumlar:**
  - *Statik Ekran:* Ağ gerektirmez, anında açılır.

---

## 5. Web'den Mobile Köprü (SCR-04 / QR Handoff)

- **Karar:** Web İstasyon Detay sayfasında (`SCR-04`) sabit "Telefona Aktar" kutusu yer alır.
- **Gerekçe:** Masaüstünde incelenen istasyonu sürüş öncesinde telefona aktarma sürtünmesini sıfırlamak.
- **Alternatif:** SMS / E-posta ile link gönderme (KVKK riski ve maliyet nedeniyle reddedildi).
- **Mekanizma:** QR kod `https://elektriklioto.com/app?station_uid=ST_XXXX` linkini içerir.
- **Mobil Etkileşim:** Telefon kamerasından okutulduğunda mobil uygulama Universal/App Link ile açılır ve `SCR-04` ekranını hydrate eder. Uygulama yüklü değilse Smart App Banner ile indirme sayfasına aktarır.

---

## 6. Tasarım ve Erişilebilirlik Standartları (WCAG 2.1 AA)

1. **Dokunma Hedefi Boyutu (Touch Targets):**
   - Mobildeki tüm butonlar, pinler, sekmeler ve liste elemanları **minimum 44x44 pt (iOS) / 48x48 dp (Android)** tıklanabilir alana sahip olacaktır.
   - Küçük ikonlar (20x20dp kalp vb.), şeffaf `padding` ile 44x44dp alana genişletilecektir.
2. **Renk Kontrastı:**
   - Gövde metinleri (`text-primary`, `text-secondary`) arka plan rengine göre **minimum 4.5:1** kontrast oranını karşılayacaktır.
   - Pasif "VERİ YOK" rozetlerinde metin kontrastı en az **3:1** olacaktır.
3. **Koyu Tema (Dark Mode) Standardı:**
   - Gece sürüş güvenliği ve araç içi yansımaları önlemek için koyu tema sistem tercihine tam duyarlı olacaktır.
   - Saf siyah yerine OLED parlamasını önleyen derin antrasit (`#121212` / `#1E1E1E`) token'ları kullanılacaktır.
4. **"VERİ YOK" Görsel Dil Standardı:**
   - Soket tipi, güç ve tarife verisi için sahte değer uydurulamaz.
   - Bu alanlar için standart nötr gri rozet (`Badge.neutral`) ve `—` (em-dash) kullanılacaktır.
