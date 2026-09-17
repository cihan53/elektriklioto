
<script setup lang="ts">
import { useSourceHealth } from '~/composables/useSourceHealth';
import { AlertTriangle, X, ChevronRight, Activity } from 'lucide-vue-next';

const emit = defineEmits<{
  (e: 'openDetails'): void;
}>();

const { hasOutage, isBannerDismissed, staleSourcesCount, dismissBanner } = useSourceHealth();
</script>

<template>
  <aside
    v-if="hasOutage && !isBannerDismissed"
    class="w-full bg-warning-subdued border-b border-warning/30 text-warning px-4 py-2.5 flex items-center justify-between gap-3 text-xs transition-colors z-20"
    role="status"
    aria-live="polite"
    aria-label="Veri kaynağı kesinti bildirimi"
  >
    <div class="flex items-center gap-2.5 flex-1 min-w-0">
      <div class="w-6 h-6 rounded-full bg-warning/20 flex items-center justify-center flex-shrink-0">
        <AlertTriangle class="w-3.5 h-3.5 text-warning" />
      </div>
      <p class="truncate text-text-primary font-medium">
        <span class="font-bold text-warning">Veri Kaynağı Bildirimi:</span>
        {{ staleSourcesCount }} operatör veri kaynağında kesinti/gecikme yaşanıyor (Son güncelleme > 24 saat).
        <span class="hidden sm:inline text-text-secondary">İstasyonlar kesintisiz listelenmektedir.</span>
      </p>
    </div>

    <div class="flex items-center gap-2 flex-shrink-0">
      <button
        type="button"
        @click="emit('openDetails')"
        class="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-warning/15 hover:bg-warning/25 text-text-primary font-semibold text-xs touch-target-min transition-colors focus-visible:outline-none"
      >
        <Activity class="w-3.5 h-3.5 text-warning" />
        <span>Durumu İncele</span>
        <ChevronRight class="w-3 h-3" />
      </button>

      <button
        type="button"
        @click="dismissBanner"
        class="touch-target-min flex items-center justify-center p-1 rounded-md text-text-secondary hover:text-text-primary focus-visible:outline-none"
        aria-label="Bildirimi Kapat"
      >
        <X class="w-4 h-4" />
      </button>
    </div>
  </aside>
</template>
