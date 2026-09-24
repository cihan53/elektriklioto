
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useToast } from '~/composables/useToast';
import { useOperators } from '~/composables/useOperators';
import { ChevronDown, Zap, BatteryCharging, Lock, Search } from 'lucide-vue-next';

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
const operatorSearchQuery = ref('');

onMounted(() => {
  fetchOperators();
});

const toggleOperatorDropdown = () => {
  isOperatorDropdownOpen.value = !isOperatorDropdownOpen.value;
  if (isOperatorDropdownOpen.value) {
    fetchOperators();
  }
};

const selectOperator = (slug: string) => {
  emit('update:selectedOperator', slug === props.selectedOperator ? '' : slug);
  isOperatorDropdownOpen.value = false;
  operatorSearchQuery.value = '';
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

const filteredOperators = computed(() => {
  if (!operatorSearchQuery.value.trim()) {
    return operators.value;
  }
  const q = operatorSearchQuery.value.toLocaleLowerCase('tr').trim();
  return operators.value.filter(op =>
    op.name.toLocaleLowerCase('tr').includes(q) ||
    op.slug.toLowerCase().includes(q)
  );
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
        class="absolute left-0 top-12 w-72 bg-bg-surface border border-border-default rounded-md shadow-lg p-2 max-h-80 overflow-y-auto z-50 space-y-1"
        role="listbox"
      >
        <!-- Arama Kutusu -->
        <div v-if="operators.length > 5" class="px-2 pt-1 pb-2 border-b border-border-default">
          <div class="relative flex items-center">
            <Search class="w-3.5 h-3.5 text-text-muted absolute left-2.5 pointer-events-none" />
            <input
              v-model="operatorSearchQuery"
              type="text"
              placeholder="Operatör ara..."
              class="w-full text-xs pl-8 pr-2.5 py-1.5 rounded bg-bg-subdued border border-border-default text-text-primary focus:outline-none focus:border-primary"
            />
          </div>
        </div>

        <button
          type="button"
          @click="selectOperator('')"
          class="w-full text-left px-3 py-2 text-sm rounded hover:bg-bg-subdued touch-target-min flex items-center justify-between"
          :class="{ 'font-bold text-primary': !selectedOperator }"
        >
          <span>Tüm Operatörler ({{ operators.length > 0 ? operators.length + ' Marka' : '179 Marka' }})</span>
        </button>

        <button
          v-for="op in filteredOperators"
          :key="op.id"
          type="button"
          @click="selectOperator(op.slug)"
          class="w-full text-left px-3 py-2 text-sm rounded hover:bg-bg-subdued touch-target-min flex items-center justify-between"
          :class="{ 'font-bold text-primary': selectedOperator === op.slug }"
        >
          <span>{{ op.name }}</span>
          <span v-if="selectedOperator === op.slug" class="text-xs text-primary font-bold">✓</span>
        </button>

        <div v-if="filteredOperators.length === 0" class="px-3 py-2 text-xs text-text-muted text-center">
          Sonuç bulunamadı
        </div>
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
