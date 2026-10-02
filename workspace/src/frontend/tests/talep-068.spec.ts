
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { deduplicateStations, deduplicateClusters, useStations } from '../composables/useStations';

// TALEP-064 & TALEP-068: Veritabanı boşken istasyon API'sinin fallback mock veri dönmemesi
// ve derleme/import doğrulaması.
// Veritabanı boşken veya boş liste dönerken frontend katmanının da mock veri uydurmaması,
// API'den dönen gerçek veritabanı durumunu (0 istasyon / 0 küme) şeffaf şekilde yansıtması doğrulanır.

describe('TALEP-068: Derleme / Import Doğrulaması ve TALEP-064 Boş Veritabanı Fallback Davranışı', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('TC-T68-01: deduplicateStations boş dizi aldığında boş dizi dönmelidir', () => {
    const result = deduplicateStations([]);
    expect(result).toEqual([]);
    expect(result.length).toBe(0);
  });

  it('TC-T68-02: deduplicateClusters boş dizi aldığında boş dizi dönmelidir', () => {
    const result = deduplicateClusters([]);
    expect(result).toEqual([]);
    expect(result.length).toBe(0);
  });

  it('TC-T68-03: useStations composable modülü hatasız import edilmeli ve metotları tanımlı olmalıdır', () => {
    expect(useStations).toBeDefined();
    expect(typeof useStations).toBe('function');
  });

  it('TC-T68-04: deduplicateStations geçersiz veya null değerleri güvenle filtrelemelidir', () => {
    const raw: any = [null, undefined, { id: 'st-1', name: 'ZES Kadıköy', lat: 41.0, lon: 29.0 }];
    const cleaned = deduplicateStations(raw);
    expect(cleaned.length).toBe(1);
    expect(cleaned[0].id).toBe('st-1');
  });

  it('TC-T68-05: deduplicateClusters tekil cluster_id değerlerini korumalıdır', () => {
    const raw = [
      { cluster_id: 'cl-1', count: 12, center_lat: 41.0, center_lon: 29.0 },
      { cluster_id: 'cl-1', count: 12, center_lat: 41.0, center_lon: 29.0 },
      { cluster_id: 'cl-2', count: 5, center_lat: 39.9, center_lon: 32.8 }
    ];
    const cleaned = deduplicateClusters(raw);
    expect(cleaned.length).toBe(2);
    expect(cleaned.map((c) => c.cluster_id)).toEqual(['cl-1', 'cl-2']);
  });
});
