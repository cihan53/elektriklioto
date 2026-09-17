
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
    // Zoom >= 10: Tekil İstasyon Pinleri
    const list = props.isPublicOnly
      ? stations.value.filter(s => s.service_type !== 'Özel')
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
      const pinContent = isDefective ? '!' : (opName ? opName.charAt(0) : 'Ş');

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

const handleLocateMe = async () => {
  const coords = await requestUserLocation();
  if (coords && map) {
    map.flyTo({
      center: [coords.lon, coords.lat],
      zoom: 13,
      duration: 1200
    });
  }
};

const flyToCoords = (lon: number, lat: number, zoom = 12) => {
  if (map) {
    map.flyTo({
      center: [lon, lat],
      zoom,
      duration: 1000
    });
  }
};

defineExpose({
  flyToCoords,
  syncViewport
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
          attribution: '© OpenStreetMap katkıda bulunanlar'
        }
      },
      layers: [
        {
          id: 'osm-tiles',
          type: 'raster',
          source: 'osm-tiles',
          minzoom: 0,
          maxzoom: 19
        }
      ]
    },
    center: [32.8597, 39.9334], // Ankara
    zoom: 6,
    maxZoom: 18,
    minZoom: 4
  });

  map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right');

  map.on('load', () => {
    syncViewport();
  });

  map.on('moveend', () => {
    syncViewport();
  });
});

onUnmounted(() => {
  if (map) {
    map.remove();
    map = null;
  }
});

watch([stations, clusters, responseType, () => props.isPublicOnly], () => {
  renderMapMarkers();
});

watch(() => props.selectedOperator, () => {
  syncViewport();
});

watch(selectedStation, () => {
  renderMapMarkers();
});
</script>

<template>
  <div class="relative w-full h-full">
    <!-- Harita Tuvali -->
    <div ref="mapContainer" class="w-full h-full" aria-label="İnteraktif Şarj İstasyonları Haritası" />

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

    <!-- Konumuma Git FAB (Mobil & Masaüstü) -->
    <button
      type="button"
      @click="handleLocateMe"
      class="absolute bottom-6 right-4 sm:right-6 z-20 w-12 h-12 rounded-full bg-bg-surface border border-border-default shadow-lg flex items-center justify-center text-primary hover:bg-bg-subdued active:scale-95 transition-all touch-target-min focus-visible:outline-none"
      title="Konumuma Git"
      aria-label="Mevcut Konumuma Git"
    >
      <Navigation class="w-5 h-5 fill-current" />
    </button>
  </div>
</template>
