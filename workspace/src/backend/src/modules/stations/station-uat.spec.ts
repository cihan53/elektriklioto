
import { describe, it, expect } from 'vitest';
import { buildApp } from '../../app.js';

describe('TALEP-070: Canlı UAT Kabul Denetimi ve İstasyon API Doğrulaması', () => {
  it('TC-TALEP070-01: UAT-02 — Web istemcisi için CORS ve CORP başlık uyumu (/api/v1/stations parametresiz)', async () => {
    const app = await buildApp();
    await app.ready();

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/stations',
      headers: {
        Origin: 'http://127.0.0.1:3000',
        Referer: 'http://127.0.0.1:3000/',
      },
    });

    expect(res.statusCode).toBe(200);
    expect(res.headers['access-control-allow-origin']).toBe('http://127.0.0.1:3000');
    expect(res.headers['cross-origin-resource-policy']).toBe('cross-origin');
    const body = res.json();
    expect(Array.isArray(body)).toBe(true);

    await app.close();
  });

  it('TC-TALEP070-02: UAT-03 — Zoom 6 Türkiye genelinde 81 ilin kümeleme verisi (Clusters)', async () => {
    const app = await buildApp();
    await app.ready();

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/stations?bbox=19.06637,34.54555,46.65303,44.92832&zoom=6',
      headers: {
        Origin: 'http://127.0.0.1:3000',
      },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.type).toBe('clusters');
    expect(body.zoom).toBe(6);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.count).toBeGreaterThanOrEqual(0);

    await app.close();
  });

  it('TC-TALEP070-03: UAT-04 — Zoom 11 İstanbul geniş ekran BBox sorgusu (1.06° boylam)', async () => {
    const app = await buildApp();
    await app.ready();

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/stations?bbox=28.42962,40.84865,29.48826,41.22010&zoom=11',
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.type).toBe('stations');
    expect(body.zoom).toBe(11);
    expect(Array.isArray(body.data)).toBe(true);

    await app.close();
  });

  it('TC-TALEP070-04: UAT-05 — API canlılık uç noktası (/api/v1/health/live)', async () => {
    const app = await buildApp();
    await app.ready();

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/health/live',
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.status).toBe('UP');

    await app.close();
  });
});
