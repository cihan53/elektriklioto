
<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import VectorMap from '~/components/map/VectorMap.vue';
import SearchInput from '~/components/map/SearchInput.vue';
import FilterChips from '~/components/map/FilterChips.vue';
import StationDetailPanel from '~/components/map/StationDetailPanel.vue';
import QrBridgeModal from '~/components/modals/QrBridgeModal.vue';
import ContributeModal from '~/components/modals/ContributeModal.vue';
import IssueReportModal from '~/components/modals/IssueReportModal.vue';
import SourceHealthBanner from '~/components/common/SourceHealthBanner.vue';
import SourceHealthModal from '~/components/modals/SourceHealthModal.vue';
import { useStations } from '~/composables/useStations';
import { useSourceHealth } from '~/composables/useSourceHealth';
import type { StationItem, ReportResponse } from '~/types/station';

const route = useRoute();
const { selectedStation, isDetailOpen, closeDetail, selectStation } = useStations();
const { isModalOpen: isSourceHealthModalOpen, fetchSourcesHealth, openModal: openSourceHealthModal, closeModal: closeSourceHealthModal } = useSourceHealth();

const searchQuery = ref('');
const selectedOperator = ref('');
const isPublicOnly = ref(false);

const vectorMapRef = ref<any>(null);

// Modal Durumları
const isQrModalOpen = ref(false);
const isContributeModalOpen = ref(false);
const isReportModalOpen = ref(false);
const activeModalStation = ref<StationItem | null>(null);

// Rota Köprüsü Durumu (?route=payload)
const activeRoutePayload = ref<string | null>(null);

const handleOpenQrBridge = (st: StationItem) => {
  activeModalStation.value = st;
  activeRoutePayload.value = null;
  isQrModalOpen.value = true;
};

const handleOpenContribute = (st: StationItem) => {
  activeModalStation.value = st;
  isContributeModalOpen.value = true;
};

const handleOpenReport = (st: StationItem) => {
  activeModalStation.value = st;
  isReportModalOpen.value = true;
};

const handleReportSubmitted = (result: ReportResponse) => {
  if (result.is_flagged_defective && selectedStation.value) {
    selectedStation.value.is_flagged_defective = true;
    selectedStation.value.status = 'DEFECTIVE';
  }
};

const cityCoords: Record<string, [number, number]> = {
  'istanbul': [28.9784, 41.0082],
  'ankara': [32.8597, 39.9334],
  'izmir': [27.1428, 38.4237],
  'bursa': [29.0610, 40.1885],
  'antalya': [30.7133, 36.8969],
  'kocaeli': [29.9400, 40.7654],
  'bolu': [31.6061, 40.7350],
  'adana': [35.3308, 36.9914],
  'konya': [32.4846, 37.8746]
};

const handleSelectCity = (city: string) => {
  const norm = city.toLocaleLowerCase('tr');
  const target = cityCoords[norm];
  if (target && vectorMapRef.value) {
    vectorMapRef.value.flyToCoords(target[0], target[1], 11);
  }
};

// URL Query Parametrelerini Dinleme (?city=..., ?operator=..., ?route=...)
onMounted(() => {
  if (route.query.operator) {
    selectedOperator.value = String(route.query.operator);
  }
  if (route.query.city) {
    const cityName = String(route.query.city);
    handleSelectCity(cityName);
  }
  if (route.query.route) {
    activeRoutePayload.value = String(route.query.route);
  }

  // S5 US-18: Veri kaynakları sağlık kontrolü
  fetchSourcesHealth();
});

watch(() => route.query, (q) => {
  if (q.operator) {
    selectedOperator.value = String(q.operator);
  }
  if (q.city) {
    handleSelectCity(String(q.city));
  }
  if (q.route) {
    activeRoutePayload.value = String(q.route);
  }
});

// SEO ve Schema.org WebSite JSON-LD
useHead({
  title: 'elektriklioto.com — Elektrikli Araç Şarj İstasyonları Haritası ve Rehberi',
  meta: [
    {
      name: 'description',
      content: 'Türkiye genelindeki tüm şarj ağlarını (ZES, Trugo, Eşarj ve 170+ operatör) tek haritada görün. Güncel konumlar ve EPDK sicil bilgileri.'
    },
    { property: 'og:title', content: 'elektriklioto.com — Elektrikli Araç Şarj İstasyonları Haritası' },
    {
      property: 'og:description',
      content: '16.788 şarj istasyonu ve 179 lisanslı operatör tek haritada. Bağımsız e-Mobilite Asistanı.'
    },
    { property: 'og:type', content: 'website' }
  ],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: 'elektriklioto.com',
        url: 'https://elektriklioto.com',
        description: 'Türkiye genelindeki tüm elektrikli araç şarj ağları tek haritada.'
      })
    }
  ]
});
</script>

<template>
  <div class="relative w-full h-[calc(100vh-64px)] overflow-hidden flex flex-col">
    <!-- S5 US-18: Veri Kaynağı Kesinti Bildirim Şeridi -->
    <SourceHealthBanner @open-details="openSourceHealthModal" />

    <div class="relative flex-1 w-full h-full overflow-hidden">
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

      <!-- Rota Aktarım Bilgilendirme Bandı (?route=...) -->
      <div
        v-if="activeRoutePayload"
        class="absolute top-20 left-4 right-4 sm:left-auto sm:right-4 sm:w-80 z-30 bg-bg-surface border border-primary rounded-lg shadow-xl p-3 flex items-center justify-between gap-2 text-xs"
      >
        <div class="flex items-center gap-2">
          <span class="w-2 h-2 rounded-full bg-success animate-pulse"></span>
          <span class="font-medium text-text-primary">Aktarılan Rota Yüklendi</span>
        </div>
        <button
          type="button"
          @click="activeRoutePayload = null"
          class="text-text-muted hover:text-text-primary p-1 touch-target-min"
          aria-label="Rota bandını kapat"
        >
          ✕
        </button>
      </div>

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
        :route-payload="activeRoutePayload || undefined"
        :is-open="isQrModalOpen"
        @close="isQrModalOpen = false"
      />

      <!-- Topluluk Veri Katkı Modalı (SCR-07) -->
      <ContributeModal
        :station="activeModalStation"
        :is-open="isContributeModalOpen"
        @close="isContributeModalOpen = false"
      />

      <!-- Arıza Bildirim Modalı (SCR-06) -->
      <IssueReportModal
        :station="activeModalStation"
        :is-open="isReportModalOpen"
        @close="isReportModalOpen = false"
        @report-submitted="handleReportSubmitted"
      />

      <!-- S5 US-18: Veri Kaynakları Sağlık Durumu Modalı -->
      <SourceHealthModal
        :is-open="isSourceHealthModalOpen"
        @close="closeSourceHealthModal"
      />
    </div>
  </div>
</template>
