
<script setup lang="ts">
import { ref, computed } from 'vue';
import { useToast } from '~/composables/useToast';
import { useOperators } from '~/composables/useOperators';
import { ChevronDown, Zap, BatteryCharging, Lock } from 'lucide-vue-next';

const props = defineProps<{
  selectedOperator: string;
  isPublicOnly: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:selectedOperator', val: string): void;
  (e: 'update:isPublicOnly', val: boolean): void;
}>();

const { showToast } = useToast();
const { operators, fetchOperators } = useOperators();
const isOperatorDropdownOpen = ref(false);

const toggleOperatorDropdown = () => {
  isOperatorDropdownOpen.value = !isOperatorDropdownOpen.value;
  if (isOperatorDropdownOpen.value) {
    fetchOperators();
  }
};

const selectOperator = (slug: string) => {
  emit('update:selectedOperator', slug === props.selectedOperator ? '' : slug);
  isOperatorDropdownOpen.value = false;
};

// Faz 1 Zorunlu Kısıt Uyarısı
const onLockedFilterClick = () => {
  showToast('Operatör Verisi Bekleniyor — Bu filtre yakında aktifleşecektir.', 'info', 4000);
};

const selectedOperatorName = computed(() => {
  if (!props.selectedOperator) return 'Tüm Operatörler';
  const found = operators.value.find(o => o.slug === props.selectedOperator);
  return found ? found.name : 'Operatör (1)';
});
</script>

<template>
  <div class="relative flex items-center gap-2 overflow-x-auto py-1 scrollbar-none max-w-full">
    <!-- 1. Operatörler Filtre Çipi -->
    <div class="relative">
      <button
        type="button"
        @click="toggleOperatorDropdown"
        class="touch-target-min px-3.5 py-1.5 rounded-full text-sm font-medium border flex items-center gap-1.5 transition-colors focus-visible:outline-none"
        :class="[
          selectedOperator
            ? 'bg-primary text-on-primary border-primary shadow-sm'
            : 'bg-bg-surface text-text-secondary border-border-default hover:bg-bg-subdued'
        ]"
        :aria-pressed="!!selectedOperator"
        aria-haspopup="listbox"
        aria-label="Operatör Filtresi"
      >
        <span>{{ selectedOperatorName }}</span>
        <ChevronDown class="w-4 h-4 opacity-80" />
      </button>

      <!-- Operatör Seçim Menüsü -->
      <div
        v-if="isOperatorDropdownOpen"
        class="absolute left-0 top-12 w-64 bg-bg-surface border border-border-default rounded-md shadow-lg p-2 max-h-72 overflow-y-auto z-50"
        role="listbox"
      >
        <button
          type="button"
          @click="selectOperator('')"
          class="w-full text-left px-3 py-2 text-sm rounded hover:bg-bg-subdued touch-target-min flex items-center justify-between"
          :class="{ 'font-bold text-primary': !selectedOperator }"
        >
          <span>Tüm Operatörler (179 Marka)</span>
        </button>

        <button
          v-for="op in operators"
          :key="op.id"
          type="button"
          @click="selectOperator(op.slug)"
          class="w-full text-left px-3 py-2 text-sm rounded hover:bg-bg-subdued touch-target-min flex items-center justify-between"
          :class="{ 'font-bold text-primary': selectedOperator === op.slug }"
        >
          <span>{{ op.name }}</span>
          <span v-if="selectedOperator === op.slug" class="text-xs text-primary font-bold">✓</span>
        </button>
      </div>
    </div>

    <!-- 2. Halka Açık Filtre Çipi -->
    <button
      type="button"
      @click="emit('update:isPublicOnly', !isPublicOnly)"
      class="touch-target-min px-3.5 py-1.5 rounded-full text-sm font-medium border flex items-center gap-1.5 transition-colors focus-visible:outline-none flex-shrink-0"
      :class="[
        isPublicOnly
          ? 'bg-primary text-on-primary border-primary shadow-sm'
          : 'bg-bg-surface text-text-secondary border-border-default hover:bg-bg-subdued'
      ]"
      :aria-pressed="isPublicOnly"
      aria-label="Halka Açık İstasyonları Filtrele"
    >
      <span>Halka Açık</span>
    </button>

    <!-- 3. Kilitli Filtre: Hızlı Şarj (DC) — Faz 1 Zorunlu Kısıt -->
    <button
      type="button"
      @click="onLockedFilterClick"
      class="touch-target-min px-3.5 py-1.5 rounded-full text-sm font-medium border border-border-default bg-bg-subdued text-text-muted flex items-center gap-1.5 opacity-80 cursor-not-allowed flex-shrink-0"
      aria-disabled="true"
      title="Faz 1'de güç verisi bulunmamaktadır."
    >
      <Zap class="w-3.5 h-3.5" />
      <span>Hızlı Şarj (DC)</span>
      <Lock class="w-3 h-3 text-text-muted ml-0.5" />
    </button>

    <!-- 4. Kilitli Filtre: Boş Soketler — Faz 1 Zorunlu Kısıt -->
    <button
      type="button"
      @click="onLockedFilterClick"
      class="touch-target-min px-3.5 py-1.5 rounded-full text-sm font-medium border border-border-default bg-bg-subdued text-text-muted flex items-center gap-1.5 opacity-80 cursor-not-allowed flex-shrink-0"
      aria-disabled="true"
      title="Faz 1'de anlık doluluk verisi bulunmamaktadır."
    >
      <BatteryCharging class="w-3.5 h-3.5" />
      <span>Boş Soketler</span>
      <Lock class="w-3 h-3 text-text-muted ml-0.5" />
    </button>
  </div>
</template>
