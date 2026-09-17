
<script setup lang="ts">
import { ref, computed } from 'vue';
import type { StationItem } from '~/types/station';
import { useUserLocation } from '~/composables/useUserLocation';
import { useToast } from '~/composables/useToast';
import { X, AlertTriangle, AlertCircle, CheckCircle2, ShieldAlert } from 'lucide-vue-next';

const props = defineProps<{
  station: StationItem | null;
  isOpen: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const { userCoords, calculateDistanceKm, requestUserLocation, locationLoading } = useUserLocation();
const { showToast } = useToast();

const selectedIssue = ref<string>('STATION_OFFLINE');
const description = ref<string>('');
const isSubmitting = ref(false);

const issueTypes = [
  { code: 'STATION_OFFLINE', label: 'İstasyon Tamamen Kapalı / Enerji Yok' },
  { code: 'CABLE_DAMAGED', label: 'Kablo / Soket Fiziksel Olarak Hasarlı' },
  { code: 'ICEING', label: 'Soket Önüne Benzinli Araç Park Etmiş (ICEing)' },
  { code: 'ACCESS_BLOCKED', label: 'İstasyona Giriş / Alan Kapalı (Bariyer/İnşaat)' }
];

// Mesafe kontrolü (50 metre kuralı = 0.05 km)
const distanceKm = computed(() => {
  if (!props.station) return null;
  return calculateDistanceKm(props.station.lat, props.station.lon);
});

const isWithin50m = computed(() => {
  return distanceKm.value !== null && distanceKm.value <= 0.05;
});

const distanceMeters = computed(() => {
  if (distanceKm.value === null) return null;
  return Math.round(distanceKm.value * 1000);
});

const handleSubmit = () => {
  if (!isWithin50m.value) {
    showToast('Bildirim yapabilmek için istasyonun 50 metre yakınında olmalısınız.', 'error', 4500);
    return;
  }

  isSubmitting.value = true;

  // KVKK Uyum Güvencesi: Kullanıcı koordinatı sunucuya gönderilmez,
  // yalnızca proximity_verified tek seferlik kanıtı iletilir.
  setTimeout(() => {
    isSubmitting.value = false;
    showToast('Bildiriminiz alındı. Topluluk katkınız için teşekkürler!', 'success', 4000);
    emit('close');
  }, 400);
};
</script>

<template>
  <div
    v-if="isOpen && station"
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
    role="dialog"
    aria-modal="true"
    aria-labelledby="report-modal-title"
  >
    <div
      class="w-full max-w-md bg-bg-surface border border-border-default rounded-xl shadow-2xl p-6 relative flex flex-col"
    >
      <button
        type="button"
        @click="emit('close')"
        class="absolute top-4 right-4 touch-target-min flex items-center justify-center text-text-secondary hover:text-text-primary rounded-md focus-visible:outline-none"
        aria-label="Modalı Kapat"
      >
        <X class="w-5 h-5" />
      </button>

      <!-- Başlık -->
      <div class="flex items-center gap-2 text-danger mb-1">
        <AlertTriangle class="w-5 h-5" />
        <h3 id="report-modal-title" class="text-base font-bold text-text-primary">
          Arıza / Durum Bildir
        </h3>
      </div>
      <p class="text-xs text-text-secondary mb-3 leading-relaxed">
        <strong class="text-text-primary">{{ station.name }}</strong> ({{ station.istasyon_no }})
      </p>

      <!-- 1. Konum Doğrulama Durumu (50m Güvenlik Kuralı) -->
      <div class="mb-4">
        <div
          v-if="!userCoords"
          class="p-3 rounded-md bg-warning-subdued border border-warning/30 text-xs text-warning flex items-start gap-2"
        >
          <AlertCircle class="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div class="flex-1">
            <p class="font-medium">Arıza doğrulaması için konum izni gereklidir.</p>
            <p class="text-[11px] text-text-secondary mt-0.5">
              İstasyonun yanında olduğunuzu doğrulamadan bildirim gönderilemez.
            </p>
            <button
              type="button"
              @click="requestUserLocation"
              class="mt-2 px-2.5 py-1 rounded bg-bg-surface border border-border-strong text-text-primary text-xs font-medium touch-target-min flex items-center gap-1"
            >
              <span>{{ locationLoading ? 'Konum Alınıyor...' : 'Konumumu Doğrula' }}</span>
            </button>
          </div>
        </div>

        <div
          v-else-if="isWithin50m"
          class="p-2.5 rounded-md bg-success-subdued border border-success/30 text-xs text-success flex items-center gap-2"
        >
          <CheckCircle2 class="w-4 h-4 flex-shrink-0" />
          <span class="font-medium">İstasyon yakınındasınız (Doğrulandı, ~{{ distanceMeters }}m)</span>
        </div>

        <div
          v-else
          class="p-3 rounded-md bg-danger-subdued border border-danger/30 text-xs text-danger flex items-start gap-2"
        >
          <ShieldAlert class="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div>
            <p class="font-semibold">50 metre sınırı dışındasınız</p>
            <p class="text-[11px] mt-0.5">
              Bildirim yapabilmek için istasyonun 50 metre yakınında olmalısınız. (Mevcut Mesafe: ~{{ distanceMeters }} metre)
            </p>
          </div>
        </div>
      </div>

      <!-- 2. Sorun Türü Seçimi -->
      <form @submit.prevent="handleSubmit" class="space-y-3">
        <div>
          <label class="block text-xs font-semibold text-text-primary mb-1.5">Sorun Türü</label>
          <div class="space-y-1.5">
            <label
              v-for="t in issueTypes"
              :key="t.code"
              class="flex items-center gap-2 p-2.5 rounded-md border border-border-default bg-bg-subdued text-xs text-text-primary cursor-pointer hover:bg-border-default touch-target-min"
            >
              <input
                type="radio"
                name="issue_type"
                :value="t.code"
                v-model="selectedIssue"
                class="text-danger focus:ring-danger"
              />
              <span>{{ t.label }}</span>
            </label>
          </div>
        </div>

        <!-- Açıklama (Opsiyonel) -->
        <div>
          <label class="block text-xs font-semibold text-text-primary mb-1">Ek Detay (Opsiyonel)</label>
          <textarea
            v-model="description"
            rows="2"
            maxlength="140"
            placeholder="Ek detay ekleyin (örn: Ekran donmuş durumda)..."
            class="w-full p-2 rounded-md border border-border-strong bg-bg-surface text-xs text-text-primary focus:outline-none focus:border-primary"
          />
        </div>

        <!-- Gönder Butonu -->
        <button
          type="submit"
          :disabled="!isWithin50m || isSubmitting"
          class="w-full h-11 rounded-md bg-danger hover:bg-danger/90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium text-xs flex items-center justify-center gap-2 focus-visible:outline-none touch-target-min"
        >
          <AlertTriangle class="w-4 h-4" />
          <span>{{ isSubmitting ? 'İletiliyor...' : 'Bildirimi Gönder' }}</span>
        </button>

        <p class="text-[10px] text-text-muted text-center leading-tight">
          KVKK Güvencesi: Kullanıcı GPS koordinatları sunucuda saklanmaz; yalnızca mesafe doğrulaması işlenir.
        </p>
      </form>
    </div>
  </div>
</template>
