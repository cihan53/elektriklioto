
/**
 * Coğrafi doğrulama ve BBox ayrıştırma yardımcı fonksiyonları.
 * Türkiye Sınır Kutusu: ST_MakeEnvelope(25.5, 35.5, 45.0, 42.5, 4326)
 */

export const TURKEY_BOUNDS = {
  MIN_LON: 25.5,
  MAX_LON: 45.0,
  MIN_LAT: 35.5,
  MAX_LAT: 42.5,
};

export interface CoordinateValidationResult {
  valid: boolean;
  reason?: string;
}

export function validateTurkeyCoordinates(lat: number, lon: number): CoordinateValidationResult {
  if (typeof lat !== 'number' || typeof lon !== 'number' || Number.isNaN(lat) || Number.isNaN(lon)) {
    return { valid: false, reason: 'COORDINATES_NAN_OR_INVALID' };
  }

  if (lat === 0 && lon === 0) {
    return { valid: false, reason: 'COORDINATES_ZERO_ZERO' };
  }

  // Enlem ve boylamın yer değiştirme durumu tespiti
  if (lat >= TURKEY_BOUNDS.MIN_LON && lat <= TURKEY_BOUNDS.MAX_LON &&
      lon >= TURKEY_BOUNDS.MIN_LAT && lon <= TURKEY_BOUNDS.MAX_LAT) {
    return { valid: false, reason: 'COORDINATES_SWAPPED_LAT_LON' };
  }

  if (lat < TURKEY_BOUNDS.MIN_LAT || lat > TURKEY_BOUNDS.MAX_LAT ||
      lon < TURKEY_BOUNDS.MIN_LON || lon > TURKEY_BOUNDS.MAX_LON) {
    return { valid: false, reason: 'OUT_OF_TURKEY_BOUNDS' };
  }

  return { valid: true };
}

export interface ParsedBBox {
  minLon: number;
  minLat: number;
  maxLon: number;
  maxLat: number;
}

export function parseBBox(bboxStr: unknown): ParsedBBox | null {
  if (typeof bboxStr !== 'string') return null;

  const parts = bboxStr.split(',').map((val) => Number.parseFloat(val.trim()));
  if (parts.length !== 4 || parts.some(Number.isNaN)) {
    return null;
  }

  const [minLon, minLat, maxLon, maxLat] = parts;

  // WGS 84 sınır kontrolleri
  if (minLon < -180 || maxLon > 180 || minLat < -90 || maxLat > 90) {
    return null;
  }

  if (minLon >= maxLon || minLat >= maxLat) {
    return null;
  }

  return { minLon, minLat, maxLon, maxLat };
}
