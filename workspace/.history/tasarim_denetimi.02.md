# Tasarım Denetim Raporu: elektriklioto.com (Faz 1)

> **Belge Sürümü:** 1.1.0-faz1  
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
1. **Eksiksizlik:** `ekran_envanteri.md` 10 ekranı (SCR-01 - SCR-10) listelemiş ve `arayuz_spesifikasyonu.md` (v1.1.0) arama yüklenme, arama boş menüsü, GPS kapalı durumu ve masaüstü web CTA ayrımını detaylandırmıştır. Ancak `ekran_envanteri.md` ve `ux_akislari.md` belgelerinde GPS kapalı durumu ve Peek çekmece boşluk davranışları hâlâ eksik kalmıştır.
2. **Erişilebilirlik (WCAG 2.1 AA):** Bağımsız yeniden hesaplanan kontrast formülüyle `tasarim_sistemi.md#3.2` ve `#8.1.1` tablolarındaki değerlerin matematiksel olarak hatalı kaydedildiği ortaya çıkarılmıştır. Ayrıca kompakt butonlar için mobil dokunma hedefi (≥ 48x48 pt) spesifikasyon açığı saptanmıştır.
3. **Web↔Mobil Tutarlılığı:** `tasarim_sistemi.md#3.1` semantik tablosundaki Dart sabit isimleri (`AppColors.bgBase`, `AppColors.primary`, vb.) ile Bölüm 10.2'deki `tokens.dart` kod bloğu (`lightBgBase`, `darkBgBase`, vb.) arasında doğrudan derleme hatası üretecek bir asimetri tespit edilmiştir. Flutter tarafında dinamik açık/koyu tema soyutlaması (`ThemeExtension`) eksiktir.
4. **Veri Gerçekliği:** `arayuz_spesifikasyonu.md` ve `tasarim_sistemi.md` EPDK gerçeğiyle uyumlanarak dinamik güncellenme tarihini kaldırmışken, `ekran_envanteri.md` ve `ux_akislari.md` dokümanlarında hâlâ `updated_at` alanı ve "X gün önce güncellendi" ibaresi yaşamaktadır.
5. **Uygulanabilirlik:** `arayuz_spesifikasyonu.md` masaüstü webde native şema çalıştırma imkânsızlığını operatör web sitesi yönlendirmesiyle çözmüştür; ancak bu ayrım `ekran_envanteri.md` envanter kaydına yansıtılmamıştır.

---

## 3. Engelleyici Tasarım Bulguları (Blocking Findings)

- [WEB↔MOBİL TUTARLILIĞI] `tasarim_sistemi.md#3.1` ve `tasarim_sistemi.md#10.2` — Semantik renk tablosunda (Bölüm 3.1) Flutter Dart sabiti olarak `AppColors.bgBase`, `AppColors.primary`, `AppColors.textPrimary`, `AppColors.borderStrong`, `AppColors.missingText`, `AppColors.dangerOnSubdued` tanımlanmışken; Bölüm 10.2'deki `tokens.dart` kod bloğunda bu isimlerde sabitler yer almamaktadır (`lightBgBase`, `darkBgBase`, `lightPrimary`, `darkPrimary` şeklinde adlandırılmıştır). Flutter geliştiricisi Tablo 3.1'e göre kod yazdığında derleme hatası (compilation error) alacaktır. Ayrıca temaya göre dinamik geçiş sağlayan bir `ThemeExtension` sunulmadığı için geliştirici her widget'ta ternary yazmaya zorlanmaktadır → `tokens.dart` içindeki `AppColors` sınıfı Tablo 3.1'deki adlandırmalarla birebir uyumlu hale getirilmeli veya `ThemeExtension` (`AppColorScheme`) yapısıyla `context.colors.bgBase` şeklinde dinamik erişim sunulmalıdır.

- [ERİŞİLEBİLİRLİK] `tasarim_sistemi.md#3.2` ve `tasarim_sistemi.md#8.1.1` — Bağıl parlaklık formülüyle bağımsız olarak yeniden hesaplanan kontrast değerleri ile dokümanda iddia edilen değerler arasında matematiksel tutarsızlıklar mevcuttur:
  a) `Danger on Subdued (#B91C1C)` / `#FEE2E2` kontrastı dokümanda **6.47:1** iddia edilmişken gerçek matematiksel değer **5.30:1**'dir.
  b) `Success Text (#15803D)` / `#DCFCE7` kontrastı dokümanda **5.02:1** iddia edilmişken gerçek değer **4.57:1**'dir.
  c) `Warning Text (#B45309)` / `#FEF3C7` kontrastı dokümanda **5.02:1** iddia edilmişken gerçek değer **4.51:1**'dir.
  d) `ButtonPrimary Hover (Koyu)` durumunda `#0B0F19` / `#0284C7` kontrastı dokümanda **6.45:1** iddia edilmişken gerçek değer **4.68:1**'dir (tabloya başka bir satırdan kopyalanmıştır).
  e) `ButtonPrimary Error (Koyu)` durumunda `#0B0F19` / `#F87171` kontrastı dokümanda **6.45:1** iddia edilmişken gerçek değer **6.92:1**'dir → `tasarim_sistemi.md` Bölüm 3.2 ve Bölüm 8.1.1 tablolarındaki uydurma/yanlış kopyalanmış kontrast oranları gerçek matematiksel formül sonuçlarıyla güncellenmelidir.

- [ERİŞİLEBİLİRLİK] `tasarim_sistemi.md#8.3.1` — "Operatör Verisi Bekleniyor" rozeti bitişiğindeki 32px `[+ Bilgi Ekle]` CTA butonu için dokunma hedefi yalnızca "şeffaf dolguyla 44x44px'e tamamlanır" olarak yazılmıştır. Zorunlu kısıtlar uyarınca dokunma hedefi webde ≥ 44x44 CSS px iken mobilde (Flutter) istisnasız ≥ **48x48 pt** (`minTargetSize: 48.0`) olmak zorundadır. 44px hedefi mobilde uygulandığında PO-902 erişilebilirlik kapısı ihlal edilir → Dokümanda `[+ Bilgi Ekle]` ve benzeri tüm kompakt butonların mobil platformda `BoxConstraints(minWidth: 48, minHeight: 48)` ile en az 48x48 pt dokunma hedefine genişletileceği açıkça kurala bağlanmalıdır.

- [VERİ GERÇEKLİĞİ] `ekran_envanteri.md#SCR-02` ve `ux_akislari.md#UX-FLOW-02, #6` — `arayuz_spesifikasyonu.md` ve `tasarim_sistemi.md` EPDK veri setinde istasyon bazlı güncelleme tarihi bulunmadığını kabul ederek kanonik `"Veri Kaynağı: EPDK Sicil Kaydı (Eylül 2026)"` ibaresini sabitlemişken; `ekran_envanteri.md`'de hâlâ `updated_at (Tazelik damgası)` veri alanı ve `"Son Güncelleme: X gün önce (EPDK Sicil Verisi)"` şablonu, `ux_akislari.md`'de ise `"Kart tepesinde: Son güncelleme: X gün önce"` kuralları yer almaktadır. Bu durum backend şemasında olmayan bir alanın arayüzde aranmasına ve sözleşme çatışmasına yol açmaktadır → `ekran_envanteri.md` ve `ux_akislari.md` dokümanlarındaki `updated_at` dinamik göreceli tarih ibareleri temizlenmeli, tüm dokümanlar tek tip `"Veri Kaynağı: EPDK Sicil Kaydı (Eylül 2026)"` kanonik ibaresinde eşitlenmelidir.

- [EKSİKSİZLİK] `ekran_envanteri.md#SCR-06` ve `ux_akislari.md#UX-FLOW-05` — `arayuz_spesifikasyonu.md#3 (SCR-06)` donanım GPS'inin kapalı veya konum izninin engelli olduğu senaryoyu sarı uyarı kartı ve kilitli gönder butonuyla tanımlamışken; `ekran_envanteri.md` ve `ux_akislari.md` içinde bu durum ele alınmamış, yalnızca `Mesafe > 50m` kuralı yazılmıştır. Konum izni verilmediğinde kullanıcı akışının ve ekran durumunun nasıl davranacağı bu iki temel belgede boşluktadır → `ekran_envanteri.md` ve `ux_akislari.md` arıza bildirim spesifikasyonlarına konum izni engellendiğinde / GPS kapalıyken gösterilecek sarı uyarı kartı ("Arıza doğrulaması için konum izni gereklidir") ve buton kilitleme kuralı işlenmelidir.

- [UYGULANABİLİRLİK] `ekran_envanteri.md#SCR-02` — Ekran envanterinde Web masaüstü ve mobil platformları için SCR-02 birincil CTA butonu ayrıştırılmamış; tekil olarak "CPO uygulaması varsa doğrudan açar (`zes://station/{no}`)" şeklinde tarif edilmiştir. Masaüstü web tarayıcılarında native CPO uygulaması varlığını denetleme veya URL scheme başlatma imkânı bulunmadığından bu kural webde protokol hatası üretir → `ekran_envanteri.md#SCR-02` maddesinde, `arayuz_spesifikasyonu.md`'de yapıldığı gibi web masaüstü için `"Operatör Web Sitesine Git ↗"` (yeni sekme), mobil için ise `"Operatörde Aç / Şarja Başla"` (native app link / clipboard fallback) ayrımı açıkça işlenmelidir.

- [EKSİKSİZLİK] `ekran_envanteri.md#SCR-02` — Mobil 3 kademeli alt çekmecenin 1. kademesinde (Peek - 160pt) `Mesafe` gösterileceği belirtilmiş; ancak kullanıcının konum izni vermediği durumda peek çekmecesinde mesafenin yerini neyin alacağı belirtilmemiştir → `ekran_envanteri.md` içine konum izni yoksa mesafe rozetinin gizlenerek yerine `Hizmet Şekli` rozetinin sola yaslanacağı kuralı eklenmelidir.

- [WEB↔MOBİL TUTARLILIĞI] `tasarim_sistemi.md#4` ve `tasarim_sistemi.md#10.2` — Bölüm 4'te genel yazı tipi ailesi `Inter, -apple-system, ...` ve mono stil `.text-mono` olarak tanımlanmışken; Bölüm 10.2'de `AppTypography.mono` için `fontFamily: 'RobotoMono'` yazılmıştır. Flutter `pubspec.yaml`'da `RobotoMono` font varlığı tanımlanmadığı takdirde sistem varsayılanına düşecek ve platformlar arası tipografi tutarsızlığı doğacaktır → Mono tipografi için platform bağımsız monospaced sistem fontu (`fontFamily: 'Courier', fontFamilyFallback: ['monospace', 'Roboto Mono']`) belirtilmeli veya projenin font varlıklarına `RobotoMono`'nun dahil edileceği açıkça karara bağlanmalıdır.

---

## 4. Kozmetik ve Deneyimi İyileştirici Öneriler (Non-blocking / ÖNERİ)

- [ÖNERİ] `tasarim_sistemi.md#8.2` — Arama çubuğu placeholder metni (`#94A3B8`) açık temada 2.56:1 kontrast vermektedir. WCAG 2.1 SC 1.4.3 placeholder metinlerini teknik olarak muaf tutsa da, araç içi parlak güneş ışığı altında okunurluğu artırmak için placeholder renginin `#64748B` (4.76:1) seviyesinde tutulması önerilir.
- [ÖNERİ] `tasarim_sistemi.md#7.4` — `prefers-reduced-motion` kuralında `animation-duration: 0.01ms` yerine doğrudan `transition: none !important; animation: none !important;` uygulanması, düşük donanımlı Android cihazlarda gereksiz GPU katmanı tetiklenmesini engeller.
- [ÖNERİ] `arayuz_spesifikasyonu.md#2.1` — Tablet kırılımında sol panelin bir yerde "340px yüzen panel" bir yerde "modal" olarak geçmesi yerine tüm metinlerde tek tip "340px sol yüzen sheet" olarak anılması geliştirici kod tekrarını önler.

---

## 5. Ölçülebilir Tasarım Kabul Kriterleri (QA Doğrulama Kapıları)

QA ve test mühendisleri yapım aşamasında her bileşeni ve ekranı aşağıdaki ölçülebilir kriterlere göre denetleyecektir:

- **DAC-01 (WCAG 2.1 AA Kontrast Sertifikasyonu):** Açık ve koyu temalarda tüm gövde metinleri, buton etiketleri ve rozetler arka planlarına karşı en az **4.5:1** bağıl kontrast oranına sahip olmalıdır (Büyük başlıklar ≥ 3.0:1, UI bileşen sınırları ve odak halkaları ≥ 3.0:1). Pa11y ve axe-core testlerinde sıfır kontrast hatası alınmalıdır.
- **DAC-02 (Fiziksel Dokunma Hedefleri):** Web üzerinde tıklanabilir tüm öğeler en az **44x44 CSS px**, mobil (Flutter) üzerinde en az **48x48 pt** fiziksel dokunma alanına sahip olmalıdır. Görsel olarak küçük olan öğeler (örn. 36px chipler, 32px butonlar, 24px kapat ikonları) şeffaf dolguyla bu sınırlara genişletilmelidir.
- **DAC-03 (Token Bütünlüğü ve Sıfır Sabit Stil):** Nuxt ve Flutter kod tabanlarında `tasarim_sistemi.md` harici sabit HEX (`#xxxxxx`) veya keyfi piksel aralığı bulunamaz. CI linter taramasında harici stil tespit edilirse derleme (build) kırılmalıdır.
- **DAC-04 (Eksik Veri Karşılama):** Soket tipi, şarj gücü (kW), tarife ve anlık doluluk verisi `null` geldiğinde ekranda hiçbir uydurma mock veri ("22kW", "0 TL") gösterilemez; standart gri "Operatör Verisi Bekleniyor" rozeti ve bitişiğindeki "Bilgi Ekle" CTA'sı eksiksiz render edilmelidir.
- **DAC-05 (Klavye Gezinimi ve Odak Yönetimi):** Web'de harita ve form kontrolleri sekmeleme (Tab) ile gezilebilmeli; odaklanan her öğe etrafında 3px kalınlığında, 2px mesafeli (`outline-offset: 2px`) odak halkası (`--color-focus-ring`) belirmelidir. Modal açıldığında odak modal içine kilitlenmeli, ESC tuşu modalı kapatıp odağı tetikleyiciye iade etmelidir.
- **DAC-06 (Ekran Okuyucu Bütünlüğü):** Vektör harita pinleri `role="button"` ve `aria-label="Operatör: {ad}, İstasyon: {ad}"` niteliği taşımalıdır. Filtre butonları `aria-pressed="true|false"`, kilitli filtreler ise `aria-disabled="true"` ve `aria-describedby` ile açıklama metnine bağlı olmalıdır.
- **DAC-07 (Sıfır FOUC ve Koyu Tema Uyumu):** Web SSR açılışında koyu tema parlaması (FOUC) tam olarak **0 milisaniye** olmalı, `class="dark"` sunucu render aşamasında `<html>` etiketine gömülmelidir. Harita vektör karoları gece moduna anında geçmelidir.
- **DAC-08 (Sıfır Konum İletimi):** Network sekmesinde sunucuya giden hiçbir HTTP isteğinde kullanıcının anlık enlem/boylam GPS koordinatı yer alamaz. Arıza bildiriminde yalnızca tek kullanımlık HMAC `proximity_proof` gitmelidir.

---

## 6. Karar ve Sonraki Adımlar

Tasarım sistemi (`tasarim_sistemi.md`) ve arayüz spesifikasyonu (`arayuz_spesifikasyonu.md`) önceki denetim turundaki temel görsel sorunları önemli ölçüde iyileştirmiştir. Ancak yukarıda listelenen 8 adet engelleyici bulgu; özellikle `tokens.dart` ile semantik tablo arasındaki derlemeyi kıracak sabit isim uyuşmazlığı, dokümandaki yanlış kontrast hesaplamaları, mobil 48pt dokunma hedefi açığı ve `ekran_envanteri.md` / `ux_akislari.md` belgelerinde hâlâ devam eden `updated_at` ile GPS kapalı durumu tutarsızlıkları giderilmeden yapım aşamasına geçilemez.

VERDICT: CHANGES_REQUIRED
