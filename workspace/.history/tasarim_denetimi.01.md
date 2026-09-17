# Tasarım Denetim Raporu: elektriklioto.com (Faz 1)

> **Belge Sürümü:** 1.0.0-faz1  
> **Denetçi Rolü:** Design Critic (`design_critic`)  
> **Denetim Tarihi:** 2026-09-06  
> **Durum:** Revizyon Gerekli (Changes Required)  
> **Denetlenen Belgeler:** `tasarim_sistemi.md`, `arayuz_spesifikasyonu.md`, `ekran_envanteri.md`, `ux_akislari.md`  
> **Doğruluk Kaynakları:** `proje_kapsami.md`, `kabul_kriterleri.md`, `veri_kaynagi_epdk.md`

---

## 1. Zorunlu Kısıtlar, Çatışmalar ve Varsayımlar

- **Alan Adı ve Marka:** `elektriklioto.com` tüm web, API (`api.elektriklioto.com`) ve mobil varlıkların tek çatısıdır (zorunlu).
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

> **Varsayım:** Flutter ve pnpm ortam sorunları giderilene kadar web ve backend süreçleri Node v22 ve npm ile yürütülür; tasarım denetimi her iki platformun mimari ve sözleşme gereksinimlerini eksiksiz karşılayacak şekilde yürütülmüştür.

> **Varsayım:** Soket tipi, güç, tarife ve anlık doluluk Faz 1 EPDK veri setinde bulunmadığından, bu alanlar ekranlarda "Operatör Verisi Bekleniyor" nötr rozetiyle gösterilir ve tıklandığında kitle kaynaklı katkı formunu tetikler.

---

## 2. Denetim Özeti ve Uyumluluk Karnesi

Tasarım dokümanları geliştiricinin görsel doğaçlama yapmasını engelleme hedefiyle 5 ana başlıkta incelenmiştir:
1. **Eksiksizlik:** Ekran envanteri 10 ekranı (SCR-01 - SCR-10) tanımlamıştır; ancak asenkron arama durumu, GPS reddedildiğinde peek çekmece görünümü ve çevrimdışı katkı davranışı eksiktir.
2. **Erişilebilirlik (WCAG 2.1 AA):** Bağımsız yeniden hesaplanan renk kontrastlarında koyu tema birincil buton aktif durumunda doğrudan standart ihlali (3.23:1 < 4.5:1) ve belgelenmiş tablolarda matematiksel veri hataları saptanmıştır. Odak halkası ve chip klavye durumları eksiktir.
3. **Web↔Mobil Tutarlılığı:** CSS değişkenleri tam iken, Dart sabitlerinde (`tokens.dart`) köşe yarıçapı, tipografi, elevation ve strong border token'ları tanımlanmamıştır; geliştirici Flutter tarafında tıkalıdır.
4. **Veri Gerçekliği:** Soket/güç/fiyat eksikliği "Operatör Verisi Bekleniyor" ile doğru karşılanmış; ancak istasyon kartındaki `{X} gün önce güncellendi` ibaresi EPDK verisinde bulunmayan bir sütuna dayanmaktadır.
5. **Uygulanabilirlik:** Masaüstü webde native CPO app tetikleme mantığı işletim sistemi düzeyinde geçersizdir; web masaüstü için ayrışma gereklidir.

---

## 3. Engelleyici Tasarım Bulguları (Blocking Findings)

- [ERİŞİLEBİLİRLİK] `tasarim_sistemi.md#8.1.1` — Koyu temada `ButtonPrimary` Active (basılma) durumu için zemin `#0369A1` ve metin `#0B0F19` (`On Primary`) olarak tanımlanmıştır. Bağıl parlaklık formülüyle hesaplanan kontrast oranı **3.23:1**'dir. Bu değer WCAG 2.1 AA'nın 14px 500 ağırlıklı buton metinleri için zorunlu kıldığı minimum **4.5:1** kontrast eşiğini ihlal eder → Koyu tema aktif buton zemininde (`#0369A1`) metin rengi `#FFFFFF` (kontrast: **5.93:1**, WCAG 2.1 AA uyumlu) olarak değiştirilmelidir.

- [ERİŞİLEBİLİRLİK] `tasarim_sistemi.md#3.2` — Dokümandaki kontrast sertifikasyon tablosunda matematiksel hesaplama ve tutarsızlık hataları mevcuttur:
  a) `On Primary (#0B0F19)` / `#38BDF8` (Primary Dark) kontrastı tabloda **12.58:1** iddia edilmişken gerçek değer **8.94:1**'dir.
  b) `On Primary (#FFFFFF)` / `#0052A3` (Hover Light) kontrastı **7.82:1** iddia edilmişken gerçek değer **7.68:1**'dir.
  c) `Danger Text (#FEE2E2)` / `#7F1D1D` (Bölüm 8.3.2) kontrastı **8.90:1** iddia edilmişken gerçek değer **8.20:1**'dir.
  d) Bölüm 3.1'de koyu tema `Danger Text` `#F87171` olarak tanımlanmıştır; bu renk `Danger Surface` (`#7F1D1D`) üzerinde kullanıldığında kontrast yalnızca **3.62:1** kalmakta ve AA kuralını bozmaktadır → Bölüm 3.2 tablosundaki sahte kontrast değerleri gerçek matematiksel sonuçlarla güncellenmeli; koyu temada tehlike rozeti içi metin rengi için `--color-danger-on-subdued: #FEE2E2` (kontrast: 8.20:1) ayrı bir semantik token olarak tescil edilmelidir.

- [ERİŞİLEBİLİRLİK] `tasarim_sistemi.md#3.1` ve `arayuz_spesifikasyonu.md#3 (SCR-02)` — Açık temada `Text Muted` (`#64748B`) renginin `Surface Subdued` (`#F1F5F9`) üzerindeki kontrast oranı **4.34:1** olup WCAG 2.1 AA standardı olan **4.5:1**'in altında kalmaktadır. İstasyon detayında EPDK Sicil Rozeti `text-mono` (13px) metni `--color-bg-subdued` üzerinde sunulduğunda erişilebilirlik testinden geçemez → EPDK Sicil Rozeti ve subdued zemin üzerindeki tüm ikincil metinlerde metin rengi `Text Secondary` (`#475569`, kontrast: **6.92:1**) veya `Text Primary` (`#0F172A`, kontrast: **16.30:1**) token'ına bağlanmalıdır.

- [WEB↔MOBİL TUTARLILIĞI] `tasarim_sistemi.md#10.2` — Flutter Dart token çıktıları (`tokens.dart`) ile CSS token'ları (`tokens.css`) ve semantik tablo (Bölüm 3.1) arasında derin asimetri bulunmaktadır:
  a) Tablo 3.1'de Dart sabiti `AppColors.bgBase` olarak belirtilmişken, Bölüm 10.2'de `lightBgBase` ve `darkBgBase` şeklinde uyumsuz yazılmıştır.
  b) `borderStrong` (`#CBD5E1` / `#334155`), `bgElevated` (`#FFFFFF` / `#1E293B`), `bgSubdued` (`#F1F5F9` / `#1E293B`), `primaryHover`, `focusRing` Dart sınıfında tamamen unutulmuştur.
  c) `AppTypography` ve `AppElevation` (Bölüm 6.2'deki gölge değerleri) Dart sınıfı olarak Bölüm 10.2'de kodlanmamıştır → `tokens.dart` dosyası, `tokens.css` ve Bölüm 3-6 arasındaki tüm token'ları (renk, tipografi, elevation, radius, touchTarget) tema destekli (`ThemeExtension` veya açık/koyu sınıf eşleşmesiyle) birebir içerecek şekilde tamamlanmalıdır.

- [EKSİKSİZLİK] `arayuz_spesifikasyonu.md#3 (SCR-01)` ve `tasarim_sistemi.md#8.2` — Arama çubuğu (`SearchInput`) için yalnızca statik durumlar (Default, Hover, Focus, Disabled, Error) tanımlanmış; kullanıcının arama yaptığı esnadaki "Arama Yapılıyor / Yükleniyor" (Asenkron API çağrısı spinner'ı) durumu ve arama sonucu bulunamadığında harita üstünde açılacak "Sonuç Bulunamadı Açılır Menüsü" (Autocomplete Empty State) spesifikasyonu yazılmamıştır → `SearchInput` bileşenine `Searching / Loading` (sağda 20px spinner) durumu ve açılır liste boş durumu ("Sonuç bulunamadı - İlçe veya operatör adı yazın") eklenmelidir.

- [EKSİKSİZLİK] `arayuz_spesifikasyonu.md#3 (SCR-02)` — Mobil 3 kademeli alt çekmecenin (`StationDetailSheet`) 1. kademesinde (Peek - 160pt) `Mesafe (in-memory)` gösterileceği belirtilmiştir. Ancak kullanıcının konum izni vermediği veya cihaz GPS'inin kapalı olduğu senaryoda Peek çekmecesinde mesafenin yerini neyin alacağı (boşluk mu kalacak, ikon mu gizlenecek, 'Mesafe hesaplanamadı' mı yazacak) tanımlanmamıştır → Konum izni yoksa mesafe rozetinin gizlenerek yerine doğrudan operatörün ticari unvanının veya `Hizmet Şekli` rozetinin sola yaslanarak hizalanacağı açıkça belirtilmelidir.

- [EKSİKSİZLİK] `arayuz_spesifikasyonu.md#3 (SCR-06)` ve `ux_akislari.md#UX-FLOW-05` — Arıza bildirim formunda mesafe > 50m durumu tanımlanmış, ancak kullanıcının cihazında donanım GPS'inin tamamen kapalı olduğu veya uygulamanın konum izninin "Asla" olarak engellendiği durum ele alınmamıştır. Kullanıcı modalı açtığında sonsuz spinner'da mı kalacak yoksa izin diyaloğu mu çıkacak belirsizdir → Konum izni kapalıysa formun başında sarı uyarı kartı ("Arıza doğrulaması için konum izni gereklidir. [İzin Ver / Ayarları Aç]") gösterilerek `Gönder` butonunun pasif tutulacağı kurala bağlanmalıdır.

- [VERİ GERÇEKLİĞİ] `arayuz_spesifikasyonu.md#3 (SCR-02)` ve `veri_kaynagi_epdk.md` — İstasyon detay kartının altında `"Son Güncelleme: {X} gün önce (EPDK Sicil Verisi)"` gösterileceği yazılmıştır. Ancak `veri_kaynagi_epdk.md` raporu istasyon bazında herhangi bir `guncelleme_tarihi` sütunu bulunmadığını (yalnızca tekil tohum dosyasının çekim tarihi `2026-09-06` olduğunu) belgelemektedir. Bu spesifikasyon geliştiriciyi veritabanında olmayan bir alanı aramaya itmektedir → Metin şablonu `"Veri Kaynağı: EPDK Sicil Kaydı (Eylül 2026)"` veya tohumlama/senkronizasyon tablosundaki global batch tarihi `"Son Veri Eşitleme: {batch_date}"` olarak revize edilmelidir.

- [UYGULANABİLİRLİK] `arayuz_spesifikasyonu.md#3 (SCR-02)` — Web masaüstü ortamında (Nuxt 3 masaüstü tarayıcı) istasyon detayındaki birincil CTA butonu `Operatörde Aç / Şarja Başla` olarak tanımlanmış ve "CPO uygulaması varsa doğrudan tetikler" kuralı verilmiştir. Web tarayıcılarında istemcinin bilgisayarda native bir CPO masaüstü uygulaması kurulu olup olmadığını sorgulama API'si (veya `canLaunchUrl` benzeri bir yetenek) yoktur ve `zes://` gibi şemalar masaüstü tarayıcılarda protokol işleyici hatası vermektedir → Web masaüstü için buton davranışı kesinleştirilmeli; Web'de masaüstü kullanıcısına doğrudan operatörün web sitesi veya QR köprüsü sunulmalı, native app scheme tetiklemesi yalnızca mobil istemciye (Flutter) tahsis edilmelidir.

- [ERİŞİLEBİLİRLİK] `tasarim_sistemi.md#8.1.3` — `FilterChip` bileşeni için klavye odak halkası (`:focus-visible`) ve fare `Hover` durumu durum tablosunda tanımlanmamıştır. Yalnızca "Seçili Değil", "Seçili" ve "Kilitli Pasif" durumları verilmiştir. Klavye ile harita filtrelerinde sekmeleyen (Tab tuşu) motor/görme engelli kullanıcı odaklandığı çipi göremez → `FilterChip` için açık ve koyu temalarda `Hover` (zemin `--color-bg-subdued`, kenarlık `--color-border-strong`) ve `Focus` (3px odak halkası `--color-focus-ring`) durumları ve `aria-pressed` / `aria-disabled` erişilebilirlik nitelikleri zorunlu olarak tabloya eklenmelidir.

---

## 4. Kozmetik ve Deneyimi İyileştirici Öneriler (Non-blocking / ÖNERİ)

- [ÖNERİ] `tasarim_sistemi.md#8.2` — Arama çubuğu placeholder metni (`#94A3B8`) açık temada 2.56:1 kontrast vermektedir. WCAG 2.1 SC 1.4.3 placeholder metinlerini teknik olarak muaf tutsa da, güneş ışığı altında araç içi kullanımda okunurluğu artırmak için placeholder renginin `#64748B` (4.76:1) seviyesine çekilmesi önerilir.
- [ÖNERİ] `arayuz_spesifikasyonu.md#2.1` — Tablet kırılımında sol panelin bir yerde "340px yüzen panel" bir yerde "modal" olarak geçmesi yerine, kod tekrarını önlemek için tek tip "340px sol yüzen sheet" olarak sabitlenmesi önerilir.
- [ÖNERİ] `tasarim_sistemi.md#7.4` — `prefers-reduced-motion` kuralında `animation-duration: 0.01ms` yerine doğrudan `transition: none !important; animation: none !important;` tanımlanması, düşük donanımlı Android cihazlarda gereksiz GPU katmanı tetiklenmesini engeller.

---

## 5. Ölçülebilir Tasarım Kabul Kriterleri (QA Doğrulama Kapıları)

QA ekibi yapım aşamasında her bileşeni ve ekranı aşağıdaki ölçülebilir kriterlere göre test edecektir:

- **DAC-01 (WCAG 2.1 AA Kontrastı):** Açık ve koyu temalarda tüm gövde metinleri, buton etiketleri ve rozetler arka planlarına karşı en az **4.5:1** kontrast oranına sahip olmalıdır (Büyük başlıklar ≥ 3.0:1, UI bileşen sınırları ve odak halkaları ≥ 3.0:1). Pa11y ve axe-core testlerinde sıfır kontrast hatası alınmalıdır.
- **DAC-02 (Fiziksel Dokunma Alanı):** Web üzerinde tıklanabilir tüm öğeler en az **44x44 CSS px**, mobil (Flutter) üzerinde en az **48x48 pt** fiziksel dokunma alanına sahip olmalıdır. Görsel olarak küçük olan öğeler (örn. 36px chipler, 24px kapat ikonları) şeffaf dolguyla bu sınıra tamamlanmalıdır.
- **DAC-03 (Token Bütünlüğü ve Sıfır Sabit Kod):** Nuxt ve Flutter kod tabanlarında `tasarim_sistemi.md` harici sabit HEX (`#xxxxxx`) veya keyfi piksel aralığı bulunamaz. CI linter taramasında harici stil tespit edilirse build kırılmalıdır.
- **DAC-04 (Eksik Veri Karşılama):** Soket tipi, şarj gücü (kW), tarife ve anlık doluluk verisi `null` geldiğinde ekranda hiçbir uydurma mock veri ("22kW", "0 TL") gösterilemez; standart gri "Operatör Verisi Bekleniyor" rozeti ve bitişiğindeki "Bilgi Ekle" CTA'sı eksiksiz render edilmelidir.
- **DAC-05 (Klavye Gezinimi ve Odak Yönetimi):** Web'de harita ve form kontrolleri sekmeleme (Tab) ile gezilebilmeli; odaklanan her öğe etrafında 3px kalınlığında, 2px mesafeli (`outline-offset: 2px`) odak halkası (`--color-focus-ring`) belirmelidir. Modal açıldığında odak modal içine kilitlenmeli, ESC tuşu modalı kapatıp odağı tetikleyiciye iade etmelidir.
- **DAC-06 (Ekran Okuyucu Bütünlüğü):** Vektör harita pinleri `role="button"` ve `aria-label="Operatör: {ad}, İstasyon: {ad}"` niteliği taşımalıdır. Filtre butonları `aria-pressed="true|false"`, kilitli filtreler ise `aria-disabled="true"` ve `aria-describedby` ile açıklama metnine bağlı olmalıdır.
- **DAC-07 (Sıfır FOUC ve Koyu Tema Uyumu):** Web SSR açılışında koyu tema parlaması (FOUC) tam olarak **0 milisaniye** olmalı, `class="dark"` sunucu render aşamasında `<html>` etiketine gömülmelidir. Harita vektör karoları gece moduna anında geçmelidir.
- **DAC-08 (Sıfır Konum İletimi):** Network sekmesinde sunucuya giden hiçbir HTTP isteğinde kullanıcının anlık enlem/boylam GPS koordinatı yer alamaz. Arıza bildiriminde yalnızca tek kullanımlık HMAC `proximity_proof` gitmelidir.

---

## 6. Karar ve Sonraki Adımlar

Yukarıda listelenen 10 adet engelleyici bulgu (özellikle WCAG 2.1 AA kontrast ihlali olan koyu tema aktif buton, Dart token eksiklikleri ve eksik arayüz durumları), geliştiricinin kodlama sırasında kişisel inisiyatif almasına ve doğaçlama yapmasına yol açacak kritikliktedir. Bu bulgular giderilmeden tasarım yapım aşamasına geçemez.

VERDICT: CHANGES_REQUIRED
