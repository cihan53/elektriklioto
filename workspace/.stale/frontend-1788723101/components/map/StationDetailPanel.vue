
<script setup lang="ts">
import { computed } from 'vue';
import type { StationItem } from '~/types/station';
import { useUserLocation } from '~/composables/useUserLocation';
import { useToast } from '~/composables/useToast';
import {
  X,
  MapPin,
  ExternalLink,
  Navigation,
  QrCode,
  AlertTriangle,
  HelpCircle
} from 'lucide-vue-next';

const props = defineProps<{
  station: StationItem | null;
  isOpen: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'openQrBridge', station: StationItem): void;
  (e: 'openContribute', station: StationItem): void;
  (e: 'openReport', station: StationItem): void;
}>();

const { calculateDistanceKm } = useUserLocation();
const { showToast } = useToast();

const distanceText = computed(() => {
  if (!props.station) return null;
  const d = calculateDistanceKm(props.station.lat, props.station.lon);
  return d !== null ? `~${d} km` : null;
});

// Deep-Link & Clipboard Fallback Mekanizması
const handlePrimaryAction = () => {
  if (!props.station) return;

  const istasyonNo = props.station.istasyon_no || '';
  const op = props.station.operator;

  // Web masaüstü ortamında istasyon kodu panoya kopyalanır ve 4 sn toast verilir.
  if (import.meta.client) {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(istasyonNo).catch(() => {});
    }

    showToast(
      `İstasyon kodu (${istasyonNo}) kopyalandı! Operatör uygulamasında arama kutusuna yapıştırabilirsiniz.`,
      'info',
      4000
    );

    const targetUrl =
      props.station.deep_link?.universal_link_url ||
      op?.deep_link_config?.web_url ||
      op?.website_url ||
      `https://www.google.com/search?q=${encodeURIComponent(op.name + ' şarj istasyonu')}`;

    window.open(targetUrl, '_blank', 'noopener,noreferrer');
  }
};

const handleDirections = () => {
  if (!props.station || !import.meta.client) return;
  const url = `https://www.google.com/maps/dir/?api=1&destination=${props.station.lat},${props.station.lon}`;
  window.open(url, '_blank', 'noopener,noreferrer');
};
</script>

<template>
  <transition
    enter-active-class="transition duration-250 ease-out"
    enter-from-class="opacity-0 translate-y-full sm:translate-y-0 sm:-translate-x-full"
    enter-to-class="opacity-100 translate-y-0 sm:translate-x-0"
    leave-active-class="transition duration-200 ease-in"
    leave-from-class="opacity-100 translate-y-0 sm:translate-x-0"
    leave-to-class="opacity-0 translate-y-full sm:translate-y-0 sm:-translate-x-full"
  >
    <section
      v-if="isOpen && station"
      class="fixed sm:absolute bottom-0 sm:bottom-auto left-0 sm:top-16 sm:bottom-0 w-full sm:w-[380px] max-h-[85vh] sm:max-h-none bg-bg-surface border-t sm:border-t-0 sm:border-r border-border-default shadow-xl z-40 flex flex-col overflow-y-auto p-5 rounded-t-xl sm:rounded-none"
      aria-labelledby="station-detail-heading"
    >
      <!-- Mobil Çekmece Tutamacı (Yalnızca Mobil) -->
      <div class="sm:hidden w-full flex items-center justify-center pb-3">
        <div class="w-9 h-1 rounded-full bg-border-strong" aria-hidden="true" />
      </div>

      <!-- Başlık ve Kapat Butonu -->
      <div class="flex items-start justify-between gap-3 border-b border-border-default pb-4">
        <div>
          <!-- Operatör Adı & Rozet -->
          <div class="flex items-center gap-2 mb-1">
            <span class="w-5 h-5 rounded-full bg-primary text-on-primary flex items-center justify-center text-xs font-bold">
              {{ station.operator.name.charAt(0) }}
            </span>
            <span class="text-sm font-semibold text-text-secondary">{{ station.operator.name }}</span>
          </div>

          <!-- İstasyon Adı -->
          <h2 id="station-detail-heading" class="text-xl font-bold text-text-primary leading-tight">
            {{ station.name }}
          </h2>

          <!-- EPDK Sicil Rozeti -->
          <div class="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-bg-subdued border border-border-strong text-xs font-mono text-text-secondary">
            <span>EPDK:</span>
            <span class="font-bold text-text-primary">{{ station.istasyon_no }}</span>
          </div>
        </div>

        <button
          type="button"
          @click="emit('close')"
          class="touch-target-min flex items-center justify-center text-text-secondary hover:text-text-primary rounded-md p-1 focus-visible:outline-none"
          aria-label="İstasyon Detayını Kapat"
        >
          <X class="w-6 h-6" />
        </button>
      </div>

      <!-- Durum Rozetleri & Mesafe -->
      <div class="flex items-center flex-wrap gap-2 py-3 border-b border-border-default">
        <span
          class="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium"
          :class="station.service_type === 'Özel' ? 'bg-warning-subdued text-warning' : 'bg-success-subdued text-success'"
        >
          <span class="w-1.5 h-1.5 rounded-full bg-current"></span>
          {{ station.service_type || 'Halka Açık' }}
        </span>

        <!-- Mesafe Rozeti: Konum izni yoksa gizlenir -->
        <span
          v-if="distanceText"
          class="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium bg-bg-subdued text-text-secondary border border-border-default"
        >
          <Navigation class="w-3 h-3 text-primary" />
          {{ distanceText }}
        </span>

        <!-- Arıza İhbar Rozeti -->
        <span
          v-if="station.status === 'ISSUE_REPORTED'"
          class="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium bg-danger-subdued text-danger border border-danger/30"
        >
          <AlertTriangle class="w-3 h-3 text-danger" />
          Arıza Bildirildi
        </span>
      </div>

      <!-- Adres Bilgisi -->
      <div class="py-4 border-b border-border-default flex items-start gap-2.5">
        <MapPin class="w-5 h-5 text-text-secondary flex-shrink-0 mt-0.5" />
        <div class="text-sm text-text-secondary leading-relaxed">
          <p>{{ station.address || 'Adres bilgisi EPDK sicilinde belirtilmemiş.' }}</p>
          <p class="font-semibold text-text-primary mt-1">
            {{ station.district || '' }} / {{ station.city || '' }}
          </p>
        </div>
      </div>

      <!-- Faz 1 Zorunlu Kısıt: Eksik Veri Rozetleri (Soket / Güç / Tarife) -->
      <div class="py-4 border-b border-border-default space-y-3">
        <div class="flex items-center justify-between">
          <h3 class="text-sm font-semibold text-text-primary">Soket ve Güç Bilgileri</h3>
          <!-- [+ Bilgi Ekle] Katkı Butonu -->
          <button
            type="button"
            @click="emit('openContribute', station)"
            class="touch-target-min text-xs font-medium text-primary hover:underline flex items-center gap-1 focus-visible:outline-none"
          >
            + Bilgi Ekle
          </button>
        </div>

        <!-- Standart Nötr Gri Rozet (Uydurma Veri YASAKTIR) -->
        <div class="p-3 rounded-md bg-missing-bg border border-border-default flex items-center justify-between gap-2">
          <div class="flex items-center gap-2 text-xs text-missing-text font-medium">
            <HelpCircle class="w-4 h-4 flex-shrink-0 text-text-secondary" />
            <span>Operatör Verisi Bekleniyor</span>
          </div>
          <span class="text-[11px] text-text-muted">Faz 1 Sicil</span>
        </div>

        <!-- Tarife & Doluluk Bilgisi -->
        <div class="text-xs text-text-secondary space-y-1">
          <p>Tarife: <span class="text-text-muted">Operatör Verisi Bekleniyor</span></p>
          <p>Canlı Doluluk: <span class="text-text-muted">Canlı durum verisi henüz açılmadı</span></p>
        </div>
      </div>

      <!-- Aksiyon Buton Grubu -->
      <div class="py-4 space-y-2.5">
        <!-- Birincil Eylem (Masaüstü: Operatör Web Sitesine Git & Kopyala) -->
        <button
          type="button"
          @click="handlePrimaryAction"
          class="w-full h-12 rounded-md bg-primary hover:bg-primary-hover text-on-primary font-medium text-sm flex items-center justify-center gap-2 shadow-sm transition-transform active:scale-[0.98] focus-visible:outline-none"
        >
          <span>Operatör Web Sitesine Git</span>
          <ExternalLink class="w-4 h-4" />
        </button>
        <p class="text-[11px] text-text-muted text-center leading-tight">
          Masaüstü ortamında doğrudan şarj başlatılamaz; operatör web sitesine gidebilir veya QR ile telefona aktarabilirsiniz.
        </p>

        <!-- İkincil Eylem Butonları -->
        <div class="grid grid-cols-2 gap-2 pt-1">
          <button
            type="button"
            @click="handleDirections"
            class="h-11 rounded-md border border-border-strong bg-bg-subdued hover:bg-border-default text-text-primary text-xs font-medium flex items-center justify-center gap-1.5 focus-visible:outline-none"
          >
            <Navigation class="w-3.5 h-3.5" />
            <span>Yol Tarifi Al</span>
          </button>

          <button
            type="button"
            @click="emit('openQrBridge', station)"
            class="h-11 rounded-md border border-border-strong bg-bg-subdued hover:bg-border-default text-text-primary text-xs font-medium flex items-center justify-center gap-1.5 focus-visible:outline-none"
          >
            <QrCode class="w-3.5 h-3.5" />
            <span>Telefona Aktar</span>
          </button>
        </div>

        <!-- Arıza Bildir Bağlantısı -->
        <button
          type="button"
          @click="emit('openReport', station)"
          class="w-full text-center py-2 text-xs font-medium text-danger hover:underline flex items-center justify-center gap-1.5 focus-visible:outline-none touch-target-min"
        >
          <AlertTriangle class="w-3.5 h-3.5" />
          <span>İstasyonla ilgili sorun mu var? Arıza Bildir</span>
        </button>
      </div>

      <!-- Dipnot ve Yasal EMP Beyanı (Zorunlu Kısıt) -->
      <div class="mt-auto pt-4 border-t border-border-default text-[11px] text-text-secondary leading-relaxed space-y-1.5">
        <p class="font-medium text-text-muted">
          Veri Kaynağı: EPDK Sicil Kaydı (Eylül 2026)
        </p>
        <p class="text-text-muted">
          elektriklioto.com lisanslı şarj operatörü değildir. Şarj başlatma ve faturalandırma ilgili operatörün sorumluluğundadır.
        </p>
      </div>
    </section>
  </transition>
</template>
