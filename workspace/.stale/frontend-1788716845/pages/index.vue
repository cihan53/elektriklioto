
<script setup lang="ts">
import { ref } from 'vue';
import VectorMap from '~/components/map/VectorMap.vue';
import SearchInput from '~/components/map/SearchInput.vue';
import FilterChips from '~/components/map/FilterChips.vue';
import StationDetailPanel from '~/components/map/StationDetailPanel.vue';
import QrBridgeModal from '~/components/modals/QrBridgeModal.vue';
import ContributeModal from '~/components/modals/ContributeModal.vue';
import { useStations } from '~/composables/useStations';
import type { StationItem } from '~/types/station';

const { selectedStation, isDetailOpen, closeDetail, selectStation } = useStations();

const searchQuery = ref('');
const selectedOperator = ref('');
const isPublicOnly = ref(false);

const vectorMapRef = ref<any>(null);

// Modal Durumları
const isQrModalOpen = ref(false);
const isContributeModalOpen = ref(false);
const activeModalStation = ref<StationItem | null>(null);

const handleOpenQrBridge = (st: StationItem) => {
  activeModalStation.value = st;
  isQrModalOpen.value = true;
};

const handleOpenContribute = (st: StationItem) => {
  activeModalStation.value = st;
  isContributeModalOpen.value = true;
};

const handleOpenReport = (st: StationItem) => {
  // Faz 1 Kitle Kaynak Bildirim Uyarısı
  handleOpenContribute(st);
};

const handleSelectCity = (city: string) => {
  // Şehirlere göre harita koordinat odaklaması
  const cityCoords: Record<string, [number, number]> = {
    'İstanbul': [28.9784, 41.0082],
    'Ankara': [32.8597, 39.9334],
    'İzmir': [27.1428, 38.4237],
    'Bursa': [29.0610, 40.1885],
    'Antalya': [30.7133, 36.8969],
    'Kocaeli': [29.9400, 40.7654],
    'Bolu': [31.6061, 40.7350]
  };

  const target = cityCoords[city];
  if (target && vectorMapRef.value) {
    vectorMapRef.value.flyToCoords(target[0], target[1], 11);
  }
};
</script>

<template>
  <div class="relative w-full h-[calc(100vh-64px)] overflow-hidden">
    <!-- İnteraktif Harita Tuvali (ClientOnly) -->
    <ClientOnly>
      <VectorMap
        ref="vectorMapRef"
        :selected-operator="selectedOperator"
        :is-public-only="isPublicOnly"
        @select-station="selectStation"
      />
      <template #fallback>
        <div class="w-full h-full bg-bg-subdued flex items-center justify-center text-text-secondary text-sm">
          Harita motoru başlatılıyor...
        </div>
      </template>
    </ClientOnly>

    <!-- Üst Yüzen Kontroller (Arama & Filtre Çubuğu) -->
    <div
      class="absolute top-4 left-4 right-4 sm:right-auto z-30 flex flex-col gap-2 pointer-events-none"
    >
      <div class="pointer-events-auto">
        <SearchInput
          v-model="searchQuery"
          @select-operator="selectedOperator = $event"
          @select-city="handleSelectCity"
        />
      </div>

      <div class="pointer-events-auto">
        <FilterChips
          v-model:selected-operator="selectedOperator"
          v-model:is-public-only="isPublicOnly"
        />
      </div>
    </div>

    <!-- İstasyon Detay Paneli (Sol Sabit 380px Masaüstü / Alt Çekmece Mobil) -->
    <StationDetailPanel
      :station="selectedStation"
      :is-open="isDetailOpen"
      @close="closeDetail"
      @open-qr-bridge="handleOpenQrBridge"
      @open-contribute="handleOpenContribute"
      @open-report="handleOpenReport"
    />

    <!-- Web-Mobil QR Aktarım Modalı (SCR-05) -->
    <QrBridgeModal
      :station="activeModalStation"
      :is-open="isQrModalOpen"
      @close="isQrModalOpen = false"
    />

    <!-- Topluluk Veri Katkı Modalı (SCR-07) -->
    <ContributeModal
      :station="activeModalStation"
      :is-open="isContributeModalOpen"
      @close="isContributeModalOpen = false"
    />
  </div>
</template>
