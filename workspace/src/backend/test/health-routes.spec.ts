
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import { skipLockedQueue } from '../src/modules/queue/skip-locked-queue.js';

describe('S5: Health & Queue API Endpoints Testleri', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    skipLockedQueue.clear();
    skipLockedQueue.setUseInMemory(true);
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('TC-HEALTH-01: GET /api/v1/health/sources kaynak durumlarını ve tazelik rozetlerini dönmelidir', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/health/sources',
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();

    expect(body.status).toBe('UP');
    expect(body.total_sources).toBeGreaterThanOrEqual(1);
    expect(body.sources).toBeInstanceOf(Array);
    expect(body.sources[0]).toHaveProperty('source_name');
    expect(body.sources[0]).toHaveProperty('circuit_state');
    expect(body.sources[0]).toHaveProperty('is_healthy');
  });

  it('TC-HEALTH-02: GET /api/v1/health/queue iş kuyruğu metriklerini dönmelidir', async () => {
    await skipLockedQueue.enqueue('metric_test_job', {});

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/health/queue',
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();

    expect(body).toHaveProperty('pending');
    expect(body).toHaveProperty('processing');
    expect(body).toHaveProperty('completed');
    expect(body).toHaveProperty('failed');
    expect(body).toHaveProperty('total');
    expect(body.total).toBeGreaterThanOrEqual(1);
  });

  it('TC-HEALTH-03: İstasyon detayında data_freshness alanı yer almalıdır', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/stations/kadikoy-moda-zes-1',
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();

    expect(body).toHaveProperty('data_freshness');
    expect(body.data_freshness).toHaveProperty('is_stale');
    expect(body.data_freshness).toHaveProperty('last_updated_text');
    expect(typeof body.data_freshness.is_stale).toBe('boolean');
    expect(typeof body.data_freshness.last_updated_text).toBe('string');
  });

  it('TC-HEALTH-04: Health uç noktalarında fatura veya lisanslı operatör terimi bulunmamalıdır (Lisans Sınırı)', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/health/sources',
    });

    const raw = response.payload.toLowerCase();
    const forbidden = ['payment', 'billing', 'invoice', 'credit_card', 'odeme_al', 'fatura'];
    for (const term of forbidden) {
      expect(raw).not.toContain(term);
    }
  });
});
