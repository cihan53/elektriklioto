
import { ref } from 'vue';

export interface VersionInfo {
  service?: string;
  version: string;
  buildId: string;
  buildTime?: number;
  timestamp?: number;
}

// Global state across components/pages
const isUpdateAvailable = ref(false);
const countdown = ref(20);
const currentVersion = ref<string>('');
const currentBuildId = ref<string>('');
const newVersion = ref<string>('');
const newBuildId = ref<string>('');
let countdownTimer: ReturnType<typeof setInterval> | null = null;
let pollTimer: ReturnType<typeof setInterval> | null = null;

export function useVersionCheck() {
  const startCountdown = () => {
    if (countdownTimer) return;
    countdown.value = 20;
    countdownTimer = setInterval(() => {
      countdown.value--;
      if (countdown.value <= 0) {
        reloadNow();
      }
    }, 1000);
  };

  const reloadNow = () => {
    if (countdownTimer) {
      clearInterval(countdownTimer);
      countdownTimer = null;
    }
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  const handleVersionData = (data: VersionInfo) => {
    const buildIdentifier = data.buildId || data.version;
    if (!buildIdentifier) return;

    if (!currentBuildId.value) {
      // İlk yüklemede mevcut build id'sini sabitle
      currentBuildId.value = buildIdentifier;
      currentVersion.value = data.version || '1.0.0';
      return;
    }

    // Yeni bir build/version tespit edilirse ve daha önce uyarı verilmediyse
    if (buildIdentifier !== currentBuildId.value && !isUpdateAvailable.value) {
      newBuildId.value = buildIdentifier;
      newVersion.value = data.version || buildIdentifier;
      isUpdateAvailable.value = true;
      startCountdown();
    }
  };

  const checkVersion = async () => {
    if (typeof window === 'undefined') return;
    try {
      // Cache-busting request
      const response = await fetch(`/api/version?t=${Date.now()}`, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
        },
      });

      if (!response.ok) {
        // Fallback to /version.json
        const fallbackRes = await fetch(`/version.json?t=${Date.now()}`);
        if (!fallbackRes.ok) return;
        const data: VersionInfo = await fallbackRes.json();
        handleVersionData(data);
        return;
      }

      const data: VersionInfo = await response.json();
      handleVersionData(data);
    } catch {
      // Sessiz hata toleransı: Ağ kesintisinde kullanıcıyı rahatsız etme
    }
  };

  // Simülasyon / Test tetikleyicisi
  const triggerUpdate = (fakeNewBuildId: string = 'new-build-' + Date.now(), fakeNewVersion: string = '1.0.1') => {
    newBuildId.value = fakeNewBuildId;
    newVersion.value = fakeNewVersion;
    isUpdateAvailable.value = true;
    startCountdown();
  };

  const resetUpdate = () => {
    if (countdownTimer) {
      clearInterval(countdownTimer);
      countdownTimer = null;
    }
    isUpdateAvailable.value = false;
    countdown.value = 20;
  };

  const initVersionCheck = (intervalMs: number = 20000) => {
    if (typeof window === 'undefined') return;

    // İlk denetim
    checkVersion();

    if (!pollTimer) {
      pollTimer = setInterval(checkVersion, intervalMs);
    }

    // Sekme tekrar aktif olduğunda veya odaklandığında anında kontrol
    window.addEventListener('focus', checkVersion);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        checkVersion();
      }
    });
  };

  return {
    isUpdateAvailable,
    countdown,
    currentVersion,
    currentBuildId,
    newVersion,
    newBuildId,
    reloadNow,
    checkVersion,
    triggerUpdate,
    resetUpdate,
    initVersionCheck,
  };
}
