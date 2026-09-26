
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
  station_count?: number;
  deep_link_config?: {
    scheme?: string | null;
    store_ios?: string | null;
    store_android?: string | null;
    web_url?: string | null;
    clipboard_fallback?: boolean;
  } | null;
}

export interface StationReportSummary {
  station_id: string;
  is_flagged_defective: boolean;
  active_report_count: number;
  defect_threshold: number;
}

export type IssueTypeCode = 'DEFECTIVE' | 'CABLE_LOCKED' | 'ICE_BLOCK' | 'ACCESS_ISSUE' | 'OTHER';

export interface CreateReportPayload {
  issue_type: IssueTypeCode;
  nonce: string;
  proximity_proof: string;
  description?: string;
}

export interface ReportResponse {
  id: string;
  station_id: string;
  issue_type: string;
  proximity_verified: boolean;
  is_flagged_defective: boolean;
  created_at: string;
}

// S5 US-18: Veri Tazeliği Rozeti (24 Saat Kuralı)
export interface DataFreshness {
  is_stale: boolean;
  last_updated_text: string;
}

// S5 US-18: Veri Kaynağı Sağlık ve Kesinti Kaydı
export interface SourceHealthItem {
  id: number;
  operator_id: number;
  source_name: string;
  endpoint_url: string;
  circuit_state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' | string;
  consecutive_failures: number;
  last_successful_sync: string | null;
  last_attempt_at: string | null;
  last_error: string | null;
  is_healthy: boolean;
}

export interface SourcesHealthResponse {
  status: string;
  total_sources: number;
  healthy_sources: number;
  stale_sources: number;
  sources: SourceHealthItem[];
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
  // Faz 1 Zorunlu Kısıt & CPO Zenginleştirme: Soket, güç ve tarife verisi kaynakta yoksa null, Voltrun/ZES gibi kaynaklardan zenginleştirilmişse tipleri desteklenir.
  connector_types: string[] | string | null;
  power_kw: number | null;
  current_tariff: string | null;
  connectors: any[] | null;
  status: string | null;
  service_type?: 'Halka Açık' | 'Özel' | string | null;
  updated_at: string;
  is_flagged_defective?: boolean;
  active_report_count?: number;
  report_summary?: StationReportSummary;
  // S5 US-18: 24 Saat Veri Tazeliği Rozeti
  data_freshness?: DataFreshness;
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

export interface RouteBridgeStop {
  station_id: string;
  name: string;
  operator_slug: string;
  lat: number;
  lon: number;
}

export interface RouteBridgeDecodedResponse {
  title?: string;
  stops: RouteBridgeStop[];
  created_at?: string;
  expires_at?: string;
  version?: number;
}
