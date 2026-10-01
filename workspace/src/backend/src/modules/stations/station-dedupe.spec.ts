
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  stationDedupeKey,
  stationSignatureKey,
  dedupeStations,
  derivedStationNo,
  ensureStationDeduped,
  type StationDedupeInput,
} from './station-dedupe.service';
import * as dbModule from '../../db/index';

describe('TALEP-054: İstasyon Mükerrer Kayıt Tekilleştirme Doğrulaması', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('TC-DEDUPE-01: stationDedupeKey kanonik istasyon numarasını Türkçe katlayarak normalize etmelidir', () => {
    expect(stationDedupeKey({ istasyon_no: 'ŞRJ/10423' })).toBe('no:srj/10423');
    expect(stationDedupeKey({ istasyon_no: 'srj/10423' })).toBe('no:srj/10423');
    expect(stationDedupeKey({ istasyon_no: 'SRJ/10423' })).toBe('no:srj/10423');
    expect(stationDedupeKey({ istasyon_no: '' })).toBeNull();
    expect(stationDedupeKey({ istasyon_no: null })).toBeNull();
  });

  it('TC-DEDUPE-02: stationSignatureKey fiziksel saha imzasını ~110m grid ile üretmelidir', () => {
    const s1: StationDedupeInput = {
      name: 'ZES Kadıköy Moda Otoparkı',
      operator_id: 1,
      lat: 40.987654,
      lon: 29.023456,
    };
    const s2: StationDedupeInput = {
      name: 'zes kadikoy moda otoparki',
      operator_id: 1,
      lat: 40.987999,
      lon: 29.023111,
    };
    const sig1 = stationSignatureKey(s1);
    const sig2 = stationSignatureKey(s2);
    expect(sig1).toBe(sig2);
  });

  it('TC-DEDUPE-03: dedupeStations hem aynı istasyon_no hem de aynı fiziksel imzalı kopyaları elemelidir', () => {
    const records: StationDedupeInput[] = [
      {
        istasyon_no: 'ŞRJ/10423',
        name: 'ZES Kadıköy Moda Otoparkı',
        operator_id: 1,
        lat: 40.987654,
        lon: 29.023456,
      },
      {
        istasyon_no: 'srj/10423',
        name: 'ZES Kadikoy Moda',
        operator_id: 1,
        lat: 40.988,
        lon: 29.023,
      },
      {
        istasyon_no: 'ZES/998877',
        name: 'zes kadikoy moda otoparki',
        operator_id: 1,
        lat: 40.9876,
        lon: 29.0234,
      },
      {
        istasyon_no: 'ŞRJ/2002',
        name: 'Trugo Beşiktaş Meydan',
        operator_id: 2,
        lat: 41.0428,
        lon: 29.0077,
      },
    ];

    const deduped = dedupeStations(records);
    expect(deduped.length).toBe(2);
    expect(deduped[0].istasyon_no).toBe('ŞRJ/10423');
    expect(deduped[1].istasyon_no).toBe('ŞRJ/2002');
  });

  it('TC-DEDUPE-04: derivedStationNo deterministik SYNC- önekli hash üretmelidir', () => {
    const input: StationDedupeInput = {
      name: 'Yerel İstasyon',
      operator_id: 3,
      lat: 38.4237,
      lon: 27.1428,
    };
    const no1 = derivedStationNo(input);
    const no2 = derivedStationNo(input);
    expect(no1).toBe(no2);
    expect(no1.startsWith('SYNC-')).toBe(true);
    expect(no1.length).toBeGreaterThan(10);
  });

  it('TC-DEDUPE-05: ensureStationDeduped veritabanı olmadan hata fırlatmamalıdır', async () => {
    vi.spyOn(dbModule, 'getDb').mockImplementation(() => {
      throw new Error('DB offline');
    });

    const report = await ensureStationDeduped();
    expect(report).toBeNull();
  });
});
