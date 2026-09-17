
/**
 * KVKK / Konum Gizliliği Kuralı:
 * Kullanıcının anlık GPS konumu YALNIZCA istemci tarafında in-memory tutulur;
 * haritayı merkezlemek ve lokal mesafe hesaplamak için kullanılır.
 * Ham koordinatlar ASLA sunucuya gönderilmez veya loglanmaz.
 */
export const useUserLocation = () => {
  const userCoords = useState<{ lat: number; lon: number } | null>('user-in-memory-coords', () => null);
  const locationLoading = useState<boolean>('user-location-loading', () => false);
  const locationError = useState<string | null>('user-location-error', () => null);

  const requestUserLocation = (): Promise<{ lat: number; lon: number } | null> => {
    return new Promise((resolve) => {
      if (!import.meta.client || !('geolocation' in navigator)) {
        locationError.value = 'Tarayıcınız konum servisini desteklemiyor.';
        resolve(null);
        return;
      }

      locationLoading.value = true;
      locationError.value = null;

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          locationLoading.value = false;
          const coords = {
            lat: pos.coords.latitude,
            lon: pos.coords.longitude
          };
          userCoords.value = coords;
          resolve(coords);
        },
        (err) => {
          locationLoading.value = false;
          locationError.value = err.message || 'Konum izni alınamadı.';
          resolve(null);
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 }
      );
    });
  };

  // İstemcide iki koordinat arası metre hassasiyetinde mesafe hesabı (Haversine - in-memory)
  const calculateDistanceMeters = (targetLat: number, targetLon: number): number | null => {
    if (!userCoords.value) return null;
    const R = 6371000; // metre cinsinden yer yarıçapı
    const dLat = ((targetLat - userCoords.value.lat) * Math.PI) / 180;
    const dLon = ((targetLon - userCoords.value.lon) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((userCoords.value.lat * Math.PI) / 180) *
        Math.cos((targetLat * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c);
  };

  // İstemcide iki koordinat arası kilometre cinsinden mesafe hesabı (gösterim için)
  const calculateDistanceKm = (targetLat: number, targetLon: number): number | null => {
    const meters = calculateDistanceMeters(targetLat, targetLon);
    if (meters === null) return null;
    return Math.round((meters / 1000) * 10) / 10;
  };

  return {
    userCoords,
    locationLoading,
    locationError,
    requestUserLocation,
    calculateDistanceMeters,
    calculateDistanceKm
  };
};
