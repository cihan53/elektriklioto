import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { ref } from 'vue';
import { useStations } from '../composables/useStations';
import { useClickOutside } from '../composables/useClickOutside';
import { TURKEY_81_CITIES, TURKEY_ALL_DISTRICTS } from '../components/map/turkeyDistricts';

// TALEP-056 / S37-T1 çalışma alanı hijyeni regresyon kilidi.
// Kalite kapısı S37-T1'de iki hijyen ihlali (frontend köküne sızan
// `_CIKTI.md` çıktı artefaktı ve `test-results/` rapor dizini), silinen
// koruma referansları ve eksik regresyon testi raporladı. Bu spec üç şeyi
// kilitler:
//   1) Frontend kökünde çıktı artefaktı (`_CIKTI*.md`, `test-results/`,
//      `playwright-report/`) bir daha var olamaz.
//   2) TALEP-053'ün istemci tarafı sözleşmesi — backend'in
//      `{type:'clusters'|'stations', data:[...]}` zarfı — bozulursa
//      ana ekran pinleri sessizce boşalır; eşleme burada dondurulur.
//   3) UAT BUG-01 kök nedeni: `~/composables/useClickOutside` ve
//      `SearchInput`'un import ettiği `turkeyDistricts` modülü derleme
//      zincirinde çözülmek zorundadır.

// vitest frontend kökünden çalışır (vitest.config.ts konumu).
const FRONTEND_ROOT = process.cwd();

const flushDebounce = async () => {
  await vi.advanceTimersByTimeAsync(350);
};

describe('TALEP-056: çalışma alanı hijyeni ve istasyon sözleşmesi', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('TC-T56-01: frontend kökünde _CIKTI çıktı artefaktı bulunamaz', () => {
    const sizanlar = readdirSync(FRONTEND_ROOT).filter((name) =>
      /^_CIKTI.*\.md$/i.test(name)
    );
    expect(sizanlar).toEqual([]);
  });

  it('TC-T56-02: test raporu artefakt dizinleri frontend kökünde bulunamaz', () => {
    expect(existsSync(join(FRONTEND_ROOT, 'test-results'))).toBe(false);
    expect(existsSync(join(FRONTEND_ROOT, 'playwright-report'))).toBe(false);
  });

  it('TC-T56-03: {type:"clusters"} zarfı küme state\'ine yazılır (TALEP-053)', async () => {
    const { fetchStationsByBBox, clusters, stations, responseType } = useStations();
    const clusterData = [{ cluster_id: 'c1', count: 17, center_lat: 39.9, center_lon: 32.8 }];
    (globalThis as any).$fetch.mockResolvedValueOnce({ type: 'clusters', data: clusterData });

    fetchStationsByBBox([26.0, 36.0, 45.0, 42.0], 8);
    await flushDebounce();

    expect(responseType.value).toBe('clusters');
    expect(clusters.value).toEqual(clusterData);
    expect(stations.value).toEqual([]);
  });

  it('TC-T56-04: {type:"stations"} zarfı pin state\'ine yazılır (TALEP-053)', async () => {
    const { fetchStationsByBBox, clusters, stations, responseType } = useStations();
    const stationData = [{ id: 's1', name: 'T56 İstasyonu', lat: 41.0, lon: 28.9, slug: 't56' }];
    (globalThis as any).$fetch.mockResolvedValueOnce({ type: 'stations', data: stationData });

    fetchStationsByBBox([28.5, 40.5, 29.5, 41.5], 13);
    await flushDebounce();

    expect(responseType.value).toBe('stations');
    expect(stations.value).toEqual(stationData);
    expect(clusters.value).toEqual([]);
  });

  it('TC-T56-05: yabancı sözleşme ({mode, items}) haritayı boş bırakır, çökertmez', async () => {
    const { fetchStationsByBBox, clusters, stations, error } = useStations();
    (globalThis as any).$fetch.mockResolvedValueOnce({ mode: 'cluster', items: [{}] });

    fetchStationsByBBox([28.5, 40.5, 29.5, 41.5], 13);
    await flushDebounce();

    expect(stations.value).toEqual([]);
    expect(clusters.value).toEqual([]);
    expect(error.value).toBeNull();
  });

  it('TC-T56-06: useClickOutside modülü çözülür, dış tıklamada handler tetiklenir ve temizlenir', () => {
    const target = ref<HTMLElement | null>(document.createElement('div'));
    document.body.appendChild(target.value as HTMLElement);
    const outside = document.createElement('button');
    document.body.appendChild(outside);
    const handler = vi.fn();

    const cleanup = useClickOutside(target, handler);
    outside.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    expect(handler).toHaveBeenCalledTimes(1);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(handler).toHaveBeenCalledTimes(2);

    cleanup();
    outside.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    expect(handler).toHaveBeenCalledTimes(2);

    document.body.removeChild(outside);
    document.body.removeChild(target.value as HTMLElement);
  });

  it('TC-T56-07: turkeyDistricts modülü çözülür — 81 il ve tam ilçe dizini (SearchInput import zinciri)', () => {
    expect(TURKEY_81_CITIES).toHaveLength(81);
    expect(TURKEY_ALL_DISTRICTS.length).toBeGreaterThanOrEqual(973);
    expect(
      TURKEY_ALL_DISTRICTS.some((d) => d.name === 'Esenler' && d.parentName === 'İstanbul')
    ).toBe(true);
  });
});
