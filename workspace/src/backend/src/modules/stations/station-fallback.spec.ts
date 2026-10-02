
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { stationRepository, stationService } from './station.service';
import * as dbModule from '../../db/index';

describe('TALEP-064: Veritabanı boşken /stations fallback davranışı doğrulaması', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    stationRepository.enableMockFallback = false;
    delete process.env.ENABLE_MOCK_FALLBACK;
  });

  it('TC-TALEP064-01: Veritabanı boşken findByRegion mock veri dönmemeli, boş dizi [] dönmelidir', async () => {
    const mockExecute = vi.fn().mockResolvedValue([]);
    vi.spyOn(dbModule, 'getDb').mockReturnValue({
      execute: mockExecute,
    } as any);

    const results = await stationRepository.findByRegion();
    expect(mockExecute).toHaveBeenCalled();
    expect(results).toEqual([]);
    expect(results.length).toBe(0);
  });

  it('TC-TALEP064-02: Veritabanı boşken getStationsInViewport parametresiz çağrıda boş liste dönmelidir', async () => {
    const mockExecute = vi.fn().mockResolvedValue([]);
    vi.spyOn(dbModule, 'getDb').mockReturnValue({
      execute: mockExecute,
    } as any);

    const res = await stationService.getStationsInViewport();
    expect(Array.isArray(res)).toBe(true);
    expect((res as any[]).length).toBe(0);
  });

  it('TC-TALEP064-03: Veritabanı boşken findByBBox mock veri dönmemeli, boş dizi [] dönmelidir', async () => {
    const mockExecute = vi.fn().mockResolvedValue([]);
    vi.spyOn(dbModule, 'getDb').mockReturnValue({
      execute: mockExecute,
    } as any);

    const results = await stationRepository.findByBBox(28.0, 40.0, 30.0, 42.0);
    expect(mockExecute).toHaveBeenCalled();
    expect(results).toEqual([]);
  });

  it('TC-TALEP064-04: Veritabanı boşken getClusters mock veri dönmemeli, boş dizi [] dönmelidir', async () => {
    const mockExecute = vi.fn().mockResolvedValue([]);
    vi.spyOn(dbModule, 'getDb').mockReturnValue({
      execute: mockExecute,
    } as any);

    const clusters = await stationRepository.getClusters(28.0, 40.0, 30.0, 42.0);
    expect(mockExecute).toHaveBeenCalled();
    expect(clusters).toEqual([]);
  });

  it('TC-TALEP064-05: ENABLE_MOCK_FALLBACK=true açıkça yapılandırıldığında fallback devreye girmelidir', async () => {
    // Veritabanı sorgusu boş dönüyor
    const mockExecute = vi.fn().mockRejectedValue(new Error('DB Baglanti Hatasi'));
    vi.spyOn(dbModule, 'getDb').mockReturnValue({
      execute: mockExecute,
    } as any);

    stationRepository.setMockFallback(true);

    const results = await stationRepository.findByRegion();
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThan(0);
  });

  it('TC-TALEP064-06: setMockFallback(false) ile fallback kapatıldığında veritabanı durumu yansıtılmalıdır', async () => {
    const mockExecute = vi.fn().mockResolvedValue([]);
    vi.spyOn(dbModule, 'getDb').mockReturnValue({
      execute: mockExecute,
    } as any);

    stationRepository.setMockFallback(false);

    const results = await stationRepository.findByRegion();
    expect(results).toEqual([]);
    expect(results.length).toBe(0);
  });
});
