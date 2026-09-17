
<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import VectorMap from '~/components/map/VectorMap.vue';
import SearchInput, { type LocationSearchResult } from '~/components/map/SearchInput.vue';
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

// TALEP-006: /harita rotası için ana harita görünümünü doğrudan sunma
definePageMeta({
  alias: ['/harita']
});

const route = useRoute();
const { selectedStation, isDetailOpen, closeDetail, selectStation } = useStations();
const {
  isModalOpen: isSourceHealthModalOpen,
  fetchSourcesHealth,
  openModal: openSourceHealthModal,
  closeModal: closeSourceHealthModal
} = useSourceHealth();

const searchQuery = ref('');
const selectedOperator = ref('');
const isPublicOnly = ref(false);

const vectorMapRef = ref<any>(null);

// TALEP-004: Harita animasyonu (flyTo) senkronizasyon durumu
const mapFlyToTarget = useState<{ lon: number; lat: number; zoom: number; timestamp: number } | null>(
  'map-fly-to-target',
  () => null
);

// Modal Durumları (TALEP-008: Harita pinlerinin z-index çakışmalarını önlemek için Teleport to body ve z-[100] destekli)
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

// Türkçe normalizasyon
const normText = (s: string) => {
  return (s || '')
    .toLocaleLowerCase('tr')
    .trim()
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c');
};

// TALEP-004: Türkiye 81 İl Merkez Koordinatları Haritası
const TURKEY_81_CITIES: Record<string, [number, number]> = {
  'adana': [35.3308, 36.9914],
  'adiyaman': [38.2786, 37.7648],
  'afyonkarahisar': [30.5401, 38.7569],
  'agri': [43.0519, 39.7217],
  'aksaray': [34.0254, 38.3687],
  'amasya': [35.8353, 40.6534],
  'ankara': [32.8597, 39.9334],
  'antalya': [30.7133, 36.8969],
  'ardahan': [42.7022, 41.1105],
  'artvin': [41.8183, 41.1828],
  'aydin': [27.8458, 37.8560],
  'balikesir': [27.8826, 39.6484],
  'bartin': [32.3375, 41.6358],
  'batman': [41.1294, 37.8812],
  'bayburt': [40.2249, 40.2552],
  'bilecik': [29.9793, 40.1426],
  'bingol': [40.4939, 38.8855],
  'bitlis': [42.1095, 38.4006],
  'bolu': [31.6061, 40.7350],
  'burdur': [30.2889, 37.7203],
  'bursa': [29.0610, 40.1885],
  'canakkale': [26.4086, 40.1553],
  'cankiri': [33.6134, 40.6013],
  'corum': [34.9556, 40.5506],
  'denizli': [29.0864, 37.7765],
  'diyarbakir': [40.2110, 37.9144],
  'duzce': [31.1565, 40.8438],
  'edirne': [26.5557, 41.6771],
  'elazig': [39.2264, 38.6810],
  'erzincan': [39.4911, 39.7500],
  'erzurum': [41.2769, 39.9043],
  'eskisehir': [30.5256, 39.7767],
  'gaziantep': [37.3822, 37.0662],
  'giresun': [38.3895, 40.9128],
  'gumushane': [39.4718, 40.4600],
  'hakkari': [43.7408, 37.5833],
  'hatay': [36.1667, 36.2023],
  'igdir': [44.0450, 39.9237],
  'isparta': [30.5537, 37.7648],
  'istanbul': [28.9784, 41.0082],
  'izmir': [27.1428, 38.4237],
  'kahramanmaras': [36.9371, 37.5858],
  'karabuk': [32.6277, 41.2061],
  'karaman': [33.2150, 37.1759],
  'kars': [43.0975, 40.6013],
  'kastamonu': [33.7765, 41.3887],
  'kayseri': [35.4853, 38.7312],
  'kilis': [37.1150, 36.7184],
  'kirikkale': [33.5064, 39.8468],
  'kirklareli': [27.2244, 41.7333],
  'kirsehir': [34.1709, 39.1425],
  'kocaeli': [29.9400, 40.7654],
  'konya': [32.4846, 37.8746],
  'kutahya': [29.9833, 39.4167],
  'malatya': [38.3552, 38.3552],
  'manisa': [27.4260, 38.6191],
  'mardin': [40.7420, 37.3212],
  'mersin': [34.6415, 36.8121],
  'mugla': [28.3636, 37.2153],
  'mus': [41.5064, 38.7432],
  'nevsehir': [34.7144, 38.6244],
  'nigde': [34.6857, 37.9667],
  'ordu': [37.8797, 40.9839],
  'osmaniye': [36.2464, 37.0742],
  'rize': [40.5217, 41.0201],
  'sakarya': [30.4033, 40.7569],
  'samsun': [36.3360, 41.2867],
  'sanliurfa': [38.7955, 37.1674],
  'siirt': [41.9420, 37.9333],
  'sinop': [35.1517, 42.0231],
  'sivas': [37.0145, 39.7477],
  'sirnak': [42.4594, 37.5164],
  'tekirdag': [27.5110, 40.9833],
  'tokat': [36.5544, 40.3167],
  'trabzon': [39.7168, 41.0027],
  'tunceli': [39.5401, 39.1079],
  'usak': [29.4058, 38.6823],
  'van': [43.3748, 38.4891],
  'yalova': [29.2769, 40.6500],
  'yozgat': [34.8044, 39.8181],
  'zonguldak': [31.7987, 41.4564]
};

const handleSelectCity = (city: string) => {
  const norm = normText(city);
  const target = TURKEY_81_CITIES[norm];
  if (target) {
    mapFlyToTarget.value = { lon: target[0], lat: target[1], zoom: 11, timestamp: Date.now() };
    if (vectorMapRef.value?.flyToCoords) {
      vectorMapRef.value.flyToCoords(target[0], target[1], 11);
    }
  }
};

const handleSelectLocation = (loc: LocationSearchResult) => {
  if (loc.type === 'operator' && loc.operatorSlug) {
    selectedOperator.value = loc.operatorSlug;
  } else if (loc.type === 'station' && loc.stationData) {
    selectStation(loc.stationData);
  }
  if (loc.lat != null && loc.lon != null) {
    const zoom = loc.zoom || (loc.type === 'station' ? 15 : loc.type === 'district' ? 13 : 11);
    mapFlyToTarget.value = { lon: loc.lon, lat: loc.lat, zoom, timestamp: Date.now() };
    if (vectorMapRef.value?.flyToCoords) {
      vectorMapRef.value.flyToCoords(loc.lon, loc.lat, zoom);
    }
  }
};

// TALEP-006: Konumuma Git aksiyonunu tetikleme
const handleLocateMe = () => {
  if (vectorMapRef.value?.locateUser) {
    vectorMapRef.value.locateUser();
  }
};

// URL Query Parametrelerini Dinleme (?city=..., ?operator=..., ?route=..., ?locate=...)
onMounted(() => {
  if (route.query.operator) {
    selectedOperator.value = String(route.query.operator);
  }
  if (route.query.city) {
    handleSelectCity(String(route.query.city));
  }
  if (route.query.route) {
    activeRoutePayload.value = String(route.query.route);
  }
  if (route.query.locate === '1' || route.query.locate === 'true') {
    handleLocateMe();
  }

  // S5 US-18: Veri kaynakları sağlık kontrolü
  fetchSourcesHealth();
});

watch(
  () => route.query,
  (q) => {
    if (q.operator) {
      selectedOperator.value = String(q.operator);
    }
    if (q.city) {
      handleSelectCity(String(q.city));
    }
    if (q.route) {
      activeRoutePayload.value = String(q.route);
    }
    if (q.locate === '1' || q.locate === 'true') {
      handleLocateMe();
    }
  }
);

// SEO ve Schema.org WebSite JSON-LD
useHead({
  title: 'elektriklioto.com — Elektrikli Araç Şarj İstasyonları Haritası ve Rehberi',
  meta: [
    {
      name: 'description',
      content:
        'Türkiye genelindeki tüm şarj ağlarını (ZES, Trugo, Eşarj ve 170+ operatör) tek haritada görün. Güncel konumlar ve EPDK sicil bilgileri.'
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

    <!-- TALEP-008: Harita bileşenlerini izole eden ve z-index bağlamını hapseden isolation katmanı -->
    <div class="relative flex-1 w-full h-full overflow-hidden isolate" style="isolation: isolate;">
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

      <!-- Üst Yüzen Kontroller (Arama & Filtre Çubuğu - TALEP-004 & TALEP-007) -->
      <div
        class="absolute top-4 left-4 right-4 sm:right-auto z-30 flex flex-col gap-2 pointer-events-none max-w-[calc(100vw-32px)]"
      >
        <div class="pointer-events-auto">
          <SearchInput
            v-model="searchQuery"
            @select-operator="selectedOperator = $event"
            @select-city="handleSelectCity"
            @select-station="selectStation"
            @select-location="handleSelectLocation"
          />
        </div>

        <!-- TALEP-007: Operatör Dropdown menüsünün container taşmasını ve istenmeyen scroll çubuklarını önleyen serbest kapsayıcı -->
        <div class="pointer-events-auto max-w-full">
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

      <!-- TALEP-008: Modal bileşenleri (Teleport to body ve z-[100] ile harita pinlerinin üzerinde en üst katmanda açılır) -->
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
