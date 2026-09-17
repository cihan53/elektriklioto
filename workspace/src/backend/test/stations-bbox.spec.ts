
import { describe, it, expect } from 'vitest';
import { buildApp } from '../src/app.js';

describe('BBox and Viewport API Tests', () => {
  it('TC-BBOX-01: User exact query with Origin 127.0.0.1:3000 and zoom 6 should return 200 with clusters', async () => {
    const app = await buildApp();
    app.addHook('onError', async (request, reply, err) => {
      console.error('ORIGINAL ERROR:', err);
    });
    await app.ready();
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/stations?bbox=19.06637,34.54555,46.65303,44.92832&zoom=6',
      headers: {
        'Origin': 'http://127.0.0.1:3000',
        'Referer': 'http://127.0.0.1:3000/'
      }
    });

    if (res.statusCode !== 200) {
      console.error('TC-BBOX-01 ERROR PAYLOAD:', res.payload);
    }
    expect(res.statusCode).toBe(200);
    const body = res.json();
    console.log('TC-BBOX-01 SUCCESS BODY TYPE:', body.type);
    expect(body.type).toBe('clusters');
    expect(body.zoom).toBe(6);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.count).toBeGreaterThan(0);
    expect(res.headers['access-control-allow-origin']).toBe('http://127.0.0.1:3000');
    expect(res.headers['cross-origin-resource-policy']).toBe('cross-origin');
    await app.close();
  });

  it('TC-BBOX-02: Zoom >= 10 should return 200 with stations when within 0.5 degrees', async () => {
    const app = await buildApp();
    await app.ready();
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/stations?bbox=28.9,40.9,29.2,41.1&zoom=12',
      headers: {
        'Origin': 'http://localhost:3000',
      }
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.type).toBe('stations');
    expect(body.zoom).toBe(12);
    expect(Array.isArray(body.data)).toBe(true);
    await app.close();
  });

  it('TC-BBOX-03: Zoom >= 10 with extreme bbox should trigger Spatial DoS 400', async () => {
    const app = await buildApp();
    await app.ready();
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/stations?bbox=25.0,38.0,30.0,42.0&zoom=12',
    });

    expect(res.statusCode).toBe(400);
    const body = res.json();
    expect(body.code).toBe('BAD_REQUEST');
    expect(body.detail).toContain('izin verilen maksimum alan');
    await app.close();
  });

  it('TC-BBOX-04: Zoom 11 Istanbul metro viewport (1.06 degree span) should return 200 with stations', async () => {
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
    expect(body.count).toBeGreaterThan(500);
    expect(body.data[0]).toHaveProperty('operator');
    expect(body.data[0].operator).toHaveProperty('name');
    await app.close();
  });
});
