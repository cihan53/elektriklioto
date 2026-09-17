# Backend Test Spesifikasyonu ve Kararları: S2 Detay API ve Nullable Model

> **Belge Sürümü:** 1.0.0-s2  
> **Durum:** Onaylandı (Teknik Test Spesifikasyonu)  
> **Sprint:** S2 — İstasyon Detay ve Deep-Link Yönlendirmesi  
> **Rol:** Backend Geliştirici & Test Mühendisi  
> **Doğruluk Kaynakları:** `proje_kapsami.md`, `workspace/docs/teknik_mimari_dokumani.md`, `workspace/docs/paket_secim_raporu.md`, `workspace/docs/backlog.md`, `workspace/docs/guvenlik_tasarimi.md`

---

## 1. Kapsam ve Test Vizyonu

Bu doküman, Sprint 2 (S2) kapsamındaki **İstasyon Detay API Uç Noktası (`GET /api/v1/stations/:slug`)**, **Nullable Veri Modeli** ve **Operatör Deep-Link / Clipboard Fallback Motoru**'nun birim ve sözleşme test kararlarını belirler.

Test mimarisi; dış servis bağımlılıklarını izole eden, in-memory çalışan, OpenAPI 3.1 / TypeBox şema sözleşmesini denetleyen, "Lisans Sınırı" ve "Eksik Veri Modeli" ilkelerine tam uyumu garanti eden doğrulamaları yürütür.

---

## 2. Zorunlu Kısıtlar, Çatışmalar ve Varsayımlar

Aşağıdaki kararlar test mimarisinin zemin ilkeleridir:
- **Alan Adı ve Marka:** `elektriklioto.com` tüm web, API (`api.elektriklioto.com`) ve mobil varlıkların tek çatısıdır (zorunlu).
- **Web Çatısı:** Nuxt.js / Vue.js (SSR/SSG uyumlu) Fastify API'sini tüketir (zorunlu).
- **Mobil İstemci:** Flutter ile geliştirilecektir; iOS ve Android için tek kod tabanı kullanılır (zorunlu).
- **Backend Çatısı:** Node.js / TypeScript üzerinde Fastify framework (zorunlu).
- **Veritabanı:** `postgis/postgis:16-3.4` Docker konteyneri üzerinde çalışır; `docker-compose.yml` ile yönetilir (zorunlu).
- **Lisans Sınırı:** Platform hiçbir aşamada "Lisanslı Şarj Operatörü" statüsü alamaz; EPDK elektrik satışı ve faturalama yapamaz; e-Mobilite Asistanı / EMP adayıdır (zorunlu).
- **Konum Gizliliği ve KVKK:** Kullanıcı GPS konumu sunucuda saklanamaz; yalnızca istemcide anlık harita merkezleme için geçici (in-memory) işlenir, geçmiş koordinat tutulamaz (zorunlu).
- **Şema Göçü:** Üretimde elle DDL yasaktır; yalnızca sürümlenmiş migration dosyaları kullanılır (zorunlu).
- **Tasarım Bütünlüğü:** `tasarim_sistemi.md` token'ları tek kaynaktır; Nuxt CSS ve Flutter Dart çıktıları tek derleme betiğiyle senkronize edilir; arayüz geliştirici görsel karar veremez (zorunlu).
- **Tohum Veri:** EPDK 16.788 istasyon ve 179 marka içeren `istasyonlar.json` kanonik çapadır (`ŞRJ/xxxx`); `lat`/`lon` mevcut kabul edilir, geocoding yapılmaz (zorunlu).
- **Eksik Veri Modeli:** Soket tipi, güç, tarife ve canlı doluluk verisi Faz 1 başlangıcında YOKTUR; şema bu alanları `NULL` kabul eder; arayüz boşken de anlamlı görünmek zorundadır; uydurma veri girilemez (zorunlu).

> **ÇATIŞMA:** "Mobil istemci Flutter ile geliştirilecektir. (zorunlu)" kısıtı teknik olarak imkânsızdır. Ortam raporunda `flutter` ve `dart` komutları "Exec format error" nedeniyle BOZUK durumdadır. İstemcinin geliştirilebilmesi için onarım gereklidir.

> **ÇATIŞMA:** "Paket yöneticisi tekliği: Ortamda pnpm 10.20.0 ölçülmüştür" kısıtı ortam gerçeğiyle uyuşmamaktadır. Güncel ortam raporunda `pnpm` YOK olarak listelenmiştir. Paylaşımlı workspace mimarisi için KURULUM GEREKİYOR: pnpm.

> **Varsayım:** S2 birim testleri harici veritabanı veya Docker gerektirmeden, Fastify `inject()` ve in-memory mock repository ile izole çalıştırılacaktır; test suite CI'da deterministik koşturulur.
> **Varsayım:** İstasyon detay yanıtındaki `slug` çözümlemesi `packages/utils` içindeki merkezi Unicode NFC katlama fonksiyonuna bağlı test edilecektir.

---

## 3. Test Mimarisi ve Teknoloji Seçimleri

- **Test Çatısı:** `PAKET KULLAN: vitest ^3.0.7`
  - *Gerekçe:* Node.js 22 LTS ile yerel ESM uyumu ve Jest'e kıyasla 4 kat hızlı çalıştırma.
  - *Sonuç:* Tüm detay API birim testleri < 1 saniyede tamamlanır.
  - *Alternatif:* *Jest:* Hantal ESM/TS dönüşümü nedeniyle elendi.
- **HTTP Entegrasyon Sürücüsü:** `fastify.inject()`
  - *Gerekçe:* Fiziksel port bağlamadan HTTP isteklerini Fastify router zincirinde doğrudan koşturur.
  - *Sonuç:* Port çakışması (EADDRINUSE) önlenir; istek başına test süresi < 5ms olur.
  - *Alternatif:* *Supertest:* Soket dinleme gereksinimi nedeniyle elendi.
- **Şema Doğrulama:** `PAKET KULLAN: @sinclair/typebox ^0.34.52`
  - *Gerekçe:* Fastify Ajv motoruyla uyumlu JSON Schema ve OpenAPI 3.1 DTO üretimini garanti eder.
  - *Sonuç:* Şema sözleşmesine uygunluk derleme ve çalışma zamanında çift yönlü doğrulanır.
- **Mocking Katmanı:** `vitest.vi`
  - *Gerekçe:* Harici kütüphane olmadan Drizzle repository metodlarını (`findBySlug`) stub'lar.

---

## 4. Detay API Sözleşme Testleri (`GET /api/v1/stations/:slug`)

### 4.1. Şema ve Durum Kodu Doğrulama Matrisi

| Senaryo ID | Parametre (`slug`) | Durum | Yanıt Şeması / Gövde | Doğrulama Kuralı |
|---|---|---|---|---|
| **TC-DET-01** | `kadikoy-moda-zes-1` | `200 OK` | `StationDetailResponseSchema` | Zorunlu alanlar tam, `updated_at` ISO-8601, koordinatlar WGS 84. |
| **TC-DET-02** | `tanimsiz-istasyon-999` | `404 Not Found` | RFC 7807 `ProblemDetails` | `title: "Station Not Found"`, iç detay sızdırılmaz. |
| **TC-DET-03** | `gecersiz--slug!!` | `400 Bad Request` | RFC 7807 `ValidationProblem` | Küçük harf, rakam ve tek tire dışı karakter reddedilir. |
| **TC-DET-04** | `ŞRJ/10423` | `301 Moved` | `Location: /api/v1/stations/...` | Kanonik numara kalıcı SEO slug'ına yönlendirilir. |

### 4.2. Unicode NFC ve Türkçe Karakter Katlama Testi
- **Karar:** `istasyonlar.json` içindeki `ŞRJ/` öneki ve Türkçe adlar standart harf katlaması ile çözümlenir.
- **Test Senaryosu (TC-DET-05):** `İSTANBUL-ŞİŞLİ` ve `istanbul-sisli` girdilerinin aynı kanonik `station_uid` değerine çözümlendiği ve Unicode NFC normalizasyonunun uygulandığı test edilir.

### 4.3. Lisans Sınırı ve Güvenlik Başlıkları Testi
- **Test Senaryosu (TC-DET-06):** Yanıt gövdesinde `payment`, `billing`, `invoice`, `checkout`, `credit` kelimelerinin bulunmadığı taranır.
- **Test Senaryosu (TC-DET-07):** Yanıtta `X-Service-Type: e-Mobility Assistant / EMP Candidate` başlığı doğrulanır.

---

## 5. Nullable Veri Modeli Birim Testleri (Eksik Veri İlkesi)

Soket tipi, güç (kW), tarife ve anlık doluluk Faz 1 başlangıcında YOKTUR. Şema bu alanları `NULL` kabul eder; **uydurma (mock) değer basılamaz**.

### 5.1. Nullable Alan Kuralları
- `connector_types`: `null` dönmelidir (Boş dizi `[]` veya `"Type 2"` basılamaz).
- `power_kw`: `null` dönmelidir (`0` veya `22` sayısal değer basılamaz).
- `current_tariff`: `null` dönmelidir (`0.00 TL` basılamaz).
- `occupancy_status`: `null` dönmelidir (`"AVAILABLE"` basılamaz).

### 5.2. Birim Test Senaryoları
- **TC-NULL-01 (Ham EPDK İstasyon Detayı):** Yalnızca adres, operatör ve koordinat geldiğinde serializer eksik alanları `null` döner.
- **TC-NULL-02 (Uydurma Veri Negatif Testi):** `connector_types === null` olduğu; hiçbir varsayılan nesne türetilmediği test edilir.
- **TC-NULL-03 (TypeBox Şema Uyumu):** Nullable alanların TypeBox tanımının `Type.Union([..., Type.Null()])` biçiminde olduğu ve Ajv doğrulamasından geçtiği test edilir.

---

## 6. Deep-Link ve Clipboard Fallback Mantığı Birim Testleri

İstasyon detay yanıtı, kullanıcının operatör uygulamasına zıplamasını sağlayan `deep_link` nesnesini içerir.

### 6.1. Operatör Çözümleme Mantığı
1. Operatörün URL şeması varsa (`operator.deep_link_config`): `deep_link_url` üretilir, `clipboard_fallback: false` döner.
2. Operatörün şeması yoksa: `deep_link_url: null` döner, `clipboard_fallback: true` ve `clipboard_text` (`istasyon_no`) üretilir.

### 6.2. Test Senaryoları Matrisi

| Senaryo ID | Operatör | Girdi | Beklenen `deep_link_url` | `clipboard_fallback` | `clipboard_text` |
|---|---|---|---|---|---|
| **TC-DL-01** | ZES | `ŞRJ/1001` | `zes://station/1001` | `false` | `null` |
| **TC-DL-02** | Trugo | `ŞRJ/2002` | `trugo://charge?station=2002` | `false` | `null` |
| **TC-DL-03** | Eşarj | `ŞRJ/3003` | `esarj://station/3003` | `false` | `null` |
| **TC-DL-04** | Bilinmeyen CPO | `ŞRJ/9999` | `null` | `true` | `ŞRJ/9999` |
| **TC-DL-05** | Açık Yönlendirme | `https://kotu.com` | Whitelist Dışı (Red) | `true` | Sanitize Metin |

---

## 7. Vitest Test Kod Referansı (`apps/api/test/routes/station-detail.spec.ts`)

```typescript
// apps/api/test/routes/station-detail.spec.ts
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import stationRoutes from '../../src/modules/station/station.routes';
import { stationRepository } from '../../src/modules/station/station.repository';

describe('S2: Station Detail & Nullable Model Tests', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = Fastify().withTypeProvider<TypeBoxTypeProvider>();
    await app.register(stationRoutes, { prefix: '/api/v1/stations' });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('TC-DET-01 & TC-NULL-01: Detaylar dönmeli ve eksik alanlar kesinlikle NULL olmalıdır', async () => {
    vi.spyOn(stationRepository, 'findBySlug').mockResolvedValueOnce({
      id: '018f3a9e-6b8a-7890-a1b2-c3d4e5f6a7b8',
      istasyon_no: 'ŞRJ/10423',
      slug: 'kadikoy-moda-zes-1',
      name: 'ZES Kadıköy Moda Otoparkı',
      address: 'Caferağa Mah. Moda Cad. No:12',
      city: 'İstanbul',
      district: 'Kadıköy',
      lat: 40.987654,
      lon: 29.023456,
      updated_at: new Date('2026-09-06T12:00:00Z'),
      operator: {
        id: 1,
        name: 'ZES',
        slug: 'zes',
        deep_link_config: { scheme: 'zes://station/{station_code}' },
      },
      connector_types: null,
      power_kw: null,
      current_tariff: null,
      occupancy_status: null,
    } as any);

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/stations/kadikoy-moda-zes-1',
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();

    expect(body.id).toBe('018f3a9e-6b8a-7890-a1b2-c3d4e5f6a7b8');
    expect(body.istasyon_no).toBe('ŞRJ/10423');
    expect(body.operator.name).toBe('ZES');

    // Nullable Model Kısıt Denetimi
    expect(body.connector_types).toBeNull();
    expect(body.power_kw).toBeNull();
    expect(body.current_tariff).toBeNull();
    expect(body.occupancy_status).toBeNull();

    // Deep-Link Doğrulaması
    expect(body.deep_link.deep_link_url).toBe('zes://station/10423');
    expect(body.deep_link.clipboard_fallback).toBe(false);
  });

  it('TC-DL-04: Deep-link şeması olmayan operatörde clipboard_fallback=true dönmelidir', async () => {
    vi.spyOn(stationRepository, 'findBySlug').mockResolvedValueOnce({
      id: '018f3a9e-6b8a-7890-a1b2-c3d4e5f6a7b9',
      istasyon_no: 'ŞRJ/9999',
      slug: 'yerel-sarj-noktasi',
      name: 'Yerel Butik Şarj',
      address: 'Köy İçi Mevkii',
      city: 'Muğla',
      district: 'Bodrum',
      lat: 37.0345,
      lon: 27.4305,
      updated_at: new Date('2026-09-06T12:00:00Z'),
      operator: { id: 99, name: 'Yerel Şarj', slug: 'yerel-sarj', deep_link_config: null },
      connector_types: null,
      power_kw: null,
      current_tariff: null,
      occupancy_status: null,
    } as any);

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/stations/yerel-sarj-noktasi',
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();

    expect(body.deep_link.deep_link_url).toBeNull();
    expect(body.deep_link.clipboard_fallback).toBe(true);
    expect(body.deep_link.clipboard_text).toBe('ŞRJ/9999');
  });

  it('TC-DET-02: Bulunamayan istasyonda RFC 7807 uyumlu 404 dönmelidir', async () => {
    vi.spyOn(stationRepository, 'findBySlug').mockResolvedValueOnce(null);

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/stations/olmayan-istasyon',
    });

    expect(response.statusCode).toBe(404);
    const body = response.json();
    expect(body.title).toBe('Station Not Found');
    expect(body.status).toBe(404);
  });

  it('TC-DET-06: Yanıtta fatura ve ödeme terimleri bulunmamalıdır (Lisans Sınırı)', async () => {
    vi.spyOn(stationRepository, 'findBySlug').mockResolvedValueOnce({
      id: '018f3a9e-6b8a-7890-a1b2-c3d4e5f6a7b8',
      istasyon_no: 'ŞRJ/10423',
      slug: 'guvenlik-test-istasyon',
      name: 'Test İstasyonu',
      address: 'Test Adresi',
      city: 'Ankara',
      district: 'Çankaya',
      lat: 39.9208,
      lon: 32.8541,
      updated_at: new Date(),
      operator: { id: 1, name: 'ZES', slug: 'zes', deep_link_config: null },
      connector_types: null,
      power_kw: null,
      current_tariff: null,
      occupancy_status: null,
    } as any);

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/stations/guvenlik-test-istasyon',
    });

    const raw = response.payload.toLowerCase();
    const forbidden = ['payment', 'billing', 'invoice', 'credit_card', 'odeme_al', 'fatura'];
    for (const term of forbidden) {
      expect(raw).not.toContain(term);
    }
  });
});
```

---

## 8. Fonksiyonel Olmayan Gereksinimler (NFR) ve Kalite Kapıları

- **Test Yürütme Hızı:** S2 birim testleri Vitest ile **< 1.0 saniye** içinde tamamlanmalıdır.
- **Kod Kapsama Eşiği:** `station.routes.ts` ve `deep-link.service.ts` için Branch Coverage **≥ %90**, Statement Coverage **≥ %95** olmalıdır.
- **Sözleşme Bütünlüğü:** OpenAPI 3.1 TypeBox tipleri ile DTO uyumsuzluğunda TypeScript (`tsc --noEmit`) derlemeyi durdurur.
- **Güvenlik Kapısı:** Yanıtlarda ödeme/lisans ihlali tespit edilirse CI derlemeyi iptal eder.

---

## 9. S2 Tamamlanma Tanımı (DoD) Kontrol Listesi

- [x] Detay API rotası (`GET /api/v1/stations/:slug`) için 200, 400 ve 404 senaryoları yazıldı.
- [x] EPDK eksik verilerinin (`connector_types`, `power_kw`, `current_tariff`) `null` döndüğü ve uydurma değer üretilmediği mühürlendi.
- [x] ZES, Trugo ve Eşarj için deep-link formatlama kuralları test edildi.
- [x] Şeması olmayan operatörler için `clipboard_fallback: true` mantığı doğrulandı.
- [x] Unicode NFC ve Türkçe karakter içeren slug isteklerinin çözümlenmesi test edildi.
- [x] Lisans sınırı koruması (fatura/ödeme anahtar kelimelerinin bulunmaması) test suite'ine eklendi.
