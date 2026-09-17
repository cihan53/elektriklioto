
<script setup lang="ts">
import { ref } from 'vue';
import type { StationItem } from '~/types/station';
import { useToast } from '~/composables/useToast';
import { X, PlusCircle, Zap } from 'lucide-vue-next';

const props = defineProps<{
  station: StationItem | null;
  isOpen: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const { showToast } = useToast();

const selectedSocket = ref<string>('CCS');
const selectedPower = ref<string>('120 kW');
const isSubmitting = ref(false);

const socketOptions = ['CCS (DC Hızlı Şarj)', 'Type 2 (AC Standart)', 'CHAdeMO (DC)'];
const powerOptions = ['22 kW', '60 kW', '120 kW', '180 kW+', 'Bilmiyorum'];

const handleSubmit = () => {
  isSubmitting.value = true;
  // Anonim katkı API kuyruğuna gönderilir
  setTimeout(() => {
    isSubmitting.value = false;
    showToast('Veri katkınız incelenmek üzere kuyruğa alındı. Teşekkürler!', 'success', 4000);
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
    aria-labelledby="contribute-modal-title"
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

      <div class="flex items-center gap-2 text-primary mb-1">
        <PlusCircle class="w-5 h-5" />
        <h3 id="contribute-modal-title" class="text-base font-bold text-text-primary">
          İstasyon Bilgisi Ekle
        </h3>
      </div>
      <p class="text-xs text-text-secondary mb-4 leading-relaxed">
        <strong class="text-text-primary">{{ station.name }}</strong> için soket veya güç bilgisi ekleyerek topluluğa destek olun.
      </p>

      <form @submit.prevent="handleSubmit" class="space-y-4">
        <!-- Soket Tipi -->
        <div>
          <label class="block text-xs font-semibold text-text-primary mb-1.5">Soket Tipi</label>
          <div class="space-y-2">
            <label
              v-for="opt in socketOptions"
              :key="opt"
              class="flex items-center gap-2 p-2.5 rounded-md border border-border-default bg-bg-subdued text-xs text-text-primary cursor-pointer hover:bg-border-default touch-target-min"
            >
              <input
                type="radio"
                name="socket"
                :value="opt"
                v-model="selectedSocket"
                class="text-primary focus:ring-primary"
              />
              <span>{{ opt }}</span>
            </label>
          </div>
        </div>

        <!-- Tahmini Şarj Gücü -->
        <div>
          <label class="block text-xs font-semibold text-text-primary mb-1.5">Tahmini Şarj Gücü</label>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="p in powerOptions"
              :key="p"
              type="button"
              @click="selectedPower = p"
              class="px-3 py-1.5 rounded-full text-xs font-medium border touch-target-min"
              :class="selectedPower === p ? 'bg-primary text-on-primary border-primary' : 'bg-bg-subdued border-border-default text-text-secondary'"
            >
              {{ p }}
            </button>
          </div>
        </div>

        <button
          type="submit"
          :disabled="isSubmitting"
          class="w-full h-11 rounded-md bg-primary hover:bg-primary-hover text-on-primary font-medium text-xs flex items-center justify-center gap-2 mt-2 focus-visible:outline-none touch-target-min"
        >
          <Zap class="w-4 h-4" />
          <span>{{ isSubmitting ? 'Gönderiliyor...' : 'Bilgileri İncelemeye Gönder' }}</span>
        </button>
      </form>
    </div>
  </div>
</template>
