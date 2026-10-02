
import { describe, it, expect, beforeEach } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import { healthRoutes } from './health.routes.js';

describe('TALEP-067 / UAT-05: Health ve Canlılık Uç Noktaları Doğrulaması', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = Fastify();
    await app.register(healthRoutes, { prefix: '/api/v1/health' });
    await app.ready();
  });

  it('TC-HEALTH-01: GET /api/v1/health/live HTTP 200 dönmeli ve UP durumu bildirmelidir', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/health/live',
    });

    expect(res.statusCode).toBe(200);
    const json = JSON.parse(res.payload);
    expect(json.status).toBe('UP');
    expect(json.timestamp).toBeDefined();
  });

  it('TC-HEALTH-02: GET /api/v1/health/version HTTP 200 dönmeli ve sürüm detayı içermelidir', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/health/version',
    });

    expect(res.statusCode).toBe(200);
    const json = JSON.parse(res.payload);
    expect(json.status).toBe('UP');
    expect(json.service).toBe('elektriklioto-api');
    expect(json.version).toBe('1.0.0-faz1');
  });

  it('TC-HEALTH-03: GET /api/v1/health/sources HTTP 200 dönmeli ve kaynak listesi vermelidir', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/health/sources',
    });

    expect(res.statusCode).toBe(200);
    const json = JSON.parse(res.payload);
    expect(json.status).toBe('UP');
    expect(Array.isArray(json.sources)).toBe(true);
  });
});
