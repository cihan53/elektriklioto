
// TALEP-049: SearchInput.vue tarafından beklenen GADM CBS arama istemcisi.
// Bu dosyanın eksikliği canlı ortamda "Cannot find module './geoSearch'"
// hatasına yol açarak ana ekranı kilitliyordu. Backend `modules/gadm`
// rotaları `/api/v1/gadm` ve `/api/v1/geo` takma adlarıyla sunulur;
// istemci iki prefix'i sırayla dener, ikisi de erişilemezse sessizce
// boş dizi döner ve bileşen yerel TURKEY_ALL_DISTRICTS dizinine düşer.
//
// TALEP-045: ilk uç 200 döndüğü hâlde dizi dışı gövde (ör. sarmalanmış
// {results} yükü veya bozuk JSON) verirse zincir artık kırılmaz — ikinci
// takma ad da denenir; iki uç da kullanılabilir sonuç üretmezse [] döner.

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

// Yanıt gövdesi çıplak dizi olabileceği gibi {results|items|data: []}
// sarmalı da olabilir; ikisi de kabul edilir, aksi hâlde null döner.
const extractPayloadArray = (payload: unknown): any[] | null => {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === 'object') {
    const box = payload as Record<string, unknown>;
    for (const key of ['results', 'items', 'data']) {
      if (Array.isArray(box[key])) return box[key] as any[];
    }
  }
  return null;
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
  const q = (query || '').trim().normalize('NFC');
  const base = normalizeBase(apiBase);
  if (!q || !base) return [];

  const safeLimit = Math.max(1, Math.min(50, Math.floor(limit) || 10));
  const qs = `q=${encodeURIComponent(q)}&limit=${safeLimit}`;

  for (const path of GEO_SEARCH_PATHS) {
    try {
      const res = await fetchWithTimeout(`${base}${path}?${qs}`);
      if (!res.ok) continue;
      const payload = await res.json();
      // TALEP-045: beklenmeyen gövde şekli zinciri kırmaz, sıradaki takma ad denenir.
      const list = extractPayloadArray(payload);
      if (!list) continue;
      const items: GadmSearchItem[] = [];
      for (const raw of list) {
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
