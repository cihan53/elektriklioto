
<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue';
import maplibregl, { type Map as MapLibreMap } from 'maplibre-gl';
import { useStations } from '~/composables/useStations';
import { useUserLocation } from '~/composables/useUserLocation';
import { useToast } from '~/composables/useToast';
import { Navigation, AlertCircle, RefreshCw, Info } from 'lucide-vue-next';
import type { StationItem, ClusterItem } from '~/types/station';

const props = defineProps<{
  selectedOperator: string;
  isPublicOnly: boolean;
}>();

const emit = defineEmits<{
  (e: 'selectStation', st: StationItem): void;
}>();

const config = useRuntimeConfig();
const mapContainer = ref<HTMLDivElement | null>(null);
let map: MapLibreMap | null = null;
let currentMarkers: maplibregl.Marker[] = [];
let userLocationMarker: maplibregl.Marker | null = null;

const {
  stations,
  clusters,
  responseType,
  loading,
  error,
  selectedStation,
  fetchStationsByBBox,
} = useStations();

const {
  userCoords,
  locationLoading,
  locationError,
  requestUserLocation,
} = useUserLocation();

const { showToast } = useToast();

// Reaktif animasyonlu odaklanma hedefi (TALEP-004: flyTo senkronizasyonu)
const mapFlyToTarget = useState<{ lon: number; lat: number; zoom: number; timestamp: number } | null>(
  'map-fly-to-target',
  () => null
);

// Bounding Box senkronizasyonu
const syncViewport = () => {
  if (!map) return;
  const bounds = map.getBounds();
  const zoom = map.getZoom();

  const minLon = bounds.getWest();
  const minLat = bounds.getSouth();
  const maxLon = bounds.getEast();
  const maxLat = bounds.getNorth();

  fetchStationsByBBox([minLon, minLat, maxLon, maxLat], zoom, props.selectedOperator);
};

// TALEP-006: Kullanıcının anlık konumunu haritada nabız atan mavi nokta (pulsing blue dot) olarak çiz
const renderUserLocationMarker = (coords: { lat: number; lon: number } | null) => {
  if (!map) return;

  if (!coords) {
    if (userLocationMarker) {
      userLocationMarker.remove();
      userLocationMarker = null;
    }
    return;
  }

  // Zaten marker varsa yalnızca koordinatını güncelle (yumuşak geçiş)
  if (userLocationMarker) {
    userLocationMarker.setLngLat([coords.lon, coords.lat]);
    return;
  }

  // Nabız atan mavi konum baloncuğu DOM elementi
  const el = document.createElement('div');
  el.className = 'user-location-marker relative flex items-center justify-center pointer-events-none';
  el.setAttribute('role', 'status');
  el.setAttribute('aria-label', 'Mevcut Konumunuz');
  el.setAttribute('title', 'Mevcut Konumunuz');

  el.innerHTML = `
    <div class="user-location-pulse absolute rounded-full"></div>
    <div class="user-location-aura absolute rounded-full"></div>
    <div class="user-location-core relative rounded-full"></div>
  `;

  userLocationMarker = new maplibregl.Marker({
    element: el,
    anchor: 'center',
  })
    .setLngLat([coords.lon, coords.lat])
    .addTo(map);
};

// Harita Pinlerini Temizle & Çiz
const renderMapMarkers = () => {
  if (!map) return;

  // Önceki istasyon markerlarını kaldır (userLocationMarker korunur)
  currentMarkers.forEach((m) => m.remove());
  currentMarkers = [];

  if (responseType.value === 'clusters') {
    // Zoom < 10: Küme Daireleri Çiz
    clusters.value.forEach((c: ClusterItem) => {
      const el = document.createElement('div');
      el.className =
        'cluster-marker flex items-center justify-center font-bold text-white shadow-lg cursor-pointer rounded-full';

      // Küme büyüklüğüne göre boyutlandırma
      let size = 36;
      let bg = '#0066CC';
      if (c.count >= 100) {
        size = 52;
        bg = '#0F172A';
      } else if (c.count >= 10) {
        size = 44;
        bg = '#0052A3';
      }

      el.style.width = `${size}px`;
      el.style.height = `${size}px`;
      el.style.backgroundColor = bg;
      el.style.border = '2px solid #FFFFFF';
      el.style.fontSize = size > 44 ? '14px' : '12px';
      el.innerText = c.count > 999 ? '999+' : c.count.toString();
      el.setAttribute('role', 'button');
      el.setAttribute('aria-label', `${c.count} istasyonluk küme`);

      el.addEventListener('click', () => {
        if (!map) return;
        map.flyTo({
          center: [c.lon, c.lat],
          zoom: Math.min(map.getZoom() + 2.5, 14),
          duration: 600,
          essential: true,
        });
      });

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([c.lon, c.lat])
        .addTo(map);

      currentMarkers.push(marker);
    });
  } else {
    // Zoom >= 10: Tekil İstasyon Pinleri
    const list = props.isPublicOnly
      ? stations.value.filter((s) => s.service_type !== 'Özel')
      : stations.value;

    list.forEach((st: StationItem) => {
      const el = document.createElement('div');
      const isSelected = selectedStation.value?.id === st.id;
      const isDefective = !!(st.is_flagged_defective || st.status === 'DEFECTIVE');

      el.className = `station-pin relative flex items-center justify-center ${isSelected ? 'is-selected' : ''} ${isDefective ? 'is-defective' : ''}`;
      el.setAttribute('role', 'button');
      const opName = st.operator?.name || (st as any).operator_name || 'Şarj İstasyonu';
      el.setAttribute('aria-label', `${st.name} — ${opName}${isDefective ? ' (Arıza Bildirildi)' : ''}`);

      const pinBg = isDefective ? '#B91C1C' : '#0066CC';
      const pinContent = isDefective ? '!' : opName ? opName.charAt(0) : 'Ş';

      // Damla pin tasarımı
      el.innerHTML = `
        <div class="w-8 h-10 flex flex-col items-center">
          <div class="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shadow-md border-2 border-white text-white" style="background-color: ${pinBg}">
            ${pinContent}
          </div>
          <div class="w-2 h-2 -mt-1 rotate-45 border-r-2 border-b-2 border-white" style="background-color: ${pinBg}"></div>
        </div>
      `;

      el.addEventListener('click', () => {
        emit('selectStation', st);
      });

      const marker = new maplibregl.Marker({ element: el, anchor: 'bottom' })
        .setLngLat([st.lon, st.lat])
        .addTo(map!);

      currentMarkers.push(marker);
    });
  }
};

// TALEP-006: Konumumu Bul aksiyonu ve haritada mavi noktanın çizilmesi
const handleLocateMe = async () => {
  const coords = await requestUserLocation();
  if (coords && map) {
    renderUserLocationMarker(coords);
    map.flyTo({
      center: [coords.lon, coords.lat],
      zoom: 14,
      duration: 1200,
      essential: true,
    });
  } else if (locationError.value) {
    showToast(locationError.value, 'warning');
  }
};

// TALEP-004: Animasyonlu flyTo fonksiyonu
const flyToCoords = (lon: number, lat: number, zoom = 12) => {
  if (map) {
    map.flyTo({
      center: [lon, lat],
      zoom,
      duration: 1000,
      essential: true,
    });
  }
};

defineExpose({
  flyToCoords,
  syncViewport,
  locateUser: handleLocateMe,
  renderUserLocationMarker,
});

onMounted(() => {
  if (!mapContainer.value) return;

  // Türkiye merkezli başlangıç görünümü
  map = new maplibregl.Map({
    container: mapContainer.value,
    style: {
      version: 8,
      sources: {
        'osm-tiles': {
          type: 'raster',
          tiles: [config.public.mapTileUrl],
          tileSize: 256,
          attribution: '© OpenStreetMap katkıda bulunanlar',
        },
      },
      layers: [
        {
          id: 'osm-tiles',
          type: 'raster',
          source: 'osm-tiles',
          minzoom: 0,
          maxzoom: 19,
        },
      ],
    },
    center: [32.8597, 39.9334], // Ankara
    zoom: 6,
    maxZoom: 18,
    minZoom: 4,
  });

  map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right');

  map.on('load', () => {
    syncViewport();
    // Kullanıcının daha önce alınmış bir konumu varsa haritada çiz
    if (userCoords.value) {
      renderUserLocationMarker(userCoords.value);
    }
  });

  map.on('moveend', () => {
    syncViewport();
  });
});

onUnmounted(() => {
  if (userLocationMarker) {
    userLocationMarker.remove();
    userLocationMarker = null;
  }
  if (map) {
    map.remove();
    map = null;
  }
});

watch([stations, clusters, responseType, () => props.isPublicOnly], () => {
  renderMapMarkers();
});

watch(
  () => props.selectedOperator,
  () => {
    syncViewport();
  }
);

watch(selectedStation, () => {
  renderMapMarkers();
});

// TALEP-006: userCoords güncellendiğinde mavi konumu anında yansıt
watch(userCoords, (newCoords) => {
  renderUserLocationMarker(newCoords);
});

// TALEP-004: Arama kutusundan gelen flyTo sinyalini dinleme ve harita animasyonu
watch(mapFlyToTarget, (target) => {
  if (target && map) {
    map.flyTo({
      center: [target.lon, target.lat],
      zoom: target.zoom,
      duration: 1200,
      essential: true,
    });
  }
});
</script>

<template>
  <div class="relative w-full h-full isolate" style="isolation: isolate;">
    <!-- Harita Tuvali -->
    <div ref="mapContainer" class="w-full h-full isolate" style="isolation: isolate;" aria-label="İnteraktif Şarj İstasyonları Haritası" />

    <!-- Yükleniyor Göstergesi -->
    <div
      v-if="loading"
      class="absolute top-4 right-4 z-20 bg-bg-surface border border-border-default shadow-md px-3 py-1.5 rounded-full flex items-center gap-2 text-xs font-medium text-text-secondary pointer-events-none"
    >
      <RefreshCw class="w-3.5 h-3.5 animate-spin text-primary" />
      <span>İstasyonlar güncelleniyor...</span>
    </div>

    <!-- Boş Durum Rozeti (Bölgede İstasyon Yok) -->
    <div
      v-if="!loading && !error && responseType === 'stations' && stations.length === 0"
      class="absolute top-20 left-1/2 -translate-x-1/2 z-20 bg-bg-surface border border-border-default shadow-md px-4 py-2 rounded-full flex items-center gap-2 text-xs font-medium text-text-secondary"
      role="status"
    >
      <Info class="w-4 h-4 text-text-muted" />
      <span>Bu bölgede şarj istasyonu bulunamadı. Haritayı kaydırın.</span>
    </div>

    <!-- Hata Durumu Bandı -->
    <div
      v-if="error"
      class="absolute bottom-20 left-1/2 -translate-x-1/2 z-20 bg-danger-subdued border border-danger/20 shadow-lg px-4 py-2 rounded-md flex items-center gap-2 text-xs font-medium text-danger"
      role="alert"
    >
      <AlertCircle class="w-4 h-4" />
      <span>{{ error }}</span>
      <button
        type="button"
        @click="syncViewport"
        class="ml-2 underline font-bold hover:text-danger-on-subdued"
      >
        Yeniden Dene
      </button>
    </div>

    <!-- Konumuma Git FAB (Mobil & Masaüstü - TALEP-006) -->
    <button
      type="button"
      @click="handleLocateMe"
      :disabled="locationLoading"
      class="absolute bottom-6 right-4 sm:right-6 z-20 w-12 h-12 rounded-full bg-bg-surface border border-border-default shadow-lg flex items-center justify-center text-primary hover:bg-bg-subdued active:scale-95 transition-all touch-target-min focus-visible:outline-none disabled:opacity-75 disabled:cursor-not-allowed"
      title="Konumuma Git"
      aria-label="Mevcut Konumuma Git"
    >
      <RefreshCw v-if="locationLoading" class="w-5 h-5 animate-spin text-primary" />
      <Navigation v-else class="w-5 h-5 fill-current" />
    </button>
  </div>
</template>

<style scoped>
/* TALEP-008: Harita pinleri ve küme baloncuklarının z-index hiyerarşisini z-10 ile sınırlandırma */
:deep(.maplibregl-marker) {
  z-index: 10 !important;
}

:deep(.station-pin) {
  z-index: 10 !important;
}

:deep(.station-pin.is-selected) {
  z-index: 20 !important;
}

:deep(.cluster-marker) {
  z-index: 10 !important;
}

/* TALEP-006 & TALEP-008: Kullanıcı anlık konumu nabız atan mavi nokta (harita kontrolleri altında z-15) */
:deep(.user-location-marker) {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  z-index: 15 !important;
}

:deep(.user-location-core) {
  width: 16px;
  height: 16px;
  border-radius: 9999px;
  background-color: var(--color-primary, #0066cc);
  border: 2.5px solid #ffffff;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(0, 102, 204, 0.2);
}

:deep(.user-location-aura) {
  width: 32px;
  height: 32px;
  border-radius: 9999px;
  background-color: var(--color-primary, #0066cc);
  opacity: 0.2;
}

:deep(.user-location-pulse) {
  width: 48px;
  height: 48px;
  border-radius: 9999px;
  background-color: var(--color-primary, #0066cc);
  opacity: 0.35;
  animation: user-location-pulse 2.2s cubic-bezier(0.24, 0, 0.38, 1) infinite;
}

@keyframes user-location-pulse {
  0% {
    transform: scale(0.33);
    opacity: 0.9;
  }
  70% {
    transform: scale(1.6);
    opacity: 0;
  }
  100% {
    transform: scale(1.8);
    opacity: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  :deep(.user-location-pulse) {
    animation: none !important;
    transform: scale(1.2) !important;
    opacity: 0.25 !important;
  }
}
</style>
