
export interface BoundingBox {
  minLon: number;
  minLat: number;
  maxLon: number;
  maxLat: number;
}

export function getMaxSpanForZoom(zoom: number): number {
  if (zoom < 10) return 180.0;
  if (zoom <= 10) return 3.5;
  if (zoom <= 11) return 2.5;
  if (zoom <= 12) return 1.8;
  return 1.2;
}

export function validateBBox(minLon: number, minLat: number, maxLon: number, maxLat: number, maxSpan: number = 0.5): boolean {
  if (minLon < -180 || maxLon > 180 || minLat < -90 || maxLat > 90) {
    return false;
  }
  if (minLon >= maxLon || minLat >= maxLat) {
    return false;
  }
  // Max BBox dimension check for DoS protection (T-08)
  const lonDiff = Math.abs(maxLon - minLon);
  const latDiff = Math.abs(maxLat - minLat);
  if (lonDiff > maxSpan || latDiff > maxSpan) {
    return false;
  }
  return true;
}


export function isWithinTurkeyBounds(lat: number, lon: number): boolean {
  // Turkey Bounding Box: 25.5 <= lon <= 45.0 && 35.5 <= lat <= 42.5
  return lon >= 25.5 && lon <= 45.0 && lat >= 35.5 && lat <= 42.5;
}

export function haversineDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
