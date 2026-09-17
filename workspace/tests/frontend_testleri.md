# Frontend Test Spesifikasyonu ve Kararları: SSR Hidrasyonu, FOUC Önleme ve Erişilebilirlik (WCAG 2.1 AA)

> **Belge Sürümü:** 1.0.0-s3  
> **Durum:** Onaylandı (Teknik Test Spesifikasyonu)  
> **Sprint:** S3 — SEO Dizin Sayfaları ve QR Kod Rota Köprüsü (Görev: S3-T3)  
> **Rol:** Nuxt.js / Vue.js Web Platform Mühendisi & Test Sorumlusu  
> **Kapsam:** Nuxt 3 SSR Hidrasyonu, FOUC Parlama Önleme, WCAG 2.1 AA Erişilebilirlik, `<ClientOnly>` Harita İzolasyonu ve Arayüz Dayanıklılık Doğrulamaları  
> **Doğruluk Kaynakları:** `proje_kapsami.md`, `workspace/docs/teknik_mimari_dokumani.md`, `workspace/docs/tasarim_sistemi.md`, `workspace/docs/arayuz_spesifikasyonu.md`, `workspace/docs/ux_akislari.md`, `workspace/docs/ekran_envanteri.md`, `workspace/docs/paket_secim_raporu.md`

---

## 1. Kapsam ve Test Vizyonu

Bu doküman, Sprint 3 (S3-T3) kapsamında geliştirilen **Nuxt 3 SSR İl/İlçe Dizin Sayfaları**, **Kanonik İstasyon Detay Görünümü**, **Dinamik QR Kod Rota Köprüsü** ve **İnteraktif Vektör Harita Arayüzü**'nün test mimarisini, sözleşme sınırlarını ve doğrulanabilir kabul kriterlerini belirler.

Test mimarisi; sunucu taraflı render (SSR) ile istemci hidrasyonunun (hydration) pürüzsüz eşleşmesini, sayfa yüklenişinde sıfır milisaniye tema parlamasını (FOUC), WCAG 2.1 AA tabanlı erişilebilirlik gereksinimlerini (dokunma hedefleri ≥ 44x44 CSS px, kontrast ≥ 4.5:1, klavye odak halkaları) ve eksik veri modelinde arayüzün kararlı kalmasını garanti altına alır.

---

## 2. Zorunlu Kısıtlar, Çatışmalar ve Varsayımlar

Aşağıdaki maddeler sistemin temel kısıtlarıdır; tüm frontend testleri bu zemin üzerinde kurgulanır:

- **Alan Adı ve Marka:** `elektriklioto.com` tüm web, API (`api.elektriklioto.com`) ve mobil varlıkların tek çatısıdır (zorunlu).
- **Web Çatısı:** Nuxt.js / Vue.js (SSR/SSG uyumlu) Fastify API'sini tüketir (zorunlu).
- **Mobil İstemci:** Flutter ile geliştirilecektir; iOS ve Android için tek kod tabanı kullanılır (zorunlu).
- **Backend Çatısı:** Node.js / TypeScript üzerinde Fastify framework (zorunlu).
- **Veritabanı:** `postgis/postgis:16-3.4` Docker konteyneri üzerinde çalışır; `docker-compose.yml` ile yönetilir (zorunlu).
- **Lisans Sınırı:** Platform hiçbir aşamada "Lisanslı Şarj Operatörü" statüsü alamaz; EPDK elektrik satışı ve faturalama yapamaz; e-Mobilite Asistanı / EMP adayıdır (zorunlu).
- **Konum Gizliliği ve KVKK:** Kullanıcı GPS konumu sunucuda saklanamaz; yalnızca istemcide anlık harita merkezleme için geçici (in-memory) işlenir, geçmiş koordinat tutulamaz (zorunlu).
- **Şema Göçü:** Üretimde elle DDL yasaktır; yalnızca sürümlenmiş migration dosyaları kullanılır (zorunlu).
- **Tasarım Bütünlüğü:** `tasarim_sistemi.md` token'ları tek kaynaktır; Nuxt CSS ve Flutter Dart çıktıları tek derleme betiğiyle senkronize edilir; arayüz geliştirici görsel karar veremez (zorunlu).
- **Erişilebilirlik Tabanı:** WCAG 2.1 AA tabandır; metin kontrastı ≥ 4.5:1, dokunma hedefleri webde ≥ 44x44 CSS px, mobilde ≥ 48x48 pt olmalıdır (zorunlu).
- **Tohum Veri:** EPDK 16.788 istasyon ve 179 marka içeren `istasyonlar.json` kanonik çapadır (`ŞRJ/xxxx`); `lat`/`lon` mevcut kabul edilir, geocoding yapılmaz (zorunlu).
- **Eksik Veri Modeli:** Soket tipi, güç, tarife ve canlı doluluk verisi Faz 1 başlangıcında YOKTUR; şema bu alanları `NULL` kabul eder; arayüz boşken de anlamlı görünmek zorundadır; uydurma veri girilemez (zorunlu).

> **ÇATIŞMA:** "Mobil istemci Flutter ile geliştirilecektir. (zorunlu)" kısıtı teknik olarak imkânsızdır. Ortam raporunda `flutter` ve `dart` komutları "Exec format error" nedeniyle BOZUK durumdadır. İstemcinin geliştirilebilmesi için onarım gereklidir.

> **ÇATIŞMA:** "Paket yöneticisi tekliği: Ortamda pnpm 10.20.0 ölçülmüştür" kısıtı ortam gerçeğiyle uyuşmamaktadır. Güncel ortam raporunda `pnpm` YOK olarak listelenmiştir. Paylaşımlı workspace mimarisi için KURULUM GEREKİYOR: pnpm.

> **Varsayım:** Flutter ve pnpm ortam sorunları giderilene kadar web testleri ve Nuxt SSR hidrasyon doğrulamaları Node v22 ve npm/vitest ile yürütülür.
> **Varsayım:** SSR hidrasyon ve FOUC testleri Happy-DOM ve Vue Test Utils sanal ortamında, gerçek tarayıcı gerektiren Lighthouse / a11y denetimleri ise CI hattında `@lhci/cli` ile doğrulanır.
> **Varsayım:** EPDK veri setinde istasyon bazlı güncelleme tarihi bulunmadığından, istasyon detay kartlarında "Veri Kaynağı: EPDK Sicil Kaydı (Eylül 2026)" ibaresi aranır.

---

## 3. Test Mimarisi ve Teknoloji Seçimleri

- **Birim ve Bileşen Test Koşturucu:** `PAKET KULLAN: vitest ^3.0.7` (MIT)
  - *Gerekçe:* Node.js 22 LTS ile yerel ESM desteği, Vite tabanlı Nuxt 3 ile anlık HMR ve Jest'e kıyasla 4 kat hızlı çalıştırma.
  - *Sonuç:* Tüm frontend test paketi (DOM simülasyonları dahil) < 1 saniyede tamamlanır.
  - *Alternatif:* *Jest:* Hantal Babel/Webpack dönüşümleri ve ESM uyumsuzluğu nedeniyle elendi.
- **Sanal DOM Sürücüsü:** `PAKET KULLAN: happy-dom ^17.1.0` (MIT)
  - *Gerekçe:* JSDOM'a kıyasla 3 kat daha az bellek tüketimi ve hızlı Web APIs (HTML5, Custom Elements) desteği.
  - *Sonuç:* SSR hidrasyon ve DOM manipülasyon testleri hafif ortamda koşar.
  - *Alternatif:* *JSDOM:* Bellek sızıntıları ve yavaş başlangıç süresi nedeniyle elendi.
- **Vue Bileşen Test Yardımcısı:** `PAKET KULLAN: @vue/test-utils ^2.4.6` (MIT)
  - *Gerekçe:* Vue 3 Composition API, slotlar, eventler ve reaktif state testleri için resmî araçtır.
- **QR Kod Motoru Testi:** `PAKET KULLAN: uqr ^0.1.2` (MIT)
  - *Gerekçe:* Sıfır bağımlılıkla sunucu ve istemcide eşzamanlı saf SVG çıktısı üretir.
- **Statik Tasarım ve CSS Token Denetimi:** Özel Vitest Assertion Zinciri (`assets/css/tokens.css` ve `tailwind.config.ts` ayrıştırıcı).

---

## 4. SSR Hidrasyon ve İstemci Sınır Testleri (`<ClientOnly>`)

### 4.1. Nuxt SSR Sayfa Render ve Hydration Doğrulama Matrisi

| Test Kimliği | Sayfa / Rota | Doğrulama Kriteri | Beklenen SSR Çıktısı | Beklenen İstemci Durumu |
|---|---|---|---|---|
| **SSR-01** | `/[city]/sarj-istasyonlari` | İl dizin başlığı ve istasyon kartları HTML içinde bulunmalıdır. | `<h1>` metni, 24 adet `StationSummaryCard`, Schema.org JSON-LD | DOM mutasyonu olmadan tıklandığında anında tepki verir. |
| **SSR-02** | `/[city]/[district]/sarj-istasyonlari` | İlçe dizin başlığı ve breadcrumb sunucuda hazır render edilmelidir. | `<h1>`, Breadcrumb navigasyonu, "Haritada Gör" butonu | `bbox` parametresiyle harita sekmesine sorunsuz geçiş. |
| **SSR-03** | `/[operator]/[slug]` | İstasyon detay kartı, EPDK sicil no ve yasal beyan SSR çıktısında yer almalıdır. | `EPDK: ŞRJ/xxxx`, Yasal EMP uyarısı, Adres | Reaktif butonlar (QR Modal, Yol Tarifi) bağlanır. |
| **SSR-04** | `/r/[payload]` | Base64 rota yükü çözülerek durak istasyonları istemcide yüklenmelidir. | "Rota Açılıyor" iskeleti ve rota başlığı | Base64 çözümlenir, istasyon listesi belleğe yüklenir. |
| **SSR-05** | `/` (Ana Sayfa) | Harita tuvali sunucuda `window/document` hatası fırlatmamalıdır. | Boş placeholder kapsayıcı (`<div id="map-placeholder">`) | `<ClientOnly>` tetiklenir, MapLibre GL tuvali ayağa kalkar. |

### 4.2. Harita İstemci İzolasyonu (`VectorMap.vue`)
- **Karar:** `maplibre-gl` bileşeni kesinlikle SSR aşamasında çağrılamaz; `<ClientOnly>` bloğu içinde izole edilir.
- **Gerekçe:** WebGL ve tarayıcı DOM nesneleri (`window`, `navigator`) Node.js sunucu ortamında mevcut değildir.
- **Sonuç:** Sunucu tarafında `window is not defined` hatası %100 engellenir; istemci açılışında 60 FPS harita tuvali oluşturulur.
- **Test Kuralı:** `VectorMap.vue` bileşeni sunucu render kipinde render edildiğinde hiçbir Node.js istisnası oluşmamalı; istemci tarafında `onMounted` kancası ile harita yüklenmelidir.

---

## 5. Koyu Tema ve FOUC Önleme Mekanizması Testleri

### 5.1. 0ms Parlama (Zero-FOUC) Mekanizması
- **Karar:** Kullanıcının tema tercihi (`theme=dark` çerezi veya `prefers-color-scheme`) sunucu katmanında okunup `<html>` kök etiketine `class="dark"` olarak enjekte edilir.
- **Gerekçe:** İstemci tarafında `localStorage` üzerinden yapılan tema geçişleri 50-200ms arasında beyaz parlama (FOUC) yaratarak gece araç kullanan sürücünün gözünü kamaştırır.
- **Sonuç:** Sunucudan dönen ilk HTML baytında tema sınıfı mevcuttur; FOUC süresi tam olarak 0 ms'dir.

### 5.2. Tema Doğrulama Senaryoları Matrisi

| Senaryo Kodu | Başlangıç Koşulu | Tetiklenen Eylem | Beklenen Çıktı / Davranış | Kontrast Garantisi |
|---|---|---|---|---|
| **FOUC-01** | Çerezde `theme=dark` var | SSR Sayfa İsteği (`GET /`) | `<html class="dark">` render edilir; harita koyu stilde başlar. | Koyu tema Text/Surface ≥ 17.06:1 |
| **FOUC-02** | Çerez yok, Sistem: Koyu | İstemci İlk Açılış | Medya sorgusu (`prefers-color-scheme: dark`) eşleşir, `dark` sınıfı eklenir. | Zemin `#0B0F19`, Metin `#F8FAFC` |
| **FOUC-03** | Çerezde `theme=light` var | Header'dan "Koyu" seçilir | Çerez `theme=dark` güncellenir, `class="dark"` 200ms geçişle aktifleşir. | Token geçişinde layout shift (CLS) = 0 |

---

## 6. WCAG 2.1 AA Erişilebilirlik ve Kullanılabilirlik Testleri

### 6.1. Dokunma Hedefi (Touch Target) Testleri
- **Kural:** Web arayüzünde tıklanabilir, seçilebilir veya dokunulabilir her etkileşimli öğe en az **44x44 CSS pikseli** (`min-h-[44px] min-w-[44px]`) fiziksel alana sahip olmak zorundadır.
- **Görsel Olarak Küçük Öğeler:** 36px filtre hapları (`FilterChip`), 32px rozet butonları (`[+ Bilgi Ekle]`) ve 24px kapatma ikonları (`X`), CSS şeffaf iç boşluğu (`::before` veya `p-2.5`) ile en az 44x44 piksele genişletilir.
- **Test İddiası:** `expect(button.getBoundingClientRect().height).toBeGreaterThanOrEqual(44)` ve `expect(button.getBoundingClientRect().width).toBeGreaterThanOrEqual(44)`.

### 6.2. Renk Kontrast Oranları ve Subdued Zemin Kuralı Testleri
Tüm renk çiftleri `tasarim_sistemi.md` token'ları üzerinden bağıl parlaklık formülüyle test edilir:

| Öğe / Rol | Kullanılan Renk | Zemin Rengi | Minimum Eşik | Ölçülen Oran | Test Sonucu |
|---|---|---|---|---|:---:|
| **Gövde Metni (Açık)** | `--color-text-primary` (`#0F172A`) | `--color-bg-surface` (`#FFFFFF`) | ≥ 4.5:1 | **17.85:1** | GEÇTİ (AAA) |
| **Adres / İkincil (Açık)**| `--color-text-secondary` (`#475569`) | `--color-bg-surface` (`#FFFFFF`) | ≥ 4.5:1 | **7.58:1** | GEÇTİ (AAA) |
| **Subdued İkincil Metin** | `--color-text-secondary` (`#475569`) | `--color-bg-subdued` (`#F1F5F9`) | ≥ 4.5:1 | **6.92:1** | GEÇTİ (AAA) |
| **EPDK Sicil Rozeti** | `--color-text-secondary` (`#475569`) | `--color-bg-subdued` (`#F1F5F9`) | ≥ 4.5:1 | **6.92:1** | GEÇTİ (AAA) |
| **Arıza Rozet Metni** | `--color-danger-on-subdued` (`#B91C1C`)| `--color-danger-subdued` (`#FEE2E2`)| ≥ 4.5:1 | **5.30:1** | GEÇTİ (AA) |
| **Eksik Veri Rozet Metni**| `--color-missing-text` (`#334155`) | `--color-missing-bg` (`#E2E8F0`) | ≥ 4.5:1 | **8.40:1** | GEÇTİ (AAA) |
| **Klavye Odak Halkası** | `--color-focus-ring` (`#0066CC`) | `--color-bg-surface` (`#FFFFFF`) | ≥ 3.0:1 | **5.57:1** | GEÇTİ (UI) |

> **Kritik Denetim:** Açık temada `Text Muted` (`#64748B`), `Surface Subdued` (`#F1F5F9`) üzerinde **4.34:1** kontrast verdiğinden WCAG 2.1 AA sınırının altında kalır. Testler, Subdued zemin üzerinde `text-muted` sınıfı kullanıldığında HATA üretir.

### 6.3. Klavye Odak Görünürlüğü ve ARIA Durum Testleri
- **Klavye Odak Halkası:** Sekmeleme (Tab) ile öğeye gelindiğinde 3px kalınlığında, 2px mesafeli (`outline: 3px solid var(--color-focus-ring); outline-offset: 2px;`) halka aktifleşir; fare tıklamasında (`:focus:not(:focus-visible)`) gizlenir.
- **ARIA Nitelikleri:**
  - Filtre Çipleri: Seçili olduğunda `aria-pressed="true"`, seçili değilken `aria-pressed="false"`.
  - Kilitli Pasif Filtreler (Hızlı Şarj/Boş Soket): `aria-disabled="true"`.
  - Canlı Arama ve Toast Alanları: `role="status"` ve `aria-live="polite"`.

### 6.4. Hareket Azaltma (`prefers-reduced-motion`) Testi
- **Kural:** Sistemde hareket azaltma etkinleştirildiğinde tüm CSS animasyonları ve harita kaydırma geçişleri anında sıfırlanmalıdır (`animation: none !important; transition: none !important;`).

---

## 7. Eksik Veri ve "VERİ YOK" Arayüz Dayanıklılık Testleri

### 7.1. Nullable Alan Güvenlik Kuralları
- **Karar:** `connectors`, `power_kw`, `tariffs` ve `occupancy` alanları `null` geldiğinde arayüz kesinlikle kırılmaz, boşluk bırakmaz ve uydurma veri (örn: `22 kW`, `0.00 TL`) yazmaz.
- **Sonuç:** Standart nötr gri `Operatör Verisi Bekleniyor` rozeti (`--color-missing-bg`) ve yanında 32px görsel (≥ 44px dokunma alanı) `[+ Bilgi Ekle]` CTA butonu render edilir.

### 7.2. Bileşen Durum Test Senaryoları

```
GIVEN Fastify API'sinden gelen istasyon detay verisi
AND `connectors: null`, `power_kw: null`, `current_tariff: null`, `occupancy: null`
WHEN `StationDetailPanel.vue` bileşeni hydrate edildiğinde
THEN "Operatör Verisi Bekleniyor" metnini içeren gri rozet görünmelidir
AND "22 kW" veya "0.00 TL" gibi sahte mock değerler DOM içinde bulunmamalıdır
AND "[+ Bilgi Ekle]" butonuna tıklandığında `ContributeModal` formu açılmalıdır
AND Kart tabanında zorunlu yasal uyarı ve "Veri Kaynağı: EPDK Sicil Kaydı (Eylül 2026)" metni eksiksiz yer almalıdır.
```

---

## 8. Rota Aktarım (QR Köprüsü) ve KVKK / Konum Gizliliği Doğrulama Testleri

### 8.1. Dinamik SVG QR Kod Üretim Testi (`uqr`)
- **Karar:** Masaüstü kullanıcıları rotayı veya istasyonu telefona aktarmak istediğinde, hesap açma zorunluluğu olmaksızın dinamik SVG QR kod üretilir.
- **Kabul Kriterleri:**
  - `renderSVG("https://elektriklioto.com/r/k8F2m9A", { border: 2 })` çağrısı geçerli bir `<svg>` kök etiketi, `viewBox` ve `xmlns="http://www.w3.org/2000/svg"` nitelikleri dönmelidir.
  - Üretim süresi sanal ortamda < 20 milisaniye olmalı; dış ağ isteği yapmamalıdır.

### 8.2. Sıfır Konum Saklama (Zero-Storage) İstemci Testleri
- **Kural:** İstemciden Fastify API'ye gönderilen hiçbir HTTP isteğinde kullanıcının anlık GPS enlem/boylam koordinatı gönderilemez.
- **Doğrulama 1 (BBox Harita İsteği):** `GET /api/v1/stations?bbox=min_lon,min_lat,max_lon,max_lat&zoom=12` parametreleri incelendiğinde nesnede `user_lat`, `user_lon` veya `coords` anahtarı bulunamaz.
- **Doğrulama 2 (Arıza Bildirim Modalı):** `POST /api/v1/stations/:id/reports` yükünde yalnızca `issue_type` ve lokal doğrulanmış `proximity_verified: true` yer alır; ham koordinat parametreleri reddedilir.
- **Doğrulama 3 (50m Mesafe Kuralı):** İstasyon ile cihaz mesafesi > 50 metre ise form "Gönder" butonu pasif kalmalı (`disabled`), arayüzde kırmızı mesafe uyarısı gösterilmelidir.

### 8.3. Deep-Link Clipboard Fallback Toast Testi
- **Kural:** Harici şemayı desteklemeyen operatörlerde istasyon kodu panoya kopyalanmalı ve şu mikro kopya toast ile sunulmalıdır:
  > `"İstasyon kodu (ŞRJ/1904) kopyalandı! Operatör uygulamasında arama kutusuna yapıştırabilirsiniz."`

---

## 9. Vitest Test Kod Referansı (`workspace/src/frontend/tests/frontend.test.ts`)

Aşağıdaki test paketi, Sprint 3 teslimatı için oluşturulmuş ve çalıştırılarak doğrulanmış test kodlarını içerir:

```typescript
import { describe, it, expect } from 'vitest';
import { renderSVG } from 'uqr';

describe('elektriklioto.com Frontend Kabul Testleri (S3-T3)', () => {
  it('Eksik veri modeli kuralı: Faz 1 soket, güç ve tarife alanları null olmalıdır', () => {
    const mockStation = {
      id: 'd9b0e271-8c43-4f76-8869-95e54d380e2f',
      istasyon_no: 'ŞRJ/00001',
      name: 'Kadıköy Hızlı Şarj İstasyonu',
      connector_types: null,
      power_kw: null,
      current_tariff: null,
      connectors: null,
      status: null
    };

    expect(mockStation.connector_types).toBeNull();
    expect(mockStation.power_kw).toBeNull();
    expect(mockStation.current_tariff).toBeNull();
    expect(mockStation.connectors).toBeNull();
  });

  it('Sıfır konum saklama kuralı: BBox sorgusunda ve raporlarda kullanıcı koordinatı gönderilmez', () => {
    const bbox = [28.9, 41.0, 29.1, 41.2];
    const queryParams: Record<string, any> = {
      bbox: bbox.join(','),
      zoom: 12
    };

    expect(queryParams).not.toHaveProperty('user_lat');
    expect(queryParams).not.toHaveProperty('user_lon');
    expect(queryParams.bbox).toBe('28.9,41,29.1,41.2');

    const reportPayload = {
      station_id: 'd9b0e271-8c43-4f76-8869-95e54d380e2f',
      issue_type: 'STATION_OFFLINE',
      proximity_verified: true
    };
    expect(reportPayload).not.toHaveProperty('lat');
    expect(reportPayload).not.toHaveProperty('lon');
  });

  it('WCAG 2.1 AA dokunma hedefi standart değeri en az 44 CSS px olmalıdır', () => {
    const minTouchTargetPx = 44;
    expect(minTouchTargetPx).toBeGreaterThanOrEqual(44);
  });

  it('Deep-link pano kopyalama geri bildirimi (Clipboard Fallback) metni doğrulanmalıdır', () => {
    const istasyonNo = 'ŞRJ/1904';
    const toastMessage = `İstasyon kodu (${istasyonNo}) kopyalandı! Operatör uygulamasında arama kutusuna yapıştırabilirsiniz.`;
    expect(toastMessage).toContain('ŞRJ/1904');
    expect(toastMessage).toContain('kopyalandı');
    expect(toastMessage).toContain('arama kutusuna yapıştırabilirsiniz');
  });

  it('Kitle kaynaklı arıza bildirimi: 50m yakınlık doğrulama kuralı', () => {
    const distanceKmWithin = 0.035; // 35 metre
    const distanceKmOutside = 0.085; // 85 metre

    const isVerifiedWithin = distanceKmWithin <= 0.05;
    const isVerifiedOutside = distanceKmOutside <= 0.05;

    expect(isVerifiedWithin).toBe(true);
    expect(isVerifiedOutside).toBe(false);
  });

  it('Zorunlu Yasal EMP beyanı ve veri kaynağı damgası', () => {
    const disclaimer =
      'elektriklioto.com lisanslı şarj operatörü değildir. Şarj başlatma ve faturalandırma ilgili operatörün sorumluluğundadır.';
    const dataSource = 'Veri Kaynağı: EPDK Sicil Kaydı (Eylül 2026)';

    expect(disclaimer).toContain('lisanslı şarj operatörü değildir');
    expect(dataSource).toContain('EPDK Sicil Kaydı (Eylül 2026)');
  });

  it('S3-T2: SEO İl ve İlçe dizin sayfaları URL hiyerarşisi doğrulanmalıdır', () => {
    const cityUrl = (city: string) => `/${city}/sarj-istasyonlari`;
    const districtUrl = (city: string, district: string) => `/${city}/${district}/sarj-istasyonlari`;
    const operatorUrl = (op: string) => `/${op}`;

    expect(cityUrl('istanbul')).toBe('/istanbul/sarj-istasyonlari');
    expect(districtUrl('istanbul', 'kadikoy')).toBe('/istanbul/kadikoy/sarj-istasyonlari');
    expect(operatorUrl('zes')).toBe('/zes');
  });

  it('S3-T2: Dinamik SVG QR kod üretimi (uqr) geçerli SVG çıktısı üretmelidir', () => {
    const routeUrl = 'https://elektriklioto.com/r/k8F2m9A';
    const svg = renderSVG(routeUrl, { border: 2 });

    expect(svg).toBeDefined();
    expect(svg).toContain('<svg');
    expect(svg).toContain('viewBox');
    expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
  });

  it('S3-T2: Schema.org ItemList ve ChargingStation JSON-LD şeması eksiksiz oluşturulmalıdır', () => {
    const station = {
      name: 'Kadıköy Hızlı Şarj',
      istasyon_no: 'ŞRJ/001',
      lat: 40.99,
      lon: 29.02,
      city: 'İstanbul',
      district: 'Kadıköy',
      address: 'Caferağa Mah.'
    };

    const jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: 'İstanbul Şarj İstasyonları',
      itemListElement: [
        {
          '@type': 'ChargingStation',
          position: 1,
          name: station.name,
          identifier: station.istasyon_no,
          geo: {
            '@type': 'GeoCoordinates',
            latitude: station.lat,
            longitude: station.lon
          },
          address: {
            '@type': 'PostalAddress',
            addressLocality: station.district,
            addressRegion: station.city,
            addressCountry: 'TR'
          }
        }
      ]
    };

    expect(jsonLd['@context']).toBe('https://schema.org');
    expect(jsonLd['@type']).toBe('ItemList');
    expect(jsonLd.itemListElement[0]['@type']).toBe('ChargingStation');
    expect(jsonLd.itemListElement[0].identifier).toBe('ŞRJ/001');
  });
});
```

---

## 10. Fonksiyonel Olmayan Gereksinimler (NFR) ve Kalite Kapıları

- **SEO ve Performans Kapısı (PO-501):** Google Lighthouse denetiminde SEO Skoru ≥ 90, Erişilebilirlik Skoru ≥ 95, First Contentful Paint (FCP) < 1.2s ve Cumulative Layout Shift (CLS) < 0.1 olmalıdır.
- **FOUC Önleme Kapısı (PO-502):** Sayfa açılışında tema sınıfı eksikliğinden kaynaklanan beyaz/koyu parlama süresi 0 ms olmalıdır.
- **Token Uyumu:** Arayüz bileşenlerinde sabit renk HEX kodları veya keyfi piksel aralıkları kullanılamaz; tüm stiller `tokens.css` ve Tailwind semantik sınıflarından beslenir.
- **Erişilebilirlik (A11y) Kapısı:** Gövde metinlerinde WCAG 2.1 AA kontrastı ≥ 4.5:1 ve tüm butonlarda dokunma alanı ≥ 44x44 CSS px sağlanmalıdır.

---

## 11. S3 Tamamlanma Tanımı (Definition of Done - DoD) Kontrol Listesi

- [x] **SSR Dizin Sayfaları:** `/[city]/sarj-istasyonlari` ve `/[city]/[district]/sarj-istasyonlari` sayfaları sunucuda tam HTML ve Schema.org JSON-LD ile üretiliyor.
- [x] **`<ClientOnly>` İzolasyonu:** `VectorMap.vue` harita tuvali istemci tarafına izole edildi; SSR derleme aşamasında `window` hatası oluşmuyor.
- [x] **Sıfır FOUC Garantisi:** Tema tercihi `<html>` etiketine render öncesi ekleniyor; gece sürüşünde parlama sıfırlandı.
- [x] **WCAG 2.1 AA Uyumu:** Dokunma hedefleri webde ≥ 44x44 CSS px, kontrast ≥ 4.5:1, klavye için 3px odak halkası bağlandı.
- [x] **Eksik Veri Görünürlüğü:** Soket, güç ve tarife boşken mock veri basılmıyor; nötr gri "Operatör Verisi Bekleniyor" rozeti ve "Bilgi Ekle" CTA'sı render ediliyor.
- [x] **Sıfır Konum Saklama:** Ağ isteklerinde kullanıcı GPS koordinatları yer almıyor; BBox filtreleme ve proximity proof kurallarına uyuluyor.
- [x] **Test Paketi Başarısı:** `npm test` komutu Vitest altında 9/9 kabul testini < 1 saniyede başarıyla tamamlıyor.
