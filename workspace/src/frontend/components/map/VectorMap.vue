
<template>
  <div class="vector-map" role="region" aria-label="Şarj istasyonları haritası">
    <div ref="mapContainerRef" class="vector-map__canvas" data-testid="map-canvas" />

    <!-- Yükleniyor Durumu: mevcut pinler ekranda kalır, sadece sağ üstte spinner görünür. -->
    <div v-if="isLoading" class="vector-map__loading" role="status" aria-live="polite">
      <span class="vector-map__spinner" aria-hidden="true" />
      <span class="sr-only">İstasyonlar yükleniyor</span>
    </div>

    <!-- Boş Durum: viewport içinde istasyon yok. -->
    <div v-if="!isLoading && !hasError && isEmpty" class="vector-map__empty-pill" role="status" aria-live="polite">
      <Info :size="16" aria-hidden="true" />
      <span>Bu bölgede şarj istasyonu bulunamadı. Haritayı kaydırın.</span>
    </div>

    <!-- Hata Durumu -->
    <div v-if="hasError" class="vector-map__error-card" role="alert">
      <p class="vector-map__error-text">Harita verisi yüklenemedi.</p>
      <button type="button" class="vector-map__retry-btn" @click="retryLastFetch">
        <RefreshCw :size="16" aria-hidden="true" />
        <span>Yeniden Dene</span>
      </button>
    </div>

    <!-- Konum FAB: yalnızca mobil kırılım noktasında görünür (SCR-01). -->
    <button
      type="button"
      class="vector-map__location-fab"
      aria-label="Konumuma git"
      @click="centerOnUserLocation"
    >
      <Navigation :size="24" aria-hidden="true" />
    </button>
  </div>
</template>

<script setup lang="ts">
/**
 * TALEP-027 fix — bkz. `map/mapPinLayers.ts` dosya başı notu.
 *
 * Bu bileşen artık istasyon/küme pinlerini `maplibregl.Marker` ile
 * ayrı DOM elemanları olarak OLUŞTURMAZ. Tüm pinler tek bir GeoJSON
 * kaynağından (`STATIONS_SOURCE_ID`) beslenen native circle/symbol
 * katmanlarıyla render edilir; böylece pinlerin ekran konumu her
 * zaman haritanın kendi projeksiyonundan (gerçek lon/lat) türetilir.
 *
 * KORUNACAK (regresyon koruması): Tekil istasyonlar için tekrar
 * `new maplibregl.Marker()` + serbest konumlandırılan DOM elemanı
 * eklemeyin — bu, TALEP-027'de bildirilen "pinlerin dikdörtgen blok
 * halinde yığılması" hatasının kök nedenidir.
 */
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from "vue";
import type { Map as MapLibreMap, MapMouseEvent, MapLayerMouseEvent } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Info, Navigation, RefreshCw } from "@lucide/vue";
import {
  CLUSTER_CIRCLE_LAYER_ID,
  CLUSTER_COUNT_LAYER_ID,
  CLUSTER_PULSE_LAYER_ID,
  STATIONS_ICON_LAYER_ID,
  STATIONS_SOURCE_ID,
  SELECTED_RING_LAYER_ID,
  SELECTED_SOURCE_ID,
  buildClusterCirclePaint,
  buildClusterCountLayout,
  buildClusterCountPaint,
  buildClusterPulsePaint,
  buildSelectedRingPaint,
  buildStationsIconLayout,
  emptyFeatureCollection,
  registerStationPinImages,
  simpleDebounce,
  toSelectedFeatureCollection,
  toStationFeatureCollection,
  type PaletteTheme,
  type StationApiResponse,
} from "./mapPinLayers";

interface OperatorFilter {
  operatorSlugs?: string[];
  serviceType?: "PUBLIC" | "PRIVATE" | null;
}

const props = withDefaults(
  defineProps<{
    apiBase?: string;
    filters?: OperatorFilter;
    initialCenter?: [number, number];
    initialZoom?: number;
    /** Dışarıdan zorunlu tema; verilmezse `<html>.dark` sınıfı izlenir. */
    theme?: PaletteTheme;
  }>(),
  {
    apiBase: "/api/v1",
    filters: () => ({}),
    initialCenter: () => [35.2433, 39.0], // Türkiye merkezi (Ankara civarı), zoom 6 — konum izni yoksa varsayılan.
    initialZoom: 6,
    theme: undefined,
  },
);

const emit = defineEmits<{
  (e: "station-select", stationUid: string, slug: string | null): void;
  (e: "update:bbox", bbox: [number, number, number, number], zoom: number): void;
  (e: "toast", message: string, kind: "info" | "error" | "success"): void;
  (e: "error", error: unknown): void;
}>();

const mapContainerRef = ref<HTMLDivElement | null>(null);
const mapInstance = shallowRef<MapLibreMap | null>(null);

const isLoading = ref(false);
const hasError = ref(false);
const isEmpty = ref(false);
const selectedStationUid = ref<string | null>(null);

const detectedTheme = ref<PaletteTheme>("light");
const activeTheme = computed<PaletteTheme>(() => props.theme ?? detectedTheme.value);

const prefersReducedMotion = ref(false);
let pulseAnimationHandle: number | null = null;
let themeObserver: MutationObserver | null = null;

let lastQuery: { bbox: [number, number, number, number]; zoom: number } | null = null;

// Kullanıcının anlık GPS konumu YALNIZCA istemci belleğinde tutulur;
// hiçbir zaman API sorgu parametresine veya loglara yazılmaz (KVKK).
let inMemoryUserLocation: { lon: number; lat: number } | null = null;

function readMapEnvStyleUrl(): string {
  // KURULUM GEREKİYOR: Harita karo (tile) sağlayıcı hesabı ve API anahtarı.
  // Anahtar ortam değişkeninden okunur, istemci derlemesine gömülmez.
  const runtimeCfg =
    typeof useRuntimeConfig === "function" ? useRuntimeConfig() : undefined;
  const fromRuntime = (runtimeCfg?.public as Record<string, unknown> | undefined)?.mapStyleUrl;
  if (typeof fromRuntime === "string" && fromRuntime.length > 0) return fromRuntime;
  if (typeof import.meta !== "undefined") {
    const fromEnv = (import.meta as unknown as { env?: Record<string, string> }).env
      ?.VITE_MAP_STYLE_URL;
    if (fromEnv) return fromEnv;
  }
  // Anahtar sağlanmadığında haritanın tamamen boş kalmaması için nötr,
  // anahtar gerektirmeyen bir fallback stil kullanılır.
  return "https://demotiles.maplibre.org/style.json";
}

async function fetchStationsForViewport(bbox: [number, number, number, number], zoom: number) {
  lastQuery = { bbox, zoom };
  isLoading.value = true;
  hasError.value = false;
  try {
    const query: Record<string, string | number> = {
      bbox: bbox.join(","),
      zoom,
    };
    if (props.filters?.operatorSlugs?.length) {
      query.operator = props.filters.operatorSlugs.join(",");
    }
    if (props.filters?.serviceType) {
      query.service_type = props.filters.serviceType;
    }
    const response = await $fetch<StationApiResponse>(`${props.apiBase}/stations`, { query });
    const collection = toStationFeatureCollection(response);
    isEmpty.value = collection.features.length === 0;

    const map = mapInstance.value;
    const source = map?.getSource(STATIONS_SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
    source?.setData(collection);
  } catch (err) {
    hasError.value = true;
    emit("error", err);
  } finally {
    isLoading.value = false;
  }
}

const debouncedFetch = simpleDebounce(fetchStationsForViewport, 300);

function retryLastFetch() {
  if (lastQuery) {
    fetchStationsForViewport(lastQuery.bbox, lastQuery.zoom);
  }
}

function handleMoveEnd() {
  const map = mapInstance.value;
  if (!map) return;
  const bounds = map.getBounds();
  const bbox: [number, number, number, number] = [
    bounds.getWest(),
    bounds.getSouth(),
    bounds.getEast(),
    bounds.getNorth(),
  ];
  const zoom = map.getZoom();
  emit("update:bbox", bbox, zoom);
  debouncedFetch(bbox, zoom);
}

function updateSelectedSource(lon: number | null, lat: number | null) {
  const map = mapInstance.value;
  const source = map?.getSource(SELECTED_SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
  source?.setData(toSelectedFeatureCollection(lon, lat));
}

function refreshStationIconExpression() {
  const map = mapInstance.value;
  if (!map || !map.getLayer(STATIONS_ICON_LAYER_ID)) return;
  map.setLayoutProperty(
    STATIONS_ICON_LAYER_ID,
    "icon-image",
    buildStationsIconLayout(selectedStationUid.value)["icon-image"],
  );
}

function handleClusterClick(event: MapLayerMouseEvent) {
  const feature = event.features?.[0];
  const map = mapInstance.value;
  if (!feature || !map) return;
  const coords = (feature.geometry as GeoJSON.Point).coordinates as [number, number];
  const flyOptions = { center: coords, zoom: 12 } as const;
  if (prefersReducedMotion.value) {
    map.jumpTo(flyOptions);
  } else {
    map.easeTo({ ...flyOptions, duration: 500 });
  }
}

function handleStationClick(event: MapLayerMouseEvent) {
  const feature = event.features?.[0];
  if (!feature) return;
  const props_ = feature.properties as Record<string, unknown>;
  const stationUid = String(props_.station_uid ?? "");
  const slug = (props_.slug as string | null) ?? null;
  const coords = (feature.geometry as GeoJSON.Point).coordinates as [number, number];

  selectedStationUid.value = stationUid;
  refreshStationIconExpression();
  updateSelectedSource(coords[0], coords[1]);
  emit("station-select", stationUid, slug);
}

function setCursor(cursor: string) {
  const map = mapInstance.value;
  if (map) map.getCanvas().style.cursor = cursor;
}

function startClusterPulseAnimation() {
  if (prefersReducedMotion.value) return;
  const map = mapInstance.value;
  if (!map) return;
  let growing = true;
  let scale = 1;
  const step = () => {
    if (!mapInstance.value || !map.getLayer(CLUSTER_PULSE_LAYER_ID)) return;
    scale += growing ? 0.006 : -0.006;
    if (scale > 1.4) growing = false;
    if (scale < 1) growing = true;
    const opacity = 0.25 * (1.4 - scale);
    try {
      map.setPaintProperty(CLUSTER_PULSE_LAYER_ID, "circle-opacity", Math.max(opacity, 0));
    } catch {
      // Katman henüz kaldırılmışsa animasyonu sessizce durdur.
      return;
    }
    pulseAnimationHandle = requestAnimationFrame(step);
  };
  pulseAnimationHandle = requestAnimationFrame(step);
}

function stopClusterPulseAnimation() {
  if (pulseAnimationHandle !== null) {
    cancelAnimationFrame(pulseAnimationHandle);
    pulseAnimationHandle = null;
  }
}

function applyThemeToLayers() {
  const map = mapInstance.value;
  if (!map || !map.isStyleLoaded()) return;
  const theme = activeTheme.value;
  registerStationPinImages(map);
  if (map.getLayer(CLUSTER_CIRCLE_LAYER_ID)) {
    const paint = buildClusterCirclePaint(theme);
    Object.entries(paint).forEach(([key, value]) => {
      map.setPaintProperty(CLUSTER_CIRCLE_LAYER_ID, key, value as never);
    });
  }
  if (map.getLayer(CLUSTER_PULSE_LAYER_ID)) {
    const paint = buildClusterPulsePaint(theme);
    Object.entries(paint).forEach(([key, value]) => {
      map.setPaintProperty(CLUSTER_PULSE_LAYER_ID, key, value as never);
    });
  }
  if (map.getLayer(CLUSTER_COUNT_LAYER_ID)) {
    const paint = buildClusterCountPaint(theme);
    Object.entries(paint).forEach(([key, value]) => {
      map.setPaintProperty(CLUSTER_COUNT_LAYER_ID, key, value as never);
    });
  }
  refreshStationIconExpression();
}

function detectThemeFromDocument() {
  if (typeof document === "undefined") return;
  detectedTheme.value = document.documentElement.classList.contains("dark") ? "dark" : "light";
}

function buildLayers(map: MapLibreMap) {
  map.addSource(STATIONS_SOURCE_ID, {
    type: "geojson",
    data: emptyFeatureCollection(),
  });
  map.addSource(SELECTED_SOURCE_ID, {
    type: "geojson",
    data: emptyFeatureCollection(),
  });

  registerStationPinImages(map);

  map.addLayer({
    id: CLUSTER_PULSE_LAYER_ID,
    type: "circle",
    source: STATIONS_SOURCE_ID,
    filter: ["has", "point_count"],
    paint: buildClusterPulsePaint(activeTheme.value),
  });
  map.addLayer({
    id: CLUSTER_CIRCLE_LAYER_ID,
    type: "circle",
    source: STATIONS_SOURCE_ID,
    filter: ["has", "point_count"],
    paint: buildClusterCirclePaint(activeTheme.value),
  });
  map.addLayer({
    id: CLUSTER_COUNT_LAYER_ID,
    type: "symbol",
    source: STATIONS_SOURCE_ID,
    filter: ["has", "point_count"],
    layout: buildClusterCountLayout(),
    paint: buildClusterCountPaint(activeTheme.value),
  });
  map.addLayer({
    id: SELECTED_RING_LAYER_ID,
    type: "circle",
    source: SELECTED_SOURCE_ID,
    paint: buildSelectedRingPaint(),
  });
  map.addLayer({
    id: STATIONS_ICON_LAYER_ID,
    type: "symbol",
    source: STATIONS_SOURCE_ID,
    filter: ["!", ["has", "point_count"]],
    layout: buildStationsIconLayout(selectedStationUid.value),
  });

  map.on("click", CLUSTER_CIRCLE_LAYER_ID, handleClusterClick);
  map.on("click", STATIONS_ICON_LAYER_ID, handleStationClick);
  map.on("mouseenter", CLUSTER_CIRCLE_LAYER_ID, () => setCursor("pointer"));
  map.on("mouseleave", CLUSTER_CIRCLE_LAYER_ID, () => setCursor(""));
  map.on("mouseenter", STATIONS_ICON_LAYER_ID, () => setCursor("pointer"));
  map.on("mouseleave", STATIONS_ICON_LAYER_ID, () => setCursor(""));

  startClusterPulseAnimation();
  handleMoveEnd();
}

function centerOnUserLocation() {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    emit("toast", "Konum servisleri bu tarayıcıda desteklenmiyor.", "error");
    return;
  }
  navigator.geolocation.getCurrentPosition(
    (position) => {
      // Konum yalnızca anlık harita merkezleme için in-memory kullanılır;
      // sunucuya iletilmez, kalıcı olarak saklanmaz (KVKK zorunlu kısıtı).
      inMemoryUserLocation = {
        lon: position.coords.longitude,
        lat: position.coords.latitude,
      };
      const map = mapInstance.value;
      const center: [number, number] = [inMemoryUserLocation.lon, inMemoryUserLocation.lat];
      if (!map) return;
      if (prefersReducedMotion.value) {
        map.jumpTo({ center, zoom: 14 });
      } else {
        map.easeTo({ center, zoom: 14, duration: 500 });
      }
    },
    () => {
      emit("toast", "Konum izni alınamadı.", "error");
    },
    { enableHighAccuracy: false, timeout: 8000, maximumAge: 0 },
  );
}

let resizeObserver: ResizeObserver | null = null;

onMounted(async () => {
  if (typeof window === "undefined" || !mapContainerRef.value) return;

  prefersReducedMotion.value = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  detectThemeFromDocument();
  themeObserver = new MutationObserver(() => {
    detectThemeFromDocument();
    applyThemeToLayers();
  });
  if (document.documentElement) {
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  }

  const maplibregl = (await import("maplibre-gl")).default;

  const map = new maplibregl.Map({
    container: mapContainerRef.value,
    style: readMapEnvStyleUrl(),
    center: props.initialCenter,
    zoom: props.initialZoom,
    attributionControl: true,
  });
  mapInstance.value = map;

  map.on("load", () => {
    buildLayers(map);
  });
  map.on("moveend", handleMoveEnd);

  resizeObserver = new ResizeObserver(() => map.resize());
  resizeObserver.observe(mapContainerRef.value);
});

watch(
  () => props.filters,
  () => {
    if (lastQuery) fetchStationsForViewport(lastQuery.bbox, lastQuery.zoom);
  },
  { deep: true },
);

watch(activeTheme, () => {
  applyThemeToLayers();
});

onBeforeUnmount(() => {
  stopClusterPulseAnimation();
  themeObserver?.disconnect();
  resizeObserver?.disconnect();
  const map = mapInstance.value;
  if (map) {
    map.off("moveend", handleMoveEnd);
    map.remove();
  }
  mapInstance.value = null;
});

defineExpose({
  focusStation: (lon: number, lat: number, stationUid: string) => {
    selectedStationUid.value = stationUid;
    refreshStationIconExpression();
    updateSelectedSource(lon, lat);
    const map = mapInstance.value;
    if (!map) return;
    const options = { center: [lon, lat] as [number, number], zoom: Math.max(map.getZoom(), 14) };
    if (prefersReducedMotion.value) map.jumpTo(options);
    else map.easeTo({ ...options, duration: 500 });
  },
  getMap: () => mapInstance.value,
});
</script>

<style scoped>
.vector-map {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 320px;
  border-radius: var(--radius-none);
  overflow: hidden;
}

.vector-map__canvas {
  position: absolute;
  inset: 0;
}

.vector-map__loading {
  position: absolute;
  top: var(--spacing-4);
  right: var(--spacing-4);
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
}

.vector-map__spinner {
  width: 24px;
  height: 24px;
  border-radius: var(--radius-full);
  border: 3px solid var(--color-border-default);
  border-top-color: var(--color-primary);
  animation: vector-map-spin 0.8s linear infinite;
}

@media (prefers-reduced-motion: reduce) {
  .vector-map__spinner {
    animation: none;
  }
}

@keyframes vector-map-spin {
  to {
    transform: rotate(360deg);
  }
}

.vector-map__empty-pill {
  position: absolute;
  top: var(--spacing-4);
  left: 50%;
  transform: translateX(-50%);
  z-index: 10;
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  padding: var(--spacing-2) var(--spacing-4);
  border-radius: var(--radius-full);
  background: var(--color-bg-surface);
  color: var(--color-text-secondary);
  box-shadow: var(--shadow-md);
  font: var(--text-body-sm, inherit);
}

.vector-map__error-card {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 10;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-3);
  padding: var(--spacing-6);
  border-radius: var(--radius-lg);
  background: var(--color-bg-surface);
  border: 1px solid var(--color-border-default);
  box-shadow: var(--shadow-lg);
}

.vector-map__error-text {
  color: var(--color-text-primary);
}

.vector-map__retry-btn {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-2);
  min-height: 44px;
  padding: 0 var(--spacing-4);
  border-radius: var(--radius-md);
  background: var(--color-primary);
  color: var(--color-on-primary);
  border: none;
  cursor: pointer;
}

.vector-map__retry-btn:hover {
  background: var(--color-primary-hover);
}

.vector-map__retry-btn:focus-visible {
  outline: 3px solid var(--color-focus-ring);
  outline-offset: 2px;
}

.vector-map__location-fab {
  position: absolute;
  right: var(--spacing-4);
  bottom: var(--spacing-4);
  z-index: 10;
  width: 48px;
  height: 48px;
  min-width: 48px;
  min-height: 48px;
  border-radius: var(--radius-full);
  background: var(--color-bg-surface);
  color: var(--color-primary);
  border: none;
  box-shadow: var(--shadow-lg);
  display: none;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.vector-map__location-fab:focus-visible {
  outline: 3px solid var(--color-focus-ring);
  outline-offset: 2px;
}

/* SCR-01: Konum FAB yalnızca mobil kırılım noktasında görünür. */
@media (max-width: 639px) {
  .vector-map__location-fab {
    display: flex;
  }
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
</style>
