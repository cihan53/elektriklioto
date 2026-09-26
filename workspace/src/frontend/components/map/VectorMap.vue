
<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue';
import maplibregl, { type Map as MapLibreMap, type GeoJSONSource, type MapLayerMouseEvent } from 'maplibre-gl';
import { useStations } from '~/composables/useStations';
import { useUserLocation } from '~/composables/useUserLocation';
import { useToast } from '~/composables/useToast';
import { Navigation, AlertCircle, RefreshCw, Info } from 'lucide-vue-next';
import {
  STATIONS_SOURCE_ID,
  STATION_POINTS_SOURCE_ID,
  SELECTED_SOURCE_ID,
  CLUSTER_CIRCLE_LAYER_ID,
  CLUSTER_PULSE_LAYER_ID,
  CLUSTER_COUNT_LAYER_ID,
  CLUSTER_CIRCLE_POINTS_LAYER_ID,
  CLUSTER_PULSE_POINTS_LAYER_ID,
  CLUSTER_COUNT_POINTS_LAYER_ID,
  STATIONS_ICON_LAYER_ID,
  SELECTED_RING_LAYER_ID,
  buildClusterCirclePaint,
  buildClusterPulsePaint,
  buildClusterCountLayout,
  buildClusterCountPaint,
  buildStationsIconLayout,
  buildSelectedRingPaint,
  registerStationPinImages,
  emptyFeatureCollection,
  toSelectedFeatureCollection,
  type PaletteTheme,
} from './mapPinLayers';
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
let mapReady = false;
let userLocationMarker: maplibregl.Marker | null = null;

// TALEP-027: İstasyon/küme pinleri DOM Marker yerine tek GeoJSON kaynağından
// beslenen native circle/symbol katmanlarıyla çizilir. Katman konumlandırması
// haritanın kendi projeksiyonundan gelir — belge akışına düşüp blok halinde
// yığılma yapısal olarak imkânsızdır. (KORUNACAK: tekil istasyonlar için
// maplibregl.Marker + serbest CSS'e dönmeyin.)
const stationByUid = new Map<string, StationItem>();

// Geçersiz/Türkiye dışı koordinatlar haritaya hiç girmez.
const isValidTrCoord = (lon: unknown, lat: unknown) =>
  Number.isFinite(lon) && Number.isFinite(lat)
  && (lon as number) >= 25.4 && (lon as number) <= 44.9
  && (lat as number) >= 35.5 && (lat as number) <= 42.4;

const activeTheme = (): PaletteTheme =>
  typeof document !== 'undefined' && document.documentElement.classList.contains('dark')
    ? 'dark'
    : 'light';

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

// TALEP-027: Pin verisi GeoJSON kaynağına yazılır; çizim native katmanlarca yapılır.
// Backend kümesi düşük zoom'da, native GeoJSON kümelemesi tekil istasyon
// yoğunluğunda (zoom >= 10) devrededir — yakın pinler otomatik gruplaşır.
const renderMapMarkers = () => {
  if (!map || !mapReady) return;

  const backendClusterFeatures: GeoJSON.Feature[] = [];
  const stationFeatures: GeoJSON.Feature[] = [];

  if (responseType.value === 'clusters') {
    // Zoom < 10: Backend küme daireleri (point_count alanı katmanları ayırt eder)
    clusters.value.forEach((c: ClusterItem, idx: number) => {
      if (!isValidTrCoord(c.lon, c.lat)) return;
      backendClusterFeatures.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [c.lon, c.lat] },
        properties: {
          cluster_id: c.cluster_id || `cluster-${idx}`,
          point_count: c.count,
        },
      });
    });
    stationByUid.clear();
  } else {
    // Zoom >= 10: Tekil istasyon pinleri — native cluster kaynağına yazılır,
    // yakın pinler harita motoru tarafından küme dairelerine gruplanır.
    const list = props.isPublicOnly
      ? stations.value.filter((s) => s.service_type !== 'Özel')
      : stations.value;

    stationByUid.clear();
    list.forEach((st: StationItem) => {
      const lon = Number(st.lon);
      const lat = Number(st.lat);
      if (!isValidTrCoord(lon, lat)) return;

      const uid = String(st.id);
      stationByUid.set(uid, st);
      stationFeatures.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [lon, lat] },
        properties: {
          station_uid: uid,
          slug: st.slug || null,
          hasActiveIssue: !!(st.is_flagged_defective || st.status === 'DEFECTIVE'),
        },
      });
    });
  }

  (map.getSource(STATIONS_SOURCE_ID) as GeoJSONSource | undefined)?.setData({
    type: 'FeatureCollection',
    features: backendClusterFeatures,
  });
  (map.getSource(STATION_POINTS_SOURCE_ID) as GeoJSONSource | undefined)?.setData({
    type: 'FeatureCollection',
    features: stationFeatures,
  });
};

// Seçili istasyon halkası + seçili pin varyantı (veri değişiminden bağımsız).
const renderSelection = () => {
  if (!map || !mapReady) return;
  const st = selectedStation.value;
  (map.getSource(SELECTED_SOURCE_ID) as GeoJSONSource | undefined)?.setData(
    toSelectedFeatureCollection(
      st && isValidTrCoord(st.lon, st.lat) ? Number(st.lon) : null,
      st && isValidTrCoord(st.lon, st.lat) ? Number(st.lat) : null,
    ),
  );
  map.setLayoutProperty(
    STATIONS_ICON_LAYER_ID,
    'icon-image',
    buildStationsIconLayout(st ? String(st.id) : null)['icon-image'],
  );
};

// Kaynaklar, katmanlar ve tıklama etkileşimleri — map 'load' sonrası bir kez kurulur.
const setupPinLayers = () => {
  if (!map) return;
  const theme = activeTheme();

  map.addSource(STATIONS_SOURCE_ID, {
    type: 'geojson',
    data: emptyFeatureCollection(),
  });
  // Tekil istasyon noktaları için native kümeleme — yoğun veride (TALEP-019
  // EPDK seti) yakın pinler otomatik küme dairesine gruplaşır.
  map.addSource(STATION_POINTS_SOURCE_ID, {
    type: 'geojson',
    data: emptyFeatureCollection(),
    cluster: true,
    clusterRadius: 48,
    clusterMaxZoom: 15,
  });
  map.addSource(SELECTED_SOURCE_ID, {
    type: 'geojson',
    data: emptyFeatureCollection(),
  });

  registerStationPinImages(map);

  // Küme katmanları iki kaynağa da bağlanır: backend kümeleri (zoom<10) ve
  // native kümeleme çıktıları (zoom>=10, yoğun istasyon noktaları).
  const clusterLayerSets: Array<[string, string, string, string]> = [
    [STATIONS_SOURCE_ID, CLUSTER_PULSE_LAYER_ID, CLUSTER_CIRCLE_LAYER_ID, CLUSTER_COUNT_LAYER_ID],
    [STATION_POINTS_SOURCE_ID, CLUSTER_PULSE_POINTS_LAYER_ID, CLUSTER_CIRCLE_POINTS_LAYER_ID, CLUSTER_COUNT_POINTS_LAYER_ID],
  ];
  for (const [sourceId, pulseId, circleId, countId] of clusterLayerSets) {
    map.addLayer({
      id: pulseId,
      type: 'circle',
      source: sourceId,
      filter: ['has', 'point_count'],
      paint: buildClusterPulsePaint(theme),
    });
    map.addLayer({
      id: circleId,
      type: 'circle',
      source: sourceId,
      filter: ['has', 'point_count'],
      paint: buildClusterCirclePaint(theme),
    });
    map.addLayer({
      id: countId,
      type: 'symbol',
      source: sourceId,
      filter: ['has', 'point_count'],
      layout: buildClusterCountLayout(),
      paint: buildClusterCountPaint(theme),
    });
  }
  map.addLayer({
    id: SELECTED_RING_LAYER_ID,
    type: 'circle',
    source: SELECTED_SOURCE_ID,
    paint: buildSelectedRingPaint(),
  });
  map.addLayer({
    id: STATIONS_ICON_LAYER_ID,
    type: 'symbol',
    source: STATION_POINTS_SOURCE_ID,
    filter: ['!', ['has', 'point_count']],
    layout: buildStationsIconLayout(null),
  });

  // Backend kümesi tıklama → içeri zoom (eski DOM davranışının karşılığı)
  map.on('click', CLUSTER_CIRCLE_LAYER_ID, (e: MapLayerMouseEvent) => {
    if (!map) return;
    const f = e.features?.[0];
    if (!f || f.geometry.type !== 'Point') return;
    map.flyTo({
      center: f.geometry.coordinates as [number, number],
      zoom: Math.min(map.getZoom() + 2.5, 14),
      duration: 600,
      essential: true,
    });
  });

  // Native küme tıklama → kümenin açıldığı zoom'a git
  map.on('click', CLUSTER_CIRCLE_POINTS_LAYER_ID, async (e: MapLayerMouseEvent) => {
    if (!map) return;
    const f = e.features?.[0];
    if (!f || f.geometry.type !== 'Point') return;
    const clusterId = f.properties?.cluster_id;
    const source = map.getSource(STATION_POINTS_SOURCE_ID) as GeoJSONSource | undefined;
    if (clusterId === undefined || !source?.getClusterExpansionZoom) return;
    try {
      const zoom = await source.getClusterExpansionZoom(clusterId);
      map.easeTo({
        center: f.geometry.coordinates as [number, number],
        zoom,
        duration: 500,
      });
    } catch {
      map.easeTo({
        center: f.geometry.coordinates as [number, number],
        zoom: Math.min(map.getZoom() + 2, 15),
        duration: 500,
      });
    }
  });

  // Tekil pin tıklama → eski emit('selectStation', st) davranışı
  map.on('click', STATIONS_ICON_LAYER_ID, (e: MapLayerMouseEvent) => {
    const uid = e.features?.[0]?.properties?.station_uid;
    const st = uid ? stationByUid.get(String(uid)) : undefined;
    if (st) emit('selectStation', st);
  });

  for (const layerId of [CLUSTER_CIRCLE_LAYER_ID, CLUSTER_CIRCLE_POINTS_LAYER_ID, STATIONS_ICON_LAYER_ID]) {
    map.on('mouseenter', layerId, () => {
      if (map) map.getCanvas().style.cursor = 'pointer';
    });
    map.on('mouseleave', layerId, () => {
      if (map) map.getCanvas().style.cursor = '';
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
      // Küme sayısı symbol katmanının text-field'ı glyphs endpoint'i ister;
      // raster-only stilde yoksa addLayer hata fırlatır ve pin katmanı kurulamaz.
      glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
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
    mapReady = true;
    setupPinLayers();
    renderMapMarkers();
    renderSelection();
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
  renderSelection();
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
