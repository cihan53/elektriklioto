
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

export interface GadmProvince {
  gid: string;
  name: string;
  slug: string;
  plate_code: number;
  center: GadmCoordinates;
  bbox: GadmBBox;
  district_count: number;
}

export interface GadmDistrict {
  gid: string;
  province_slug: string;
  province_name: string;
  name: string;
  slug: string;
  center: GadmCoordinates;
  bbox: GadmBBox;
  neighborhood_count: number;
}

export interface GadmNeighborhood {
  gid: string;
  province_slug: string;
  district_slug: string;
  name: string;
  slug: string;
  center: GadmCoordinates;
  bbox: GadmBBox;
  postal_code?: string;
}

export interface GeocodeResult {
  query: string;
  type: 'province' | 'district' | 'neighborhood';
  name: string;
  display_name: string;
  province: string;
  district: string | null;
  neighborhood: string | null;
  coordinates: GadmCoordinates;
  bbox: GadmBBox;
  gadm_id: string;
  confidence: number;
}

export interface ReverseGeocodeResult {
  coordinates: GadmCoordinates;
  province: string;
  province_slug: string;
  district: string | null;
  district_slug: string | null;
  neighborhood: string | null;
  neighborhood_slug: string | null;
  formatted_address: string;
  distance_meters: number;
  gadm_id: string;
}

export interface GadmSearchResult {
  type: 'province' | 'district' | 'neighborhood';
  name: string;
  display_name: string;
  slug: string;
  province_name: string;
  district_name?: string;
  coordinates: GadmCoordinates;
  bbox: GadmBBox;
}
