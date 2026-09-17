
<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue';
import maplibregl, { type Map as MapLibreMap } from 'maplibre-gl';
import { useStations } from '~/composables/useStations';
import { useUserLocation } from '~/composables/useUserLocation';
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

const {
  stations,
  clusters,
  responseType,
  loading,
  error,
  selectedStation,
  fetchStationsByBBox,
  selectStation
} = useStations();

const { requestUserLocation } = useUserLocation();

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

// Harita Pinlerini Temizle & Çiz
const renderMapMarkers = () => {
  if (!map) return;

  // Önceki markerları kaldır
  currentMarkers.forEach(m => m.remove());
  currentMarkers = [];

  if (responseType.value === 'clusters') {
    // Zoom < 10: Küme Daireleri Çiz
    clusters.value.forEach((c: ClusterItem) => {
      const el = document.createElement('div');
      el.className = 'cluster-marker flex items-center justify-center font-bold text-white shadow-lg cursor-pointer rounded-full';

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
          duration: 600
        });
      });

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([c.lon, c.lat])
        .addTo(map);

      currentMarkers.push(marker);
    });
  } else {
    // Zoom >= 10: Tekil İstasyon Pinleri Çiz
    stations.value.forEach((st: StationItem) => {
      if (props.isPublicOnly && st.service_type === 'Özel') {
        return;
      }

      const isSelected = selectedStation.value?.id === st.id;

      const el = document.createElement('div');
      el.className = `station-pin flex items-center justify-center rounded-full shadow-md ${isSelected ? 'is-selected' : ''}`;
      el.style.width = '36px';
      el.style.height = '36px';
      el.style.backgroundColor = '#0066CC';
      el.style.border = '2px solid #FFFFFF';
      el.style.color = '#FFFFFF';
      el.style.fontWeight = 'bold';
      el.style.fontSize = '12px';
      el.setAttribute('role', 'button');
      el.setAttribute('aria-label', `${st.name}, ${st.operator.name}`);

      el.innerText = st.operator.name.charAt(0);

      el.addEventListener('click', () => {
        selectStation(st);
        emit('selectStation', st);
        if (map) {
          map.flyTo({
            center: [st.lon, st.lat],
            duration: 400
          });
        }
      });

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([st.lon, st.lat])
        .addTo(map);

      currentMarkers.push(marker);
    });
  }
};

watch([stations, clusters, selectedStation], () => {
  renderMapMarkers();
});

watch(() => props.selectedOperator, () => {
  syncViewport();
});

watch(() => props.isPublicOnly, () => {
  renderMapMarkers();
});

// Kullanıcı Konumuna Git FAB
const handleGoToLocation = async () => {
  const coords = await requestUserLocation();
  if (coords && map) {
    map.flyTo({
      center: [coords.lon, coords.lat],
      zoom: 13,
      duration: 800
    });
  }
};

onMounted(() => {
  if (!mapContainer.value) return;

  // Haritayı Türkiye merkezli başlat (Ankara: [35.24, 38.96], zoom: 6)
  map = new maplibregl.Map({
    container: mapContainer.value,
    style: {
      version: 8,
      sources: {
        'osm-tiles': {
          type: 'raster',
          tiles: [config.public.mapTileUrl],
          tileSize: 256,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        }
      },
      layers: [
        {
          id: 'osm-tiles-layer',
          type: 'raster',
          source: 'osm-tiles',
          minzoom: 0,
          maxzoom: 19
        }
      ]
    },
    center: [35.2433, 38.9637],
    zoom: 6
  });

  map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right');
  map.on('moveend', syncViewport);
  map.on('load', syncViewport);
});

onUnmounted(() => {
  if (map) {
    map.remove();
    map = null;
  }
});

defineExpose({
  flyToCoords: (lon: number, lat: number, zoom = 13) => {
    if (map) {
      map.flyTo({ center: [lon, lat], zoom, duration: 600 });
    }
  }
});
</script>

<template>
  <div class="relative w-full h-[calc(100vh-64px)] overflow-hidden bg-bg-base">
    <!-- Harita Tuvali -->
    <div ref="mapContainer" class="w-full h-full" aria-label="Elektrikli Araç Şarj İstasyonları Haritası" />

    <!-- Yükleniyor Göstergesi -->
    <div
      v-if="loading"
      class="absolute top-4 right-4 z-20 px-3 py-1.5 rounded-full bg-bg-surface/90 backdrop-blur border border-border-default shadow-md flex items-center gap-2 text-xs font-medium text-text-primary"
      role="status"
    >
      <RefreshCw class="w-3.5 h-3.5 text-primary animate-spin" />
      <span>İstasyonlar yükleniyor...</span>
    </div>

    <!-- Hata Durumu Bandı -->
    <div
      v-if="error"
      class="absolute top-4 left-1/2 -translate-x-1/2 z-20 px-4 py-2 rounded-md bg-danger text-white shadow-lg flex items-center gap-2 text-xs font-semibold"
      role="alert"
    >
      <AlertCircle class="w-4 h-4" />
      <span>{{ error }}</span>
      <button
        type="button"
        @click="syncViewport"
        class="ml-2 underline hover:opacity-80 touch-target-min"
      >
        Yeniden Dene
      </button>
    </div>

    <!-- Boş Durum Bandı (Bölgede istasyon yoksa) -->
    <div
      v-if="!loading && !error && responseType === 'stations' && stations.length === 0"
      class="absolute top-16 left-1/2 -translate-x-1/2 z-20 px-4 py-2 rounded-full bg-bg-surface/95 backdrop-blur border border-border-default shadow-md flex items-center gap-2 text-xs font-medium text-text-secondary"
      role="status"
    >
      <Info class="w-4 h-4 text-text-muted" />
      <span>Bu alanda şarj istasyonu bulunamadı. Haritayı kaydırın veya uzaklaşın.</span>
    </div>

    <!-- Konumuma Git FAB Butonu (Yalnızca istemci tarafında in-memory) -->
    <button
      type="button"
      @click="handleGoToLocation"
      class="absolute bottom-24 right-4 z-20 w-12 h-12 rounded-full bg-bg-surface border border-border-default shadow-lg text-primary hover:bg-bg-subdued flex items-center justify-center transition-transform active:scale-95 focus-visible:outline-none"
      aria-label="Mevcut Konumuma Git"
      title="Konumuma Git"
    >
      <Navigation class="w-5 h-5 fill-current" />
    </button>
  </div>
</template>
