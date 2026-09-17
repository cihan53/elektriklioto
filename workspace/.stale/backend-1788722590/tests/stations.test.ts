
import { describe, it, expect, beforeAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';

describe('İstasyon Detay ve Nullable Veri Modeli Entegrasyon Testleri', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
  });

  it('GET /api/v1/stations/:slug mevcut istasyon için HTTP 200 ve Nullable model dönmelidir', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/stations/test-istasyon',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);

    // Temel İstasyon Verileri
    expect(body.istasyon_no).toBe('ŞRJ/1042');
    expect(body.name).toBe('ZES - Tepe Nautilus AVM');
    expect(body.coordinates.lat).toBeCloseTo(40.9991234, 4);
    expect(body.coordinates.lon).toBeCloseTo(29.0345678, 4);
    expect(body.operator.slug).toBe('zes');

    // ZORUNLU KISIT: Eksik veri alanları kesinlikle NULL olmalıdır (uydurma değer yasak)
    expect(body.connectors).toBeNull();
    expect(body.power_kw).toBeNull();
    expect(body.current_tariff).toBeNull();
    expect(body.live_status).toBeNull();

    // Veri Yok Rozeti
    expect(body.data_badge.code).toBe('OPERATOR_DATA_PENDING');
    expect(body.data_badge.label).toBe('Operatör Verisi Bekleniyor');

    // Deep-Link Bilgisi
    expect(body.deep_link.operator_slug).toBe('zes');
    expect(body.deep_link.app_scheme_url).toContain('zes://');
  });

  it('GET /api/v1/stations/:slug bulunamayan istasyon için HTTP 404 RFC 7807 dönmelidir', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/stations/olmayan-istasyon-999999',
    });

    expect(response.statusCode).toBe(404);
    const body = JSON.parse(response.body);

    expect(body.type).toBe('https://api.elektriklioto.com/errors/not-found');
    expect(body.title).toBe('İstasyon Bulunamadı');
    expect(body.status).toBe(404);
  });

  it('GET /api/v1/stations/:slug/deep-link doğrudan yönlendirme talimatı dönmelidir', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/stations/test-istasyon/deep-link',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);

    expect(body.station_code).toBe('ŞRJ/1042');
    expect(body.operator_slug).toBe('zes');
    expect(body.app_scheme_url).toContain('zes://');
    expect(body.clipboard_fallback).toBe(false);
    expect(body.instructions).toContain('ZES');
  });

  it('GET /api/v1/stations BBox ve zoom < 10 için kümelenmiş veri dönmelidir', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/stations?bbox=24.21852,34.04813,46.26808,43.56051&zoom=6',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.type).toBe('clusters');
    expect(body.zoom).toBe(6);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeGreaterThan(0);
    expect(body.data[0]).toHaveProperty('cluster_id');
    expect(body.data[0]).toHaveProperty('count');
  });

  it('GET /api/v1/stations BBox ve zoom >= 10 için tekil istasyon listesi dönmelidir', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/stations?bbox=28.8,40.9,29.2,41.2&zoom=12',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.type).toBe('stations');
    expect(body.zoom).toBe(12);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeGreaterThan(0);
    expect(body.data[0]).toHaveProperty('istasyon_no');
    expect(body.data[0]).toHaveProperty('name');
  });
});
