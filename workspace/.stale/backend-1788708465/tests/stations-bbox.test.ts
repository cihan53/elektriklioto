
import { describe, it, expect } from 'vitest';
import { parseBBox, validateTurkeyCoordinates, TURKEY_BOUNDS } from '../src/utils/geo.js';
import { toSlug, generateStationSlug } from '../src/utils/unicode-slug.js';

describe('BBox Parsing ve Coğrafi Doğrulama', () => {
  it('geçerli bbox dizesini doğru ayrıştırmalıdır', () => {
    const bboxStr = '28.97,41.00,29.05,41.05';
    const result = parseBBox(bboxStr);

    expect(result).not.toBeNull();
    expect(result?.minLon).toBeCloseTo(28.97);
    expect(result?.minLat).toBeCloseTo(41.00);
    expect(result?.maxLon).toBeCloseTo(29.05);
    expect(result?.maxLat).toBeCloseTo(41.05);
  });

  it('ters veya geçersiz koordinat parametrelerinde null dönmelidir', () => {
    expect(parseBBox('29.05,41.05,28.97,41.00')).toBeNull(); // min > max
    expect(parseBBox('gecersiz,bbox,formati,burada')).toBeNull();
    expect(parseBBox('28.97,41.00')).toBeNull(); // eksik argüman
    expect(parseBBox(undefined)).toBeNull();
  });

  it('WGS84 sınırları dışındaki değerleri reddetmelidir', () => {
    expect(parseBBox('-200,0,100,50')).toBeNull();
    expect(parseBBox('0,-95,50,0')).toBeNull();
  });

  it('Türkiye sınırları içindeki koordinatları onaylamalıdır', () => {
    // İstanbul Kadıköy
    const result = validateTurkeyCoordinates(40.9995, 29.0335);
    expect(result.valid).toBe(true);
  });

  it('Türkiye sınırları dışındaki koordinatları reddetmelidir', () => {
    const result = validateTurkeyCoordinates(52.52, 13.405); // Berlin
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('OUT_OF_TURKEY_BOUNDS');
  });

  it('(0,0) geçersiz koordinatını reddetmelidir', () => {
    const result = validateTurkeyCoordinates(0, 0);
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('COORDINATES_ZERO_ZERO');
  });

  it('enlem ve boylamın yer değiştirdiği durumları tespit etmelidir', () => {
    // lat: 30.0, lon: 40.0 yerine lat: 40.0, lon: 30.0 olmalı; lat 30 dışarıda kalır
    // Swapped durumu: lat=32.0 (lon aralığında), lon=41.0 (lat aralığında)
    const result = validateTurkeyCoordinates(29.5, 41.0);
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('COORDINATES_SWAPPED_LAT_LON');
  });
});

describe('Türkçe Karakter ve Kanonik Slug Üretimi', () => {
  it('Türkçe harfleri standart İngilizce karakterlere dönüştürmelidir', () => {
    const raw = 'İZMİR Çeşme Şarj İstasyonu 120kW GÜÇ';
    const slug = toSlug(raw);
    expect(slug).toBe('izmir-cesme-sarj-istasyonu-120kw-guc');
  });

  it('noktalı i ve noktasız ı ayrımını doğru yapmalıdır', () => {
    expect(toSlug('Isparta')).toBe('isparta');
    expect(toSlug('İstanbul')).toBe('istanbul');
    expect(toSlug('Şırnak')).toBe('sirnak');
  });

  it('kanonik istasyon slug formatını doğru oluşturmalıdır', () => {
    const stationSlug = generateStationSlug('ZES', 'İstanbul', 'Kadıköy', 'ŞRJ/00142');
    expect(stationSlug).toBe('zes-istanbul-kadikoy-srj-00142');
  });
});
