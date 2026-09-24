import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import { stationRepository, stationService, ensureDatabaseSeeded } from '../src/modules/stations/station.service.js';
import * as dbModule from '../src/db/index.js';

describe('TALEP-022: Veritabanı Tek Gerçek Kaynak (Single Source of Truth) Doğrulaması', () => {
  let app: FastifyInstance;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('TC-TALEP022-01: Veritabanı boşken findByBBox mock/fallback istasyon dönmemeli, boş dizi [] dönmelidir', async () => {
    // Mock getDb to simulate empty database query
    const mockExecute = vi.fn().mockResolvedValue([]);
    vi.spyOn(dbModule, 'getDb').mockReturnValue({
      execute: mockExecute,
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      }),
    } as any);

    const prevNodeEnv = process.env.NODE_ENV;
    try {
      // Test as if in development/production (non-test)
      process.env.NODE_ENV = 'production';

      const results = await stationRepository.findByBBox(28.0, 40.0, 30.0, 42.0);
      expect(mockExecute).toHaveBeenCalled();
      expect(results).toEqual([]);
      expect(results.length).toBe(0);
    } finally {
      process.env.NODE_ENV = prevNodeEnv;
    }
  });

  it('TC-TALEP022-02: Veritabanı boşken getClusters GADM veya in-memory küme dönmemeli, boş dizi [] dönmelidir', async () => {
    const mockExecute = vi.fn().mockResolvedValue([]);
    vi.spyOn(dbModule, 'getDb').mockReturnValue({
      execute: mockExecute,
    } as any);

    const prevNodeEnv = process.env.NODE_ENV;
    try {
      process.env.NODE_ENV = 'production';

      const clusters = await stationRepository.getClusters(28.0, 40.0, 30.0, 42.0);
      expect(mockExecute).toHaveBeenCalled();
      expect(clusters).toEqual([]);
      expect(clusters.length).toBe(0);
    } finally {
      process.env.NODE_ENV = prevNodeEnv;
    }
  });

  it('TC-TALEP022-03: Veritabanı boşken /stations viewport API boş liste dönmelidir', async () => {
    const mockExecute = vi.fn().mockResolvedValue([]);
    vi.spyOn(dbModule, 'getDb').mockReturnValue({
      execute: mockExecute,
    } as any);

    const prevNodeEnv = process.env.NODE_ENV;
    try {
      process.env.NODE_ENV = 'production';

      const res = await stationService.getStationsInViewport('28.5,40.8,29.5,41.2', 11);
      expect(res.type).toBe('stations');
      expect(res.count).toBe(0);
      expect(res.data).toEqual([]);

      const clusterRes = await stationService.getStationsInViewport('28.0,40.0,30.0,42.0', 6);
      expect(clusterRes.type).toBe('clusters');
      expect(clusterRes.count).toBe(0);
      expect(clusterRes.data).toEqual([]);
    } finally {
      process.env.NODE_ENV = prevNodeEnv;
    }
  });

  it('TC-TALEP022-04: ensureDatabaseSeeded() AUTO_SEED=true olmadan veritabanını otomatik doldurmamalıdır', async () => {
    const mockExecute = vi.fn();
    vi.spyOn(dbModule, 'getDb').mockReturnValue({
      execute: mockExecute,
    } as any);

    delete process.env.AUTO_SEED;
    await ensureDatabaseSeeded();
    // mockExecute never called because AUTO_SEED is not 'true'
    expect(mockExecute).not.toHaveBeenCalled();
  });

  it('TC-TALEP022-05: Veritabanında istasyon yoksa findBySlug ve findById null dönmelidir', async () => {
    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    });
    vi.spyOn(dbModule, 'getDb').mockReturnValue({
      select: mockSelect,
    } as any);

    const prevNodeEnv = process.env.NODE_ENV;
    try {
      process.env.NODE_ENV = 'production';

      const stationBySlug = await stationRepository.findBySlug('kadikoy-moda-zes-1');
      expect(stationBySlug).toBeNull();

      const stationById = await stationRepository.findById('018f3a9e-6b8a-7890-a1b2-c3d4e5f6a7b8');
      expect(stationById).toBeNull();
    } finally {
      process.env.NODE_ENV = prevNodeEnv;
    }
  });
});
