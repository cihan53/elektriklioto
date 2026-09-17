
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { FastifyInstance } from 'fastify';
import { randomBytes } from 'node:crypto';
import { buildApp } from '../src/app.js';
import { proximityProofService } from '../src/modules/reports/proximity-proof.service.js';
import { reportService } from '../src/modules/reports/report.service.js';
import { stationRepository } from '../src/modules/stations/station.service.js';

describe('S4: Zero-Storage Proximity Proof & Defect Reports API', () => {
  let app: FastifyInstance;
  const testStationId = '018f3a9e-6b8a-7890-a1b2-c3d4e5f6a7b8'; // kadikoy-moda-zes-1
  const testDeviceUid = 'dev-attest-ios-secure-token-12345';

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    reportService.clear();
    stationRepository.initDefaults();
  });

  it('TC-REP-01: Geçerli cihaz tasdiki ve proximity proof ile arıza bildirimi 201 dönmelidir', async () => {
    const nonce = randomBytes(16).toString('hex');
    const proof = proximityProofService.generateProof(testStationId, testDeviceUid, nonce);

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/stations/${testStationId}/reports`,
      headers: {
        'x-device-attestation': testDeviceUid,
      },
      payload: {
        issue_type: 'DEFECTIVE',
        nonce,
        proximity_proof: proof,
        description: 'Ekran kararmış, soket kapağı açılmıyor.',
      },
    });

    expect(response.statusCode).toBe(201);
    const body = response.json();
    expect(body.id).toBeDefined();
    expect(body.station_id).toBe(testStationId);
    expect(body.issue_type).toBe('DEFECTIVE');
    expect(body.proximity_verified).toBe(true);
    expect(body.created_at).toBeDefined();
  });

  it('TC-REP-02: Sıfır Konum Saklama (Zero-Storage) denetimi - Yanıtta veya raporda koordinat/IP bulunmamalıdır', async () => {
    const nonce = randomBytes(16).toString('hex');
    const proof = proximityProofService.generateProof(testStationId, testDeviceUid, nonce);

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/stations/${testStationId}/reports`,
      headers: {
        'x-device-attestation': testDeviceUid,
      },
      payload: {
        issue_type: 'CABLE_LOCKED',
        nonce,
        proximity_proof: proof,
      },
    });

    expect(response.statusCode).toBe(201);
    const body = response.json();

    // Yanıt gövdesinde kullanıcı konumu olamaz
    expect(body).not.toHaveProperty('lat');
    expect(body).not.toHaveProperty('lon');
    expect(body).not.toHaveProperty('user_lat');
    expect(body).not.toHaveProperty('user_lon');
    expect(body).not.toHaveProperty('geom');
    expect(body).not.toHaveProperty('ip_address');

    // Dahili raporda kullanıcı konumu tutulamaz (KVKK kuralı)
    const storedReports = reportService.getAllReportsForAudit();
    const saved = storedReports.find((r) => r.id === body.id);
    expect(saved).toBeDefined();
    expect(saved).not.toHaveProperty('user_lat');
    expect(saved).not.toHaveProperty('user_lon');
    expect(saved).not.toHaveProperty('geom');
    expect(saved).not.toHaveProperty('ip_address');
    expect(saved?.proximity_verified).toBe(true);
  });

  it('TC-REP-03: Cihaz tasdiki (X-Device-Attestation) eksik olduğunda 401 Unauthorized dönmelidir', async () => {
    const nonce = randomBytes(16).toString('hex');
    const proof = proximityProofService.generateProof(testStationId, testDeviceUid, nonce);

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/stations/${testStationId}/reports`,
      payload: {
        issue_type: 'DEFECTIVE',
        nonce,
        proximity_proof: proof,
      },
    });

    expect(response.statusCode).toBe(401);
    const body = response.json();
    expect(body.title).toBe('Cihaz Tasdiki Gerekli');
    expect(body.status).toBe(401);
    expect(body.code).toBe('MISSING_DEVICE_ATTESTATION');
  });

  it('TC-REP-04: Geçersiz Proximity Proof (hatalı HMAC) gönderildiğinde 400 Bad Request dönmelidir', async () => {
    const nonce = randomBytes(16).toString('hex');
    const fakeProof = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/stations/${testStationId}/reports`,
      headers: {
        'x-device-attestation': testDeviceUid,
      },
      payload: {
        issue_type: 'DEFECTIVE',
        nonce,
        proximity_proof: fakeProof,
      },
    });

    expect(response.statusCode).toBe(400);
    const body = response.json();
    expect(body.title).toBe('Geçersiz Konum Kanıtı');
    expect(body.status).toBe(400);
  });

  it('TC-REP-05: Nonce Yeniden Oynatma (Replay Attack) Engelleme - Aynı nonce ikinci kez kullanılamaz', async () => {
    const nonce = randomBytes(16).toString('hex');
    const proof = proximityProofService.generateProof(testStationId, testDeviceUid, nonce);

    // 1. İstek: Başarılı
    const res1 = await app.inject({
      method: 'POST',
      url: `/api/v1/stations/${testStationId}/reports`,
      headers: {
        'x-device-attestation': testDeviceUid,
      },
      payload: {
        issue_type: 'DEFECTIVE',
        nonce,
        proximity_proof: proof,
      },
    });
    expect(res1.statusCode).toBe(201);

    // 2. İstek: Aynı nonce ile replay saldırısı
    const res2 = await app.inject({
      method: 'POST',
      url: `/api/v1/stations/${testStationId}/reports`,
      headers: {
        'x-device-attestation': testDeviceUid,
      },
      payload: {
        issue_type: 'DEFECTIVE',
        nonce,
        proximity_proof: proof,
      },
    });
    expect(res2.statusCode).toBe(409);
    const body2 = res2.json();
    expect(body2.title).toBe('Belirteç Zaten Kullanılmış');
    expect(body2.code).toBe('NONCE_REPLAY');
  });

  it('TC-REP-06: Shadow-ban altındaki cihazdan gelen ihbar 201 döner ancak istasyon puanını etkilemez', async () => {
    const shadowDevice = 'shadow-banned-spammer-device-999';
    reportService.shadowBanDevice(shadowDevice);

    const nonce = randomBytes(16).toString('hex');
    const proof = proximityProofService.generateProof(testStationId, shadowDevice, nonce);

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/stations/${testStationId}/reports`,
      headers: {
        'x-device-attestation': shadowDevice,
      },
      payload: {
        issue_type: 'DEFECTIVE',
        nonce,
        proximity_proof: proof,
      },
    });

    // Saldırgana engellendiği hissettirilmez (HTTP 201)
    expect(response.statusCode).toBe(201);

    // Ancak rapor dahili olarak is_suppressed: true olmalıdır
    const reports = reportService.getAllReportsForAudit();
    const stored = reports.find((r) => r.device_uid === shadowDevice);
    expect(stored?.is_suppressed).toBe(true);

    // Aktif ihbar sayısı 0 kalmalıdır
    expect(reportService.getActiveReportCount(testStationId)).toBe(0);
  });

  it('TC-REP-07: Eşik Değeri ve Dinamik Etiketleme - 3 bağımsız ihbarda istasyon haritada arızalı etiketlenmelidir', async () => {
    // 3 farklı tasdikli cihazdan geçerli ihbar gönder
    const devices = ['device-alpha-111', 'device-beta-222', 'device-gamma-333'];

    for (let i = 0; i < devices.length; i++) {
      const dev = devices[i];
      const nonce = randomBytes(16).toString('hex');
      const proof = proximityProofService.generateProof(testStationId, dev, nonce);

      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/stations/${testStationId}/reports`,
        headers: {
          'x-device-attestation': dev,
        },
        payload: {
          issue_type: 'DEFECTIVE',
          nonce,
          proximity_proof: proof,
        },
      });
      expect(res.statusCode).toBe(201);
    }

    // İstasyon detayında is_flagged_defective: true doğrulaması
    const detailRes = await app.inject({
      method: 'GET',
      url: '/api/v1/stations/kadikoy-moda-zes-1',
    });
    expect(detailRes.statusCode).toBe(200);
    const detail = detailRes.json();
    expect(detail.is_flagged_defective).toBe(true);

    // Özet uç noktasında doğrulama
    const summaryRes = await app.inject({
      method: 'GET',
      url: `/api/v1/stations/${testStationId}/reports/summary`,
    });
    expect(summaryRes.statusCode).toBe(200);
    const summary = summaryRes.json();
    expect(summary.is_flagged_defective).toBe(true);
    expect(summary.active_report_count).toBe(3);
  });

  it('TC-REP-08: Lisans Sınırı ve Güvenlik Başlıkları Denetimi', async () => {
    const nonce = randomBytes(16).toString('hex');
    const proof = proximityProofService.generateProof(testStationId, testDeviceUid, nonce);

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/stations/${testStationId}/reports`,
      headers: {
        'x-device-attestation': testDeviceUid,
      },
      payload: {
        issue_type: 'OTHER',
        nonce,
        proximity_proof: proof,
      },
    });

    expect(response.headers['x-service-type']).toBe('e-Mobility Assistant / EMP Candidate');
    expect(response.headers['strict-transport-security']).toBeDefined();

    const raw = response.payload.toLowerCase();
    const forbidden = ['payment', 'billing', 'invoice', 'credit_card', 'fatura'];
    for (const term of forbidden) {
      expect(raw).not.toContain(term);
    }
  });
});
