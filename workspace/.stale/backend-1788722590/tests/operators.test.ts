
import { describe, it, expect, beforeAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';

describe('Operatör Sözlüğü ve Deep-Link API Entegrasyon Testleri', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
  });

  it('GET /api/v1/operators operatör listesini başarıyla dönmelidir', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/operators',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);

    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThan(0);

    const zes = body.find((op: { slug: string }) => op.slug === 'zes');
    expect(zes).toBeDefined();
    expect(zes.name).toContain('ZES');
    expect(zes.supports_deep_link).toBe(true);
  });

  it('GET /api/v1/operators/:slug operatör detayını ve URL şablonunu dönmelidir', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/operators/trugo',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);

    expect(body.slug).toBe('trugo');
    expect(body.deep_link_config.androidSchemeTemplate).toContain('trugo://');
    expect(body.deep_link_config.clipboardFallback).toBe(false);
  });

  it('GET /api/v1/operators/:slug bilinmeyen operatör için HTTP 404 RFC 7807 dönmelidir', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/operators/bilinmeyen-operatör-12345',
    });

    expect(response.statusCode).toBe(404);
    const body = JSON.parse(response.body);

    expect(body.type).toBe('https://api.elektriklioto.com/errors/not-found');
    expect(body.status).toBe(404);
  });
});
