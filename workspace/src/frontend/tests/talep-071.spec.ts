
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useStations, deduplicateStations, deduplicateClusters } from '../composables/useStations';
import { useSourceHealth } from '../composables/useSourceHealth';
import { useOperators, sortOperatorsByStationCount } from '../composables/useOperators';
import { useTheme } from '../composables/useTheme';
import { useToast } from '../composables/useToast';
import { useUserLocation } from '../composables/useUserLocation';
import { useVersionCheck } from '../composables/useVersionCheck';
import { useChangelog } from '../composables/useChangelog';
import { useProximityProof } from '../composables/useProximityProof';
import type {
  StationItem,
  ClusterItem,
  SourcesHealthResponse,
  SourceHealthItem,
  DataFreshness
} from '../types/station';

// TALEP-071 / S35-T7: Derleme ve import doğrulaması (Build & Import Verification).
// 1) Ön yüz modüllerinin, composable'ların ve tiplerin bağıl import yollarının (relative imports) eksiksiz çözümlenmesi.
// 2) useStations ve deduplication fonksiyonlarının deterministik çalışması ve regresyon koruması.
// 3) useSourceHealth ve 24 saat tazelik denetimi fonksiyonlarının sıfır hata ile çözümlenmesi.
// 4) useOperators sözlük fallback ve sıralama mekanizmasının doğrulanması.
// 5) useToast, useTheme, useUserLocation, useVersionCheck ve useProximityProof modüllerinin eksiksiz tanımlı olması.

describe('TALEP-071: Derleme / Import Doğrulaması ve Ön Yüz Modül Bütünlüğü', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('TC-T71-01: Tüm temel composable modülleri ve yardımcı fonksiyonlar hatasız import edilmelidir', () => {
    expect(useStations).toBeDefined();
    expect(typeof useStations).toBe('function');
    expect(deduplicateStations).toBeDefined();
    expect(typeof deduplicateStations).toBe('function');
    expect(deduplicateClusters).toBeDefined();
    expect(typeof deduplicateClusters).toBe('function');

    expect(useSourceHealth).toBeDefined();
    expect(typeof useSourceHealth).toBe('function');

    expect(useOperators).toBeDefined();
    expect(typeof useOperators).toBe('function');
    expect(sortOperatorsByStationCount).toBeDefined();
    expect(typeof sortOperatorsByStationCount).toBe('function');

    expect(useTheme).toBeDefined();
    expect(typeof useTheme).toBe('function');

    expect(useToast).toBeDefined();
    expect(typeof useToast).toBe('function');

    expect(useUserLocation).toBeDefined();
    expect(typeof useUserLocation).toBe('function');

    expect(useVersionCheck).toBeDefined();
    expect(typeof useVersionCheck).toBe('function');

    expect(useChangelog).toBeDefined();
    expect(typeof useChangelog).toBe('function');

    expect(useProximityProof).toBeDefined();
    expect(typeof useProximityProof).toBe('function');
  });

  it('TC-T71-02: deduplicateStations aynı id, slug ve kanonik istasyon_no içeren mükerrer kayıtları tekilleştirmelidir', () => {
    const list: StationItem[] = [
      {
        id: 'st-071-1',
        name: 'ZES Kadıköy Meydan',
        slug: 'zes-kadikoy-meydan',
        istasyon_no: 'ŞRJ/1071',
        operator: { id: 1, name: 'ZES', slug: 'zes', is_active: true },
        lat: 40.990,
        lon: 29.025,
        address: 'Kadıköy',
        city: 'İstanbul',
        district: 'Kadıköy',
        connector_types: null,
        power_kw: null,
        current_tariff: null,
        connectors: null,
        status: null,
        updated_at: new Date().toISOString()
      },
      {
        id: 'st-071-1',
        name: 'ZES Kadıköy Kopya',
        slug: 'zes-kadikoy-meydan-2',
        istasyon_no: 'srj/1071',
        operator: { id: 1, name: 'ZES', slug: 'zes', is_active: true },
        lat: 40.9901,
        lon: 29.0251,
        address: 'Kadıköy',
        city: 'İstanbul',
        district: 'Kadıköy',
        connector_types: null,
        power_kw: null,
        current_tariff: null,
        connectors: null,
        status: null,
        updated_at: new Date().toISOString()
      },
      {
        id: 'st-071-2',
        name: 'Trugo Üsküdar',
        slug: 'trugo-uskudar',
        istasyon_no: 'ŞRJ/2071',
        operator: { id: 2, name: 'Trugo', slug: 'trugo', is_active: true },
        lat: 41.025,
        lon: 29.015,
        address: 'Üsküdar',
        city: 'İstanbul',
        district: 'Üsküdar',
        connector_types: null,
        power_kw: null,
        current_tariff: null,
        connectors: null,
        status: null,
        updated_at: new Date().toISOString()
      }
    ];

    const deduped = deduplicateStations(list);
    expect(deduped).toHaveLength(2);
    expect(deduped[0].id).toBe('st-071-1');
    expect(deduped[1].id).toBe('st-071-2');
  });

  it('TC-T71-03: deduplicateClusters mükerrer küme kayıtlarını ayıklamalıdır', () => {
    const clusters: ClusterItem[] = [
      { cluster_id: 'cl-34', count: 120, lat: 41.0, lon: 29.0 },
      { cluster_id: 'cl-34', count: 120, lat: 41.0, lon: 29.0 },
      { cluster_id: 'cl-06', count: 85, lat: 39.9, lon: 32.8 }
    ];
    const deduped = deduplicateClusters(clusters);
    expect(deduped).toHaveLength(2);
    expect(deduped.map((c) => c.cluster_id)).toEqual(['cl-34', 'cl-06']);
  });

  it('TC-T71-04: useSourceHealth formatFreshnessText 24 saat tazelik kuralını eksiksiz uygulamalıdır', () => {
    const { formatFreshnessText } = useSourceHealth();
    const now = new Date('2026-10-02T12:00:00Z');

    const emptyFreshness = formatFreshnessText(null, now);
    expect(emptyFreshness.is_stale).toBe(true);
    expect(emptyFreshness.last_updated_text).toBe('Operatör Verisi Bekleniyor');

    const freshDate = new Date('2026-10-02T10:00:00Z');
    const freshResult = formatFreshnessText(freshDate, now);
    expect(freshResult.is_stale).toBe(false);
    expect(freshResult.last_updated_text).toBe('Son güncelleme: 2 saat önce');

    const staleDate = new Date('2026-10-01T06:00:00Z');
    const staleResult = formatFreshnessText(staleDate, now);
    expect(staleResult.is_stale).toBe(true);
    expect(staleResult.last_updated_text).toBe('Son güncelleme: 1 gün önce');
  });

  it('TC-T71-05: sortOperatorsByStationCount operatörleri istasyon sayısına göre azalan sıralamalıdır', () => {
    const ops = [
      { id: 1, name: 'Voltrun', slug: 'voltrun', is_active: true, station_count: 50 },
      { id: 2, name: 'ZES', slug: 'zes', is_active: true, station_count: 200 },
      { id: 3, name: 'Eşarj', slug: 'esarj', is_active: true, station_count: 150 },
      { id: 4, name: 'A-Şarj', slug: 'a-sarj', is_active: true, station_count: 50 }
    ];

    const sorted = sortOperatorsByStationCount(ops);
    expect(sorted.map((o) => o.slug)).toEqual(['zes', 'esarj', 'a-sarj', 'voltrun']);
  });

  it('TC-T71-06: useToast showToast ve removeToast bildirimleri başarıyla yönetmelidir', () => {
    const { toasts, showToast, removeToast } = useToast();
    showToast('Test bildirim', 'success', 5000);
    expect(toasts.value.length).toBeGreaterThan(0);
    const addedId = toasts.value[toasts.value.length - 1].id;
    removeToast(addedId);
    expect(toasts.value.find((t) => t.id === addedId)).toBeUndefined();
  });

  it('TC-T71-07: useProximityProof getDeviceAttestation anonim cihaz kimliği üretmelidir', () => {
    const { getDeviceAttestation } = useProximityProof();
    const token = getDeviceAttestation();
    expect(token).toBeDefined();
    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThan(0);
  });
});
