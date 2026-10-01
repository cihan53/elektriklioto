
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useStations } from '../composables/useStations';
import { TURKEY_81_CITIES, TURKEY_ALL_DISTRICTS } from '../components/map/turkeyDistricts';

// TALEP-055 / TALEP-053 regresyon koruması:
// Ana ekran istasyonları, backend'in {type:'clusters'|'stations', data:[...]}
// sözleşmesine bağlıdır. S37 öncesinde servis {mode, items} döndürerek haritayı
// boş bırakmıştı; bu test istemci tarafı eşlemenin kırılmadığını kilitler.
// Ayrıca SearchInput'un import ettiği yerel il/ilçe dizininin (turkeyDistricts)
// derleme zamanında çözüldüğünü ve tam kapsam taşıdığını doğrular.

const flushDebounce = async () => {
  await vi.advanceTimersByTimeAsync(350);
};

describe('TALEP-055: ana ekran istasyon sözleşmesi ve modül bütünlüğü', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('TC-T55-01: backend {type:"clusters"} yanıtı clusters state\'ine yazılır', async () => {
    const { fetchStationsByBBox, clusters, stations, responseType } = useStations();
    const clusterData = [{ cluster_id: 'c1', count: 42, center_lat: 41.0, center_lon: 29.0 }];
    (globalThis as any).$fetch.mockResolvedValueOnce({ type: 'clusters', data: clusterData });

    fetchStationsByBBox([26.0, 36.0, 45.0, 42.0], 8);
    await flushDebounce();

    expect(responseType.value).toBe('clusters');
    expect(clusters.value).toEqual(clusterData);
    expect(stations.value).toEqual([]);
  });

  it('TC-T55-02: backend {type:"stations", data:[...]} yanıtı stations state\'ine yazılır', async () => {
    const { fetchStationsByBBox, clusters, stations, responseType } = useStations();
    const stationData = [{ id: 's1', name: 'Test İstasyonu', lat: 41.01, lon: 28.97, slug: 'test' }];
    (globalThis as any).$fetch.mockResolvedValueOnce({ type: 'stations', data: stationData });

    fetchStationsByBBox([28.5, 40.5, 29.5, 41.5], 13);
    await flushDebounce();

    expect(responseType.value).toBe('stations');
    expect(stations.value).toEqual(stationData);
    expect(clusters.value).toEqual([]);
  });

  it('TC-T55-03: {mode, items} gibi yabancı sözleşme haritayı boş bırakır, çökertmez', async () => {
    const { fetchStationsByBBox, clusters, stations } = useStations();
    (globalThis as any).$fetch.mockResolvedValueOnce({ mode: 'cluster', items: [{}] });

    fetchStationsByBBox([28.5, 40.5, 29.5, 41.5], 13);
    await flushDebounce();

    expect(stations.value).toEqual([]);
    expect(clusters.value).toEqual([]);
  });

  it('TC-T55-04: API hatası state\'i kırmaz, error alanı dolar', async () => {
    const { fetchStationsByBBox, error } = useStations();
    (globalThis as any).$fetch.mockRejectedValueOnce(new Error('ERR_MODULE_NOT_FOUND'));

    fetchStationsByBBox([28.5, 40.5, 29.5, 41.5], 12);
    await flushDebounce();

    expect(error.value).toBe('ERR_MODULE_NOT_FOUND');
  });

  it('TC-T55-05: turkeyDistricts modülü çözülür, 81 il ve tam ilçe dizini taşır', () => {
    expect(TURKEY_81_CITIES).toHaveLength(81);
    // 973 ilçe kapsamı — backend gadm.data.ts ile aynı sözlük.
    expect(TURKEY_ALL_DISTRICTS.length).toBeGreaterThanOrEqual(973);
    const esenler = TURKEY_ALL_DISTRICTS.find(
      (d) => d.name === 'Esenler' && d.parentName === 'İstanbul'
    );
    expect(esenler).toBeDefined();
  });
});
