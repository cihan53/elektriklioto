
<template>
  <div class="station-map">
    <div ref="mapContainer" class="station-map__container" />
    <p v-if="errorMessage" class="station-map__error" role="alert">{{ errorMessage }}</p>
  </div>
</template>

<script setup lang="ts">
// Dosya adı ".client.vue" ile bittiği için Nuxt bu bileşeni otomatik olarak yalnızca
// tarayıcıda render eder (bkz. teknik_mimari_dokumani.md §8: "harita sayfası ssr:false
// bileşen ile client-only hydrate"). Harita kütüphanesi (maplibre-gl) ayrıca bileşen
// mount olduğunda dinamik import edilir; böylece ayrı bir JS parçası (chunk) olarak kalır.
import { onBeforeUnmount, onMounted, ref, shallowRef } from "vue";
import { useStationsApi, type StationCluster, type StationPin, type StationsResponse } from "~/composables/useStationsApi";

const config = useRuntimeConfig();
const { fetchStations } = useStationsApi();

const mapContainer = ref<HTMLDivElement | null>(null);
const errorMessage = ref<string | null>(null);

// maplibre-gl yalnızca istemcide dinamik olarak yüklendiği için tip burada `any` ile tutulur.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const map = shallowRef<any>(null);

const SOURCE_ID = "stations";
const DEFAULT_CENTER: [number, number] = [35.2433, 39.0]; // Türkiye coğrafi merkezi civarı
const DEFAULT_ZOOM = 5.5;
const MOVE_DEBOUNCE_MS = 300;

let moveDebounceTimer: ReturnType<typeof setTimeout> | null = null;
let destroyed = false;

function toFeatureCollection(response: StationsResponse) {
  return {
    type: "FeatureCollection" as const,
    features: response.items.map((item) => {
      if (item.kind === "cluster") {
        const cluster = item as StationCluster;
        return {
          type: "Feature" as const,
          geometry: { type: "Point" as const, coordinates: [cluster.lon, cluster.lat] },
          properties: { kind: "cluster", count: cluster.count },
        };
      }
      const pin = item as StationPin;
      return {
        type: "Feature" as const,
        geometry: { type: "Point" as const, coordinates: [pin.lon, pin.lat] },
        properties: {
          kind: "pin",
          uid: pin.uid,
          operatorName: pin.operatorName,
          maxPowerKw: pin.maxPowerKw,
          status: pin.status,
        },
      };
    }),
  };
}

function currentBbox(): [number, number, number, number] {
  const bounds = map.value.getBounds();
  return [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()];
}

async function refreshStations() {
  if (!map.value) return;
  try {
    const response = await fetchStations({ bbox: currentBbox(), zoom: map.value.getZoom() });
    if (destroyed) return;
    errorMessage.value = null;
    const source = map.value.getSource(SOURCE_ID);
    if (source) {
      source.setData(toFeatureCollection(response));
    }
  } catch {
    errorMessage.value = "İstasyon verisi yüklenemedi. Bağlantınızı kontrol edin.";
  }
}

function scheduleRefresh() {
  if (moveDebounceTimer) clearTimeout(moveDebounceTimer);
  moveDebounceTimer = setTimeout(refreshStations, MOVE_DEBOUNCE_MS);
}

onMounted(async () => {
  if (!mapContainer.value) return;

  const [{ default: maplibregl }] = await Promise.all([
    import("maplibre-gl"),
    import("maplibre-gl/dist/maplibre-gl.css"),
  ]);

  if (destroyed || !mapContainer.value) return;

  const instance = new maplibregl.Map({
    container: mapContainer.value,
    style: config.public.mapStyleUrl as string,
    center: DEFAULT_CENTER,
    zoom: DEFAULT_ZOOM,
    attributionControl: true,
  });

  instance.addControl(new maplibregl.NavigationControl(), "top-right");

  instance.on("load", () => {
    instance.addSource(SOURCE_ID, {
      type: "geojson",
      data: { type: "FeatureCollection", features: [] },
    });

    // Kümeleme sunucu tarafında ST_SnapToGrid ile yapılır (zoom < 10); istemci yalnızca
    // sunucudan gelen "cluster" veya "pin" tipindeki noktaları çizer, kendi kümeleme
    // mantığını çalıştırmaz (bkz. teknik_mimari_dokumani.md §4.3, kabul_kriterleri.md AC-02).
    instance.addLayer({
      id: "clusters-layer",
      type: "circle",
      source: SOURCE_ID,
      filter: ["==", ["get", "kind"], "cluster"],
      paint: {
        "circle-radius": ["step", ["get", "count"], 14, 10, 18, 50, 24],
        "circle-color": "#2563eb",
        "circle-opacity": 0.85,
        "circle-stroke-width": 2,
        "circle-stroke-color": "#ffffff",
      },
    });

    instance.addLayer({
      id: "clusters-count-layer",
      type: "symbol",
      source: SOURCE_ID,
      filter: ["==", ["get", "kind"], "cluster"],
      layout: {
        "text-field": ["get", "count"],
        "text-size": 12,
      },
      paint: { "text-color": "#ffffff" },
    });

    instance.addLayer({
      id: "pins-layer",
      type: "circle",
      source: SOURCE_ID,
      filter: ["==", ["get", "kind"], "pin"],
      paint: {
        "circle-radius": 7,
        "circle-color": [
          "match",
          ["get", "status"],
          "available",
          "#16a34a",
          "occupied",
          "#f59e0b",
          "faulted",
          "#dc2626",
          "decommissioned",
          "#94a3b8",
          "#2563eb",
        ],
        "circle-stroke-width": 2,
        "circle-stroke-color": "#ffffff",
      },
    });

    const popup = new maplibregl.Popup({ closeButton: true, closeOnClick: true });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    instance.on("click", "pins-layer", (event: any) => {
      const feature = event.features?.[0];
      if (!feature) return;
      const { operatorName, maxPowerKw, status } = feature.properties;
      popup
        .setLngLat(feature.geometry.coordinates)
        .setHTML(`<strong>${operatorName}</strong><br />${maxPowerKw} kW · ${status}`)
        .addTo(instance);
    });

    instance.on("mouseenter", "pins-layer", () => {
      instance.getCanvas().style.cursor = "pointer";
    });
    instance.on("mouseleave", "pins-layer", () => {
      instance.getCanvas().style.cursor = "";
    });

    void refreshStations();
  });

  instance.on("moveend", scheduleRefresh);
  instance.on("zoomend", scheduleRefresh);

  map.value = instance;
});

onBeforeUnmount(() => {
  destroyed = true;
  if (moveDebounceTimer) clearTimeout(moveDebounceTimer);
  map.value?.remove();
});
</script>

<style scoped>
.station-map {
  position: relative;
  width: 100%;
  height: 100%;
}

.station-map__container {
  width: 100%;
  height: 100%;
}

.station-map__error {
  position: absolute;
  top: 0.75rem;
  left: 50%;
  transform: translateX(-50%);
  background: #fef2f2;
  color: #991b1b;
  border: 1px solid #fecaca;
  border-radius: 0.5rem;
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
  z-index: 10;
}
</style>
