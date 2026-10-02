
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

// TALEP-054 & TALEP-059: Haritada mükerrer istasyon kayıtlarının sayıyı şişirmesini önleyen istemci tekilleştirmesi.
// TALEP-061: Mükerrer kayıt ve küme tekilleştirme genişletmesi.
// Aynı id, slug veya aynı kanonik istasyon_no / operatör + konum imzasına sahip mükerrerler elenir.
export const deduplicateStations = (list: StationItem[]): StationItem[] => {
  if (!Array.isArray(list)) return [];
  const seenKeys = new Set<string>();
  const result: StationItem[] = [];

  for (const item of list) {
    if (!item) continue;
    // 1. Birincil kimlik anahtarları (id, slug ve kanonik istasyon_no)
    const idKey = item.id ? `id:${item.id}` : null;
    const slugKey = item.slug ? `slug:${item.slug}` : null;
    const rawNo = (item as any).istasyon_no ? String((item as any).istasyon_no).trim().toLowerCase() : '';
    const noKey = rawNo
      ? `no:${rawNo.replace(/ş/g, 's').replace(/ı/g, 'i').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ö/g, 'o').replace(/ç/g, 'c')}`
      : null;

    if (idKey && seenKeys.has(idKey)) continue;
    if (slugKey && seenKeys.has(slugKey)) continue;
    if (noKey && seenKeys.has(noKey)) continue;

    // 2. Fiziksel saha imzası: operatör + yaklaşık koordinat (3 ondalık ~110m) + normalize isim
    const lat = typeof item.lat === 'number' ? item.lat : parseFloat(String(item.lat));
    const lon = typeof item.lon === 'number' ? item.lon : parseFloat(String(item.lon));
    const op = String((item as any).operator_id || (item as any).operator_slug || '');
    const nameNorm = (item.name || '').trim().toLowerCase()
      .replace(/ş/g, 's').replace(/ı/g, 'i').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ö/g, 'o').replace(/ç/g, 'c');

    if (!Number.isNaN(lat) && !Number.isNaN(lon)) {
      const sigKey = `sig:${op}:${lat.toFixed(3)}:${lon.toFixed(3)}:${nameNorm}`;
      if (seenKeys.has(sigKey)) {
        continue;
      }
      seenKeys.add(sigKey);
    }

    if (idKey) seenKeys.add(idKey);
    if (slugKey) seenKeys.add(slugKey);
    if (noKey) seenKeys.add(noKey);
    result.push(item);
  }

  return result;
};

// TALEP-054 & TALEP-061: Kümeleme yanıtlarında mükerrer cluster kayıtlarını ayıklar
export const deduplicateClusters = (list: ClusterItem[]): ClusterItem[] => {
  if (!Array.isArray(list)) return [];
  const seen = new Set<string>();
  const result: ClusterItem[] = [];
  for (const c of list) {
    if (!c) continue;
    const key = c.cluster_id ? `id:${c.cluster_id}` : `pos:${c.center_lat?.toFixed(2)}:${c.center_lon?.toFixed(2)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(c);
  }
  return result;
};

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

        // TALEP-022, TALEP-064 & TALEP-068: Veritabanı tek gerçek kaynaktır (Single Source of Truth).
        // Veritabanı boşaltıldığında veya fallback devre dışı bırakıldığında API'den dönen data: []
        // sonucu haritada sıfır pin / sıfır küme olarak şeffaf şekilde yansıtılır.
        if (Array.isArray(res)) {
          responseType.value = 'stations';
          stations.value = deduplicateStations(res as StationItem[]);
          clusters.value = [];
        } else if (res && res.type === 'clusters') {
          responseType.value = 'clusters';
          clusters.value = deduplicateClusters((res.data || []) as ClusterItem[]);
          stations.value = [];
        } else if (res && res.data) {
          responseType.value = 'stations';
          stations.value = deduplicateStations((res.data || []) as StationItem[]);
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

  // Kitle kaynaklı arıza bildirimi (Sıfır Konum Saklama - HMAC Proximity Proof)
  const submitStationReport = async (
    stationIdOrSlug: string,
    payload: CreateReportPayload,
    deviceUid: string
  ): Promise<ReportResponse> => {
    const res = await $fetch<ReportResponse>(
      `${config.public.apiBase}/stations/${encodeURIComponent(stationIdOrSlug)}/reports`,
      {
        method: 'POST',
        headers: {
          'x-device-attestation': deviceUid,
        },
        body: payload,
      }
    );

    // İstasyon haritada ve detayda dinamik olarak arızalı etiketlensin
    if (res.is_flagged_defective) {
      if (selectedStation.value && (selectedStation.value.id === res.station_id || selectedStation.value.slug === stationIdOrSlug)) {
        selectedStation.value.is_flagged_defective = true;
        selectedStation.value.status = 'DEFECTIVE';
      }
      const mapStation = stations.value.find((s) => s.id === res.station_id || s.slug === stationIdOrSlug);
      if (mapStation) {
        mapStation.is_flagged_defective = true;
        mapStation.status = 'DEFECTIVE';
      }
    }

    return res;
  };

  // İstasyon arıza özetini sorgular
  const fetchStationReportsSummary = async (
    stationIdOrSlug: string
  ): Promise<StationReportSummary | null> => {
    try {
      return await $fetch<StationReportSummary>(
        `${config.public.apiBase}/stations/${encodeURIComponent(stationIdOrSlug)}/reports/summary`
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
    submitStationReport,
    fetchStationReportsSummary,
    selectStation,
    closeDetail
  };
};
