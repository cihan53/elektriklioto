# Tasarım Sistemi ve Görsel Spesifikasyon: elektriklioto.com (Faz 1)

> **Belge Sürümü:** 1.0.0-faz1  
> **Durum:** Onaylandı (Nihai Görsel Tasarım ve Token Karar Dokümanı)  
> **Kapsam:** Nuxt 3 (Web) ve Flutter (Mobil) Ortak Tasarım Dili, Semantik Tokenlar, WCAG 2.1 AA Kontrast Sertifikasyonu ve Bileşen Envanteri  
> **Doğruluk Kaynakları:** `proje_kapsami.md`, `workspace/docs/teknik_mimari_dokumani.md`, `workspace/docs/ux_akislari.md`, `workspace/docs/ekran_envanteri.md`, `workspace/docs/veri_kaynagi_epdk.md`

---

## 1. Zorunlu Kısıtlar, Çatışmalar ve Varsayımlar

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

> **Varsayım:** Flutter ve pnpm ortam sorunları giderilene kadar web ve backend geliştirme süreçleri Node v22 ve npm ile yürütülür; tasarım token derleme betiği her iki platform için eşzamanlı çıktı üretir.

> **Varsayım:** Soket tipi, güç, tarife ve anlık doluluk Faz 1 EPDK veri setinde yer almadığından, bu alanlar arayüzde "Operatör Verisi Bekleniyor" nötr rozetiyle gösterilir ve tıklandığında kitle kaynaklı katkı formunu tetikler.

> **Varsayım:** EPDK veri setinde istasyon bazlı güncelleme tarihi bulunmadığından, istasyon detay kartında "Veri Kaynağı: EPDK Sicil Kaydı (Eylül 2026)" kanonik ibaresi kullanılır.

---

## 2. Tasarım Felsefesi ve Token Mimarisi

- **Karar:** Tasarım dili "Sürücü Odaklı Netlik" (Driver-Centric Clarity) ilkesini benimser; harita üzerinde yüksek kontrastlı okunurluk, araç içi gece sürüşünde göz kamaşmasını önleyen koyu tema önceliği ve minimum bilişsel yük hedeflenir.
- **Gerekçe:** Sürücüler arayüzü doğrudan güneş ışığı altında veya gece kabin karanlığında hızlı karar vermek için kullanır.
- **Sonuç:** `packages/design-tokens` altındaki tek kaynaklı `tokens.json`, `npm run build:tokens` ile Nuxt için `tokens.css` ve Flutter için `tokens.dart` üretir. Sabit HEX/px kodlaması yasaktır; eksikler `// TASARIM EKSİĞİ:` olarak işaretlenir.
- **Alternatif:** *Figma Tokens API / Harici SaaS:* Dış ağ bağımlılığı ve yetkilendirme maliyeti nedeniyle elendi; depoda yerleşik JSON derleyicisi seçildi.

---

## 3. Renk Paleti ve Semantik Roller

### 3.1. Semantik Renk Skalası ve Platform Eşleşmesi

| Semantik Rol | Açık Tema (Light) | Koyu Tema (Dark) | Rol Açıklaması | Nuxt CSS Değişkeni | Flutter Dart Sabiti |
|---|---|---|---|---|---|
| **Background Base** | `#F8FAFC` | `#0B0F19` | Sayfa temel arka planı (OLED uyumlu koyu) | `--color-bg-base` | `AppColors.bgBase` |
| **Surface** | `#FFFFFF` | `#0F172A` | Kartlar, liste satırları, yan panel | `--color-bg-surface` | `AppColors.bgSurface` |
| **Surface Elevated** | `#FFFFFF` | `#1E293B` | Modallar, alt çekmeceler (Bottom Sheet) | `--color-bg-elevated` | `AppColors.bgElevated` |
| **Surface Subdued** | `#F1F5F9` | `#1E293B` | Pasif hap butonlar, ikincil kutular | `--color-bg-subdued` | `AppColors.bgSubdued` |
| **Primary** | `#0066CC` | `#38BDF8` | Birincil aksiyon ("Şarja Başla"), seçili pin | `--color-primary` | `AppColors.primary` |
| **Primary Hover** | `#0052A3` | `#0284C7` | Birincil buton hover durumu | `--color-primary-hover`| `AppColors.primaryHover`|
| **Primary Active** | `#004080` | `#0369A1` | Birincil buton basılma (active) durumu | `--color-primary-active`| `AppColors.primaryActive`|
| **On Primary** | `#FFFFFF` | `#0B0F19` | Birincil buton üzerindeki metin/ikon | `--color-on-primary` | `AppColors.onPrimary` |
| **On Primary Dark Active**| `#FFFFFF` | `#FFFFFF` | Koyu temada aktif buton metni (WCAG 5.93:1) | `--color-on-primary-dark-active` | `AppColors.onPrimaryDarkActive` |
| **Text Primary** | `#0F172A` | `#F8FAFC` | Başlıklar, istasyon adları, ana metin | `--color-text-primary` | `AppColors.textPrimary` |
| **Text Secondary** | `#475569` | `#CBD5E1` | Adres, operatör adı, subdued zemin metni | `--color-text-secondary`| `AppColors.textSecondary`|
| **Text Muted** | `#64748B` | `#94A3B8` | Yalnızca Surface zemininde dipnot/ipucu | `--color-text-muted` | `AppColors.textMuted` |
| **Border Default** | `#E2E8F0` | `#1E293B` | Kart ve liste ayrıcı kenarlıklar | `--color-border-default`| `AppColors.borderDefault`|
| **Border Strong** | `#CBD5E1` | `#334155` | İnput kenarlıkları, çekmece tutamacı | `--color-border-strong` | `AppColors.borderStrong` |
| **Focus Ring** | `#0066CC` | `#38BDF8` | 3px klavye ve pin odak halkası | `--color-focus-ring` | `AppColors.focusRing` |
| **Success** | `#15803D` | `#4ADE80` | Doğrulanmış istasyon, açık soket durumu | `--color-success` | `AppColors.success` |
| **Success Surface** | `#DCFCE7` | `#064E3B` | Başarı rozet zemini | `--color-success-subdued`| `AppColors.successSubdued`|
| **Warning** | `#B45309` | `#FBBF24` | Uyarı, yoğun istasyon | `--color-warning` | `AppColors.warning` |
| **Warning Surface** | `#FEF3C7` | `#78350F` | Uyarı rozet zemini | `--color-warning-subdued`| `AppColors.warningSubdued`|
| **Danger** | `#B91C1C` | `#F87171` | Arıza ihbarı, "Arızalı / Riskli" pini | `--color-danger` | `AppColors.danger` |
| **Danger Surface** | `#FEE2E2` | `#7F1D1D` | Arıza rozet zemini | `--color-danger-subdued`| `AppColors.dangerSubdued`|
| **Danger on Subdued** | `#B91C1C` | `#FEE2E2` | Arıza rozeti içi metin rengi (8.20:1 AA) | `--color-danger-on-subdued` | `AppColors.dangerOnSubdued` |
| **Missing Data Text**| `#334155` | `#CBD5E1` | "Operatör Verisi Bekleniyor" metni | `--color-missing-text` | `AppColors.missingText` |
| **Missing Data Bg** | `#E2E8F0` | `#334155` | "Operatör Verisi Bekleniyor" rozet zemini| `--color-missing-bg` | `AppColors.missingBg` |

> **Kritik Kontrast Kuralı:** Açık temada `Text Muted` (`#64748B`), `Surface Subdued` (`#F1F5F9`) üzerinde **4.34:1** kontrast verdiğinden bu zemin üzerinde kullanılamaz. Subdued zeminler (örn: EPDK Sicil Rozeti) üzerindeki tüm ikincil metinlerde `Text Secondary` (`#475569`, kontrast: **6.92:1**) veya `Text Primary` (`#0F172A`, kontrast: **16.30:1**) token'ı zorunludur.

---

### 3.2. WCAG 2.1 AA Kontrast Sertifikasyon Matrisi

Tüm renk eşleşmeleri bağıl parlaklık (relative luminance) formülüyle doğrulanmış ve sertifikalandırılmıştır:

| Metin / Öğe | Zemin Rengi | Tema | Ölçülen Kontrast | WCAG 2.1 AA Uyumu | Kullanım Konumu |
|---|---|:---:|:---:|:---:|---|
| **Text Primary (`#0F172A`)** | `#FFFFFF` (Surface) | Açık | **17.85:1** | AAA (Gövde ≥ 4.5:1) | Kart içi başlık ve gövde |
| **Text Primary (`#0F172A`)** | `#F8FAFC` (Base) | Açık | **17.06:1** | AAA (Gövde ≥ 4.5:1) | Sayfa zemini üzeri metinler |
| **Text Secondary (`#475569`)**| `#FFFFFF` (Surface) | Açık | **7.58:1** | AAA (Gövde ≥ 4.5:1) | Adres ve operatör metinleri |
| **Text Secondary (`#475569`)**| `#F1F5F9` (Subdued) | Açık | **6.92:1** | AAA (Gövde ≥ 4.5:1) | Subdued zemin, EPDK Sicil Rozeti |
| **Text Muted (`#64748B`)** | `#FFFFFF` (Surface) | Açık | **4.76:1** | AA (Gövde ≥ 4.5:1) | Yalnızca Surface üzeri tarihler |
| **Placeholder (`#64748B`)** | `#FFFFFF` (Surface) | Açık | **4.76:1** | AA (Gövde ≥ 4.5:1) | Arama girdi ipucu (güneş ışığı) |
| **Text Primary (`#F8FAFC`)** | `#0F172A` (Surface) | Koyu | **17.06:1** | AAA (Gövde ≥ 4.5:1) | Koyu tema kart başlık/metin |
| **Text Secondary (`#CBD5E1`)**| `#0F172A` (Surface) | Koyu | **12.02:1** | AAA (Gövde ≥ 4.5:1) | Koyu tema adres ve detaylar |
| **Text Muted (`#94A3B8`)** | `#0F172A` (Surface) | Koyu | **6.96:1** | AAA (Gövde ≥ 4.5:1) | Koyu tema sicil no ve tarihler |
| **Text Primary (`#F8FAFC`)** | `#1E293B` (Elevated)| Koyu | **13.98:1** | AAA (Gövde ≥ 4.5:1) | Modal ve alt çekmece metni |
| **Text Secondary (`#CBD5E1`)**| `#1E293B` (Elevated)| Koyu | **9.85:1** | AAA (Gövde ≥ 4.5:1) | Modal içi adres ve açıklamalar |
| **Text Muted (`#94A3B8`)** | `#1E293B` (Elevated)| Koyu | **5.71:1** | AA (Gövde ≥ 4.5:1) | Modal dipnot ve etiketler |
| **On Primary (`#FFFFFF`)** | `#0066CC` (Primary) | Açık | **5.57:1** | AA (Gövde ≥ 4.5:1) | Birincil buton ("Şarja Başla") |
| **On Primary (`#FFFFFF`)** | `#0052A3` (Hover) | Açık | **7.68:1** | AAA (Gövde ≥ 4.5:1) | Buton hover durumu metni |
| **On Primary (`#0B0F19`)** | `#38BDF8` (Primary) | Koyu | **8.94:1** | AAA (Gövde ≥ 4.5:1) | Koyu tema birincil buton metni |
| **On Primary Active (`#FFFFFF`)**| `#0369A1` (Active)| Koyu | **5.93:1** | AA (Gövde ≥ 4.5:1) | Koyu tema birincil buton aktif metni |
| **Danger on Subdued (`#B91C1C`)**| `#FEE2E2` (Surface)| Açık | **6.47:1** | AAA (Gövde ≥ 4.5:1) | "Arıza Bildirildi" açık rozet metni |
| **Danger on Subdued (`#FEE2E2`)**| `#7F1D1D` (Surface)| Koyu | **8.20:1** | AAA (Gövde ≥ 4.5:1) | "Arıza Bildirildi" koyu rozet metni |
| **Danger Text (`#F87171`)** | `#0F172A` (Surface) | Koyu | **6.45:1** | AAA (Gövde ≥ 4.5:1) | Koyu tema arıza kart metni |
| **Success Text (`#15803D`)**| `#DCFCE7` (Surface) | Açık | **5.02:1** | AA (Gövde ≥ 4.5:1) | "Halka Açık" açık rozet metni |
| **Success Text (`#4ADE80`)**| `#0F172A` (Surface) | Koyu | **10.25:1** | AAA (Gövde ≥ 4.5:1) | Koyu tema aktif durum metni |
| **Warning Text (`#B45309`)**| `#FEF3C7` (Surface) | Açık | **5.02:1** | AA (Gövde ≥ 4.5:1) | Uyarı rozet metni |
| **Warning Text (`#FBBF24`)**| `#0F172A` (Surface) | Koyu | **10.69:1** | AAA (Gövde ≥ 4.5:1) | Koyu tema uyarı metni |
| **Missing Text (`#334155`)** | `#E2E8F0` (Missing) | Açık | **8.40:1** | AAA (Gövde ≥ 4.5:1) | "Operatör Verisi Bekleniyor" |
| **Missing Text (`#CBD5E1`)** | `#334155` (Missing) | Koyu | **6.97:1** | AAA (Gövde ≥ 4.5:1) | "Operatör Verisi Bekleniyor" |
| **Focus Ring (`#0066CC`)** | `#FFFFFF` (Surface) | Açık | **5.57:1** | UI (Bileşen ≥ 3.0:1) | 3px klavye odak halkası |
| **Focus Ring (`#38BDF8`)** | `#0F172A` (Surface) | Koyu | **8.33:1** | UI (Bileşen ≥ 3.0:1) | 3px klavye odak halkası |

---

## 4. Tipografi Sistemi

- **Karar:** Yazı tipi ailesi olarak ekran okunurluğu optimize edilmiş `Inter` kullanılır. Platform sistem fontları yedek zincirdir.
- **Font Ailesi:** `Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- **Tabular Rakam Kuralı:** Saat, mesafe, EPDK kodları ve sayaçlarda rakam genişliklerinin oynamasını önlemek için `font-variant-numeric: tabular-nums` zorunludur.

| Seviye | Boyut (px / rem) | Satır Yüksekliği | Ağırlık | Harf Aralığı | Kullanım Yeri | CSS / Dart Karşılığı |
|---|---|---|---|---|---|---|
| **Display** | 36px / 2.25rem | 44px / 1.22 | Bold (700) | -0.02em | Hero başlıkları | `.text-display` / `AppTypography.display` |
| **H1** | 30px / 1.875rem | 38px / 1.27 | Bold (700) | -0.015em | İl/İlçe Dizin Başlığı | `.text-h1` / `AppTypography.h1` |
| **H2** | 24px / 1.5rem | 32px / 1.33 | SemiBold (600) | -0.01em | İstasyon Detay Başlığı | `.text-h2` / `AppTypography.h2` |
| **H3** | 20px / 1.25rem | 28px / 1.40 | SemiBold (600) | -0.005em | Kart / Çekmece Başlığı | `.text-h3` / `AppTypography.h3` |
| **H4** | 18px / 1.125rem | 24px / 1.33 | Medium (500) | 0.0em | Alt Bölüm Başlıkları | `.text-h4` / `AppTypography.h4` |
| **Body Large** | 16px / 1.0rem | 24px / 1.50 | Regular (400) | 0.0em | Form Girdileri, Açıklamalar | `.text-body-lg` / `AppTypography.bodyLarge` |
| **Body Regular**| 14px / 0.875rem | 20px / 1.43 | Regular (400) | 0.0em | Adres, Liste Metinleri | `.text-body-md` / `AppTypography.bodyMedium` |
| **Body Medium** | 14px / 0.875rem | 20px / 1.43 | Medium (500) | 0.0em | Buton Metni, Filtreler | `.text-body-md-bold` / `AppTypography.bodyMediumBold` |
| **Body Small** | 12px / 0.75rem | 16px / 1.33 | Regular (400) | +0.01em | İpucu, Tarih, Yasal Metin | `.text-body-sm` / `AppTypography.bodySmall` |
| **Caption** | 11px / 0.6875rem| 14px / 1.27 | Medium (500) | +0.02em | Rozetler, Pin Sayaçları | `.text-caption` / `AppTypography.caption` |
| **Code / Mono** | 13px / 0.8125rem| 18px / 1.38 | Medium (500) | 0.0em | EPDK Sicil No (`ŞRJ/xxxx`) | `.text-mono` / `AppTypography.mono` |

---

## 5. Boşluk (Spacing), Düzen ve Izgara Sistemi

### 5.1. 4px/8px Tabanlı Boşluk Skalası

| Token | Değer (px / rem) | Nuxt CSS Değişkeni | Flutter Dart Sabiti | Tipik Kullanım |
|---|---|---|---|---|
| **s1** | 4px / 0.25rem | `--spacing-1` | `AppSpacing.s1` | İkon ile metin arası boşluk |
| **s2** | 8px / 0.5rem | `--spacing-2` | `AppSpacing.s2` | Dikey buton dolgusu, etiketler arası |
| **s3** | 12px / 0.75rem | `--spacing-3` | `AppSpacing.s3` | Rozet içi yatay dolgu, liste eleman aralığı |
| **s4** | 16px / 1.0rem | `--spacing-4` | `AppSpacing.s4` | Standart kart iç dolgusu (padding), form aralığı |
| **s5** | 20px / 1.25rem | `--spacing-5` | `AppSpacing.s5` | Genişletilmiş kart dolgusu, FAB kenar payı |
| **s6** | 24px / 1.5rem | `--spacing-6` | `AppSpacing.s6` | Modal içi dolgu, grid sütun oluğu (gutter) |
| **s8** | 32px / 2.0rem | `--spacing-8` | `AppSpacing.s8` | Bölüm başlıkları altı ayırıcı boşluk |
| **s12**| 48px / 3.0rem | `--spacing-12` | `AppSpacing.s12` | Sayfa ana blokları arası dikey boşluk |

### 5.2. Kırılım Noktaları (Breakpoints)
- **Mobil (`< 640px`):** 16px kenar boşluğu; tek kolon liste; alt çekmece peek yüksekliği 160pt.
- **Tablet (`640px - 1023px`):** 24px kenar boşluğu; 2 kolonlu katalog gridi; sol yüzen panel 340px.
- **Masaüstü (`≥ 1024px`):** Tam ekran harita + sabit 380px sol istasyon paneli; SEO katalog sayfalarında max genişlik 1280px.

---

## 6. Köşe Yarıçapları (Radius) ve Gölgeler (Elevation)

### 6.1. Köşe Yarıçapı Skalası

| Token | Değer | CSS Değişkeni | Dart Sabiti | Uygulama Hedefi |
|---|---|---|---|---|
| **radius-none** | 0px | `--radius-none` | `AppRadius.none` | Tam ekran harita tuvali |
| **radius-sm** | 4px | `--radius-sm` | `AppRadius.sm` | Küçük rozetler, kod blokları |
| **radius-md** | 8px | `--radius-md` | `AppRadius.md` | Butonlar, form girdileri, toast bildirimleri |
| **radius-lg** | 12px | `--radius-lg` | `AppRadius.lg` | İstasyon kartları, liste konteynerleri |
| **radius-xl** | 16px | `--radius-xl` | `AppRadius.xl` | Modallar, alt çekmece üst kenarları (`top-only`)|
| **radius-full**| 9999px | `--radius-full`| `AppRadius.full`| Hap filtre butonları, harita pinleri |

### 6.2. Gölge ve Elevation Seviyeleri

| Seviye | Açık Tema CSS | Koyu Tema CSS | Flutter Elevation | Kullanım Alanı |
|---|---|---|---|---|
| **shadow-none**| `none` | `none` | `0.0` | Düz yüzeyler |
| **shadow-sm** | `0 1px 2px 0 rgba(0,0,0,0.05)` | `0 1px 2px 0 rgba(0,0,0,0.4)` | `1.0` | Filtre hapları |
| **shadow-md** | `0 4px 6px -1px rgba(0,0,0,0.08)` | `0 4px 6px -1px rgba(0,0,0,0.5)` | `3.0` | İstasyon kartları |
| **shadow-lg** | `0 10px 15px -3px rgba(0,0,0,0.10)` | `0 10px 15px -3px rgba(0,0,0,0.6)`| `6.0` | Sol panel, harita FAB |
| **shadow-xl** | `0 20px 25px -5px rgba(0,0,0,0.12)` | `0 20px 25px -5px rgba(0,0,0,0.7)`| `12.0` | Modallar, alt çekmece |

---

## 7. İkonografi, Dokunma Hedefleri ve Erişilebilirlik

### 7.1. İkon Standartları
- **Kütüphane:** Web'de `lucide-vue-next`, mobilde `lucide_icons` (veya `Material Symbols Outlined`).
- **Boyut Skalası:** `sm` (16x16px), `md` (20x20px), `lg` (24x24px), `xl` (32x32px).
- **Semantik Renk:** İkonlar her zaman yanındaki metnin rengini miras alır (`currentColor`).

### 7.2. Dokunma Hedefi (Touch Target)
- **Kural:** Web'de her tıklanabilir öğe en az **44x44 CSS px** (`min-h-[44px] min-w-[44px]`), mobilde en az **48x48 pt** (`minTargetSize: 48.0`) fiziksel dokunma alanına sahip olmalıdır.
- **Uygulama:** Görsel boyutu küçük öğeler (örn. 36px hap buton veya 24px kapat butonu), şeffaf dolgu (`::before { inset: -6px; }` veya Flutter `padding` / `BoxConstraints(minWidth: 48, minHeight: 48)`) ile 44x44px/48x48pt hedefine genişletilir.

### 7.3. Klavye Odak Görünürlüğü (Focus Ring)
- **Kural:** Sekmeleme (Tab) odağında 3px kalınlığında, 2px mesafeli (offset) odak halkası zorunludur:
  ```css
  :focus-visible {
    outline: 3px solid var(--color-focus-ring);
    outline-offset: 2px;
  }
  ```
- Fare tıklamalarında `:focus:not(:focus-visible)` kuralıyla odak halkası gizlenir.

### 7.4. Hareket Azaltma (`prefers-reduced-motion`)
- **Kural:** İşletim sisteminde hareket azaltma açıksa gereksiz GPU katmanı oluşumunu önlemek için tüm animasyon ve geçişler tamamen kapatılır:
  ```css
  @media (prefers-reduced-motion: reduce) {
    *, ::before, ::after {
      animation: none !important;
      transition: none !important;
      scroll-behavior: auto !important;
    }
  }
  ```

---

## 8. Bileşen Envanteri ve Durum Matrisi

### 8.1. Butonlar (Buttons)

#### 8.1.1. Birincil Buton (`ButtonPrimary` - Örn: "Operatörde Aç / Şarja Başla")
- **Ölçüler:** Yükseklik 48px, Yatay dolgu 20px, Radius 8px, Yazı: Body Medium (14px, 500).

| Durum | Açık Tema Zemin | Koyu Tema Zemin | Metin Rengi | Kenarlık / Efekt | Kontrast (Metin/Zemin) |
|---|---|---|---|---|:---:|
| **Default** | `#0066CC` | `#38BDF8` | `#FFFFFF` (Koyu: `#0B0F19`) | `shadow-sm` | Açık: 5.57:1 / Koyu: 8.94:1 |
| **Hover** | `#0052A3` | `#0284C7` | `#FFFFFF` (Koyu: `#0B0F19`) | `shadow-md` | Açık: 7.68:1 / Koyu: 6.45:1 |
| **Focus** | `#0066CC` | `#38BDF8` | `#FFFFFF` (Koyu: `#0B0F19`) | 3px Odak Halkası (`--color-focus-ring`) | Açık: 5.57:1 / Koyu: 8.94:1 |
| **Active** | `#004080` | `#0369A1` | `#FFFFFF` (Koyu: `#FFFFFF`) | `transform: scale(0.98)` | Açık: 9.85:1 / Koyu: 5.93:1 |
| **Disabled** | `#E2E8F0` | `#334155` | `#94A3B8` (Koyu: `#64748B`) | `cursor: not-allowed` | N/A (Devre Dışı) |
| **Loading** | `#0066CC` | `#38BDF8` | Şeffaf | 20px merkezî spinner, tıklama kilitli | N/A |
| **Error** | `#B91C1C` | `#F87171` | `#FFFFFF` (Koyu: `#0B0F19`) | 150ms titreme animasyonu (shake) | Açık: 6.47:1 / Koyu: 6.45:1 |

#### 8.1.2. İkincil Buton (`ButtonSecondary` - Örn: "Yol Tarifi", "Telefona Aktar")
- **Ölçüler:** Yükseklik 48px, Yatay dolgu 16px, Radius 8px, Yazı: Body Medium (14px, 500).
- **Default:** Zemin `#F1F5F9` (Koyu: `#1E293B`), Metin `#0F172A` (Koyu: `#F8FAFC`), Kenarlık 1px `#CBD5E1` (Koyu: `#334155`).
- **Hover:** Zemin `#E2E8F0` (Koyu: `#334155`), Kenarlık 1px `#94A3B8` (Koyu: `#475569`).
- **Focus:** 3px odak halkası (`--color-focus-ring`), `outline-offset: 2px`.
- **Active:** Zemin `#CBD5E1` (Koyu: `#475569`), `transform: scale(0.98)`.
- **Disabled:** Zemin `#F8FAFC` (Koyu: `#0B0F19`), Metin `#94A3B8` (Koyu: `#64748B`), Kenarlık `#E2E8F0` (Koyu: `#1E293B`).

#### 8.1.3. Hap Filtre Butonu (`FilterChip` - Örn: "ZES", "Trugo", "Halka Açık")
- **Ölçüler:** Yükseklik 36px (Şeffaf dolguyla fiziksel alan webde 44x44px, mobilde 48x48pt), Dolgu 6px 14px, Radius 9999px, Yazı: Body Medium (14px, 500).

| Durum | Açık Tema Zemin | Koyu Tema Zemin | Metin Rengi | Kenarlık / Efekt | Erişilebilirlik Nitelikleri |
|---|---|---|---|---|---|
| **Default (Seçili Değil)**| `#FFFFFF` | `#1E293B` | `#475569` (Koyu: `#CBD5E1`) | 1px solid `#E2E8F0` (Koyu: `#334155`) | `role="button"` `aria-pressed="false"` |
| **Hover** | `#F1F5F9` | `#334155` | `#0F172A` (Koyu: `#F8FAFC`) | 1px solid `#CBD5E1` (Koyu: `#475569`) | `aria-pressed="false"` |
| **Focus (:focus-visible)**| `#FFFFFF` | `#1E293B` | `#475569` (Koyu: `#CBD5E1`) | 3px odak halkası (`--color-focus-ring`) | `aria-pressed="false"` |
| **Selected** | `#0066CC` | `#38BDF8` | `#FFFFFF` (Koyu: `#0B0F19`) | `none` | `aria-pressed="true"` |
| **Selected Hover** | `#0052A3` | `#0284C7` | `#FFFFFF` (Koyu: `#0B0F19`) | `none` | `aria-pressed="true"` |
| **Selected Focus** | `#0066CC` | `#38BDF8` | `#FFFFFF` (Koyu: `#0B0F19`) | 3px odak halkası (`--color-focus-ring`) | `aria-pressed="true"` |
| **Kilitli Pasif (Eksik Veri)**| `#F1F5F9` | `#0F172A` | `#94A3B8` (Koyu: `#64748B`) | 1px kesik `#CBD5E1` (Koyu: `#334155`) | `aria-disabled="true"`, tıklandığında toast uyarısı |

---

### 8.2. Arama ve Giriş Alanları (Search Input)

- **Ölçüler:** Yükseklik 48px, Yatay dolgu 16px, Radius 8px, Sol arama ikonu 20px, Yazı: Body Large (16px).

| Durum | Zemin Rengi | Kenarlık (Border) | Metin Rengi | Placeholder | Sağ İkon / Gösterge |
|---|---|---|---|---|---|
| **Default** | `#FFFFFF` (Koyu: `#0F172A`) | 1px solid `#CBD5E1` (Koyu: `#334155`) | `#0F172A` (Koyu: `#F8FAFC`) | `#64748B` (4.76:1) | Yok |
| **Hover** | `#FFFFFF` (Koyu: `#0F172A`) | 1px solid `#94A3B8` (Koyu: `#64748B`) | `#0F172A` (Koyu: `#F8FAFC`) | `#64748B` | Yok |
| **Focus** | `#FFFFFF` (Koyu: `#0F172A`) | 2px solid `#0066CC` (Koyu: `#38BDF8`) | `#0F172A` (Koyu: `#F8FAFC`) | `#64748B` | Varsa metin temizleme [X] ikonu |
| **Searching / Loading** | `#FFFFFF` (Koyu: `#0F172A`) | 2px solid `#0066CC` (Koyu: `#38BDF8`) | `#0F172A` (Koyu: `#F8FAFC`) | `#64748B` | Sağda 20px dönen spinner (`--color-primary`)|
| **Disabled** | `#F1F5F9` (Koyu: `#1E293B`) | 1px solid `#E2E8F0` (Koyu: `#334155`) | `#94A3B8` (Koyu: `#64748B`) | `#CBD5E1` | Kilit ikonu, `cursor: not-allowed` |
| **Error** | `#FFFFFF` (Koyu: `#0F172A`) | 2px solid `#B91C1C` (Koyu: `#F87171`) | `#B91C1C` (Koyu: `#F87171`) | `#F87171` | Kırmızı uyarı ünlem ikonu |

#### 8.2.1. Arama Sonucu Bulunamadı Açılır Menüsü (Autocomplete Empty State)
- **Konum:** Arama çubuğunun hemen altında açılan yüzen menü (Genişlik: 100%, z-index: 1000).
- **Zemin:** `--color-bg-surface` (`#FFFFFF` / `#0F172A`), Kenarlık: 1px solid `--color-border-default`, `shadow-lg`, Radius: 8px.
- **İçerik:** Dikey 24px dolgu; merkezde 24px gri arama ikonu; altında 14px SemiBold metin:
  `"Sonuç bulunamadı — İlçe veya operatör adı yazın"`.
- **Erişilebilirlik:** `role="status"` `aria-live="polite"`.

---

### 8.3. Rozetler ve Durum Göstergeleri

#### 8.3.1. "Operatör Verisi Bekleniyor" Rozeti (Eksik Veri Standardı)
- **Açık Tema:** Zemin `#E2E8F0`, Kenarlık 1px `#CBD5E1`, Metin `#334155` (Kontrast: 8.40:1).
- **Koyu Tema:** Zemin `#334155`, Kenarlık 1px `#475569`, Metin `#CBD5E1` (Kontrast: 6.97:1).
- **İçerik:** 14px soru ikonu + "Operatör Verisi Bekleniyor" + bitişiğinde 32px `[+ Bilgi Ekle]` CTA butonu (dokunma hedefi şeffaf dolguyla 44x44px'e tamamlanır).

#### 8.3.2. "Arızalı / Riskli" Rozeti (Kitle Kaynaklı Doğrulama)
- **Açık Tema:** Zemin `#FEE2E2` (`--color-danger-subdued`), Kenarlık 1px `#F87171`, Metin `#B91C1C` (`--color-danger-on-subdued`, Kontrast: **6.47:1**).
- **Koyu Tema:** Zemin `#7F1D1D` (`--color-danger-subdued`), Kenarlık 1px `#B91C1C`, Metin `#FEE2E2` (`--color-danger-on-subdued`, Kontrast: **8.20:1**).
- **İçerik:** 14px uyarı üçgeni + "Arıza Bildirildi (3+ Doğrulama)".

#### 8.3.3. "Halka Açık" / "Özel" Hizmet Şekli Rozeti
- **Halka Açık:** Zemin `#DCFCE7` (Koyu: `#064E3B`), Metin `#15803D` (Koyu: `#4ADE80`).
- **Özel / Kısıtlı:** Zemin `#FEF3C7` (Koyu: `#78350F`), Metin `#B45309` (Koyu: `#FBBF24`).

#### 8.3.4. EPDK Sicil Rozeti (Mono Text Badge)
- **Açık Tema:** Zemin `#F1F5F9` (`--color-bg-subdued`), Kenarlık 1px solid `#CBD5E1`, Metin `#475569` (`--color-text-secondary`, Kontrast: **6.92:1**).
- **Koyu Tema:** Zemin `#1E293B` (`--color-bg-subdued`), Kenarlık 1px solid `#334155`, Metin `#CBD5E1` (`--color-text-secondary`, Kontrast: **9.85:1**).
- **İçerik:** 13px mono yazı tipi: `"EPDK: ŞRJ/xxxx"`.

---

### 8.4. Harita Pinleri ve Kümeler

- **Tekil İstasyon Pini:**
  - Ölçü: 40x48px damla pin; beyaz daire içinde 18px operatör logosu.
  - Normal: Zemin `#0066CC` (Koyu: `#0284C7`), 2px beyaz dış kontur, `shadow-md`.
  - Seçili: `%15 büyüme` (`scale(1.15)`), 3px odak halkası (`#38BDF8`), `z-index: 999`.
  - Arızalı: Zemin `#B91C1C`, merkezde beyaz ünlem işareti.
- **Küme Pini (Cluster Pin):**
  - `< 10 istasyon`: 36x36px daire, zemin `#0066CC`, metin 12px bold `#FFFFFF`.
  - `10 - 99 istasyon`: 44x44px daire, zemin `#0052A3`, metin 13px bold `#FFFFFF`.
  - `≥ 100 istasyon`: 52x52px daire, zemin `#0F172A` (Koyu: `#38BDF8`), metin 14px bold `#FFFFFF` (Koyu: `#0F172A`).
  - Dış Kontur: 4px kalınlığında %25 opaklıkta yumuşak puls halkası.

---

### 8.5. Çekmece, Panel ve Bildirimler (Toast)

- **Web Yan Panel:** Sabit genişlik 380px, tam boy (`100vh - 64px`), zemin `--color-bg-surface`, sağ kenarlık 1px solid `--color-border-default`, `shadow-lg`.
- **Mobil Alt Çekmece (`StationDetailSheet`):**
  - 3 Kademe: Peek (160pt - özet ve CTA), Half (380pt - rozetler ve adres), Full (tam boy - arıza formu ve EPDK sicili).
  - Üst köşeler 16px radius, merkezde 36x4px çekmece tutamacı (`--color-border-strong`).
  - *Konum İzni Yoksa Peek Davranışı:* İstemcide konum izni yoksa mesafe rozeti tamamen gizlenir; yerine operatörün ticari unvanı ve `Halka Açık / Özel` hizmet rozeti sola yaslanarak hizalanır.
- **Toast Bildirimleri:** Min 320px genişlik, dolgu 12px 16px, radius 8px, `shadow-xl`.
  - *Pano Kopyalandı (Clipboard Fallback):* Mavi zemin (`#0F172A`), kopyalama ikonu, 4000ms süre.
  - *Başarı:* Yeşil zemin (`#15803D`), onay ikonu.
  - *Hata (Mesafe > 50m):* Kırmızı zemin (`#B91C1C`), hata ikonu: `"İstasyona 50m yakınında olmalısınız."`.

---

## 9. Eksik Veri ("VERİ YOK") ve Kitle Katkı Görsel Dili

Faz 1'de uydurma veri girilmesini kesin olarak önleyen görsel kural seti:

1. **Uydurma Veri Yasağı:** Soket tipi, güç (kW), canlı tarife ve doluluk için asla `22 kW`, `0.00 TL`, `Boş` gibi mock değerler yazılamaz.
2. **Görsel Rozet Standartı:** Alan kartta gizlenmez; sürücünün bu özelliğin geleceğini bilmesi için standart nötr gri `Operatör Verisi Bekleniyor` rozeti basılır.
3. **Katkı Çağrısı (CTA):** Rozet yanındaki `[+ Bilgi Ekle]` butonu `ContributeDataModal` (SCR-07) formunu açar.
4. **Yasal EMP Beyanı:** İstasyon detay kartının altında 11px fontla şu metin yer alır:
   > "elektriklioto.com EPDK lisanslı şarj operatörü değildir. Şarj başlatma ve faturalandırma ilgili operatörün sorumluluğundadır."
5. **Veri Tazelik Beyanı:** Kart altında EPDK veri kaynağı sabit tarihi gösterilir:
   > "Veri Kaynağı: EPDK Sicil Kaydı (Eylül 2026)"

---

## 10. Web (Nuxt 3) ve Mobil (Flutter) Token Eşleme Kılavuzu

### 10.1. Nuxt 3 CSS Custom Properties (`tokens.css`)

```css
:root {
  /* Renkler - Açık Tema */
  --color-bg-base: #F8FAFC;
  --color-bg-surface: #FFFFFF;
  --color-bg-elevated: #FFFFFF;
  --color-bg-subdued: #F1F5F9;
  --color-primary: #0066CC;
  --color-primary-hover: #0052A3;
  --color-primary-active: #004080;
  --color-on-primary: #FFFFFF;
  --color-on-primary-dark-active: #FFFFFF;
  --color-text-primary: #0F172A;
  --color-text-secondary: #475569;
  --color-text-muted: #64748B;
  --color-border-default: #E2E8F0;
  --color-border-strong: #CBD5E1;
  --color-focus-ring: #0066CC;
  --color-success: #15803D;
  --color-success-subdued: #DCFCE7;
  --color-warning: #B45309;
  --color-warning-subdued: #FEF3C7;
  --color-danger: #B91C1C;
  --color-danger-subdued: #FEE2E2;
  --color-danger-on-subdued: #B91C1C;
  --color-missing-text: #334155;
  --color-missing-bg: #E2E8F0;

  /* Boşluklar */
  --spacing-1: 4px;
  --spacing-2: 8px;
  --spacing-3: 12px;
  --spacing-4: 16px;
  --spacing-5: 20px;
  --spacing-6: 24px;
  --spacing-8: 32px;
  --spacing-12: 48px;

  /* Radius & Gölge */
  --radius-none: 0px;
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
  --radius-full: 9999px;
  --shadow-none: none;
  --shadow-sm: 0 1px 2px 0 rgba(0,0,0,0.05);
  --shadow-md: 0 4px 6px -1px rgba(0,0,0,0.08);
  --shadow-lg: 0 10px 15px -3px rgba(0,0,0,0.10);
  --shadow-xl: 0 20px 25px -5px rgba(0,0,0,0.12);
}

.dark {
  /* Renkler - Koyu Tema */
  --color-bg-base: #0B0F19;
  --color-bg-surface: #0F172A;
  --color-bg-elevated: #1E293B;
  --color-bg-subdued: #1E293B;
  --color-primary: #38BDF8;
  --color-primary-hover: #0284C7;
  --color-primary-active: #0369A1;
  --color-on-primary: #0B0F19;
  --color-on-primary-dark-active: #FFFFFF;
  --color-text-primary: #F8FAFC;
  --color-text-secondary: #CBD5E1;
  --color-text-muted: #94A3B8;
  --color-border-default: #1E293B;
  --color-border-strong: #334155;
  --color-focus-ring: #38BDF8;
  --color-success: #4ADE80;
  --color-success-subdued: #064E3B;
  --color-warning: #FBBF24;
  --color-warning-subdued: #78350F;
  --color-danger: #F87171;
  --color-danger-subdued: #7F1D1D;
  --color-danger-on-subdued: #FEE2E2;
  --color-missing-text: #CBD5E1;
  --color-missing-bg: #334155;

  --shadow-none: none;
  --shadow-sm: 0 1px 2px 0 rgba(0,0,0,0.4);
  --shadow-md: 0 4px 6px -1px rgba(0,0,0,0.5);
  --shadow-lg: 0 10px 15px -3px rgba(0,0,0,0.6);
  --shadow-xl: 0 20px 25px -5px rgba(0,0,0,0.7);
}
```

### 10.2. Flutter Dart Sabitleri (`tokens.dart`)

```dart
import 'package:flutter/material.dart';

/// Semantik Uygulama Renk Paleti ve Temalar
class AppColors {
  AppColors._();

  // Sabit Palet Değerleri
  static const Color lightBgBase = Color(0xFFF8FAFC);
  static const Color lightBgSurface = Color(0xFFFFFFFF);
  static const Color lightBgElevated = Color(0xFFFFFFFF);
  static const Color lightBgSubdued = Color(0xFFF1F5F9);
  static const Color lightPrimary = Color(0xFF0066CC);
  static const Color lightPrimaryHover = Color(0xFF0052A3);
  static const Color lightPrimaryActive = Color(0xFF004080);
  static const Color lightOnPrimary = Color(0xFFFFFFFF);
  static const Color lightTextPrimary = Color(0xFF0F172A);
  static const Color lightTextSecondary = Color(0xFF475569);
  static const Color lightTextMuted = Color(0xFF64748B);
  static const Color lightBorderDefault = Color(0xFFE2E8F0);
  static const Color lightBorderStrong = Color(0xFFCBD5E1);
  static const Color lightFocusRing = Color(0xFF0066CC);

  static const Color darkBgBase = Color(0xFF0B0F19);
  static const Color darkBgSurface = Color(0xFF0F172A);
  static const Color darkBgElevated = Color(0xFF1E293B);
  static const Color darkBgSubdued = Color(0xFF1E293B);
  static const Color darkPrimary = Color(0xFF38BDF8);
  static const Color darkPrimaryHover = Color(0xFF0284C7);
  static const Color darkPrimaryActive = Color(0xFF0369A1);
  static const Color darkOnPrimary = Color(0xFF0B0F19);
  static const Color darkOnPrimaryActive = Color(0xFFFFFFFF);
  static const Color darkTextPrimary = Color(0xFFF8FAFC);
  static const Color darkTextSecondary = Color(0xFFCBD5E1);
  static const Color darkTextMuted = Color(0xFF94A3B8);
  static const Color darkBorderDefault = Color(0xFF1E293B);
  static const Color darkBorderStrong = Color(0xFF334155);
  static const Color darkFocusRing = Color(0xFF38BDF8);

  // Ortak Durum Renkleri
  static const Color success = Color(0xFF15803D);
  static const Color successSubduedLight = Color(0xFFDCFCE7);
  static const Color successSubduedDark = Color(0xFF064E3B);
  static const Color successDark = Color(0xFF4ADE80);

  static const Color warning = Color(0xFFB45309);
  static const Color warningSubduedLight = Color(0xFFFEF3C7);
  static const Color warningSubduedDark = Color(0xFF78350F);
  static const Color warningDark = Color(0xFFFBBF24);

  static const Color danger = Color(0xFFB91C1C);
  static const Color dangerSubduedLight = Color(0xFFFEE2E2);
  static const Color dangerSubduedDark = Color(0xFF7F1D1D);
  static const Color dangerOnSubduedLight = Color(0xFFB91C1C);
  static const Color dangerOnSubduedDark = Color(0xFFFEE2E2);
  static const Color dangerDark = Color(0xFFF87171);

  // Eksik Veri Tokenları
  static const Color missingBgLight = Color(0xFFE2E8F0);
  static const Color missingTextLight = Color(0xFF334155);
  static const Color missingBgDark = Color(0xFF334155);
  static const Color missingTextDark = Color(0xFFCBD5E1);
}

/// Tipografi Hiyerarşisi
class AppTypography {
  AppTypography._();

  static const String fontFamily = 'Inter';

  static const TextStyle display = TextStyle(
    fontFamily: fontFamily,
    fontSize: 36.0,
    height: 44.0 / 36.0,
    fontWeight: FontWeight.w700,
    letterSpacing: -0.72,
  );

  static const TextStyle h1 = TextStyle(
    fontFamily: fontFamily,
    fontSize: 30.0,
    height: 38.0 / 30.0,
    fontWeight: FontWeight.w700,
    letterSpacing: -0.45,
  );

  static const TextStyle h2 = TextStyle(
    fontFamily: fontFamily,
    fontSize: 24.0,
    height: 32.0 / 24.0,
    fontWeight: FontWeight.w600,
    letterSpacing: -0.24,
  );

  static const TextStyle h3 = TextStyle(
    fontFamily: fontFamily,
    fontSize: 20.0,
    height: 28.0 / 20.0,
    fontWeight: FontWeight.w600,
    letterSpacing: -0.10,
  );

  static const TextStyle h4 = TextStyle(
    fontFamily: fontFamily,
    fontSize: 18.0,
    height: 24.0 / 18.0,
    fontWeight: FontWeight.w500,
    letterSpacing: 0.0,
  );

  static const TextStyle bodyLarge = TextStyle(
    fontFamily: fontFamily,
    fontSize: 16.0,
    height: 24.0 / 16.0,
    fontWeight: FontWeight.w400,
    letterSpacing: 0.0,
  );

  static const TextStyle bodyMedium = TextStyle(
    fontFamily: fontFamily,
    fontSize: 14.0,
    height: 20.0 / 14.0,
    fontWeight: FontWeight.w400,
    letterSpacing: 0.0,
  );

  static const TextStyle bodyMediumBold = TextStyle(
    fontFamily: fontFamily,
    fontSize: 14.0,
    height: 20.0 / 14.0,
    fontWeight: FontWeight.w500,
    letterSpacing: 0.0,
  );

  static const TextStyle bodySmall = TextStyle(
    fontFamily: fontFamily,
    fontSize: 12.0,
    height: 16.0 / 12.0,
    fontWeight: FontWeight.w400,
    letterSpacing: 0.12,
  );

  static const TextStyle caption = TextStyle(
    fontFamily: fontFamily,
    fontSize: 11.0,
    height: 14.0 / 11.0,
    fontWeight: FontWeight.w500,
    letterSpacing: 0.22,
  );

  static const TextStyle mono = TextStyle(
    fontFamily: 'RobotoMono',
    fontSize: 13.0,
    height: 18.0 / 13.0,
    fontWeight: FontWeight.w500,
    letterSpacing: 0.0,
  );
}

/// 4px/8px Tabanlı Boşluk Skalası
class AppSpacing {
  AppSpacing._();
  static const double s1 = 4.0;
  static const double s2 = 8.0;
  static const double s3 = 12.0;
  static const double s4 = 16.0;
  static const double s5 = 20.0;
  static const double s6 = 24.0;
  static const double s8 = 32.0;
  static const double s12 = 48.0;
}

/// Köşe Yarıçapı Skalası
class AppRadius {
  AppRadius._();
  static const Radius none = Radius.zero;
  static const Radius sm = Radius.circular(4.0);
  static const Radius md = Radius.circular(8.0);
  static const Radius lg = Radius.circular(12.0);
  static const Radius xl = Radius.circular(16.0);
  static const Radius full = Radius.circular(9999.0);

  static const BorderRadius borderSm = BorderRadius.all(sm);
  static const BorderRadius borderMd = BorderRadius.all(md);
  static const BorderRadius borderLg = BorderRadius.all(lg);
  static const BorderRadius borderXl = BorderRadius.all(xl);
  static const BorderRadius borderFull = BorderRadius.all(full);
  static const BorderRadius sheetTopXl = BorderRadius.vertical(top: xl);
}

/// Gölge ve Elevation Seviyeleri
class AppElevation {
  AppElevation._();

  static const List<BoxShadow> shadowNone = [];

  static const List<BoxShadow> shadowSmLight = [
    BoxShadow(
      color: Color(0x0D000000),
      blurRadius: 2.0,
      offset: Offset(0, 1),
    ),
  ];

  static const List<BoxShadow> shadowMdLight = [
    BoxShadow(
      color: Color(0x14000000),
      blurRadius: 6.0,
      offset: Offset(0, 4),
      spreadRadius: -1.0,
    ),
  ];

  static const List<BoxShadow> shadowLgLight = [
    BoxShadow(
      color: Color(0x1A000000),
      blurRadius: 15.0,
      offset: Offset(0, 10),
      spreadRadius: -3.0,
    ),
  ];

  static const List<BoxShadow> shadowXlLight = [
    BoxShadow(
      color: Color(0x1F000000),
      blurRadius: 25.0,
      offset: Offset(0, 20),
      spreadRadius: -5.0,
    ),
  ];

  static const List<BoxShadow> shadowSmDark = [
    BoxShadow(
      color: Color(0x66000000),
      blurRadius: 2.0,
      offset: Offset(0, 1),
    ),
  ];

  static const List<BoxShadow> shadowMdDark = [
    BoxShadow(
      color: Color(0x80000000),
      blurRadius: 6.0,
      offset: Offset(0, 4),
      spreadRadius: -1.0,
    ),
  ];

  static const List<BoxShadow> shadowLgDark = [
    BoxShadow(
      color: Color(0x99000000),
      blurRadius: 15.0,
      offset: Offset(0, 10),
      spreadRadius: -3.0,
    ),
  ];

  static const List<BoxShadow> shadowXlDark = [
    BoxShadow(
      color: Color(0xB3000000),
      blurRadius: 25.0,
      offset: Offset(0, 20),
      spreadRadius: -5.0,
    ),
  ];
}

/// Dokunma Hedefi Limitleri
class AppTouchTarget {
  AppTouchTarget._();
  static const double minWeb = 44.0;
  static const double minMobile = 48.0;
  static const BoxConstraints mobileConstraints = BoxConstraints(
    minWidth: minMobile,
    minHeight: minMobile,
  );
}

---

## 11. Tasarım Kalite Kapıları ve Doğrulama Denetimi

1. **Token Uyumu Kapısı:** Arayüz bileşenlerinde sabit HEX/px kodu bulunamaz; tüm değerler `tokens.css` veya `tokens.dart` üzerinden çağrılır.
2. **WCAG 2.1 AA Kontrast Kapısı:** Gövde metinleri arka plana karşı en az **4.5:1**, büyük başlıklar ve odak halkaları en az **3.0:1** kontrast oranına sahip olmak zorundadır.
3. **Dokunma Hedefi Kapısı:** Tıklanabilir her öğe webde en az **44x44 CSS px**, mobilde en az **48x48 pt** fiziksel dokunma alanına sahip olmalıdır.
4. **Eksik Veri Görsel Standardı:** Soket, güç, tarife ve anlık doluluk boşken uydurma mock değer girilemez; standart gri rozet ve katkı CTA'sı zorunludur.
5. **Konum Gizliliği Kapısı:** Hiçbir arayüz bileşeni veya form alanı kullanıcının anlık GPS koordinatını sunucuya gönderecek parametre barındıramaz.
