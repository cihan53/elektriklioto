# Arayüz Spesifikasyonu: elektriklioto.com (Faz 1)

> **Belge Sürümü:** 1.0.0-faz1  
> **Durum:** Onaylandı (Arayüz ve Etkileşim Karar Dokümanı)  
> **Kapsam:** Nuxt 3 (Web) ve Flutter (Mobil) Ortak Ekran Düzenleri, Kırılım Noktaları, Bileşen Hiyerarşisi, Durum Ekranları ve Mikro Kopya  
> **Doğruluk Kaynakları:** `proje_kapsami.md`, `workspace/docs/teknik_mimari_dokumani.md`, `workspace/docs/tasarim_sistemi.md`, `workspace/docs/ux_akislari.md`, `workspace/docs/ekran_envanteri.md`

---

## 1. Zorunlu Kısıtlar, Çatışmalar ve Varsayımlar

Aşağıdaki kararlar projenin değişmez kısıtlarıdır ve tüm arayüz spesifikasyonu bu temeller üzerinde yapılandırılmıştır:

- **Platform Alan Adı ve Marka:** `elektriklioto.com` tüm web, API (`api.elektriklioto.com`) ve mobil varlıkların tek çatısıdır (zorunlu).
- **Web Çatısı:** Nuxt.js / Vue.js (SSR/SSG uyumlu) Fastify API'sini tüketir (zorunlu).
- **Mobil İstemci:** Flutter ile geliştirilecektir; iOS ve Android için tek kod tabanı kullanılır (zorunlu).
- **Backend Çatısı:** Node.js / TypeScript üzerinde Fastify framework (zorunlu).
- **Veritabanı:** `postgis/postgis:16-3.4` Docker konteyneri üzerinde çalışır (zorunlu).
- **Lisans Sınırı:** Platform hiçbir aşamada "Lisanslı Şarj Operatörü" statüsü alamaz; EPDK elektrik satışı ve faturalama yapamaz; e-Mobilite Asistanı / EMP adayıdır (zorunlu).
- **Konum Gizliliği ve KVKK:** Kullanıcı GPS konumu sunucuda saklanamaz; yalnızca istemcide anlık harita merkezleme için geçici (in-memory) işlenir, geçmiş koordinat tutulamaz (zorunlu).
- **Tasarım Bütünlüğü:** `tasarim_sistemi.md` token'ları tek kaynaktır; Nuxt CSS ve Flutter Dart çıktıları tek derleme betiğiyle senkronize edilir; arayüz geliştirici görsel karar veremez (zorunlu).
- **Erişilebilirlik Tabanı:** WCAG 2.1 AA tabandır; metin kontrastı ≥ 4.5:1, dokunma hedefleri webde ≥ 44x44 CSS px, mobilde ≥ 48x48 pt olmalıdır (zorunlu).
- **Tohum Veri:** EPDK 16.788 istasyon ve 179 marka içeren `istasyonlar.json` kanonik çapadır (`ŞRJ/xxxx`); `lat`/`lon` mevcut kabul edilir, geocoding yapılmaz (zorunlu).
- **Eksik Veri Modeli:** Soket tipi, güç, tarife ve canlı doluluk verisi Faz 1 başlangıcında YOKTUR; şema bu alanları `NULL` kabul eder; arayüz boşken de anlamlı görünmek zorundadır; uydurma veri girilemez (zorunlu).

> **ÇATIŞMA:** "Mobil istemci Flutter ile geliştirilecektir. (zorunlu)" kısıtı teknik olarak imkânsızdır. Ortam raporunda `flutter` ve `dart` komutları "Exec format error" nedeniyle BOZUK durumdadır. İstemcinin geliştirilebilmesi için onarım gereklidir.

> **ÇATIŞMA:** "Paket yöneticisi tekliği: Ortamda pnpm 10.20.0 ölçülmüştür" kısıtı ortam gerçeğiyle uyuşmamaktadır. Güncel ortam raporunda `pnpm` YOK olarak listelenmiştir. Paylaşımlı workspace mimarisi için KURULUM GEREKİYOR: pnpm.

> **Varsayım:** Flutter ve pnpm ortam sorunları giderilene kadar web ve backend geliştirme süreçleri Node v22 ve npm ile yürütülür; arayüz spesifikasyonu her iki platform için geliştiricinin doğaçlama yapamayacağı kesinlikte tanımlanmıştır.

> **Varsayım:** Soket tipi, güç, tarife ve anlık doluluk Faz 1 EPDK veri setinde bulunmadığından, bu alanlar ekranlarda "Operatör Verisi Bekleniyor" nötr rozetiyle gösterilir ve tıklandığında kitle kaynaklı katkı formunu tetikler.

---

## 2. Genel Düzen Kuralları ve Kırılım Noktaları (Layout & Breakpoints)

### 2.1. Kırılım Noktaları ve Grid Sistemi

- **Mobil (`< 640px`):**
  - Kenar Boşluğu (Gutter): 16px (`--spacing-4`).
  - Sütun Sayısı: 1 kolon (dikey akış).
  - Navigasyon: 64px sabit alt sekme çubuğu (Bottom Navigation Bar).
  - İstasyon Detayı: 3 kademeli alt çekmece (`StationDetailSheet` - Peek: 160pt, Half: 380pt, Full: 100vh - 24px).
- **Tablet (`640px - 1023px`):**
  - Kenar Boşluğu: 24px (`--spacing-6`).
  - Sütun Sayısı: 2 kolonlu kart ızgarası veya harita üzerinde yüzen sol panel (340px genişlik, üstten 80px, alttan 24px boşluk).
  - Navigasyon: Üst başlık çubuğu (Header: 64px) + kompakt menü.
- **Masaüstü (`≥ 1024px`):**
  - Harita Ekranı (`/`): Tam ekran tuval (`100vw`, `calc(100vh - 64px)`), sol tarafta sabit 380px genişliğinde yan panel (`StationDetailPanel`).
  - SEO ve Dizin Sayfaları: Maksimum genişlik 1280px (`max-w-7xl`), ortalanmış, 3 kolonlu istasyon kart ızgarası (`gap-6`).
  - Header: 64px sabit, zemin `--color-bg-surface`, alt kenarlık 1px solid `--color-border-default`.

### 2.2. Dokunma Hedefi ve Klavye Odak Standartları
- Tıklanabilir tüm elemanlar webde en az 44x44 CSS px (`min-h-[44px] min-w-[44px]`), mobilde en az 48x48 pt (`minTargetSize: 48.0`) fiziksel alana sahip olmak zorundadır.
- Klavye sekme (Tab) odağında 3px kalınlığında `--color-focus-ring` (açıkta `#0066CC`, koyuda `#38BDF8`) odak halkası zorunludur; `outline-offset: 2px`.

### 2.3. Koyu Tema ve FOUC Koruması
- Varsayılan tema sistem tercihidir (`prefers-color-scheme`). Kullanıcı Ayarlar'dan (SCR-09) Açık/Koyu/Sistem seçebilir.
- Nuxt SSR'da sayfa render edilmeden önce tema çerezi okunup `<html>` etiketine `class="dark"` olarak gömülür (0ms FOUC). Harita vektör karoları tema sınıfına göre anında gece moduna geçer.

---

## 3. Ekran Spesifikasyonları (Ekran Envanteri Karşılıkları)

### SCR-01: İnteraktif Harita ve Ana Keşfet Ekranı

- **Platform:** Web (`/`), Mobil (`ExploreTab` - Sekme 1).
- **Hedef:** 16.788 istasyonu akıcı (60 FPS) harita üzerinde sunmak, BBox tabanlı listelemek ve filtrelemek.
- **Kırılım Düzeni:**
  - *Masaüstü (≥ 1024px):* Üstte 64px Header. Altında tam ekran harita. Harita üzerinde sol üstte arama çubuğu ve yatay hap filtreler; sol panel kapalıyken harita tam geniştir. Pin tıklandığında sol 380px panel kayarak açılır (`transition: 200ms ease-out`).
  - *Tablet (640-1023px):* Üstte arama ve filtreler; pin tıklandığında sol altta yüzen 340px kart açılır.
  - *Mobil (< 640px):* Tam ekran harita. Üstte 48px yüzen arama çubuğu (kenarlardan 16px). Arama altında yatay kaydırılabilir filtre hapları. Sağ altta 48x48pt dairesil "Konumuma Git" FAB. Pin tıklandığında alttan 160pt'lik `StationDetailSheet` belirir.

#### Bileşen Yerleşimi (Hiyerarşi)
1. **Arama Çubuğu (`SearchInput`):**
   - Genişlik: Webde 380px, mobilde `calc(100% - 32px)`.
   - Yükseklik: 48px, radius 8px (`--radius-md`), sol ikon `Search` (20px), sağda aktifken `X` temizleme ikonu.
   - Mikro Kopya (Placeholder): `"İstasyon, ilçe veya operatör ara..."`
2. **Filtre Çubuğu (`FilterChips`):**
   - Yatay kaydırılabilir liste (`gap-2`, padding: 8px 16px).
   - Chip 1: `"Operatörler"` (Açılır menü tetikler; 179 markadan çoklu seçim; seçilince `"Operatör (2)"` formatına döner).
   - Chip 2: `"Halka Açık"` (İki durumlu buton; default pasif, basılınca aktif).
   - Chip 3: `"Hızlı Şarj (DC)"` (> **VERİ YOK:** Faz 1'de kilitli pasif; dokunulduğunda toast çıkar).
   - Chip 4: `"Boş Soketler"` (> **VERİ YOK:** Faz 1'de kilitli pasif; dokunulduğunda toast çıkar).
3. **Konum FAB (`LocationButton` - Yalnızca Mobil):**
   - Boyut: 48x48pt dairesel, `shadow-lg`, zemin `--color-bg-surface`, ikon `Navigation` (24px, `--color-primary`).
   - Ekran konumu: Sağ alt, alt sekme çubuğunun 16pt üzerinde.
4. **Harita Tuvali (`VectorMapCanvas`):**
   - BBox değişiminde 300ms debounce ile API'ye sınır koordinatları gider. Ham GPS sunucuya iletilmez.
   - Zoom < 11: Küme daireleri (SCR-01 Pin Kuralları).
   - Zoom ≥ 11: 40x48px damla pinler.

#### Arayüz Durumları
- **Varsayılan:** Pinler ve harita karoları yüklü, 60 FPS etkileşim.
- **Yükleniyor:** Sağ üst köşede 24px spinner (`--color-primary`); mevcut harita pinleri ekranda kalır, titreme (flicker) yapmaz.
- **Boş Durum (Bölgede İstasyon Yok):** Haritanın üst orta kısmında yüzen kapsül rozet belirir (`shadow-md`, dolgu: 8px 16px):
  - İkon: `Info` (16px, `--color-text-secondary`).
  - Metin: `"Bu bölgede şarj istasyonu bulunamadı. Haritayı kaydırın."`
- **Hata Durumu:**
  - Web: Ekranın ortasında kart: `"Harita verisi yüklenemedi."` + Buton: `[Yeniden Dene]`.
  - Mobil: Ağ koptuğunda üstte sarı bildirim şeridi açılır: `"Çevrimdışı Mod — Son bilinen istasyonlar gösteriliyor."` (Hive önbelleği).
- **Kilitli Filtre Dokunma Durumu:**
  - Toast Mesajı (4 sn): `"Operatör Verisi Bekleniyor — Bu filtre yakında aktifleşecektir."`

---

### SCR-02: İstasyon Detay Görünümü (Panel / Sayfa / Çekmece)

- **Platform:** Web (`/{operator}/{slug}` ve Sol Panel 380px), Mobil (`StationDetailSheet` 3 Kademeli Çekmece).
- **Hedef:** İstasyonun adres, operatör ve EPDK sicil bilgilerini göstermek; CPO uygulamasına derin bağlantı (deep-linking) veya clipboard fallback ile şarj başlatmak.
- **Kırılım Düzeni:**
  - *Masaüstü (≥ 1024px):* Sol sabit 380px panel; dikey kaydırılabilir (`overflow-y-auto`), dolgu 24px (`--spacing-6`). Kapatma butonu sağ üstte 32x32px (dokunma alanı 44x44px).
  - *Tablet (640-1023px):* Sol yüzen kart (340px) veya modal görünümü.
  - *Mobil (< 640px):* 3 Kademeli `StationDetailSheet`.
    - Kademe 1 (Peek - 160pt): Çekmece tutamacı, Operatör adı, İstasyon adı, Mesafe (in-memory) ve Birincil CTA (`Operatörde Aç`).
    - Kademe 2 (Half - 380pt): Hizmet şekli rozeti, Eksik veri rozetleri, Açık Adres, Yol Tarifi butonu.
    - Kademe 3 (Full - 100vh - 24px): EPDK Sicil No, Arıza Bildir CTA, Topluluk Veri Ekle CTA, EMP yasal beyanı.

#### Bileşen Yerleşimi (Yukarıdan Aşağıya)
1. **Çekmece Tutamacı (Yalnızca Mobil):** 36x4px, radius 9999px, `--color-border-strong`, ortalanmış.
2. **Başlık ve Operatör Bloğu:**
   - Operatör Logosu/Adı: 24px logo + Text Muted 12px operatör ticari unvanı.
   - İstasyon Adı: Display/H2 seviyesinde (`text-h3` / 20px SemiBold), Text Primary.
   - EPDK Sicil Rozeti: `text-mono` (13px), zemin `--color-bg-subdued`, metin: `"EPDK: ŞRJ/xxxx"`.
3. **Durum ve Hizmet Rozetleri (Yatay Esnek Blok):**
   - Rozet 1 (Hizmet Şekli): `"Halka Açık"` (yeşil) veya `"Özel / Kısıtlı"` (sarı).
   - Rozet 2 (Arıza Varsa - 3+ Doğrulanmış İhbar): `"Arıza Bildirildi"` (kırmızı zemin, 14px uyarı ikonu).
4. **Eksik Veri Bölümü (> **VERİ YOK:** Faz 1 Kuralı):**
   - Başlık: `H4` (18px Medium) `"Soket ve Güç Bilgileri"`.
   - Rozet: Standart Gri Rozet (`--color-missing-bg`, metin: `--color-missing-text`):
     - İkon: `HelpCircle` (14px).
     - Metin: `"Operatör Verisi Bekleniyor"`.
     - Bitişik Buton (CTA): `[+ Bilgi Ekle]` (Küçük ikincil buton, SCR-07'yi tetikler).
   - Tarife Satırı: `"Tarife: Operatör Verisi Bekleniyor"`.
   - Doluluk Satırı: `"Canlı Doluluk: Canlı durum verisi henüz açılmadı"`.
5. **Adres ve Konum Bilgisi:**
   - İkon: `MapPin` (18px, `--color-text-secondary`).
   - Metin: Açık adres, İlçe / İl (`text-body-md`, Text Secondary).
6. **Aksiyon Buton Grubu:**
   - Birincil CTA Butonu (`ButtonPrimary`, yükseklik 48px, tam genişlik):
     - Metin: `"Operatörde Aç / Şarja Başla"` (CPO uygulaması varsa doğrudan tetikler; yoksa markete yönlendirir; desteklenmiyorsa panoya kopyalar).
   - İkincil Buton Grubu (2 Kolon, yükseklik 44px):
     - Sol Buton: `[Yol Tarifi Al]` (Harici Apple Maps / Google Maps açar).
     - Sağ Buton (Web): `[Telefona Aktar]` (SCR-05 QR modalını açar).
     - Sağ Buton (Mobil): `[Favoriye Ekle]` (Yıldız ikonu; lokal Hive/localStorage).
   - Arıza Bildir Butonu (Metin Bağlantı Butonu, 44px dokunma):
     - Metin: `"İstasyonla ilgili bir sorun mu var? Arıza Bildir"`.
7. **Tazelik ve Yasal EMP Beyanı (Dipnot Bloğu):**
   - Son Güncelleme Damgası: `"Son Güncelleme: {X} gün önce (EPDK Sicil Verisi)"` (`text-body-sm`, Text Muted).
   - Yasal Uyarı Metni: `"elektriklioto.com lisanslı şarj operatörü değildir. Şarj başlatma ve faturalandırma ilgili operatörün sorumluluğundadır."` (`text-caption`, 11px, Text Muted).

#### Arayüz Durumları
- **Varsayılan:** Tüm EPDK doğrulanmış alanları görünür, eksik alanlar gri rozetli.
- **Yükleniyor:** Başlık, adres ve buton alanlarında gri iskelet (skeleton shimmer) animasyonu.
- **Bulunamadı (404):** Panelde metin: `"İstasyon kaydı bulunamadı."` + Buton: `[Haritaya Dön]`.
- **Clipboard Fallback Tetiklendiğinde (Toast):**
  - Mavi zeminli Toast (4000ms): `"İstasyon kodu ({ŞRJ/xxxx}) kopyalandı! Operatör uygulamasında arama kutusuna yapıştırabilirsiniz."`

---

### SCR-03: SEO İl ve İlçe İstasyon Dizin Sayfaları

- **Platform:** Web'e Özgü (`/{city}/sarj-istasyonlari`, `/{city}/{district}/sarj-istasyonlari` - Nuxt SSR/ISR).
- **Hedef:** Google aramalarından gelen sürücülere FCP < 1.2s ve SEO skoru > 90 ile dizin sunmak, schema.org JSON-LD ile taranmak ve haritaya yönlendirmek.
- **Kırılım Düzeni:**
  - *Masaüstü (≥ 1024px):* 1280px genişlik, 24px kenar boşluğu. Üstte ilçe özeti ve "Haritada Gör" butonu. Altta 3 kolonlu istasyon kart ızgarası (`gap-6`).
  - *Tablet (640-1023px):* 2 kolonlu kart ızgarası (`gap-4`).
  - *Mobil (< 640px):* 1 kolonlu dikey kart listesi. Sayfa başında sticky "Haritada Gör" barı.

#### Bileşen Yerleşimi
1. **Breadcrumb (İçerik Haritası):**
   - Format: `"Ana Sayfa > {İl} Şarj İstasyonları > {İlçe}"` (`text-body-sm`, linkler `--color-primary`).
2. **Başlık ve Özet Bloğu:**
   - Başlık (H1, 30px Bold): `"{İlçe} {İl} Elektrikli Araç Şarj İstasyonları"`
   - Açıklama (Body Large): `"{İlçe} genelinde EPDK siciline kayıtlı toplam {istasyon_sayisi} şarj istasyonu listelenmektedir."`
   - Birincil Eylem Butonu (`ButtonPrimary`, 48px):
     - İkon: `Map` (20px).
     - Metin: `"{İlçe} İstasyonlarını Haritada Gör"` (Tıklandığında haritayı ilgili ilçe sınır kutusuna `bbox` odaklayarak açar).
3. **İstasyon Kart Listesi (`StationSummaryCard`):**
   - Kart Yapısı: Zemin `--color-bg-surface`, 1px border `--color-border-default`, radius 12px, dolgu 16px.
   - Kart Başlığı (H3, 18px SemiBold): İstasyon Adı (Bağlantı: `/{operator}/{slug}`).
   - Operatör ve Kod: Operatör Adı • EPDK Sicil No (`ŞRJ/xxxx`).
   - Adres: 2 satırla sınırlandırılmış açık adres (`line-clamp-2`).
   - Durum Rozeti: `"Operatör Verisi Bekleniyor"` (Gri rozet).
   - Aksiyon: `[Detayları İncele →]` bağlantısı (Dokunma alanı 44x44px).
4. **Sayfalama (Pagination / Sonsuz Kaydırma):**
   - Her sayfada 24 istasyon kartı. Altta `[Önceki]` ve `[Sonraki]` numaralandırılmış butonlar.

#### Arayüz Durumları
- **Varsayılan:** SSR ile anında yüklenmiş HTML içerik.
- **Boş Durum:** İlçede istasyon yoksa:
  - Metin: `"Bu ilçede henüz kayıtlı şarj istasyonu bulunmamaktadır."`
  - Alternatif Link: `"{İl} Genelindeki İstasyonları Görüntüle"`
- **Hata Durumu:** Tanımsız il/ilçe girildiğinde doğrudan HTTP 404 (SCR-10) döner.

---

### SCR-04: Operatör Marka Rehberi ve İstasyon Kataloğu

- **Platform:** Web'e Özgü (`/{operator}` - Nuxt SSR).
- **Hedef:** EPDK lisanslı 179 markanın kurumsal unvanını, ağ büyüklüğünü ve il dağılımını sergilemek.
- **Kırılım Düzeni:**
  - *Masaüstü (≥ 1024px):* Üstte 2 kolonlu operatör tanıtım hero alanı (sol logo/bilgi, sağ harita CTA ve istatistik kartı). Altta il bazlı istasyon sayıları tablosu.
  - *Mobil (< 640px):* Tek kolon dikey akış.

#### Bileşen Yerleşimi
1. **Operatör Başlık Bloğu:**
   - Marka Logosu: 64x64px, radius 8px, kenarlık 1px solid `--color-border-default`.
   - Başlık (H1): `"{Operatör Adı} Şarj İstasyonları ve Ağı"`
   - Lisans Sahibi Unvanı: `sarj_agi_isletmecisi` resmî şirket adı (`text-body-md`, Text Secondary).
   - İstatistik Rozetleri: `"{istasyon_sayisi} İstasyon"`, `"{il_sayisi} İl"`.
2. **Ağ Haritası Aksiyon Butonu:**
   - Metin: `"{Operatör Adı} İstasyonlarını Haritada Filtrele"` (Tıklandığında harita açılır ve ilgili operatör filtresi otomatik seçilir).
3. **Mobil Uygulama Köprüsü:**
   - Metin: `"Resmî {Operatör Adı} Uygulamasını İndirin:"`
   - Butonlar: `[App Store]` ve `[Google Play]` mağaza rozetleri.
4. **İl Dağılım Listesi:**
   - 3 Kolonlu liste: `"{İl Adı} ({İstasyon Sayısı} İstasyon)"` formatında tıklanabilir bağlantılar.

#### Arayüz Durumları
- **Varsayılan:** SSR ile üretilmiş tam sayfa.
- **Boş Durum:** İstasyonu olmayan aktif lisanslarda:
  - Metin: `"Bu operatöre ait aktif istasyon kaydı henüz işlenmemiştir."`
- **Hata Durumu:** Geçersiz operatör slug'ında HTTP 404.

---

### SCR-05: Web-Mobil Rota & İstasyon Aktarım Köprüsü (QR Kod Modalı)

- **Platform:** Web (`QrBridgeModal`), Mobil (`QrScanSheet` ve `/r/{base64}`).
- **Hedef:** Masaüstünde planlanan rota veya istasyonun, kullanıcı hesabı açtırmadan ve sunucuda koordinat tutmadan (sıfır KVKK riski) mobil cihaza aktarılması.
- **Kırılım Düzeni:**
  - *Masaüstü:* Ekran ortasında 420px genişliğinde modal (`radius-xl`, `shadow-xl`, dolgu 24px).
  - *Mobil:* Tam ekran kamera QR tarama çekmecesi.

#### Bileşen Yerleşimi (Web Modalı)
1. **Modal Başlığı ve Kapat Butonu:**
   - Başlık (H3, 20px SemiBold): `"Rotayı Telefona Aktar"`
   - Kapat Butonu: Sağ üstte `X` (44x44px dokunma alanı).
2. **Dinamik SVG QR Kod Alanı:**
   - Boyut: 220x220px ortalanmış beyaz zemin, etrafında 1px kenarlık.
   - İçerik: `https://elektriklioto.com/r/{base64_payload}`
3. **Yönerge Metni:**
   - `"Telefonunuzun kamerasıyla QR kodu okutun. Rota ve seçili istasyonlar elektriklioto.com mobil uygulamasında anında açılacaktır."` (`text-body-md`, Text Secondary).
4. **Alternatif Paylaşım Aksiyonu:**
   - Buton (`ButtonSecondary`, 44px): `[Bağlantıyı Kopyala]` (Panoya kopyalar; toast: `"Bağlantı kopyalandı!"`).

#### Arayüz Durumları
- **Üretim:** Kod < 100ms içinde yerel olarak üretilir; loading süresi algılanmaz.
- **Mobil Tarama Başarısı:** Mobil kamera kodu okuduğunda uygulama açılır, harita ilgili rota state'ini yükler ve 2 sn yeşil toast verir: `"Rota başarıyla aktarıldı."`
- **Mobil Kamera İzni Yok:** Ekranda uyarı: `"QR okutabilmek için kamera izni gereklidir."` + `[Ayarları Aç]` butonu.

---

### SCR-06: Kitle Kaynaklı Arıza Bildirim Modalı (Proximity Proof)

- **Platform:** Mobil öncelikli (`IssueReportModal`), Web (Tarayıcı GPS izniyle kısıtlı).
- **Hedef:** İstasyon arızalarını ve ICEing (benzinli araç işgali) durumlarını, sunucuya ham kullanıcı koordinatı göndermeksizin (donanım mesafesi < 50m doğrulama) raporlamak.
- **Kırılım Düzeni:**
  - *Mobil:* Alttan açılan modal çekmece (`radius-xl`, yükseklik otomatik, max %85 ekran).
  - *Web:* 460px genişliğinde merkez modal.

#### Bileşen Yerleşimi
1. **Modal Başlığı:**
   - Başlık (H3): `"Arıza / Durum Bildir"`
   - İstasyon Adı: `{istasyon_adi}` (`text-body-sm`, Text Muted).
2. **Mesafe Doğrulama Göstergesi (Proximity Status):**
   - Mesafe Denetimi: Cihaz lokal hesaplar (Lokal in-memory; sunucuya iletilmez).
   - Durum A (Mesafe ≤ 50m): Yeşil ikon + `"İstasyon yakınındasınız (Doğrulandı)"`.
   - Durum B (Mesafe > 50m): Kırmızı ikon + `"Bildirim yapabilmek için istasyonun 50 metre yakınında olmalısınız. (Mevcut Mesafe: ~{X} metre)"`.
3. **Sorun Türü Seçim Listesi (Tekli Seçim Radyo Kartları):**
   - Seçenek 1: `"İstasyon Tamamen Kapalı / Enerji Yok"`
   - Seçenek 2: `"Kablo / Soket Fiziksel Olarak Hasarlı"`
   - Seçenek 3: `"Soket Önüne Benzinli Araç Park Etmiş (ICEing)"`
   - Seçenek 4: `"İstasyona Giriş / Alan Kapalı (Bariyer/İnşaat)"`
4. **Açıklama Giriş Alanı (Opsiyonel):**
   - `SearchInput` stilinde textarea, yükseklik 80px, max 140 karakter.
   - Placeholder: `"Ek detay ekleyin (örn: Ekran donmuş durumda)..."`
5. **Gönder Butonu (`ButtonPrimary`, 48px):**
   - Metin: `"Bildirimi Gönder"`
   - Kural: Mesafe > 50m ise veya sorun seçilmemişse buton `Disabled` durumdadır.

#### Arayüz Durumları
- **Gönderiliyor:** Buton üzerinde 20px spinner aktif, form kilitli.
- **Başarı (Toast):** Yeşil zemin: `"Bildiriminiz alındı. Topluluk katkınız için teşekkürler!"` (Modal kapanır).
- **Hata (Mesafe Kuralı İhlali):** Kırmızı uyarı bandı: `"Konumunuz istasyonla eşleşmiyor. Lütfen istasyonun yanındayken tekrar deneyin."`
- **Hız Sınırı Aşıldı (HTTP 429):** `"Çok fazla bildirim gönderdiniz. Lütfen 5 dakika sonra tekrar deneyin."`

---

### SCR-07: Topluluk İstasyon Verisi Katkı Modalı (Eksik Veri Tamamlama)

- **Platform:** Web ve Mobil Ortak (`ContributeDataModal`).
- **Hedef:** Faz 1 EPDK veri setinde bulunmayan soket tipi ve güç verilerini kullanıcı katkısıyla toplamak ve moderasyon kuyruğuna iletmek.
- **Kırılım Düzeni:**
  - Webde 440px merkez modal; mobilde alttan açılan form çekmecesi.

#### Bileşen Yerleşimi
1. **Modal Başlığı:**
   - Başlık (H3): `"İstasyon Bilgisi Ekle"`
   - Açıklama: `"EPDK kayıtlarında eksik olan soket ve güç bilgilerini tamamlayarak diğer sürücülere yardımcı olun."`
2. **Soket Tipi Seçimi (Çoklu Seçim Kartları):**
   - Kart 1: `"CCS (DC Hızlı Şarj)"` (İkonlu)
   - Kart 2: `"Type 2 (AC Standart Şarj)"` (İkonlu)
   - Kart 3: `"CHAdeMO (DC)"` (İkonlu)
3. **Tahmini Şarj Gücü Seçimi (Hap Butonlar):**
   - Seçenekler: `[22 kW]` `[60 kW]` `[120 kW]` `[180 kW+]` `[Bilmiyorum]`
4. **Fotoğraf Yükleme (Opsiyonel):**
   - Buton: `[Etiket / Ünite Fotoğrafı Yükle]` (Maks 5 MB, JPEG/PNG).
   - Dipnot: `"İstasyon teknik bilgi etiketinin fotoğrafı doğrulamayı hızlandırır."`
5. **Gönder Butonu (`ButtonPrimary`, 48px):**
   - Metin: `"Bilgileri İncelemeye Gönder"`

#### Arayüz Durumları
- **Varsayılan:** Form açık, en az 1 soket tipi seçilmelidir.
- **Başarı (Toast):** `"Veri katkınız inceleme kuyruğuna alındı. Onaylandığında yayınlanacaktır."`
- **Hata:** `"Görsel yüklenemedi. Lütfen dosya boyutunu kontrol edin (Maks 5MB)."`

---

### SCR-08: Favori İstasyonlar Ekranı (Çevrimdışı Destekli)

- **Platform:** Web (`FavoritesDrawer`), Mobil (`FavoritesTab` - Sekme 2).
- **Hedef:** Sık kullanılan istasyonlara tek dokunuşla ulaşmak; tünel veya hücresel ağ yokken dahi Hive önbelleğinden adres ve yön bilgisi sağlamak.
- **Kırılım Düzeni:**
  - *Masaüstü:* Sağdan açılan 380px çekmece (Drawer) veya özel sayfa (`/favoriler`).
  - *Mobil:* Alt navigasyondaki 2. sekme tam ekran liste.

#### Bileşen Yerleşimi
1. **Ekran Başlığı:**
   - Başlık (H2, 24px SemiBold): `"Favori İstasyonlarım"`
   - Sayaç Rozeti: `"{favori_sayisi} İstasyon"`
2. **İstasyon Kart Listesi:**
   - Kart içi: İstasyon Adı, Operatör Markası, İlçe/İl bilgisi.
   - Durum: "Operatör Verisi Bekleniyor" rozeti veya arıza ihbarı varsa kırmızı "Arıza Bildirildi" rozeti.
   - Çevrimdışı Rozeti (Ağ yoksa): `"Çevrimdışı Önbellek"` (`text-caption`, sarı/gri zemin).
   - Aksiyonlar:
     - Tıklama: Haritada istasyona odaklar ve SCR-02'yi açar.
     - Silme (Swipe / Buton): Kartı sola kaydırarak veya çöp kutusu ikonuyla silme.
     - Şarja Başla Butonu (Kompakt 36px buton): Operatör derin bağlantısını tetikler.

#### Arayüz Durumları
- **Varsayılan:** Kayıtlı istasyonlar listelenir.
- **Boş Durum (Favori Yok):**
  - İkon: `StarOff` (48px, `--color-text-muted`).
  - Başlık: `"Henüz favori istasyon eklemediniz"`
  - Açıklama: `"Haritadaki istasyon detayından yıldız simgesine dokunarak sık kullandığınız noktaları buraya ekleyebilirsiniz."`
  - Buton (`ButtonPrimary`, 44px): `[İstasyonları Keşfet]` (Haritaya yönlendirir).
- **Çevrimdışı Durum:** Liste kesintisiz çalışır, ekranın üstünde küçük bilgi bandı açılır: `"Çevrimdışı moddasınız. Önbellekteki veriler gösteriliyor."`

---

### SCR-09: Uygulama Ayarları, Tema ve Yasal Bildirim Ekranı

- **Platform:** Web (Header/Footer Menüsü), Mobil (`SettingsTab` - Sekme 4).
- **Hedef:** Koyu/açık tema seçimi, yerel önbellek temizliği ve zorunlu EMP yasal statü bildirimlerini sunmak.
- **Kırılım Düzeni:**
  - Masaüstünde modal veya sayfa; mobilde Sekme 4 tam ekran liste.

#### Bileşen Yerleşimi
1. **Bölüm 1: Görünüm ve Tema:**
   - Başlık: `"Görünüm"`
   - Seçenek Grubu (3 Seçenekli Segment Buton):
     - `[ Sistem ]` | `[ Açık ]` | `[ Koyu ]`
   - Açıklama: `"Gece sürüşünde göz kamaşmasını önlemek için Koyu temayı tercih edebilirsiniz."`
2. **Bölüm 2: Depolama ve Çevrimdışı Harita:**
   - Başlık: `"Veri ve Önbellek"`
   - Satır: `"Kayıtlı Çevrimdışı Veri: {cache_boyutu} MB"`
   - Buton (`ButtonSecondary`, 40px): `[Önbelleği Temizle]` (Onay diyaloğu açar: `"Önbellek temizlensin mi?"`).
3. **Bölüm 3: Yasal Bildirimler ve Lisans Beyanı (Zorunlu EMP Metni):**
   - Başlık: `"Yasal Bilgiler"`
   - Menü Öğesi 1: `"Hakkımızda ve Yasal Statü"` (Açar: Platformun lisanslı şarj operatörü olmadığını, bir e-Mobilite asistanı olduğunu açıklayan metin).
   - Menü Öğesi 2: `"Konum Gizliliği ve KVKK Bildirimi"` (Açar: Konum verisinin sunucuda tutulmadığına dair aydınlatma metni).
   - Menü Öğesi 3: `"EPDK Veri Kaynak Bildirimi"` (Açar: 16.788 istasyonun resmî EPDK sicilinden alındığı beyanı).
4. **Uygulama Sürümü:**
   - Metin: `"elektriklioto.com v1.0.0-faz1 (build 102)"` (`text-body-sm`, Text Muted, ortalanmış).

---

### SCR-10: 404 Sayfası ve Bulunamadı Durumları

- **Platform:** Web (`/404` Nuxt SSR Sayfası), Mobil (`NotFoundDialog`).
- **Hedef:** Geçersiz URL veya silinmiş istasyon bağlantılarında kullanıcıya net yönlendirme sağlamak.
- **Kırılım Düzeni:** Ortalanmış tek kolon içerik (Masaüstü max 600px).

#### Bileşen Yerleşimi
1. **Görsel / Hata Kodu:**
   - `404` (`text-display`, 72px Bold, `--color-primary`).
2. **Başlık:**
   - (H2, 24px SemiBold): `"Aradığınız Sayfa veya İstasyon Bulunamadı"`
3. **Açıklama:**
   - `"İncelemek istediğiniz şarj istasyonu kaldırılmış veya bağlantı adresi değişmiş olabilir."`
4. **Hızlı Bağlantılar ve Aksiyon:**
   - Birincil Buton (`ButtonPrimary`, 48px): `[Haritayı Aç ve Keşfet]`
   - Popüler Dizin Bağlantıları:
     - `[İstanbul Şarj İstasyonları]` • `[Ankara Şarj İstasyonları]` • `[İzmir Şarj İstasyonları]`

---

## 4. Eksik Veri ("VERİ YOK") ve Mikro Kopya Sözlüğü

Aşağıdaki mikro kopya metinleri tüm web ve mobil bileşenlerinde harfiyen kullanılmak zorundadır; geliştirici metin uyduramaz:

| Durum / Konum | Standart Mikro Kopya Metni | Görsel Stil / Token |
|---|---|---|
| **Eksik Soket / Güç Rozeti** | `"Operatör Verisi Bekleniyor"` | Zemin: `--color-missing-bg`, Metin: `--color-missing-text`, İkon: `HelpCircle` 14px |
| **Eksik Veri Katkı Butonu** | `"[+ Bilgi Ekle]"` | Küçük ikincil buton, 32px yükseklik, dokunma alanı 44x44px |
| **Eksik Canlı Tarife** | `"Tarife: Operatör Verisi Bekleniyor"` | `text-body-md`, Text Secondary |
| **Eksik Canlı Doluluk** | `"Canlı durum verisi henüz açılmadı"` | `text-body-sm`, Text Muted |
| **Kilitli Filtre Toast Uyarısı**| `"Operatör Verisi Bekleniyor — Bu filtre yakında aktifleşecektir."` | 4000ms Toast, İkon: `Info` |
| **Clipboard Fallback Toast** | `"İstasyon kodu ({kod}) kopyalandı! Operatör uygulamasında arama kutusuna yapıştırabilirsiniz."` | Mavi zemin (`--color-bg-surface`), 4000ms süre |
| **Zorunlu EMP Yasal Uyarısı** | `"elektriklioto.com lisanslı şarj operatörü değildir. Şarj başlatma ve faturalandırma ilgili operatörün sorumluluğundadır."` | `text-caption` (11px), Text Muted, İstasyon detay kartı tabanı |
| **50m Mesafe Dışı Uyarısı** | `"Bildirim yapabilmek için istasyonun 50 metre yakınında olmalısınız. (Mevcut Mesafe: ~{X} m)"` | Kırmızı metin (`--color-danger`), İkon: `AlertTriangle` |
| **Çevrimdışı Mod Şeridi** | `"Çevrimdışı Mod — Son bilinen istasyon verileri gösteriliyor."` | Üst bant, Sarı/Gri zemin, İkon: `WifiOff` |
| **Boş Arama Sonucu** | `"Aramanızla eşleşen istasyon bulunamadı. Farklı bir ilçe veya operatör deneyin."` | Ortalı metin, `text-body-md`, Text Secondary |

---

## 5. Doğrulama ve Kabul Kriterleri (Geliştirici Kontrol Listesi)

Arayüz geliştiricileri her ekranı tamamlamadan önce aşağıdaki denetim listesini doğrulamak zorundadır:

- [ ] **Sıfır Doğaçlama:** Ekrandaki tüm renkler, yazı boyutları, boşluklar ve köşe yarıçapları `tasarim_sistemi.md` token'larından gelmelidir.
- [ ] **Dokunma Hedefi Doğrulaması:** Web'de hiçbir buton/input 44x44 CSS px'den, mobilde 48x48 pt'den küçük olamaz.
- [ ] **WCAG 2.1 AA Kontrast Testi:** Açık ve koyu temalarda tüm metin/zemin kontrast oranları ≥ 4.5:1 (büyük başlıklar ≥ 3.0:1) olmalıdır.
- [ ] **Eksik Veri Görünürlüğü:** Soket tipi, güç ve tarife boşken hiçbir sahte veri (örn. "22kW") basılamaz; standart gri "Operatör Verisi Bekleniyor" rozeti basılmalıdır.
- [ ] **Konum Gizliliği Denetimi:** Kullanıcı koordinatları ağ isteklerinde (Network tab) görünmemeli; sunucuya ham GPS iletilmemelidir.
- [ ] **FOUC Sıfırlama:** Web sayfasının ilk yüklenişinde koyu mod parlaması (FOUC) 0 milisaniye olmalıdır.
