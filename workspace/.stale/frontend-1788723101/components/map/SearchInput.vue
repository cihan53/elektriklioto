
<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { Search, X, Loader2, SearchX, MapPin, Building2 } from 'lucide-vue-next';
import { useOperators } from '~/composables/useOperators';

const props = defineProps<{
  modelValue: string;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', val: string): void;
  (e: 'selectOperator', slug: string): void;
  (e: 'selectCity', name: string): void;
}>();

const { operators, fetchOperators } = useOperators();
const isOpen = ref(false);
const isSearching = ref(false);
const inputVal = ref(props.modelValue);

// Popüler şehirler hızlı erişim listesi
const popularCities = [
  'İstanbul', 'Ankara', 'İzmir', 'Bursa', 'Antalya', 'Kocaeli', 'Bolu'
];

watch(() => props.modelValue, (v) => {
  inputVal.value = v;
});

const onInput = (e: Event) => {
  const val = (e.target as HTMLInputElement).value;
  inputVal.value = val;
  emit('update:modelValue', val);

  if (val.length >= 2) {
    isSearching.value = true;
    isOpen.value = true;
    fetchOperators();
    setTimeout(() => {
      isSearching.value = false;
    }, 200);
  } else {
    isOpen.value = false;
  }
};

const clearInput = () => {
  inputVal.value = '';
  emit('update:modelValue', '');
  isOpen.value = false;
};

const filteredOperators = computed(() => {
  if (!inputVal.value || inputVal.value.trim().length < 2) return [];
  const q = inputVal.value.toLocaleLowerCase('tr');
  return operators.value
    .filter(op => op.name.toLocaleLowerCase('tr').includes(q))
    .slice(0, 5);
});

const filteredCities = computed(() => {
  if (!inputVal.value || inputVal.value.trim().length < 2) return [];
  const q = inputVal.value.toLocaleLowerCase('tr');
  return popularCities.filter(c => c.toLocaleLowerCase('tr').includes(q));
});

const handleSelectOperator = (slug: string, name: string) => {
  inputVal.value = name;
  emit('update:modelValue', name);
  emit('selectOperator', slug);
  isOpen.value = false;
};

const handleSelectCity = (city: string) => {
  inputVal.value = city;
  emit('update:modelValue', city);
  emit('selectCity', city);
  isOpen.value = false;
};
</script>

<template>
  <div class="relative w-full max-w-[380px]">
    <!-- Arama Kutusu -->
    <div
      class="h-12 w-full bg-bg-surface border border-border-strong rounded-md shadow-md flex items-center px-3 gap-2 transition-colors focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20"
    >
      <Search class="w-5 h-5 text-text-secondary flex-shrink-0" />

      <input
        type="text"
        :value="inputVal"
        @input="onInput"
        @focus="inputVal.length >= 2 && (isOpen = true)"
        placeholder="İstasyon, ilçe veya operatör ara..."
        class="w-full bg-transparent text-text-primary text-base placeholder:text-text-muted focus:outline-none"
        aria-label="İstasyon, ilçe veya operatör arama"
        aria-autocomplete="list"
        aria-expanded="isOpen"
      />

      <!-- Spinner veya Temizle Butonu -->
      <Loader2 v-if="isSearching" class="w-5 h-5 text-primary animate-spin flex-shrink-0" />
      <button
        v-else-if="inputVal.length > 0"
        type="button"
        @click="clearInput"
        class="touch-target-min flex items-center justify-center text-text-secondary hover:text-text-primary focus-visible:outline-none"
        aria-label="Aramayı Temizle"
      >
        <X class="w-5 h-5" />
      </button>
    </div>

    <!-- Autocomplete Açılır Menüsü (SCR-01.2) -->
    <div
      v-if="isOpen"
      class="absolute left-0 right-0 top-14 bg-bg-surface border border-border-default rounded-md shadow-lg max-h-80 overflow-y-auto z-50 p-2"
      role="listbox"
    >
      <!-- Operatör Eşleşmeleri -->
      <div v-if="filteredOperators.length > 0" class="mb-2">
        <span class="text-xs font-semibold text-text-muted px-3 py-1 block uppercase">Operatörler</span>
        <button
          v-for="op in filteredOperators"
          :key="op.id"
          type="button"
          @click="handleSelectOperator(op.slug, op.name)"
          class="w-full text-left px-3 py-2 rounded text-sm text-text-primary hover:bg-bg-subdued flex items-center justify-between touch-target-min"
          role="option"
        >
          <span class="flex items-center gap-2">
            <Building2 class="w-4 h-4 text-primary" />
            {{ op.name }}
          </span>
          <span class="text-xs text-text-secondary">Operatör</span>
        </button>
      </div>

      <!-- Şehir/İlçe Eşleşmeleri -->
      <div v-if="filteredCities.length > 0">
        <span class="text-xs font-semibold text-text-muted px-3 py-1 block uppercase">Bölgeler</span>
        <button
          v-for="c in filteredCities"
          :key="c"
          type="button"
          @click="handleSelectCity(c)"
          class="w-full text-left px-3 py-2 rounded text-sm text-text-primary hover:bg-bg-subdued flex items-center justify-between touch-target-min"
          role="option"
        >
          <span class="flex items-center gap-2">
            <MapPin class="w-4 h-4 text-text-secondary" />
            {{ c }}
          </span>
          <span class="text-xs text-text-secondary">Haritada Odakla</span>
        </button>
      </div>

      <!-- Sonuç Bulunamadı Durumu -->
      <div
        v-if="filteredOperators.length === 0 && filteredCities.length === 0 && !isSearching"
        class="py-6 px-4 text-center"
        role="status"
        aria-live="polite"
      >
        <SearchX class="w-8 h-8 text-text-muted mx-auto mb-2" />
        <p class="text-sm font-semibold text-text-primary">Sonuç bulunamadı</p>
        <p class="text-xs text-text-secondary mt-1">
          İlçe veya operatör adı yazın (örn: Kadıköy, ZES, Trugo).
        </p>
      </div>
    </div>
  </div>
</template>
