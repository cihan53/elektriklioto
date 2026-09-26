
import { ref, computed } from 'vue';
import defaultChangelog from '~/data/changelog.json';

export interface ChangelogItem {
  id: string;
  title: string;
  category: 'feature' | 'bug' | 'ux' | 'data' | 'infra';
  categoryLabel: string;
  scope: string;
  description: string;
  status: 'COZULDU' | 'GELISTIRILIYOR' | 'PLANLANDI';
  githubIssueNumber?: number;
  date: string;
}

export interface ReleaseVersion {
  version: string;
  buildId: string;
  date: string;
  isLatest: boolean;
  summary: string;
  items: ChangelogItem[];
}

export interface ChangelogApiResponse {
  success: boolean;
  version: string;
  buildId: string;
  latestReleaseDate: string;
  totalResolved: number;
  releasesCount: number;
  releases: ReleaseVersion[];
  syncedAt?: string;
}

// Global shared reactive state
const releases = ref<ReleaseVersion[]>(
  JSON.parse(JSON.stringify(defaultChangelog.releases))
);
const isLoading = ref(false);
const isSyncing = ref(false);
const lastSyncTime = ref<string>('Az önce');
const syncError = ref<string | null>(null);
let pollTimer: ReturnType<typeof setInterval> | null = null;
let isInitialized = false;

export function useChangelog() {
  const latestRelease = computed<ReleaseVersion | undefined>(() => releases.value[0]);
  const latestVersion = computed<string>(() => latestRelease.value?.version || 'v1.4.0');
  const latestReleaseDate = computed<string>(() => latestRelease.value?.date || '26 Eylül 2026');

  const totalResolvedCount = computed<number>(() => {
    return releases.value.reduce((total, rel) => {
      return total + rel.items.filter((item) => item.status === 'COZULDU').length;
    }, 0);
  });

  const fetchChangelog = async () => {
    if (typeof window === 'undefined') return;
    isSyncing.value = true;
    syncError.value = null;

    try {
      const res = await fetch(`/api/changelog?t=${Date.now()}`, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache'
        }
      });

      if (!res.ok) {
        // Fallback to static public json
        const fallbackRes = await fetch(`/changelog.json?t=${Date.now()}`);
        if (!fallbackRes.ok) throw new Error('API ve fallback yanıt vermedi');
        const fallbackData = await fallbackRes.json();
        if (Array.isArray(fallbackData.releases)) {
          releases.value = fallbackData.releases;
          lastSyncTime.value = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
        }
        return;
      }

      const data: ChangelogApiResponse = await res.json();
      if (Array.isArray(data.releases) && data.releases.length > 0) {
        releases.value = data.releases;
        lastSyncTime.value = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
      }
    } catch (err: any) {
      syncError.value = err?.message || 'Senkronizasyon hatası';
    } finally {
      isSyncing.value = false;
      isLoading.value = false;
    }
  };

  const refresh = () => {
    return fetchChangelog();
  };

  const resetChangelog = () => {
    releases.value = JSON.parse(JSON.stringify(defaultChangelog.releases));
    isSyncing.value = false;
    isLoading.value = false;
    syncError.value = null;
  };

  const initChangelogSync = (intervalMs: number = 30000) => {
    if (typeof window === 'undefined') return;
    if (isInitialized) return;
    isInitialized = true;

    // İlk arka plan çekimi
    fetchChangelog();

    // Periyodik kontrol
    if (!pollTimer) {
      pollTimer = setInterval(fetchChangelog, intervalMs);
    }

    // Sekme odaklanması ve görünürlük değişikliklerinde otomatik tazele
    window.addEventListener('focus', fetchChangelog);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        fetchChangelog();
      }
    });
  };

  return {
    releases,
    latestRelease,
    latestVersion,
    latestReleaseDate,
    totalResolvedCount,
    isLoading,
    isSyncing,
    lastSyncTime,
    syncError,
    fetchChangelog,
    refresh,
    resetChangelog,
    initChangelogSync
  };
}
