import { describe, it, expect } from 'vitest';
import { regionLookup } from '../src/modules/regions/region-lookup.js';
import { buildApp } from '../src/app.js';

describe('Issue #56: İl/İlçe kanonik kod tabanı', () => {
  it('ismin tüm varyantları aynı plaka koduna iner', () => {
    expect(regionLookup.resolveProvinceCode('İstanbul')).toBe(34);
    expect(regionLookup.resolveProvinceCode('Istanbul')).toBe(34);
    expect(regionLookup.resolveProvinceCode('İSTANBUL')).toBe(34);
    expect(regionLookup.resolveProvinceCode('istanbul')).toBe(34);
    expect(regionLookup.resolveProvinceCode('İzmir')).toBe(35);
    expect(regionLookup.resolveProvinceCode('Izmir')).toBe(35);
    expect(regionLookup.resolveProvinceCode('Diyarbakır')).toBe(21);
    expect(regionLookup.resolveProvinceCode('Diyarbakir')).toBe(21);
    expect(regionLookup.resolveProvinceCode('Ankara')).toBe(6);
    expect(regionLookup.resolveProvinceCode('Şanlıurfa')).toBe(63);
  });

  it('tanınmayan ve çöp il metinleri kod üretmez', () => {
    expect(regionLookup.resolveProvinceCode('')).toBeNull();
    expect(regionLookup.resolveProvinceCode('No:117')).toBeNull();
    expect(regionLookup.resolveProvinceCode('C ( Ada: - , Pafta: - )')).toBeNull();
  });

  it('ilçe doğrulaması: bilinen ilçe kodlanır, adres parçası elenir', () => {
    expect(regionLookup.resolveIlceCode(6, 'Çankaya')).toBe(6007);
    expect(regionLookup.resolveIlceCode(6, 'cankaya')).toBe(6007);
    expect(regionLookup.resolveIlceCode(34, 'Kadıköy')).toBe(34023);
    expect(regionLookup.resolveIlceCode(6, 'No:117')).toBeNull();
    expect(regionLookup.resolveIlceCode(6, '93-93')).toBeNull();
  });

  it('ad değişen ilçeler alias ile çözülür', () => {
    expect(regionLookup.resolveIlceCode(6, 'Şereflikoçhisar')).toBe(6023);
    expect(regionLookup.resolveIlceCode(6, 'Kahramankazan')).toBe(6016);
    expect(regionLookup.districtName(6023)).toBe('Şereflikoçhisar');
    expect(regionLookup.districtName(6016)).toBe('Kahramankazan');
  });

  it('kod -> kanonik görünen ad', () => {
    expect(regionLookup.provinceName(34)).toBe('İstanbul');
    expect(regionLookup.provinceName(35)).toBe('İzmir');
    expect(regionLookup.provinceName(21)).toBe('Diyarbakır');
  });

  it('koordinat -> plaka kodu (bbox öncelikli)', () => {
    expect(regionLookup.provinceCodeFromCoords(41.01, 28.97)).toBe(34); // İstanbul
    expect(regionLookup.provinceCodeFromCoords(38.42, 27.14)).toBe(35); // İzmir
    expect(regionLookup.provinceCodeFromCoords(37.91, 40.23)).toBe(21); // Diyarbakır
  });
});

describe('Issue #56: API tarafı', () => {
  it('küme kimlikleri plaka kodu formatındadır', async () => {
    const app = await buildApp();
    await app.ready();
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/stations?bbox=26,36,45,42&zoom=8',
      headers: { Origin: 'http://127.0.0.1:3000' },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.type).toBe('clusters');
    for (const c of body.data) {
      expect(c.cluster_id).toMatch(/^cluster-(\d{2}|diger)-\d+$/);
    }
    await app.close();
  });

  it('istasyon yanıtında il/ilçe kanonik Türkçe ve kod alanları gelir', async () => {
    const app = await buildApp();
    await app.ready();
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/stations?bbox=28.9,40.9,29.2,41.1&zoom=12',
      headers: { Origin: 'http://127.0.0.1:3000' },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.type).toBe('stations');
    for (const s of body.data) {
      // API yanıtı asla ASCII il adı veya U+0307 artifakti içermez
      expect(s.city).not.toMatch(/Istanbul|Izmir|Diyarbakir/);
      expect(s.city).not.toContain('̇');
      expect(String(s.district)).not.toContain('̇');
      expect(String(s.district)).not.toMatch(/^No:|^[0-9]+$/);
    }
    await app.close();
  });
});
