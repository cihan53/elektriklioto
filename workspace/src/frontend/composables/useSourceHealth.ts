
import { computed } from 'vue';
import type { SourcesHealthResponse, SourceHealthItem, DataFreshness } from '~/types/station';

export const useSourceHealth = () => {
  const config = useRuntimeConfig();

  const healthData = useState<SourcesHealthResponse | null>('sources-health-data', () => null);
  const loading = useState<boolean>('sources-health-loading', () => false);
  const error = useState<string | null>('sources-health-error', () => null);
  const isModalOpen = useState<boolean>('sources-health-modal-open', () => false);
  const isBannerDismissed = useState<boolean>('sources-health-banner-dismissed', () => false);

  const sources = computed<SourceHealthItem[]>(() => healthData.value?.sources || []);

  const staleSources = computed<SourceHealthItem[]>(() =>
    sources.value.filter(
      (s) =>
        !s.is_healthy ||
        s.circuit_state === 'OPEN' ||
        (s.last_successful_sync && Date.now() - new Date(s.last_successful_sync).getTime() > 24 * 60 * 60 * 1000)
    )
  );

  const staleSourcesCount = computed<number>(() => staleSources.value.length);

  const hasOutage = computed<boolean>(() => staleSourcesCount.value > 0);

  /**
   * CPO veri kaynaklarının sağlık durumunu sorgular (US-18).
   * Kesinti olsa dahi platformun %100 kesintisiz çalışması garanti edilir.
   */
  const fetchSourcesHealth = async (): Promise<SourcesHealthResponse | null> => {
    loading.value = true;
    error.value = null;
    try {
      const res = await $fetch<SourcesHealthResponse>(`${config.public.apiBase}/health/sources`);
      healthData.value = res;
      return res;
    } catch (err: any) {
      error.value = err.message || 'Kaynak sağlık verisi alınamadı';
      return null;
    } finally {
      loading.value = false;
    }
  };

  /**
   * İstasyonun son güncellenme zamanına göre tazelik rozeti üretir (US-18 24 Saat Kuralı).
   * Son güncelleme > 24 saat ise "Son güncelleme: X gün/saat önce" nötr gri rozeti üretilir.
   */
  const formatFreshnessText = (updatedAtDate: Date | string | null | undefined, now = new Date()): DataFreshness => {
    if (!updatedAtDate) {
      return {
        is_stale: true,
        last_updated_text: 'Operatör Verisi Bekleniyor',
      };
    }

    const date = updatedAtDate instanceof Date ? updatedAtDate : new Date(updatedAtDate);
    const diffMs = Math.max(0, now.getTime() - date.getTime());
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    const isStale = diffHours >= 24;

    let text: string;
    if (diffDays >= 1) {
      text = `Son güncelleme: ${diffDays} gün önce`;
    } else if (diffHours >= 1) {
      text = `Son güncelleme: ${diffHours} saat önce`;
    } else {
      text = 'Son güncelleme: az önce';
    }

    return {
      is_stale: isStale,
      last_updated_text: text,
    };
  };

  const openModal = () => {
    isModalOpen.value = true;
  };

  const closeModal = () => {
    isModalOpen.value = false;
  };

  const dismissBanner = () => {
    isBannerDismissed.value = true;
  };

  return {
    healthData,
    sources,
    staleSources,
    staleSourcesCount,
    hasOutage,
    loading,
    error,
    isModalOpen,
    isBannerDismissed,
    fetchSourcesHealth,
    formatFreshnessText,
    openModal,
    closeModal,
    dismissBanner,
  };
};
