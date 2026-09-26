
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import { skipLockedQueue } from '../src/modules/queue/skip-locked-queue.js';

// API Contract Testi: /operators uç noktasının yanıt şeması frontend'in
// beklediği OperatorItem tipiyle sabitlenir. Veritabanı olmadan da
// DEFAULT_OPERATORS fallback'i üzerinden doğrulanır.
describe('Operators API Contract Testleri', () => {
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

  it('TC-OPS-01: GET /api/v1/operators düz bir dizi (array) döndürmelidir', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/operators',
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();

    // Frontend useOperators.ts: Array.isArray(res) || res?.data bekler.
    // Kontrat: üst seviye JSON düz dizi olmalı (wrapper nesne DEĞİL).
    expect(body).toBeInstanceOf(Array);
    expect(body.length).toBeGreaterThanOrEqual(1);
  });

  it('TC-OPS-02: Her operatör öğesi zorunlu OperatorItem alanlarını taşımalıdır', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/operators',
    });

    const body = response.json();
    for (const op of body) {
      expect(typeof op.id).toBe('number');
      expect(typeof op.slug).toBe('string');
      expect(op.slug.length).toBeGreaterThan(0);
      expect(typeof op.name).toBe('string');
      expect(op.name.length).toBeGreaterThan(0);
      expect(typeof op.is_active).toBe('boolean');
      // deep_link_config: null veya scheme alanlı nesne
      if (op.deep_link_config !== null && op.deep_link_config !== undefined) {
        expect(typeof op.deep_link_config).toBe('object');
      }
    }
  });

  it('TC-OPS-03: Operatör slug değerleri benzersiz ve URL-güvenli olmalıdır', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/operators',
    });

    const body = response.json();
    const slugs = body.map((o: any) => o.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const slug of slugs) {
      expect(slug).toMatch(/^[a-z0-9-]+$/);
    }
  });
});
