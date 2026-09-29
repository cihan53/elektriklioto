
// TALEP-049: SearchInput.vue tarafından beklenen GADM CBS arama istemcisi.
// Bu dosyanın eksikliği canlı ortamda "Cannot find module './geoSearch'"
// hatasına yol açarak ana ekranı kilitliyordu. Backend `modules/gadm`
// rotaları `/api/v1/gadm` ve `/api/v1/geo` takma adlarıyla sunulur;
// istemci iki prefix'i sırayla dener, ikisi de erişilemezse sessizce
// boş dizi döner ve bileşen statik TURKEY_MAJOR_DISTRICTS fallback'ine düşer.

export interface GadmCoordinates {
  lat: number;
  lon: number;
}

export interface GadmBBox {
  min_lon: number;
  min_lat: number;
  max_lon: number;
  max_lat: number;
}

export interface GadmSearchItem {
  type: 'province' | 'district' | 'neighborhood' | string;
  name: string;
  display_name: string;
  slug: string;
  province_name: string;
  district_name?: string;
  coordinates: GadmCoordinates | null;
  bbox?: GadmBBox;
}

const GEO_SEARCH_PATHS = ['/geo/search', '/gadm/search'] as const;
const REQUEST_TIMEOUT_MS = 4000;

const normalizeBase = (apiBase: string) => (apiBase || '').replace(/\/+$/, '');

const isValidCoord = (c: unknown): c is GadmCoordinates =>
  !!c &&
  typeof (c as GadmCoordinates).lat === 'number' &&
  typeof (c as GadmCoordinates).lon === 'number' &&
  Number.isFinite((c as GadmCoordinates).lat) &&
  Number.isFinite((c as GadmCoordinates).lon);

const toItem = (raw: any): GadmSearchItem | null => {
  if (!raw || typeof raw.name !== 'string' || raw.name.trim() === '') return null;
  return {
    type: typeof raw.type === 'string' ? raw.type : '',
    name: raw.name,
    display_name: typeof raw.display_name === 'string' ? raw.display_name : raw.name,
    slug: typeof raw.slug === 'string' ? raw.slug : '',
    province_name: typeof raw.province_name === 'string' ? raw.province_name : '',
    district_name: typeof raw.district_name === 'string' ? raw.district_name : undefined,
    coordinates: isValidCoord(raw.coordinates)
      ? { lat: raw.coordinates.lat, lon: raw.coordinates.lon }
      : null,
    bbox: raw.bbox,
  };
};

const fetchWithTimeout = async (url: string): Promise<Response> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: { accept: 'application/json' },
    });
  } finally {
    clearTimeout(timer);
  }
};

export async function fetchGadmSearch(
  apiBase: string,
  query: string,
  limit = 10
): Promise<GadmSearchItem[]> {
  const q = (query || '').trim();
  const base = normalizeBase(apiBase);
  if (!q || !base) return [];

  const safeLimit = Math.max(1, Math.min(50, Math.floor(limit) || 10));
  const qs = `q=${encodeURIComponent(q)}&limit=${safeLimit}`;

  for (const path of GEO_SEARCH_PATHS) {
    try {
      const res = await fetchWithTimeout(`${base}${path}?${qs}`);
      if (!res.ok) continue;
      const payload = await res.json();
      if (!Array.isArray(payload)) return [];
      const items: GadmSearchItem[] = [];
      for (const raw of payload) {
        const item = toItem(raw);
        if (item) items.push(item);
      }
      return items;
    } catch {
      continue;
    }
  }

  return [];
}
