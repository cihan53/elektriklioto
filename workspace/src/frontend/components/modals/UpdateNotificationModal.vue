
<script setup lang="ts">
import { onMounted, computed } from 'vue';
import { useVersionCheck } from '~/composables/useVersionCheck';

const {
  isUpdateAvailable,
  countdown,
  currentVersion,
  newVersion,
  reloadNow,
  initVersionCheck
} = useVersionCheck();

onMounted(() => {
  initVersionCheck(20000);
});

const progressPercent = computed(() => {
  return Math.max(0, Math.min(100, (countdown.value / 20) * 100));
});
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="isUpdateAvailable"
        class="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
        role="dialog"
        aria-modal="true"
        aria-labelledby="update-modal-title"
        data-testid="update-notification-modal"
      >
        <div
          class="w-full max-w-md bg-bg-surface border border-border-default rounded-xl shadow-xl p-6 flex flex-col gap-4 text-text-primary animate-in fade-in zoom-in-95 duration-200"
        >
          <!-- İkon ve Başlık -->
          <div class="flex items-center gap-3">
            <div
              class="w-11 h-11 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0"
              aria-hidden="true"
            >
              <svg
                class="w-6 h-6 animate-spin-slow"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="2"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </div>
            <div>
              <h2
                id="update-modal-title"
                class="text-h3 font-semibold text-text-primary"
              >
                Yeni Sürüm Yayınlandı
              </h2>
              <p class="text-caption text-text-secondary mt-0.5 font-medium">
                Yeni sürüm yayınlandı, sayfa güncelleniyor ({{ countdown }}s)
              </p>
            </div>
          </div>

          <!-- Açıklama Metni -->
          <p class="text-body-md text-text-secondary leading-relaxed">
            elektriklioto.com üzerinde yeni bir güncelleme yayına alındı. En güncel harita ve istasyon verilerini görüntüleyebilmeniz için sayfa otomatik yenileniyor.
          </p>

          <!-- 20s Geri Sayım İlerleme Çubuğu -->
          <div class="space-y-1.5">
            <div class="flex justify-between text-body-sm font-medium text-text-secondary">
              <span>Otomatik yenileme</span>
              <span class="font-mono tabular-nums text-primary font-bold">
                {{ countdown }} saniye
              </span>
            </div>
            <div
              class="w-full h-2 bg-bg-subdued rounded-full overflow-hidden border border-border-default"
            >
              <div
                class="h-full bg-primary transition-all duration-1000 ease-linear rounded-full"
                :style="{ width: `${progressPercent}%` }"
              />
            </div>
          </div>

          <!-- Aksiyon Butonu: Şimdi Yenile -->
          <div class="pt-2 flex flex-col gap-2">
            <button
              type="button"
              class="w-full min-h-[44px] px-5 py-2.5 bg-primary hover:bg-primary-hover active:bg-primary-active text-on-primary font-medium text-body-md rounded-md shadow-sm transition-all focus-visible:outline focus-visible:outline-3 focus-visible:outline-focus-ring focus-visible:outline-offset-2 flex items-center justify-center gap-2 cursor-pointer"
              data-testid="reload-now-btn"
              @click="reloadNow"
            >
              <svg
                class="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="2"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              <span>Şimdi Yenile</span>
            </button>
            <p class="text-caption text-text-muted text-center">
              Açık olan tüm sekmeleriniz en güncel sürüme senkronize edilir.
            </p>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

@keyframes spinSlow {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.animate-spin-slow {
  animation: spinSlow 8s linear infinite;
}
</style>
