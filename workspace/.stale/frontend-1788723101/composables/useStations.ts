
import type {
  StationItem,
  ClusterItem,
  StationsResponse,
  StationDetailResponse,
  StationDeepLinkResponse
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

        const res = await $fetch<StationsResponse>(`${config.public.apiBase}/stations`, {
          params: queryParams
        });

        responseType.value = res.type;
        if (res.type === 'clusters') {
          clusters.value = res.data as ClusterItem[];
          stations.value = [];
        } else {
          stations.value = res.data as StationItem[];
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
      const res = await $fetch<StationDetailResponse>(`${config.public.apiBase}/stations/${encodeURIComponent(slugOrCode)}`);
      return res.data;
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

  const selectStation = (st: StationItem | null) => {
    selectedStation.value = st;
    isDetailOpen.value = !!st;
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
    selectStation,
    closeDetail
  };
};
