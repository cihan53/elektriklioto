
import type {
  StationItem,
  ClusterItem,
  StationsResponse,
  StationDetailResponse,
  StationDeepLinkResponse,
  StationReportSummary,
  CreateReportPayload,
  ReportResponse
} from '~/types/station';

export const useStations = () => {
  const config = useRuntimeConfig();

  const stations = useState<StationItem[]>('map-stations', () => []);
  const clusters = useState<ClusterItem[]>('map-clusters', () => []);
  const selectedStation = useState<StationItem | null>('selected-station', () => null);
  const isDetailOpen = useState<boolean>('station-detail-open', () => false);

  const loading = useState<boolean>('stations-loading', () => false);
  const error = useState<string | null>('stations-error', () => null);
  const responseType = useState<'stations' | 'clusters'>('stations-response-type', () => 'stations');

  // Debounce mekanizması için zamanlayıcı referansı
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  const fetchStationsByBBox = (
    bbox: [number, number, number, number],
    zoom: number,
    operatorSlug?: string
  ) => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    debounceTimer = setTimeout(async () => {
      loading.value = true;
      error.value = null;

      try {
        const bboxParam = `${bbox[0].toFixed(5)},${bbox[1].toFixed(5)},${bbox[2].toFixed(5)},${bbox[3].toFixed(5)}`;
        const queryParams: Record<string, any> = {
          bbox: bboxParam,
          zoom: Math.round(zoom)
        };

        if (operatorSlug && operatorSlug.trim() !== '') {
          queryParams.operator = operatorSlug;
        }

        const res = await $fetch<any>(`${config.public.apiBase}/stations`, {
          params: queryParams
        });

        if (Array.isArray(res)) {
          responseType.value = 'stations';
          stations.value = res as StationItem[];
          clusters.value = [];
        } else if (res && res.type === 'clusters') {
          responseType.value = 'clusters';
          clusters.value = (res.data || []) as ClusterItem[];
          stations.value = [];
        } else if (res && res.data) {
          responseType.value = 'stations';
          stations.value = (res.data || []) as StationItem[];
          clusters.value = [];
        } else {
          stations.value = [];
          clusters.value = [];
        }
      } catch (err: any) {
        error.value = err.message || 'İstasyon verisi alınamadı.';
      } finally {
        loading.value = false;
      }
    }, 300); // 300ms debounce
  };

  // İstasyon detayını slug veya kod ile tekil olarak getirir
  const fetchStationDetail = async (slugOrCode: string): Promise<StationItem | null> => {
    try {
      const res = await $fetch<any>(`${config.public.apiBase}/stations/${encodeURIComponent(slugOrCode)}`);
      if (res && res.data) {
        return {
          ...res.data,
          data_freshness: res.data.data_freshness || res.data_freshness || null,
        } as StationItem;
      }
      return res as StationItem | null;
    } catch {
      return null;
    }
  };

  // İstasyon deep-link konfigürasyonunu getirir
  const fetchStationDeepLink = async (slugOrCode: string): Promise<StationDeepLinkResponse | null> => {
    try {
      return await $fetch<StationDeepLinkResponse>(
        `${config.public.apiBase}/stations/${encodeURIComponent(slugOrCode)}/deep-link`
      );
    } catch {
      return null;
    }
  };

  // S4-T2: İstasyon arıza ihbarı oluşturur
  const submitStationReport = async (
    stationId: string,
    payload: CreateReportPayload
  ): Promise<ReportResponse> => {
    return await $fetch<ReportResponse>(
      `${config.public.apiBase}/stations/${encodeURIComponent(stationId)}/reports`,
      {
        method: 'POST',
        body: payload
      }
    );
  };

  // S4-T2: İstasyon arıza özet durumunu getirir
  const fetchStationReportSummary = async (stationId: string): Promise<StationReportSummary | null> => {
    try {
      return await $fetch<StationReportSummary>(
        `${config.public.apiBase}/stations/${encodeURIComponent(stationId)}/reports/summary`
      );
    } catch {
      return null;
    }
  };

  const selectStation = (station: StationItem | null) => {
    selectedStation.value = station;
    isDetailOpen.value = station !== null;
  };

  const closeDetail = () => {
    selectedStation.value = null;
    isDetailOpen.value = false;
  };

  return {
    stations,
    clusters,
    selectedStation,
    isDetailOpen,
    loading,
    error,
    responseType,
    fetchStationsByBBox,
    fetchStationDetail,
    fetchStationDeepLink,
    submitStationReport,
    fetchStationReportSummary,
    selectStation,
    closeDetail
  };
};
