
<script setup lang="ts">
import { ref, computed } from 'vue';
import type { StationItem } from '~/types/station';
import { useToast } from '~/composables/useToast';
import { X, QrCode, Copy, Smartphone, Route } from 'lucide-vue-next';
import { renderSVG } from 'uqr';

const props = defineProps<{
  station?: StationItem | null;
  routeTitle?: string;
  routePayload?: string;
  isOpen: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const { showToast } = useToast();
const isCopied = ref(false);
const isTeleportDisabled = import.meta.env?.MODE === 'test' || (typeof process !== 'undefined' && process.env?.NODE_ENV === 'test');

const shareUrl = computed(() => {
  if (props.routePayload) {
    return `https://elektriklioto.com/r/${props.routePayload}`;
  }
  if (!props.station) return '';
  const opSlug = props.station.operator?.slug || 'operator';
  return `https://elektriklioto.com/${opSlug}/${props.station.slug}`;
});

// Gerçek, taranabilir dinamik SVG QR Kod matrisi üretimi
const qrSvg = computed(() => {
  if (!shareUrl.value) return '';
  try {
    return renderSVG(shareUrl.value, { border: 2 });
  } catch {
    return '';
  }
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
  <Teleport to="body" :disabled="isTeleportDisabled">
    <div
      v-if="isOpen && (station || routePayload)"
      class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
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

        <div class="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-3 shadow-inner">
          <Route v-if="routePayload" class="w-6 h-6" />
          <Smartphone v-else class="w-6 h-6" />
        </div>

        <h3 id="qr-modal-title" class="text-lg font-bold text-text-primary">
          {{ routePayload ? 'Rotayı Telefona Aktar' : 'İstasyonu Telefona Aktar' }}
        </h3>
        <p class="text-xs text-text-secondary mt-1 max-w-xs leading-relaxed">
          Telefonunuzun kamerasıyla QR kodu okutun. Bilgiler elektriklioto.com mobil uygulamasında anında açılacaktır.
        </p>

        <!-- Dinamik SVG QR Kod Alanı (uqr) -->
        <div class="my-5 p-3 bg-white rounded-lg border border-border-strong shadow-md flex flex-col items-center justify-center">
          <div
            v-if="qrSvg"
            class="w-52 h-52 flex items-center justify-center [&>svg]:w-full [&>svg]:h-full"
            v-html="qrSvg"
          />
          <div v-else class="w-52 h-52 flex items-center justify-center text-slate-400">
            <QrCode class="w-32 h-32" />
          </div>
        </div>

        <!-- Bağlantıyı Kopyala Butonu -->
        <button
          type="button"
          @click="copyLink"
          class="w-full h-11 rounded-md border border-border-strong bg-bg-subdued hover:bg-border-default text-text-primary font-medium text-xs flex items-center justify-center gap-2 touch-target-min transition-colors focus-visible:outline-none"
        >
          <Copy class="w-4 h-4" />
          <span>{{ isCopied ? 'Bağlantı Kopyalandı!' : 'Bağlantıyı Kopyala' }}</span>
        </button>
      </div>
    </div>
  </Teleport>
</template>
