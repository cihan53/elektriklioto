
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import { routeBridgeService } from '../src/modules/route-bridge/route-bridge.service.js';

describe('Route Bridge Tests', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('Geçerli durak listesini Base64URL payload ve kısa bağlantıya çevirmeli', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/route-bridge/encode',
      payload: {
        stops: ['018f3a9e-6b8a-7890-a1b2-c3d4e5f6a7b8', '018f3a9e-6b8a-7890-a1b2-c3d4e5f6a7c1'],
        expires_in_hours: 24,
      },
    });

    expect(response.statusCode).toBe(201);
    const body = response.json();
    expect(body.code).toBeDefined();
    expect(body.url).toContain('https://elektriklioto.com/r/');
    expect(body.expires_at).toBeDefined();
  });

  it('Üretilen payloadı /r/:payload ile başarıyla çözmeli', async () => {
    const stops = ['018f3a9e-6b8a-7890-a1b2-c3d4e5f6a7b8', '018f3a9e-6b8a-7890-a1b2-c3d4e5f6a7c1'];
    const encoded = routeBridgeService.encodeRoute(stops, 12);

    const response = await app.inject({
      method: 'GET',
      url: `/r/${encoded.code}`,
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.version).toBe(1);
    expect(body.stops).toEqual(stops);
    expect(body.is_valid).toBe(true);
  });

  it('Tahrif edilmiş rota imzasında 400 dönmeli', async () => {
    const stops = ['018f3a9e-6b8a-7890-a1b2-c3d4e5f6a7b8'];
    const encoded = routeBridgeService.encodeRoute(stops, 12);

    // Payloadın ortasından bir karakteri boz
    const corrupted = encoded.code.slice(0, 10) + 'X' + encoded.code.slice(11);

    const response = await app.inject({
      method: 'GET',
      url: `/r/${corrupted}`,
    });

    expect(response.statusCode).toBe(400);
    const body = response.json();
    expect(body.status).toBe(400);
  });
});
