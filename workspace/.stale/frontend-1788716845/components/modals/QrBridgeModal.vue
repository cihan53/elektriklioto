
<script setup lang="ts">
import { ref, computed } from 'vue';
import type { StationItem } from '~/types/station';
import { useToast } from '~/composables/useToast';
import { X, QrCode, Copy, Check, Smartphone } from 'lucide-vue-next';

const props = defineProps<{
  station: StationItem | null;
  isOpen: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const { showToast } = useToast();
const isCopied = ref(false);

const shareUrl = computed(() => {
  if (!props.station) return '';
  return `https://elektriklioto.com/istasyon/${props.station.slug}`;
});

const copyLink = async () => {
  if (!import.meta.client || !shareUrl.value) return;
  try {
    await navigator.clipboard.writeText(shareUrl.value);
    isCopied.value = true;
    showToast('Bağlantı panoya kopyalandı!', 'success');
    setTimeout(() => {
      isCopied.value = false;
    }, 2500);
  } catch {
    showToast('Kopyalama başarısız oldu.', 'error');
  }
};
</script>

<template>
  <div
    v-if="isOpen && station"
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
    role="dialog"
    aria-modal="true"
    aria-labelledby="qr-modal-title"
  >
    <div
      class="w-full max-w-md bg-bg-surface border border-border-default rounded-xl shadow-2xl p-6 relative flex flex-col items-center text-center"
    >
      <!-- Kapat Butonu -->
      <button
        type="button"
        @click="emit('close')"
        class="absolute top-4 right-4 touch-target-min flex items-center justify-center text-text-secondary hover:text-text-primary rounded-md focus-visible:outline-none"
        aria-label="Modalı Kapat"
      >
        <X class="w-5 h-5" />
      </button>

      <div class="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-3">
        <Smartphone class="w-6 h-6" />
      </div>

      <h3 id="qr-modal-title" class="text-lg font-bold text-text-primary">
        Rotayı Telefona Aktar
      </h3>
      <p class="text-xs text-text-secondary mt-1 max-w-xs leading-relaxed">
        Telefonunuzun kamerasıyla QR kodu okutun. İstasyon bilgisi doğrudan mobil uygulamada açılacaktır.
      </p>

      <!-- Dinamik QR Kod Temsil Kutusu (SVG Matrisi) -->
      <div class="my-5 p-4 bg-white rounded-lg border border-border-strong shadow-inner">
        <div class="w-48 h-48 bg-slate-100 flex flex-col items-center justify-center text-slate-800 rounded border border-slate-200">
          <QrCode class="w-32 h-32 text-slate-900" />
          <span class="text-[10px] font-mono mt-1 text-slate-500">{{ station.istasyon_no }}</span>
        </div>
      </div>

      <!-- Bağlantıyı Kopyala Butonu -->
      <button
        type="button"
        @click="copyLink"
        class="w-full h-11 rounded-md border border-border-strong bg-bg-subdued hover:bg-border-default text-text-primary text-xs font-semibold flex items-center justify-center gap-2 touch-target-min focus-visible:outline-none"
      >
        <Check v-if="isCopied" class="w-4 h-4 text-success" />
        <Copy v-else class="w-4 h-4" />
        <span>{{ isCopied ? 'Kopyalandı!' : 'Bağlantıyı Kopyala' }}</span>
      </button>
    </div>
  </div>
</template>
