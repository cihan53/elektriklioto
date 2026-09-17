
export interface DeepLinkStoreUrls {
  ios?: string | null;
  android?: string | null;
}

export interface OperatorItem {
  id: number;
  name: string;
  slug: string;
  logo_url?: string | null;
  website_url?: string | null;
  is_active: boolean;
  deep_link_config?: {
    scheme?: string | null;
    store_ios?: string | null;
    store_android?: string | null;
    web_url?: string | null;
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
  data_badge?: {
    code: string;
    label: string;
    description: string;
  };
  deep_link?: {
    operator_slug: string;
    station_code: string;
    app_scheme_url: string | null;
    universal_link_url: string | null;
    store_urls: DeepLinkStoreUrls;
    clipboard_fallback: boolean;
    clipboard_text: string;
  };
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
  disclaimer?: string;
}

export interface StationDeepLinkResponse {
  station_id: string;
  station_code: string;
  station_name: string;
  operator_slug: string;
  operator_name: string;
  app_scheme_url: string | null;
  universal_link_url: string | null;
  store_urls: DeepLinkStoreUrls;
  clipboard_fallback: boolean;
  clipboard_text: string;
  instructions: string;
}
