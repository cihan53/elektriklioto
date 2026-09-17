# Tasarım Denetim Raporu: elektriklioto.com (Faz 1)

> **Belge Sürümü:** 1.2.0-faz1  
> **Denetçi Rolü:** Design Critic (`design_critic`)  
> **Denetim Tarihi:** 2026-09-06  
> **Durum:** Revizyon Gerekli (Changes Required)  
> **Denetlenen Belgeler:** `tasarim_sistemi.md`, `arayuz_spesifikasyonu.md`, `ekran_envanteri.md`, `ux_akislari.md`  
> **Doğruluk Kaynakları:** `proje_kapsami.md`, `kabul_kriterleri.md`, `veri_kaynagi_epdk.md`

---

## 1. Zorunlu Kısıtlar, Çatışmalar ve Varsayımlar

Aşağıdaki maddeler projenin bağlayıcı temelleridir; tüm denetim bu kuralların tavizsiz uygulanmasını gözetir:
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

> **Varsayım:** Flutter ve pnpm ortam sorunları giderilene kadar web ve backend geliştirme süreçleri Node v22 ve npm ile yürütülür; tasarım denetimi her iki platformun mimari ve sözleşme gereksinimlerini eksiksiz karşılayacak titizlikte işletilmiştir.

> **Varsayım:** Soket tipi, güç, tarife ve anlık doluluk Faz 1 EPDK veri setinde bulunmadığından, bu alanlar arayüzde "Operatör Verisi Bekleniyor" nötr rozetiyle gösterilir ve tıklandığında kitle kaynaklı katkı formunu tetikler.

> **Varsayım:** EPDK veri setinde istasyon bazlı güncelleme tarihi bulunmadığından, istasyon detay kartında "Veri Kaynağı: EPDK Sicil Kaydı (Eylül 2026)" kanonik ibaresi kullanılır.

---

## 2. Denetim Özeti ve Uyumluluk Karnesi

Tasarım dokümanları geliştiriciyi doğaçlamaya ve keyfi görsel karar almaya itecek her boşluğu ortaya çıkarmak amacıyla 5 ana başlık altında titizlikle denetlenmiştir:

1. **Eksiksizlik:** `arayuz_spesifikasyonu.md` (v1.2.0) 10 ekranın tamamında arama spinner'ı, autocomplete boş durumu, GPS kapalı hata kartı, mobil peek çekmece hizalaması ve web-mobil CTA ayrımını tanımlamıştır. Ancak bu kritik akışlar `ekran_envanteri.md` ve `ux_akislari.md` belgelerine henüz yansıtılmamış olup iki temel belgede boşluklar bulunmaktadır.
2. **Erişilebilirlik (WCAG 2.1 AA):** `tasarim_sistemi.md` v1.2.0 içinde yapılan revizyonla bağıl parlaklık formülüne dayalı tüm kontrast değerleri bağımsız olarak doğrulanmış ve düzeltilmiştir (tüm metinler ≥ 4.5:1, butonlar/odaklar ≥ 3.0:1). Kompakt butonlar için mobil dokunma hedefi (`BoxConstraints(minWidth: 48, minHeight: 48)`) güvenceye alınmıştır.
3. **Web↔Mobil Tutarlılığı:** `tasarim_sistemi.md#3.1` semantik renk tablosunda Flutter Dart sabiti sütununda 24 tokenın tamamı için `AppColors.xxx(context)` statik metot çağrısı yazılmışken; Bölüm 10.2'deki `tokens.dart` kodunda `AppColors` sınıfı yalnızca 3 token (`bgBase`, `bgSurface`, `primary`) için statik metot barındırmaktadır. Tablo 3.1 ile kod arasındaki bu asimetri Flutter tarafında doğrudan derleme hatası üretecektir.
4. **Veri Gerçekliği:** `tasarim_sistemi.md` ve `arayuz_spesifikasyonu.md` EPDK veri setinde güncelleme tarihi olmadığını saptayıp kanonik `"Veri Kaynağı: EPDK Sicil Kaydı (Eylül 2026)"` metnine geçmişken; `ekran_envanteri.md` ve `ux_akislari.md` dokümanlarında hâlâ `updated_at (Tazelik damgası)` veri alanı ve dinamik `"Son Güncelleme: X gün önce"` şablonu yaşatılmaktadır.
5. **Uygulanabilirlik:** Masaüstü web ortamında yerel mobil CPO uygulamasını çalıştırma imkânsızlığı `arayuz_spesifikasyonu.md` içinde web için `"Operatör Web Sitesine Git ↗"` olarak çözülmüş; ancak `ekran_envanteri.md#SCR-02` içinde hâlâ her iki platform için tekil mobil deep-link kuralı yazılı bırakılmıştır.

---

## 3. Engelleyici Tasarım Bulguları (Blocking Findings)

- [VERİ GERÇEKLİĞİ] `workspace/docs/ekran_envanteri.md#SCR-02` ve `workspace/docs/ux_akislari.md#UX-FLOW-02, #6` — `istasyonlar.json` EPDK veri setinde istasyon bazlı güncelleme tarihi bulunmamaktadır (`veri_kaynagi_epdk.md`). `tasarim_sistemi.md` ve `arayuz_spesifikasyonu.md` kanonik `"Veri Kaynağı: EPDK Sicil Kaydı (Eylül 2026)"` ibaresini sabitlemişken; `ekran_envanteri.md`'de hâlâ `updated_at (Tazelik damgası)` veri alanı ve `"Son Güncelleme: X gün önce (EPDK Sicil Verisi)"` şablonu, `ux_akislari.md`'de ise `"Kart tepesinde: Son güncelleme: X gün önce"` kuralları yer almaktadır. Bu durum backend şemasında olmayan bir alanın arayüzde aranmasına ve sözleşme çatışmasına yol açar → `ekran_envanteri.md` ve `ux_akislari.md` içindeki tüm `updated_at` ve "X gün önce" dinamik göreceli tarih ifadeleri silinmeli, kanonik `"Veri Kaynağı: EPDK Sicil Kaydı (Eylül 2026)"` ibaresinde eşitlenmelidir.

- [EKSİKSİZLİK] `workspace/docs/ekran_envanteri.md#SCR-06` ve `workspace/docs/ux_akislari.md#UX-FLOW-05` — Donanım GPS'inin kapalı olduğu veya kullanıcının konum iznini reddettiği senaryo `arayuz_spesifikasyonu.md#3 (SCR-06)` içinde sarı uyarı kartı ve kilitli gönder butonuyla tanımlanmışken; `ekran_envanteri.md` ve `ux_akislari.md` içinde tamamen tanımsızdır. Akış ve envanter yalnızca `Mesafe > 50m` durumunu ele almakta, konum izni yokken uygulamanın ne göstereceği ve butonun nasıl davranacağı belirsiz bırakılmıştır → `ekran_envanteri.md` ve `ux_akislari.md` dokümanlarına, konum izni kapalı/reddedilmişken gösterilecek sarı uyarı kartı ("Arıza doğrulaması için konum izni gereklidir"), `[Konum İznini Aç / Ayarlar]` aksiyonu ve `Gönder` butonunun kilitli pasif (`Disabled`) kalacağı kuralı eklenmelidir.

- [UYGULANABİLİRLİK] `workspace/docs/ekran_envanteri.md#SCR-02` — Ekran envanterinde Web masaüstü ve mobil platformları için SCR-02 birincil CTA butonu ayrıştırılmamış; tekil olarak "CPO uygulaması varsa doğrudan açar (`zes://station/{no}`)" şeklinde tarif edilmiştir. Masaüstü web tarayıcılarında native CPO mobil uygulaması tespiti veya URL scheme tetikleme imkânı bulunmadığından bu tanım webde protokol hatası üretir → `ekran_envanteri.md#SCR-02` bileşen eylemlerine, `arayuz_spesifikasyonu.md`'de olduğu gibi Web Masaüstü için `"Operatör Web Sitesine Git ↗"` (yeni sekme), Mobil için `"Operatörde Aç / Şarja Başla"` (native app link / clipboard fallback) ayrımı işlenmelidir.

- [EKSİKSİZLİK] `workspace/docs/ekran_envanteri.md#SCR-02` — Mobil 3 kademeli alt çekmecenin 1. kademesinde (Peek — 160pt) sağ üstte `Mesafe` rozeti gösterileceği yazılmıştır; ancak kullanıcının konum izni vermediği durumda peek çekmecesindeki görsel yerleşimin nasıl davranacağı tanımlanmamıştır → `ekran_envanteri.md` içine konum izni yoksa veya GPS kapalıysa mesafe rozetinin gizlenerek yerine `Hizmet Şekli` rozetinin sola yaslanarak gösterileceği ve boşluk kalmayacağı kuralı eklenmelidir.

- [WEB↔MOBİL TUTARLILIĞI] `workspace/docs/tasarim_sistemi.md#3.1` ve `workspace/docs/tasarim_sistemi.md#10.2` — Semantik renk tablosunda (Bölüm 3.1) tüm tokenlar için Flutter Dart sabiti olarak `context.colors.xxx (AppColors.xxx(context))` şeklinde statik yardımcı metot çağrısı dokümante edilmiştir (örn: `AppColors.textPrimary(context)`, `AppColors.borderStrong(context)`, `AppColors.missingText(context)`, `AppColors.dangerOnSubdued(context)`). Ancak Bölüm 10.2'deki `tokens.dart` kodunda `AppColors` sınıfı yalnızca `bgBase`, `bgSurface` ve `primary` için statik metot barındırmaktadır; diğer 21 token için bu metotlar tanımlanmamıştır. Flutter geliştiricisi Tablo 3.1'e güvenerek `AppColors.textPrimary(context)` yazdığında Dart derleme hatası alacaktır → `tokens.dart` içindeki `AppColors` sınıfına ya tüm semantik tokenlar için statik yardımcılar eklenmeli ya da Tablo 3.1'deki yanıltıcı `(AppColors.xxx(context))` ibareleri kaldırılarak kanonik erişim tekil olarak `context.colors.xxx` olarak sabitlenmelidir.

- [EKSİKSİZLİK] `workspace/docs/ux_akislari.md#UX-FLOW-01` ve `workspace/docs/ekran_envanteri.md#SCR-01` — Harita üzerinde arama çubuğuna giriş yapıldığında (debounce: 250ms) aramanın sürdüğünü belirten asenkron durum (`Searching / Loading` spinner'ı) ve arama sonucunda eşleşme bulunamadığında açılır menüde gösterilecek boş durum (`SearchAutocompleteDropdown Empty State`), `arayuz_spesifikasyonu.md#3 (SCR-01)` içinde detaylandırılmışken; `ux_akislari.md` ve `ekran_envanteri.md` arama bileşen durumlarında tanımlanmamıştır → `ekran_envanteri.md#SCR-01` ve `ux_akislari.md#UX-FLOW-01` arama akışlarına 20px döner arama spinner'ı ve `"Sonuç bulunamadı — İlçe veya operatör adı yazın"` açılır menü boş durumu eklenmelidir.

---

## 4. Kozmetik ve Deneyimi İyileştirici Öneriler (Non-blocking / ÖNERİ)

- [ÖNERİ] `workspace/docs/tasarim_sistemi.md#8.2` — Arama çubuğu placeholder metni açık temada `#64748B` (4.76:1) olarak belirlenmiştir; WCAG AA şartını karşılasa da araç içi doğrudan güneş ışığı altında okunabilirliği daha da artırmak için `#475569` (7.58:1) seviyesine yükseltilmesi değerlendirilebilir.
- [ÖNERİ] `workspace/docs/tasarim_sistemi.md#7.4` — `prefers-reduced-motion` kuralında `animation: none !important; transition: none !important;` tanımlanmıştır; mobil web WebView bileşenlerinde CSS `scroll-behavior: auto !important;` kuralının da eklenmesi düşük segmentli Android cihazlarda GPU rasterizasyonunu hafifletir.
- [ÖNERİ] `workspace/docs/arayuz_spesifikasyonu.md#2.1` — Tablet kırılımında sol panelin tanımlandığı tüm yerlerde "340px sol yüzen sheet" teriminin tek tip kullanımı devam ettirilmelidir.

---

## 5. Ölçülebilir Tasarım Kabul Kriterleri (QA Doğrulama Kapıları)

QA ve test mühendisleri yapım aşamasında her bileşeni ve ekranı aşağıdaki ölçülebilir kriterlere göre denetleyecektir:

- **DAC-01 (WCAG 2.1 AA Kontrast Sertifikasyonu):** Açık ve koyu temalarda tüm gövde metinleri, buton etiketleri ve rozetler arka planlarına karşı en az **4.5:1** bağıl kontrast oranına sahip olmalıdır (Büyük başlıklar ≥ 3.0:1, UI bileşen sınırları ve odak halkaları ≥ 3.0:1). Pa11y ve axe-core testlerinde sıfır kontrast hatası alınmalıdır.
- **DAC-02 (Fiziksel Dokunma Hedefleri):** Web üzerinde tıklanabilir tüm öğeler en az **44x44 CSS px**, mobil (Flutter) üzerinde en az **48x48 pt** fiziksel dokunma alanına sahip olmalıdır. Görsel olarak küçük olan öğeler (örn. 36px chipler, 32px butonlar, 24px kapat ikonları) şeffaf dolgu veya `BoxConstraints(minWidth: 48, minHeight: 48)` ile bu sınırlara genişletilmelidir.
- **DAC-03 (Token Bütünlüğü ve Sıfır Sabit Stil):** Nuxt ve Flutter kod tabanlarında `tasarim_sistemi.md` harici sabit HEX (`#xxxxxx`) veya keyfi piksel aralığı bulunamaz. CI linter taramasında harici stil tespit edilirse derleme (build) kırılmalıdır.
- **DAC-04 (Eksik Veri Karşılama):** Soket tipi, şarj gücü (kW), tarife ve anlık doluluk verisi `null` geldiğinde ekranda hiçbir uydurma mock veri ("22kW", "0 TL") gösterilemez; standart gri "Operatör Verisi Bekleniyor" rozeti ve bitişiğindeki "Bilgi Ekle" CTA'sı eksiksiz render edilmelidir.
- **DAC-05 (Klavye Gezinimi ve Odak Yönetimi):** Web'de harita ve form kontrolleri sekmeleme (Tab) ile gezilebilmeli; odaklanan her öğe etrafında 3px kalınlığında, 2px mesafeli (`outline-offset: 2px`) odak halkası (`--color-focus-ring`) belirmelidir. Modal açıldığında odak modal içine kilitlenmeli, ESC tuşu modalı kapatıp odağı tetikleyiciye iade etmelidir.
- **DAC-06 (Ekran Okuyucu Bütünlüğü):** Vektör harita pinleri `role="button"` ve `aria-label="Operatör: {ad}, İstasyon: {ad}"` niteliği taşımalıdır. Filtre butonları `aria-pressed="true|false"`, kilitli filtreler ise `aria-disabled="true"` ve `aria-describedby` ile açıklama metnine bağlı olmalıdır.
- **DAC-07 (Sıfır FOUC ve Koyu Tema Uyumu):** Web SSR açılışında koyu tema parlaması (FOUC) tam olarak **0 milisaniye** olmalı, `class="dark"` sunucu render aşamasında `<html>` etiketine gömülmelidir. Harita vektör karoları gece moduna anında geçmelidir.
- **DAC-08 (Sıfır Konum İletimi):** Network sekmesinde sunucuya giden hiçbir HTTP isteğinde kullanıcının anlık enlem/boylam GPS koordinatı yer alamaz. Arıza bildiriminde yalnızca tek kullanımlık HMAC `proximity_proof` gitmelidir.

---

## 6. Karar ve Sonraki Adımlar

`tasarim_sistemi.md` ve `arayuz_spesifikasyonu.md` (v1.2.0) görsel kararlar ve WCAG kontrast oranları bakımından olgunlaştırılmıştır. Ancak yukarıda listelenen 6 adet engelleyici bulgu; özellikle `ekran_envanteri.md` ve `ux_akislari.md` belgelerinde süregelen veri gerçekliği ihlali (`updated_at`), tanımsız GPS kapalı durumları, masaüstü web için CPO app link hatası ve `tokens.dart` API asimetrisi çözülmeden yapım aşamasına onay verilemez. İlgili belgeler güncellenene kadar karar dondurulmuştur.

VERDICT: CHANGES_REQUIRED
