
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useStations, deduplicateStations, deduplicateClusters } from '../composables/useStations';
import type { StationItem, ClusterItem } from '../types/station';

// TALEP-061 / S35-T1 derleme/import doğrulaması ve TALEP-054 istasyon tekilleştirme kilidi.
// 1) useStations ve yardımcı fonksiyonların relative import çözümleme doğrulaması.
// 2) deduplicateStations: aynı id, slug, Türkçe normalize edilmiş istasyon_no ve fiziksel saha imzasına sahip mükerrer kayıtların elenmesi.
// 3) deduplicateClusters: küme verilerinde mükerrer kayıtların elenmesi.
// 4) fetchStationsByBBox: API'den gelen verilerin doğru şekilde filtrelenip state'e aktarılması.

describe('TALEP-061: derleme doğrulaması ve harita mükerrer kayıt tekilleştirme', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('TC-T61-01: deduplicateStations aynı id veya slug taşıyan kayıtları tekilleştirmelidir', () => {
    const list: StationItem[] = [
      { id: 'st-1', name: 'İstasyon A', slug: 'istasyon-a', lat: 41.0, lon: 29.0 },
      { id: 'st-1', name: 'İstasyon A Kopya', slug: 'istasyon-a-2', lat: 41.0001, lon: 29.0001 },
      { id: 'st-2', name: 'İstasyon B', slug: 'istasyon-a', lat: 41.1, lon: 29.1 },
    ];
    const deduped = deduplicateStations(list);
    expect(deduped).toHaveLength(1);
    expect(deduped[0].id).toBe('st-1');
  });

  it('TC-T61-02: deduplicateStations Türkçe karakterli istasyon_no değerlerini normalize ederek eşleştirmelidir', () => {
    const list: any[] = [
      { id: 'st-1', name: 'Kadıköy Şarj', istasyon_no: 'ŞRJ/10423', lat: 40.98, lon: 29.02 },
      { id: 'st-2', name: 'Kadikoy Sarj', istasyon_no: 'srj/10423', lat: 40.981, lon: 29.021 },
      { id: 'st-3', name: 'Beşiktaş Şarj', istasyon_no: 'ŞRJ/20001', lat: 41.04, lon: 29.00 },
    ];
    const deduped = deduplicateStations(list as StationItem[]);
    expect(deduped).toHaveLength(2);
    expect(deduped[0].id).toBe('st-1');
    expect(deduped[1].id).toBe('st-3');
  });

  it('TC-T61-03: deduplicateStations fiziksel saha imzası (~110m ve aynı operatör/isim) eşleşenleri elemelidir', () => {
    const list: any[] = [
      { id: 'st-1', name: 'ZES Moda Otopark', operator_id: 1, lat: 40.98765, lon: 29.02345 },
      { id: 'st-2', name: 'zes moda otopark', operator_id: 1, lat: 40.98799, lon: 29.02311 },
      { id: 'st-3', name: 'Trugo Moda Otopark', operator_id: 2, lat: 40.98765, lon: 29.02345 },
    ];
    const deduped = deduplicateStations(list as StationItem[]);
    expect(deduped).toHaveLength(2);
    expect(deduped.map((s) => s.id)).toEqual(['st-1', 'st-3']);
  });

  it('TC-T61-04: deduplicateClusters mükerrer küme id veya konumlarını elemelidir', () => {
    const clusters: ClusterItem[] = [
      { cluster_id: 'c-34', count: 50, center_lat: 41.0, center_lon: 29.0 },
      { cluster_id: 'c-34', count: 50, center_lat: 41.0, center_lon: 29.0 },
      { cluster_id: 'c-06', count: 30, center_lat: 39.9, center_lon: 32.8 },
    ];
    const deduped = deduplicateClusters(clusters);
    expect(deduped).toHaveLength(2);
    expect(deduped[0].cluster_id).toBe('c-34');
    expect(deduped[1].cluster_id).toBe('c-06');
  });

  it('TC-T61-05: useStations fetchStationsByBBox çağrısında mükerrer istasyonları tekilleştirerek state\'e yazmalıdır', async () => {
    const { fetchStationsByBBox, stations, clusters, responseType } = useStations();
    const mockData = [
      { id: 's1', name: 'Test İstasyon 1', istasyon_no: 'ŞRJ/101', lat: 41.0, lon: 29.0 },
      { id: 's2', name: 'Test İstasyon 1 Kopya', istasyon_no: 'srj/101', lat: 41.0, lon: 29.0 },
    ];
    (globalThis as any).$fetch.mockResolvedValueOnce({ type: 'stations', data: mockData });

    fetchStationsByBBox([28.0, 40.0, 30.0, 42.0], 12);
    await vi.advanceTimersByTimeAsync(350);

    expect(responseType.value).toBe('stations');
    expect(stations.value).toHaveLength(1);
    expect(stations.value[0].id).toBe('s1');
    expect(clusters.value).toEqual([]);
  });

  it('TC-T61-06: boş veya geçersiz girdi verildiğinde çökmemelidir', () => {
    expect(deduplicateStations([])).toEqual([]);
    expect(deduplicateStations(null as any)).toEqual([]);
    expect(deduplicateClusters([])).toEqual([]);
    expect(deduplicateClusters(null as any)).toEqual([]);
  });
});
