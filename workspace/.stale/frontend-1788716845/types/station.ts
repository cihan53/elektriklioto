
export interface OperatorItem {
  id: number;
  name: string;
  slug: string;
  logo_url?: string | null;
  is_active: boolean;
  deep_link_config?: {
    scheme?: string;
    store_ios?: string;
    store_android?: string;
    web_url?: string;
    clipboard_fallback?: boolean;
  } | null;
}

export interface StationItem {
  id: string;
  istasyon_no: string;
  slug: string;
  name: string;
  operator: OperatorItem;
  lat: number;
  lon: number;
  address: string | null;
  city: string | null;
  district: string | null;
  // Faz 1 Zorunlu Kısıt: Soket, güç ve tarife verisi kaynakta yoktur; kesinlikle null döner.
  connector_types: null;
  power_kw: null;
  current_tariff: null;
  connectors: any[] | null;
  status: string | null;
  service_type?: 'Halka Açık' | 'Özel' | string | null;
  updated_at: string;
}

export interface ClusterItem {
  cluster_id: string;
  count: number;
  lat: number;
  lon: number;
}

export interface StationsResponse {
  type: 'stations' | 'clusters';
  zoom: number;
  count: number;
  data: StationItem[] | ClusterItem[];
}

export interface StationDetailResponse {
  data: StationItem;
  disclaimer: string;
}
