
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';

describe('S2: Station Detail & Nullable Model Tests', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('TC-DET-01 & TC-NULL-01: Detaylar dönmeli ve eksik alanlar kesinlikle NULL olmalıdır', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/stations/kadikoy-moda-zes-1',
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();

    expect(body.id).toBe('018f3a9e-6b8a-7890-a1b2-c3d4e5f6a7b8');
    expect(body.istasyon_no).toBe('ŞRJ/10423');
    expect(body.operator.name).toBe('ZES');

    // Nullable Model Kısıt Denetimi (Zorunlu kısıt)
    expect(body.connector_types).toBeNull();
    expect(body.power_kw).toBeNull();
    expect(body.current_tariff).toBeNull();
    expect(body.occupancy_status).toBeNull();

    // Deep-Link Doğrulaması
    expect(body.deep_link.deep_link_url).toBe('zes://station/10423');
    expect(body.deep_link.clipboard_fallback).toBe(false);
  });

  it('TC-DL-04: Deep-link şeması olmayan operatörde clipboard_fallback=true dönmelidir', async () => {
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
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/stations/kadikoy-moda-zes-1',
    });

    const raw = response.payload.toLowerCase();
    const forbidden = ['payment', 'billing', 'invoice', 'credit_card', 'odeme_al', 'fatura'];
    for (const term of forbidden) {
      expect(raw).not.toContain(term);
    }
  });

  it('TC-DET-07: Yanıtta X-Service-Type başlığı doğrulanmalıdır', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/stations/kadikoy-moda-zes-1',
    });

    expect(response.headers['x-service-type']).toBe('e-Mobility Assistant / EMP Candidate');
  });
});
