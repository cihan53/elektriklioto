
<script setup lang="ts">
import { ref, computed } from 'vue';
import { useToast } from '~/composables/useToast';
import { useOperators } from '~/composables/useOperators';
import { ChevronDown, Zap, BatteryCharging, Lock, Search, Check } from 'lucide-vue-next';

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
const operatorSearch = ref('');

const toggleOperatorDropdown = () => {
  isOperatorDropdownOpen.value = !isOperatorDropdownOpen.value;
  if (isOperatorDropdownOpen.value) {
    operatorSearch.value = '';
    fetchOperators();
  }
};

const closeOperatorDropdown = () => {
  isOperatorDropdownOpen.value = false;
  operatorSearch.value = '';
};

const selectOperator = (slug: string) => {
  emit('update:selectedOperator', slug === props.selectedOperator ? '' : slug);
  closeOperatorDropdown();
};

// Faz 1 Zorunlu Kısıt Uyarısı
const onLockedFilterClick = () => {
  showToast('Operatör Verisi Bekleniyor — Bu filtre yakında aktifleşecektir.', 'info', 4000);
};

const selectedOperatorName = computed(() => {
  if (!props.selectedOperator) return 'Tüm Operatörler';
  const found = operators.value.find((o) => o.slug === props.selectedOperator);
  return found ? found.name : 'Operatör (1)';
});

// 179 Operatör için hızlı arama ve filtreleme
const filteredOperators = computed(() => {
  if (!operatorSearch.value.trim()) return operators.value;
  const q = operatorSearch.value.trim().toLocaleLowerCase('tr');
  return operators.value.filter(
    (op) =>
      op.name.toLocaleLowerCase('tr').includes(q) ||
      op.slug.toLocaleLowerCase('tr').includes(q)
  );
});
</script>

<template>
  <div class="relative flex items-center max-w-full">
    <!-- 1. Operatörler Filtre Çipi ve Bağımsız Açılır Menü (Container overflow taşmasını önlemek için scroll container dışında tutulur - TALEP-007) -->
    <div class="relative flex-shrink-0 mr-2 z-30">
      <button
        type="button"
        @click="toggleOperatorDropdown"
        class="touch-target-min px-3.5 py-1.5 rounded-full text-sm font-medium border flex items-center gap-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
        :class="[
          selectedOperator
            ? 'bg-primary text-on-primary border-primary shadow-sm'
            : 'bg-bg-surface text-text-secondary border-border-default hover:bg-bg-subdued',
        ]"
        :aria-pressed="!!selectedOperator"
        :aria-expanded="isOperatorDropdownOpen"
        aria-haspopup="listbox"
        aria-label="Operatör Filtresi"
      >
        <span class="truncate max-w-[140px] sm:max-w-[180px]">{{ selectedOperatorName }}</span>
        <ChevronDown
          class="w-4 h-4 opacity-80 transition-transform duration-200"
          :class="{ 'rotate-180': isOperatorDropdownOpen }"
        />
      </button>

      <!-- Arka Plan Tıklama Katmanı (Click Outside Overlay) -->
      <div
        v-if="isOperatorDropdownOpen"
        class="fixed inset-0 z-40 bg-black/5"
        @click="closeOperatorDropdown"
      />

      <!-- Operatör Seçim Açılır Menüsü (Dropdown) -->
      <div
        v-if="isOperatorDropdownOpen"
        class="absolute left-0 top-12 w-72 sm:w-80 max-w-[calc(100vw-32px)] bg-bg-surface border border-border-default rounded-md shadow-xl z-50 flex flex-col max-h-80 overflow-hidden"
        role="listbox"
        aria-label="Operatör Listesi"
        @keydown.esc="closeOperatorDropdown"
      >
        <!-- Arama Çubuğu (179 Lisanslı Marka İçin Hızlı Süzme) -->
        <div class="p-2 border-b border-border-default bg-bg-surface sticky top-0 z-10">
          <div class="relative">
            <input
              v-model="operatorSearch"
              type="text"
              placeholder="Operatör ara (örn: ZES, Trugo)..."
              class="w-full pl-8 pr-3 py-1.5 text-xs rounded border border-border-default bg-bg-subdued text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
              autofocus
              @click.stop
            />
            <Search class="w-3.5 h-3.5 text-text-muted absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        <!-- Operatör Listesi (Kaydırılabilir Menü Alanı - scrollbar-thin ile pürüzsüz kaydırma) -->
        <div class="overflow-y-auto p-1.5 space-y-0.5 max-h-64 scrollbar-thin">
          <button
            type="button"
            @click="selectOperator('')"
            class="w-full text-left px-3 py-2 text-sm rounded hover:bg-bg-subdued touch-target-min flex items-center justify-between transition-colors"
            :class="{ 'font-bold text-primary bg-bg-subdued/60': !selectedOperator }"
            role="option"
            :aria-selected="!selectedOperator"
          >
            <span>Tüm Operatörler (179 Marka)</span>
            <Check v-if="!selectedOperator" class="w-4 h-4 text-primary" />
          </button>

          <div
            v-if="filteredOperators.length === 0"
            class="py-6 text-center text-xs text-text-muted"
          >
            "{{ operatorSearch }}" ile eşleşen operatör bulunamadı
          </div>

          <button
            v-for="op in filteredOperators"
            :key="op.id"
            type="button"
            @click="selectOperator(op.slug)"
            class="w-full text-left px-3 py-2 text-sm rounded hover:bg-bg-subdued touch-target-min flex items-center justify-between transition-colors"
            :class="{ 'font-bold text-primary bg-bg-subdued/60': selectedOperator === op.slug }"
            role="option"
            :aria-selected="selectedOperator === op.slug"
          >
            <span class="truncate">{{ op.name }}</span>
            <Check v-if="selectedOperator === op.slug" class="w-4 h-4 text-primary flex-shrink-0" />
          </button>
        </div>
      </div>
    </div>

    <!-- 2, 3, 4. Diğer Filtre Çipleri (Yatay Kaydırılabilir Alan) -->
    <div class="flex items-center gap-2 overflow-x-auto py-1 scrollbar-none max-w-full">
      <!-- 2. Halka Açık Filtre Çipi -->
      <button
        type="button"
        @click="emit('update:isPublicOnly', !isPublicOnly)"
        class="touch-target-min px-3.5 py-1.5 rounded-full text-sm font-medium border flex items-center gap-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring flex-shrink-0"
        :class="[
          isPublicOnly
            ? 'bg-primary text-on-primary border-primary shadow-sm'
            : 'bg-bg-surface text-text-secondary border-border-default hover:bg-bg-subdued',
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
        class="touch-target-min px-3.5 py-1.5 rounded-full text-sm font-medium border border-border-default bg-bg-subdued text-text-muted flex items-center gap-1.5 opacity-80 cursor-not-allowed flex-shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
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
        class="touch-target-min px-3.5 py-1.5 rounded-full text-sm font-medium border border-border-default bg-bg-subdued text-text-muted flex items-center gap-1.5 opacity-80 cursor-not-allowed flex-shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
        aria-disabled="true"
        title="Faz 1'de anlık doluluk verisi bulunmamaktadır."
      >
        <BatteryCharging class="w-3.5 h-3.5" />
        <span>Boş Soketler</span>
        <Lock class="w-3 h-3 text-text-muted ml-0.5" />
      </button>
    </div>
  </div>
</template>

<style scoped>
.scrollbar-thin::-webkit-scrollbar {
  width: 5px;
}
.scrollbar-thin::-webkit-scrollbar-track {
  background: transparent;
}
.scrollbar-thin::-webkit-scrollbar-thumb {
  background: var(--color-border-strong);
  border-radius: 9999px;
}
.scrollbar-thin::-webkit-scrollbar-thumb:hover {
  background: var(--color-text-muted);
}
</style>
