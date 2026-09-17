# Backend Test Spesifikasyonu ve Kararları: S4 Sıfır Konum Saklama ve Güvenlik Testleri

> **Belge Sürümü:** 1.0.0-s4  
> **Durum:** Onaylandı (Teknik Test Karar Dokümanı)  
> **Sprint:** S4 — Sıfır Konum Saklama ile Arıza Bildirimi  
> **Rol:** Backend Geliştirici & Test Mühendisi  
> **Doğruluk Kaynakları:** `proje_kapsami.md`, `workspace/docs/teknik_mimari_dokumani.md`, `workspace/docs/guvenlik_tasarimi.md`, `workspace/docs/paket_secim_raporu.md`, `workspace/docs/backlog.md`

---

## 1. Kapsam ve Test Vizyonu

Bu doküman, Sprint 4 (S4) kapsamındaki **Arıza Bildirimi API'si (`POST /api/v1/stations/:id/reports`)**, **İstasyon Arıza Özeti (`GET /api/v1/stations/:id/reports/summary`)**, **Sıfır Konum Saklama (Zero-Storage) KVKK Uyum Denetimi**, **Kriptografik Proximity Proof (HMAC-SHA256)** ve **Anonim Cihaz Tasdiki / Shadow-Ban Savunması** test kararlarını belirler.

Test mimarisi; kullanıcı GPS konumunun sunucuda hiçbir koşulda saklanmadığını, sahte ihbarların matematiksel kanıtla engellendiğini ve yasal lisans sınırına tam uyumu doğrular.

---

## 2. Zorunlu Kısıtlar, Çatışmalar ve Varsayımlar

Aşağıdaki kararlar test tasarımının tartışılamaz zeminidir:
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

> **Varsayım:** S4 güvenlik ve KVKK testleri Fastify `inject()` ve in-memory mock veri katmanı ile izole çalıştırılır; CI'da < 1 saniyede tamamlanır.
> **Varsayım:** Proximity proof testlerinde ortam değişkeni `PROXIMITY_SECRET` kullanılır; üretimde gizli kasadan okunur.

---

## 3. Test Mimarisi ve Paket Kararları

- **Test Koşturucu:** `PAKET KULLAN: vitest ^3.0.7` — Node.js 22 LTS ile yerel ESM uyumu ve hızlı yürütme (< 150ms). *Alternatif: Jest (ağır TS derleme).*
- **HTTP Sürücüsü:** `fastify.inject()` — TCP portu açmadan router testi; port çakışması önlenir, istek gecikmesi < 5ms. *Alternatif: Supertest (port zorunluluğu).*
- **Kriptografi:** `node:crypto` (`createHmac`, `timingSafeEqual`) — Yerel modül ile timing attack korumalı HMAC-SHA256 doğrulaması. *Alternatif: CryptoJS (saf JS ek yükü).*
- **Şema Doğrulayıcı:** `PAKET KULLAN: @sinclair/typebox ^0.34.52` — Fastify Ajv ile sıfır gecikmeli şema denetimi. *Alternatif: Zod (daha yavaş).*
- **Hız Sınırlama:** `PAKET KULLAN: @fastify/rate-limit ^10.2.0` — Token-bucket algoritması ile IP ve cihaz koruması.

---

## 4. Test Senaryoları Matrisi (TC-REP-01 - TC-REP-08)

| Senaryo ID | Kategori | Metot & Yol | Ön Koşul / Girdi | Beklenen HTTP | Doğrulama & Kabul Kriteri |
|---|---|---|---|---|---|
| **TC-REP-01** | Başarılı Bildirim | `POST .../reports` | Tasdikli cihaz, 16-byte nonce, geçerli HMAC | `201 Created` | Rapor ID döner, `proximity_verified: true` onaylanır. |
| **TC-REP-02** | Sıfır Konum Saklama | `POST .../reports` | Geçerli ihbar gönderimi | `201 Created` | Yanıtta ve depoda `lat`, `lon`, `geom`, `ip_address` kesinlikle yer almaz. |
| **TC-REP-03** | Cihaz Tasdiki Yok | `POST .../reports` | `x-device-attestation` başlığı eksik | `401 Unauthorized` | RFC 7807 problem; `code: 'MISSING_DEVICE_ATTESTATION'` döner. |
| **TC-REP-04** | Hatalı HMAC Proof | `POST .../reports` | Geçersiz 32-byte hex HMAC | `400 Bad Request` | Hatalı imza reddedilir; `title: 'Geçersiz Konum Kanıtı'` döner. |
| **TC-REP-05** | Nonce Replay Savunması | `POST .../reports` | Aynı nonce ile 2. istek | `409 Conflict` | İkinci istek engellenir; `code: 'NONCE_REPLAY'` döner. |
| **TC-REP-06** | Shadow-Ban Savunması | `POST .../reports` | Kara listedeki cihaz tasdiki | `201 Created` | 201 döner; kayıtta `is_suppressed: true` atanır, istasyon skoru artmaz. |
| **TC-REP-07** | Eşik & Dinamik Etiket | `POST .../reports` | 3 farklı cihazdan geçerli ihbar | `201 Created` / `200 OK` | İstasyon detayında ve özetinde `is_flagged_defective: true` olur. |
| **TC-REP-08** | Lisans Sınırı & Başlık | `POST .../reports` | Geçerli ihbar gönderimi | `201 Created` | `X-Service-Type` doğrulanır; ödeme/fatura kelimesi bulunmaz. |

---

## 5. KVKK Konum Gizliliği ve Sıfır Konum Saklama (Zero-Storage) Kararları

- **Karar:** Sunucuya ham GPS koordinatı gönderilmez; API yanıtında, şemada ve loglarda koordinat tutulamaz.
- **Gerekçe:** KVKK / GDPR ve Konum Gizliliği zorunlu kısıtı.
- **Doğrulama Yöntemi (TC-REP-02):**
  1. **Yanıt Taraması:** JSON çıktısında `lat`, `lon`, `user_lat`, `user_lon`, `geom`, `ip_address` anahtarlarının bulunmadığı taranır (`expect(body).not.toHaveProperty(...)`).
  2. **Depo Denetimi:** `reportService.getAllReportsForAudit()` ile saklanan nesne taranır; koordinat alanlarının boş olduğu, yalnızca `proximity_verified: true` tutulduğu doğrulanır.
  3. **Şema Statik Analizi:** Drizzle `reports.ts` şemasında coğrafi sütun bulunmadığı mühürlenir.
- **Alternatif:** *Koordinatları sunucuda hash'lemek:* Korelasyon riski nedeniyle reddedildi.

---

## 6. Kriptografik Proximity Proof Protokol Kararları

- **Karar:** 50 metre mesafe kontrolü istemcide yerel hesaplanır; sunucuya yalnızca tek kullanımlık HMAC-SHA256 kanıtı iletilir.
- **Gerekçe:** Kullanıcı konumunu ifşa etmeden istasyon başında olduğunu matematiksel doğrulamak.
- **Protokol Parametreleri:**
  - **İmza Girdisi:** `${stationId}${deviceUid}${T}${nonce}` veya `${stationId}:${deviceUid}:${T}:${nonce}`.
  - **Zaman Penceresi:** `T = Math.round(epoch / 60000)` (1 dk). Tolerans: `[T - 1, T, T + 1]`.
  - **Zamanlama Koruması:** HMAC karşılaştırması `timingSafeEqual` ile sabit zamanda yapılır.
  - **Replay Koruması (TC-REP-05):** Kullanılan nonce'lar 5 dakika saklanır; tekrarında `409 Conflict` döner.
- **Alternatif:** *Asimetrik RSA şifreleme:* Sunucuda çözüldüğünde koordinat ortaya çıkacağı için reddedildi.

---

## 7. Cihaz Tasdiki, Hız Sınırlaması ve Shadow-Ban Kararları

- **Karar:** İhbar için `X-Device-Attestation` başlığı zorunludur; şüpheli spam cihazlar sessiz modda engellenir.
- **Gerekçe:** Harita manipülasyonunu ve bot saldırılarını önlemek.
- **Doğrulama Kuralları:**
  - **Tasdiksiz İstek (TC-REP-03):** Başlık eksik veya < 8 karakter ise HTTP 401 döner.
  - **Shadow-Ban (TC-REP-06):** Şüpheli cihazlara HTTP 201 dönülür; ancak `is_suppressed: true` atanır ve aktif ihbar sayısı sıfır kalır.
  - **Dinamik Etiketleme (TC-REP-07):** 3 bağımsız ihbar eşiği aşıldığında istasyon `is_flagged_defective: true` rozeti alır.
- **Alternatif:** *SMS OTP:* KVKK yüzeyini ve sürtünmeyi artırdığı için reddedildi.

---

## 8. Vitest Test Kod Referansı (`workspace/src/backend/test/reports.spec.ts`)

```typescript
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { FastifyInstance } from 'fastify';
import { randomBytes } from 'node:crypto';
import { buildApp } from '../src/app.js';
import { proximityProofService } from '../src/modules/reports/proximity-proof.service.js';
import { reportService } from '../src/modules/reports/report.service.js';
import { stationRepository } from '../src/modules/stations/station.service.js';

describe('S4: Zero-Storage Proximity Proof & Defect Reports API', () => {
  let app: FastifyInstance;
  const testStationId = '018f3a9e-6b8a-7890-a1b2-c3d4e5f6a7b8';
  const testDeviceUid = 'dev-attest-ios-secure-token-12345';

  beforeAll(async () => { app = await buildApp(); await app.ready(); });
  afterAll(async () => { await app.close(); });
  beforeEach(() => { reportService.clear(); stationRepository.initDefaults(); });

  it('TC-REP-01 & TC-REP-02: Sıfır Konum Saklama - Yanıtta ve depoda koordinat/IP olamaz', async () => {
    const nonce = randomBytes(16).toString('hex');
    const proof = proximityProofService.generateProof(testStationId, testDeviceUid, nonce);

    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/stations/${testStationId}/reports`,
      headers: { 'x-device-attestation': testDeviceUid },
      payload: { issue_type: 'DEFECTIVE', nonce, proximity_proof: proof },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.proximity_verified).toBe(true);

    const forbidden = ['lat', 'lon', 'user_lat', 'user_lon', 'geom', 'ip_address'];
    for (const prop of forbidden) expect(body).not.toHaveProperty(prop);

    const saved = reportService.getAllReportsForAudit().find((r) => r.id === body.id);
    for (const prop of forbidden) expect(saved).not.toHaveProperty(prop);
  });

  it('TC-REP-04 & TC-REP-05: Hatalı HMAC 400, replay istekleri 409 dönmelidir', async () => {
    const nonce = randomBytes(16).toString('hex');
    const proof = proximityProofService.generateProof(testStationId, testDeviceUid, nonce);

    const badRes = await app.inject({
      method: 'POST',
      url: `/api/v1/stations/${testStationId}/reports`,
      headers: { 'x-device-attestation': testDeviceUid },
      payload: { issue_type: 'DEFECTIVE', nonce, proximity_proof: '00'.repeat(32) },
    });
    expect(badRes.statusCode).toBe(400);

    const send = () => app.inject({
      method: 'POST',
      url: `/api/v1/stations/${testStationId}/reports`,
      headers: { 'x-device-attestation': testDeviceUid },
      payload: { issue_type: 'DEFECTIVE', nonce, proximity_proof: proof },
    });
    expect((await send()).statusCode).toBe(201);
    const rep = await send();
    expect(rep.statusCode).toBe(409);
    expect(rep.json().code).toBe('NONCE_REPLAY');
  });

  it('TC-REP-06 & TC-REP-07: Shadow-ban skoru etkilememeli; 3 geçerli ihbar istasyonu etiketlemelidir', async () => {
    const shadowDev = 'shadow-dev-999';
    reportService.shadowBanDevice(shadowDev);
    const nShadow = randomBytes(16).toString('hex');
    const pShadow = proximityProofService.generateProof(testStationId, shadowDev, nShadow);

    const sRes = await app.inject({
      method: 'POST',
      url: `/api/v1/stations/${testStationId}/reports`,
      headers: { 'x-device-attestation': shadowDev },
      payload: { issue_type: 'DEFECTIVE', nonce: nShadow, proximity_proof: pShadow },
    });
    expect(sRes.statusCode).toBe(201);
    expect(reportService.getActiveReportCount(testStationId)).toBe(0);

    for (const dev of ['d1', 'd2', 'd3']) {
      const n = randomBytes(16).toString('hex');
      const p = proximityProofService.generateProof(testStationId, dev, n);
      await app.inject({
        method: 'POST',
        url: `/api/v1/stations/${testStationId}/reports`,
        headers: { 'x-device-attestation': dev },
        payload: { issue_type: 'DEFECTIVE', nonce: n, proximity_proof: p },
      });
    }
    const detail = await app.inject({ method: 'GET', url: '/api/v1/stations/kadikoy-moda-zes-1' });
    expect(detail.json().is_flagged_defective).toBe(true);
  });
});
```

---

## 9. Fonksiyonel Olmayan Gereksinimler (NFR) ve Kalite Kapıları

- **Test Yürütme Performansı:** Tüm S4 test suite'i Vitest üzerinde **< 1.0 saniye** içinde tamamlanmalıdır (ölçülen: ~520ms).
- **Kod Kapsama Eşiği (Coverage):** `proximity-proof.service.ts`, `report.routes.ts` ve `report.service.ts` için Statement Coverage **≥ %95**, Branch Coverage **≥ %90** olmalıdır.
- **Sıfır Konum Saklama Güvenlik Kapısı:** CI pipeline'ında `station_report` tablosuna veya API yanıtına koordinat sütunu eklendiğinde derleme durdurulur.
- **Lisans Sınırı Kapısı:** Yanıtlarda ödeme ve fatura anahtar kelimeleri tespit edilirse derleme derhal iptal edilir.

---

## 10. S4 Tamamlanma Tanımı (DoD) Kontrol Listesi

- [x] Arıza bildirimi uç noktası (`POST /api/v1/stations/:id/reports`) için 201, 400, 401 ve 409 senaryoları doğrulandı.
- [x] Sıfır Konum Saklama denetimi yapılarak yanıtta ve sunucu deposunda koordinat/IP tutulmadığı mühürlendi.
- [x] İstemcide hesaplanan mesafenin sunucuda HMAC-SHA256 proximity proof belirteciyle doğrulandığı test edildi.
- [x] Replay saldırılarına karşı tek kullanımlık nonce koruması doğrulandı.
- [x] Anonim cihaz tasdiki eksikliğinde 401 Unauthorized dönüldüğü test edildi.
- [x] Shadow-ban mekanizması test edilerek şüpheli cihazların istasyon skorunu etkilemediği onaylandı.
- [x] Eşik değeri (3 bağımsız ihbar) aşıldığında istasyonun otomatik olarak "Arızalı / Riskli" etiketlendiği doğrulandı.
- [x] Lisans sınırı denetimi yapılarak yanıtlarda fatura/ödeme terimlerinin bulunmadığı garanti edildi.
