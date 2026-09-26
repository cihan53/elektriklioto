
<script setup lang="ts">
import { ref, reactive, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import type { Map as MapLibreMap, GeoJSONSource, MapMouseEvent, MapGeoJSONFeature } from 'maplibre-gl'
import { Search, X, Info, Navigation, HelpCircle, MapPin, WifiOff } from '@lucide/vue'

// ---------------------------------------------------------------------------
// TALEP-027 — Haritada Yakınlaşınca İstasyon Pinlerinin Dikdörtgen Blok Halinde
// Üst Üste Yığılması (bkz. workspace/docs/cozum_planlari/TALEP-027.md)
//
// Kök neden sınıfı: (1) istemcinin eksik/hatalı alan adlarıyla koordinat
// okuması NaN/undefined üretip pinleri sabit bir DOM konumunda (ör. harita
// merkezi / konteyner orijini) üst üste yığması, (2) ardışık bbox
// isteklerinde yarış durumu (race condition) nedeniyle eski/iptal edilmiş
// bir yanıtın yeni görünüme geç gelip üzerine yazması. Bu dosyadaki harita
// artık:
//   a) Ham API noktalarını normalizeMapPoint() ile doğrular; Türkiye sınır
//      kutusu dışında kalan veya NaN üreten hiçbir nokta katmana EKLENMEZ.
//   b) Pinleri manuel CSS/grid konumlandırma yerine MapLibre GL GeoJSON
//      source + circle/symbol katmanlarıyla render eder; ekran konumu
//      doğrudan kütüphanenin projeksiyon motorundan gelir (gerçek lon/lat).
//   c) İstek sıra numarası (fetchToken) ile geç gelen bayat yanıtları yok
//      sayar; yalnızca en güncel viewport verisi katmana yazılır.
// Aşağıdaki "TALEP-027 FIX" yorumları bu düzeltmenin uygulandığı noktaları
// işaretler; bu yorumları veya koruduğu davranışı KALDIRMAYIN.
// ---------------------------------------------------------------------------

const config = useRuntimeConfig()

// KURULUM GEREKİYOR: Harita karo (tile) sağlayıcı hesabı ve API anahtarı.
// Ortam envanterinde ölçülemeyen bir dış servistir; anahtar sağlanana kadar
// MapLibre'nin lisans gerektirmeyen açık demo stiline düşülür.
const mapStyleUrl = computed(
  () =>
    (config.public.mapStyleUrl as string | undefined) ||
    'https://demotiles.maplibre.org/style.json',
)
const apiBaseUrl = (config.public.apiBase as string | undefined) || 'https://api.elektriklioto.com'

useHead({
  title: 'elektriklioto.com — Türkiye Elektrikli Araç Şarj İstasyonu Haritası',
  meta: [
    {
      name: 'description',
      content:
        'Türkiye genelindeki EPDK sicilli elektrikli araç şarj istasyonlarını tek haritada keşfedin.',
    },
  ],
})

// --- Veri Modeli -----------------------------------------------------------

type ServiceType = 'PUBLIC' | 'RESTRICTED' | null

interface StationMapPoint {
  id: string
  kind: 'station'
  lat: number
  lon: number
  name: string
  operatorName: string
  operatorSlug: string
  slug: string
  istasyonNo: string
  serviceType: ServiceType
  issueBadge: boolean
}

interface ClusterMapPoint {
  id: string
  kind: 'cluster'
  lat: number
  lon: number
  count: number
}

type MapPoint = StationMapPoint | ClusterMapPoint

// Türkiye Bounding Box — teknik_mimari_dokumani.md § 5.2 ile birebir.
const TR_BBOX = { minLon: 25.5, minLat: 35.5, maxLon: 45.0, maxLat: 42.5 }

// TALEP-027 FIX: Geçersiz / Türkiye sınırları dışı / (0,0) koordinatlar
// katmana asla eklenmez. Önceki hatalı davranışta bu tür kayıtlar NaN/0
// konumuna düşüp harita merkezinde üst üste yığılıyordu.
function isValidLngLat(lon: number, lat: number): boolean {
  return (
    Number.isFinite(lon) &&
    Number.isFinite(lat) &&
    lon >= TR_BBOX.minLon &&
    lon <= TR_BBOX.maxLon &&
    lat >= TR_BBOX.minLat &&
    lat <= TR_BBOX.maxLat &&
    !(lon === 0 && lat === 0)
  )
}

// > **Varsayım:** `GET /api/v1/stations` yanıtındaki alan adları
// `teknik_mimari_dokumani.md` içinde birebir DTO olarak sabitlenmediğinden,
// normalizeMapPoint() olası alan adı varyasyonlarını (lat/latitude/center_lat
// ve GeoJSON `center_geom.coordinates`) tolere edecek şekilde savunmacı
// yazılmıştır. Bu, TALEP-027'nin kök nedenlerinden biri olan "beklenmeyen
// alan adı → NaN koordinat" senaryosunu bir daha yaşanmayacak şekilde kapatır.
function normalizeMapPoint(raw: Record<string, any> | null | undefined): MapPoint | null {
  if (!raw) return null

  const isCluster =
    raw.kind === 'cluster' ||
    raw.type === 'cluster' ||
    (raw.cluster_id != null && typeof (raw.count ?? raw.cluster_count) !== 'undefined')

  const geomCoords = raw.center_geom?.coordinates ?? raw.geom?.coordinates
  const lon = Number(raw.lon ?? raw.longitude ?? raw.center_lon ?? geomCoords?.[0])
  const lat = Number(raw.lat ?? raw.latitude ?? raw.center_lat ?? geomCoords?.[1])

  // TALEP-027 FIX: doğrulamadan geçemeyen nokta sessizce atılır (haritaya
  // hiç eklenmez) — merkezde yığılma yerine "eksik veri" olarak kabul edilir.
  if (!isValidLngLat(lon, lat)) return null

  if (isCluster) {
    return {
      id: `cluster-${raw.cluster_id ?? raw.id ?? `${lon},${lat}`}`,
      kind: 'cluster',
      lat,
      lon,
      count: Number(raw.count ?? raw.cluster_count ?? 0),
    }
  }

  const id = String(raw.id ?? raw.station_uid ?? raw.slug ?? `${lon},${lat}`)
  return {
    id,
    kind: 'station',
    lat,
    lon,
    name: String(raw.name ?? raw.istasyon_adi ?? raw.station_name ?? 'İsimsiz İstasyon'),
    operatorName: String(raw.operatorName ?? raw.operator_name ?? raw.operator?.name ?? '—'),
    operatorSlug: String(raw.operatorSlug ?? raw.operator_slug ?? raw.operator?.slug ?? ''),
    slug: String(raw.slug ?? ''),
    istasyonNo: String(raw.istasyonNo ?? raw.istasyon_no ?? ''),
    serviceType: (raw.serviceType ?? raw.service_type ?? null) as ServiceType,
    issueBadge: Boolean(raw.issueBadge ?? raw.issue_badge),
  }
}

function toFeatureCollection(points: MapPoint[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    // TALEP-027 FIX: her `Feature.geometry.coordinates` gerçek [lon, lat]
    // değeridir; index tabanlı satır/sütun (grid) hesaplaması YOKTUR.
    features: points.map((p) => ({
      type: 'Feature',
      properties: { ...p },
      geometry: { type: 'Point', coordinates: [p.lon, p.lat] },
    })),
  }
}

// --- Harita Durumu -----------------------------------------------------------

const mapContainer = ref<HTMLDivElement | null>(null)
let map: MapLibreMap | null = null
let selectedFeatureId: string | null = null

const isMapReady = ref(false)
const isLoading = ref(false)
const isError = ref(false)
const isEmpty = ref(false)
const isDark = ref(false)

const selectedPoint = ref<StationMapPoint | null>(null)
const isDesktop = ref(false)

function updateResponsiveFlag() {
  if (typeof window === 'undefined') return
  isDesktop.value = window.matchMedia('(min-width: 1024px)').matches
}

// --- Filtre ve Arama Durumu ---------------------------------------------------

interface OperatorOption {
  slug: string
  name: string
}

const operatorOptions = ref<OperatorOption[]>([])
const selectedOperatorSlugs = ref<string[]>([])
const isOperatorMenuOpen = ref(false)
const onlyPublic = ref(false)

const searchQuery = ref('')
const isSearching = ref(false)
const searchResults = ref<{ label: string; count: number; href: string }[]>([])
const isSearchDropdownOpen = ref(false)
let searchDebounceTimer: ReturnType<typeof setTimeout> | undefined

const toastMessage = ref<string | null>(null)
let toastTimer: ReturnType<typeof setTimeout> | undefined

function showToast(message: string) {
  toastMessage.value = message
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => {
    toastMessage.value = null
  }, 4000)
}

function onLockedFilterClick() {
  // Mikro kopya sözlüğü (arayuz_spesifikasyonu.md § 4) ile harfiyen aynı.
  showToast('Operatör Verisi Bekleniyor — Bu filtre yakında aktifleşecektir.')
}

async function fetchOperatorOptions() {
  try {
    const res = await $fetch<{ operators: OperatorOption[] }>('/api/v1/operators', {
      baseURL: apiBaseUrl,
    })
    operatorOptions.value = res?.operators ?? []
  } catch {
    // Operatör listesi opsiyoneldir; sessizce boş bırakılır, filtre çipi
    // yine de "Operatörler" etiketiyle görünür kalır.
    operatorOptions.value = []
  }
}

function toggleOperator(slug: string) {
  const idx = selectedOperatorSlugs.value.indexOf(slug)
  if (idx >= 0) {
    selectedOperatorSlugs.value.splice(idx, 1)
  } else {
    selectedOperatorSlugs.value.push(slug)
  }
}

const operatorChipLabel = computed(() =>
  selectedOperatorSlugs.value.length > 0
    ? `Operatör (${selectedOperatorSlugs.value.length})`
    : 'Operatörler',
)

// --- BBox Sorgu Döngüsü (SCR-01 / PO-201) -----------------------------------

let fetchToken = 0 // TALEP-027 FIX: yarış durumu (race condition) koruması
let moveEndTimer: ReturnType<typeof setTimeout> | undefined

async function fetchStationsForViewport() {
  if (!map) return
  const bounds = map.getBounds()
  const zoom = map.getZoom()
  const bboxParam = [
    bounds.getWest(),
    bounds.getSouth(),
    bounds.getEast(),
    bounds.getNorth(),
  ].join(',')

  const token = ++fetchToken
  isLoading.value = true
  isError.value = false

  try {
    const res = await $fetch<{ points: Record<string, any>[] }>('/api/v1/stations', {
      baseURL: apiBaseUrl,
      query: {
        bbox: bboxParam,
        zoom: Math.round(zoom),
        operator: selectedOperatorSlugs.value.length ? selectedOperatorSlugs.value.join(',') : undefined,
        service_type: onlyPublic.value ? 'PUBLIC' : undefined,
      },
    })

    // TALEP-027 FIX: bu yanıt artık en güncel istek değilse (kullanıcı
    // haritayı tekrar hareket ettirdiyse) tamamen yok sayılır; aksi halde
    // eski, geniş-bbox'lı kümelenmiş veri yeni zoom seviyesinin üzerine
    // yazılıp pinlerin görünüm merkezinde yığılmasına yol açabiliyordu.
    if (token !== fetchToken) return

    const points = (res?.points ?? [])
      .map(normalizeMapPoint)
      .filter((p): p is MapPoint => p !== null)

    isEmpty.value = points.length === 0
    updateMapSource(points)
  } catch {
    if (token !== fetchToken) return
    isError.value = true
  } finally {
    if (token === fetchToken) isLoading.value = false
  }
}

function scheduleFetch() {
  if (moveEndTimer) clearTimeout(moveEndTimer)
  // Debounce: 300ms — teknik_mimari_dokumani.md § 7.2 ile birebir.
  moveEndTimer = setTimeout(fetchStationsForViewport, 300)
}

function updateMapSource(points: MapPoint[]) {
  if (!map) return
  const source = map.getSource('stations-source') as GeoJSONSource | undefined
  if (!source) return
  source.setData(toFeatureCollection(points))
}

function retryFetch() {
  isError.value = false
  fetchStationsForViewport()
}

// --- Seçim / Panel -----------------------------------------------------------

function selectStation(point: StationMapPoint) {
  if (!map) return
  if (selectedFeatureId) {
    map.setFeatureState({ source: 'stations-source', id: selectedFeatureId }, { selected: false })
  }
  selectedFeatureId = point.id
  map.setFeatureState({ source: 'stations-source', id: point.id }, { selected: true })
  selectedPoint.value = point
}

function closePanel() {
  if (map && selectedFeatureId) {
    map.setFeatureState({ source: 'stations-source', id: selectedFeatureId }, { selected: false })
  }
  selectedFeatureId = null
  selectedPoint.value = null
}

function openDirections(point: StationMapPoint) {
  const url = `https://www.google.com/maps/dir/?api=1&destination=${point.lat},${point.lon}`
  window.open(url, '_blank', 'noopener')
}

// --- Konumuma Git (yalnızca istemci belleğinde; sunucuya asla gönderilmez) --

function locateUser() {
  if (!map || typeof navigator === 'undefined' || !navigator.geolocation) return
  navigator.geolocation.getCurrentPosition(
    (position) => {
      // KVKK: konum yalnızca in-memory harita merkezleme için kullanılır;
      // hiçbir ağ isteğine eklenmez, diske/depoya yazılmaz.
      const { longitude, latitude } = position.coords
      map!.flyTo({ center: [longitude, latitude], zoom: 13 })
    },
    () => {
      showToast('Konum bilgisine ulaşılamadı. Cihaz ayarlarınızı kontrol edin.')
    },
    { enableHighAccuracy: true, timeout: 8000 },
  )
}

// --- Arama ------------------------------------------------------------------

function onSearchInput() {
  if (searchDebounceTimer) clearTimeout(searchDebounceTimer)
  isSearchDropdownOpen.value = true
  if (!searchQuery.value.trim()) {
    searchResults.value = []
    isSearchDropdownOpen.value = false
    return
  }
  searchDebounceTimer = setTimeout(async () => {
    isSearching.value = true
    try {
      const res = await $fetch<{ results: { label: string; count: number; href: string }[] }>(
        '/api/v1/search',
        { baseURL: apiBaseUrl, query: { q: searchQuery.value.trim() } },
      )
      searchResults.value = res?.results ?? []
    } catch {
      searchResults.value = []
    } finally {
      isSearching.value = false
    }
  }, 250)
}

function clearSearch() {
  searchQuery.value = ''
  searchResults.value = []
  isSearchDropdownOpen.value = false
}

// --- Tema (yalnızca okuma; global tema anahtarına dokunmaz) -----------------

function readDarkMode(): boolean {
  if (typeof document === 'undefined') return false
  return document.documentElement.classList.contains('dark')
}

function applyThemeAwareLayerColors() {
  if (!map) return
  isDark.value = readDarkMode()

  map.setPaintProperty('cluster-circle-layer', 'circle-color', [
    'step',
    ['get', 'count'],
    isDark.value ? '#38BDF8' : '#0066CC',
    10,
    isDark.value ? '#0284C7' : '#0052A3',
    100,
    isDark.value ? '#38BDF8' : '#0F172A',
  ])

  map.setPaintProperty('station-point-layer', 'circle-color', [
    'case',
    ['==', ['get', 'issueBadge'], true],
    isDark.value ? '#F87171' : '#B91C1C',
    ['boolean', ['feature-state', 'selected'], false],
    '#38BDF8',
    isDark.value ? '#0284C7' : '#0066CC',
  ])
}

let themeObserver: MutationObserver | undefined

// --- Yaşam Döngüsü -----------------------------------------------------------

onMounted(async () => {
  updateResponsiveFlag()
  window.addEventListener('resize', updateResponsiveFlag)

  fetchOperatorOptions()

  const maplibregl = (await import('maplibre-gl')).default
  await import('maplibre-gl/dist/maplibre-gl.css')

  if (!mapContainer.value) return

  map = new maplibregl.Map({
    container: mapContainer.value,
    style: mapStyleUrl.value,
    center: [35.2433, 39.0], // Türkiye coğrafi merkezi — konum izni yoksa varsayılan
    zoom: 6,
    attributionControl: true,
  })

  map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right')

  map.on('load', () => {
    if (!map) return

    map.addSource('stations-source', {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
      // TALEP-027 FIX: `promoteId` sayesinde string `id` alanı doğrudan
      // feature-state anahtarı olarak kullanılabilir (seçim vurgusu için).
      promoteId: 'id',
    })

    // Küme pinleri — tasarim_sistemi.md § 8.4 "Küme Pini" ölçüleriyle birebir.
    map.addLayer({
      id: 'cluster-circle-layer',
      type: 'circle',
      source: 'stations-source',
      filter: ['==', ['get', 'kind'], 'cluster'],
      paint: {
        'circle-radius': ['step', ['get', 'count'], 18, 10, 22, 100, 26],
        'circle-color': ['step', ['get', 'count'], '#0066CC', 10, '#0052A3', 100, '#0F172A'],
        'circle-stroke-width': 4,
        'circle-stroke-color': 'rgba(255,255,255,0.25)',
        'circle-stroke-opacity': 1,
      },
    })

    map.addLayer({
      id: 'cluster-count-label-layer',
      type: 'symbol',
      source: 'stations-source',
      filter: ['==', ['get', 'kind'], 'cluster'],
      layout: {
        'text-field': ['to-string', ['get', 'count']],
        'text-size': 13,
        'text-allow-overlap': true,
      },
      paint: { 'text-color': '#FFFFFF' },
    })

    // Tekil istasyon pinleri — gerçek koordinatta, MapLibre projeksiyonuyla.
    map.addLayer({
      id: 'station-point-layer',
      type: 'circle',
      source: 'stations-source',
      filter: ['==', ['get', 'kind'], 'station'],
      paint: {
        'circle-radius': ['case', ['boolean', ['feature-state', 'selected'], false], 11, 8],
        'circle-color': [
          'case',
          ['==', ['get', 'issueBadge'], true],
          '#B91C1C',
          ['boolean', ['feature-state', 'selected'], false],
          '#38BDF8',
          '#0066CC',
        ],
        'circle-stroke-width': 2,
        'circle-stroke-color': '#FFFFFF',
      },
    })

    isMapReady.value = true
    applyThemeAwareLayerColors()
    fetchStationsForViewport()

    themeObserver = new MutationObserver(() => applyThemeAwareLayerColors())
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
  })

  map.on('moveend', scheduleFetch)

  map.on('click', 'cluster-circle-layer', (e: MapMouseEvent & { features?: MapGeoJSONFeature[] }) => {
    const feature = e.features?.[0]
    if (!feature || !map) return
    const coords = (feature.geometry as GeoJSON.Point).coordinates as [number, number]
    map.easeTo({ center: coords, zoom: Math.min(map.getZoom() + 2, 14) })
  })

  map.on('click', 'station-point-layer', (e: MapMouseEvent & { features?: MapGeoJSONFeature[] }) => {
    const feature = e.features?.[0]
    if (!feature) return
    const point = normalizeMapPoint(feature.properties as Record<string, any>)
    if (point && point.kind === 'station') {
      selectStation(point)
    }
  })

  for (const layerId of ['cluster-circle-layer', 'station-point-layer']) {
    map.on('mouseenter', layerId, () => {
      if (map) map.getCanvas().style.cursor = 'pointer'
    })
    map.on('mouseleave', layerId, () => {
      if (map) map.getCanvas().style.cursor = ''
    })
  }
})

onBeforeUnmount(() => {
  if (typeof window !== 'undefined') window.removeEventListener('resize', updateResponsiveFlag)
  if (moveEndTimer) clearTimeout(moveEndTimer)
  if (searchDebounceTimer) clearTimeout(searchDebounceTimer)
  if (toastTimer) clearTimeout(toastTimer)
  themeObserver?.disconnect()
  map?.remove()
  map = null
})
</script>

<template>
  <div class="explore-page">
    <ClientOnly>
      <div class="map-shell">
        <!-- Arama Çubuğu -->
        <div class="search-block">
          <div class="search-input-wrap">
            <Search :size="20" class="search-icon" aria-hidden="true" />
            <input
              v-model="searchQuery"
              type="text"
              class="search-input"
              placeholder="İstasyon, ilçe veya operatör ara..."
              @input="onSearchInput"
              @focus="isSearchDropdownOpen = !!searchQuery"
            />
            <button
              v-if="searchQuery"
              type="button"
              class="icon-btn"
              aria-label="Aramayı temizle"
              @click="clearSearch"
            >
              <X :size="20" aria-hidden="true" />
            </button>
            <span v-if="isSearching" class="search-spinner" aria-hidden="true" />
          </div>

          <div
            v-if="isSearchDropdownOpen && searchQuery"
            class="search-dropdown"
            role="status"
            aria-live="polite"
          >
            <ul v-if="searchResults.length" class="search-result-list">
              <li v-for="r in searchResults" :key="r.href">
                <NuxtLink :to="r.href" class="search-result-item" @click="isSearchDropdownOpen = false">
                  <span>{{ r.label }}</span>
                  <span class="search-result-count">{{ r.count }} istasyon</span>
                </NuxtLink>
              </li>
            </ul>
            <div v-else class="search-empty">
              <Search :size="24" class="search-empty-icon" aria-hidden="true" />
              <p class="search-empty-title">Sonuç bulunamadı</p>
              <p class="search-empty-desc">
                Aradığınız kriterle eşleşen ilçe veya operatör bulunamadı. Lütfen yazımı kontrol edin
                veya haritayı kaydırın.
              </p>
            </div>
          </div>
        </div>

        <!-- Filtre Çubuğu -->
        <div class="filter-bar" role="toolbar" aria-label="İstasyon filtreleri">
          <div class="filter-chip-wrap">
            <button
              type="button"
              class="filter-chip"
              :class="{ 'filter-chip--selected': selectedOperatorSlugs.length > 0 }"
              :aria-pressed="selectedOperatorSlugs.length > 0"
              @click="isOperatorMenuOpen = !isOperatorMenuOpen"
            >
              {{ operatorChipLabel }}
            </button>
            <div v-if="isOperatorMenuOpen" class="operator-menu">
              <button
                v-for="op in operatorOptions"
                :key="op.slug"
                type="button"
                class="operator-menu-item"
                :aria-pressed="selectedOperatorSlugs.includes(op.slug)"
                @click="toggleOperator(op.slug)"
              >
                {{ op.name }}
              </button>
              <p v-if="!operatorOptions.length" class="operator-menu-empty">Operatör listesi yükleniyor…</p>
            </div>
          </div>

          <button
            type="button"
            class="filter-chip"
            :class="{ 'filter-chip--selected': onlyPublic }"
            :aria-pressed="onlyPublic"
            @click="onlyPublic = !onlyPublic"
          >
            Halka Açık
          </button>

          <button
            type="button"
            class="filter-chip filter-chip--locked"
            aria-disabled="true"
            @click="onLockedFilterClick"
          >
            Hızlı Şarj (DC)
          </button>

          <button
            type="button"
            class="filter-chip filter-chip--locked"
            aria-disabled="true"
            @click="onLockedFilterClick"
          >
            Boş Soketler
          </button>
        </div>

        <!-- Harita Tuvali -->
        <div ref="mapContainer" class="map-canvas" role="application" aria-label="İstasyon haritası" />

        <!-- Yükleniyor Göstergesi -->
        <div v-if="isLoading" class="map-loading-indicator" aria-hidden="true" />

        <!-- Boş Bölge Durumu -->
        <div v-if="isEmpty && !isLoading && !isError" class="map-empty-pill" role="status">
          <Info :size="16" aria-hidden="true" />
          <span>Bu bölgede şarj istasyonu bulunamadı. Haritayı kaydırın.</span>
        </div>

        <!-- Hata Durumu -->
        <div v-if="isError" class="map-error-card" role="alert">
          <p>Harita verisi yüklenemedi.</p>
          <button type="button" class="btn-secondary" @click="retryFetch">Yeniden Dene</button>
        </div>

        <!-- Konumuma Git FAB (yalnızca mobil) -->
        <button
          v-if="!isDesktop"
          type="button"
          class="locate-fab"
          aria-label="Konumuma git"
          @click="locateUser"
        >
          <Navigation :size="24" aria-hidden="true" />
        </button>

        <!-- İstasyon Detay Paneli / Çekmecesi -->
        <transition name="panel-slide">
          <aside v-if="selectedPoint" class="station-panel" :class="{ 'station-panel--sheet': !isDesktop }">
            <div class="station-panel-handle" v-if="!isDesktop" aria-hidden="true" />
            <button type="button" class="station-panel-close" aria-label="Kapat" @click="closePanel">
              <X :size="20" aria-hidden="true" />
            </button>

            <p class="station-operator-name">{{ selectedPoint.operatorName }}</p>
            <h2 class="station-title">{{ selectedPoint.name }}</h2>

            <span v-if="selectedPoint.istasyonNo" class="epdk-badge">EPDK: {{ selectedPoint.istasyonNo }}</span>

            <div class="station-badges">
              <span
                v-if="selectedPoint.serviceType === 'RESTRICTED'"
                class="badge badge--warning"
              >Özel / Kısıtlı</span>
              <span v-else class="badge badge--success">Halka Açık</span>
              <span v-if="selectedPoint.issueBadge" class="badge badge--danger">Arıza Bildirildi (3+ Doğrulama)</span>
            </div>

            <div class="missing-data-block">
              <h3 class="missing-data-title">Soket ve Güç Bilgileri</h3>
              <span class="missing-badge">
                <HelpCircle :size="14" aria-hidden="true" />
                Operatör Verisi Bekleniyor
              </span>
              <p class="missing-line">Tarife: Operatör Verisi Bekleniyor</p>
              <p class="missing-line">Canlı Doluluk: Canlı durum verisi henüz açılmadı</p>
            </div>

            <div class="station-address">
              <MapPin :size="18" aria-hidden="true" />
              <span>Açık adres bilgisi EPDK sicil kaydından derlenmektedir.</span>
            </div>

            <div class="station-actions">
              <button type="button" class="btn-secondary station-actions-full" @click="openDirections(selectedPoint)">
                Yol Tarifi Al
              </button>
            </div>

            <p class="desktop-cta-note">
              Masaüstü ortamında doğrudan şarj başlatılamaz; operatör web sitesine gidebilir veya QR ile
              telefona aktarabilirsiniz.
            </p>

            <footer class="station-footer">
              <p>Veri Kaynağı: EPDK Sicil Kaydı (Eylül 2026)</p>
              <p>
                elektriklioto.com lisanslı şarj operatörü değildir. Şarj başlatma ve faturalandırma ilgili
                operatörün sorumluluğundadır.
              </p>
            </footer>
          </aside>
        </transition>

        <!-- Toast -->
        <transition name="toast-fade">
          <div v-if="toastMessage" class="toast" role="status" aria-live="polite">
            <Info :size="16" aria-hidden="true" />
            <span>{{ toastMessage }}</span>
          </div>
        </transition>
      </div>

      <template #fallback>
        <div class="map-skeleton" aria-hidden="true" />
      </template>
    </ClientOnly>
  </div>
</template>

<style scoped>
.explore-page {
  position: relative;
  width: 100%;
  height: calc(100vh - 64px);
  background: var(--color-bg-base);
}

.map-shell {
  position: relative;
  width: 100%;
  height: 100%;
}

.map-canvas {
  position: absolute;
  inset: 0;
  z-index: 0;
}

.map-skeleton {
  width: 100%;
  height: calc(100vh - 64px);
  background: var(--color-bg-subdued);
}

/* Arama */
.search-block {
  position: absolute;
  top: var(--spacing-4);
  left: var(--spacing-4);
  right: var(--spacing-4);
  z-index: 20;
}
@media (min-width: 1024px) {
  .search-block {
    right: auto;
    width: 380px;
  }
}

.search-input-wrap {
  position: relative;
  display: flex;
  align-items: center;
  height: 48px;
  padding: 0 var(--spacing-4);
  background: var(--color-bg-surface);
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-md);
  gap: var(--spacing-2);
}
.search-input-wrap:focus-within {
  border: 2px solid var(--color-primary);
}

.search-icon {
  color: var(--color-text-secondary);
  flex-shrink: 0;
}

.search-input {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  color: var(--color-text-primary);
  font-size: 1rem;
  min-width: 0;
}
.search-input::placeholder {
  color: var(--color-text-secondary);
}

.icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 44px;
  min-height: 44px;
  margin: 0 -10px;
  background: transparent;
  border: none;
  color: var(--color-text-secondary);
  cursor: pointer;
}
.icon-btn:focus-visible {
  outline: 3px solid var(--color-focus-ring);
  outline-offset: 2px;
}

.search-spinner {
  width: 20px;
  height: 20px;
  border-radius: var(--radius-full);
  border: 2px solid var(--color-border-default);
  border-top-color: var(--color-primary);
  animation: spin 0.8s linear infinite;
  flex-shrink: 0;
}

.search-dropdown {
  margin-top: var(--spacing-2);
  background: var(--color-bg-surface);
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  max-height: 320px;
  overflow-y: auto;
}

.search-result-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.search-result-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 44px;
  padding: 0 var(--spacing-4);
  color: var(--color-text-primary);
  text-decoration: none;
}
.search-result-item:hover {
  background: var(--color-bg-subdued);
}

.search-result-count {
  color: var(--color-text-secondary);
  font-size: 0.75rem;
}

.search-empty {
  padding: var(--spacing-6) var(--spacing-4);
  text-align: center;
}
.search-empty-icon {
  color: var(--color-text-secondary);
  margin: 0 auto var(--spacing-2);
}
.search-empty-title {
  color: var(--color-text-primary);
  font-weight: 600;
  margin: 0 0 var(--spacing-1);
}
.search-empty-desc {
  color: var(--color-text-secondary);
  font-size: 0.875rem;
  margin: 0;
}

/* Filtre Çubuğu */
.filter-bar {
  position: absolute;
  top: 104px;
  left: var(--spacing-4);
  right: var(--spacing-4);
  z-index: 20;
  display: flex;
  gap: var(--spacing-2);
  overflow-x: auto;
  padding-bottom: var(--spacing-1);
}
@media (min-width: 1024px) {
  .filter-bar {
    right: auto;
    max-width: 380px;
    flex-wrap: wrap;
  }
}

.filter-chip-wrap {
  position: relative;
}

.filter-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  padding: 6px 14px;
  border-radius: var(--radius-full);
  background: var(--color-bg-surface);
  border: 1px solid var(--color-border-default);
  color: var(--color-text-secondary);
  font-size: 0.875rem;
  font-weight: 500;
  white-space: nowrap;
  cursor: pointer;
}
.filter-chip:hover {
  background: var(--color-bg-subdued);
  border-color: var(--color-border-strong);
}
.filter-chip:focus-visible {
  outline: 3px solid var(--color-focus-ring);
  outline-offset: 2px;
}
.filter-chip--selected {
  background: var(--color-primary);
  border-color: transparent;
  color: var(--color-on-primary);
}
.filter-chip--locked {
  background: var(--color-bg-subdued);
  border: 1px dashed var(--color-border-strong);
  color: var(--color-text-muted);
  cursor: not-allowed;
}

.operator-menu {
  position: absolute;
  top: 48px;
  left: 0;
  min-width: 220px;
  max-height: 280px;
  overflow-y: auto;
  background: var(--color-bg-surface);
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  padding: var(--spacing-2);
  z-index: 25;
}

.operator-menu-item {
  display: block;
  width: 100%;
  text-align: left;
  min-height: 44px;
  padding: var(--spacing-2) var(--spacing-3);
  background: transparent;
  border: none;
  border-radius: var(--radius-sm);
  color: var(--color-text-primary);
  cursor: pointer;
}
.operator-menu-item:hover {
  background: var(--color-bg-subdued);
}
.operator-menu-item[aria-pressed='true'] {
  color: var(--color-primary);
  font-weight: 600;
}

.operator-menu-empty {
  padding: var(--spacing-2) var(--spacing-3);
  color: var(--color-text-secondary);
  font-size: 0.875rem;
}

/* Yükleniyor / boş / hata durumları */
.map-loading-indicator {
  position: absolute;
  top: var(--spacing-4);
  right: var(--spacing-4);
  z-index: 20;
  width: 24px;
  height: 24px;
  border-radius: var(--radius-full);
  border: 3px solid var(--color-border-default);
  border-top-color: var(--color-primary);
  animation: spin 0.8s linear infinite;
}

.map-empty-pill {
  position: absolute;
  top: var(--spacing-4);
  left: 50%;
  transform: translateX(-50%);
  z-index: 20;
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  padding: var(--spacing-2) var(--spacing-4);
  background: var(--color-bg-surface);
  border-radius: var(--radius-full);
  box-shadow: var(--shadow-md);
  color: var(--color-text-secondary);
  font-size: 0.875rem;
}

.map-error-card {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 20;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-3);
  padding: var(--spacing-6);
  background: var(--color-bg-surface);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  color: var(--color-text-primary);
}

.btn-secondary {
  min-height: 44px;
  padding: 0 var(--spacing-4);
  background: var(--color-bg-subdued);
  color: var(--color-text-primary);
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-md);
  font-weight: 500;
  cursor: pointer;
}
.btn-secondary:hover {
  background: var(--color-border-default);
}
.btn-secondary:focus-visible {
  outline: 3px solid var(--color-focus-ring);
  outline-offset: 2px;
}

/* Konumuma Git FAB */
.locate-fab {
  position: absolute;
  right: var(--spacing-4);
  bottom: 80px;
  z-index: 20;
  width: 48px;
  height: 48px;
  min-width: 48px;
  min-height: 48px;
  border-radius: var(--radius-full);
  background: var(--color-bg-surface);
  color: var(--color-primary);
  border: none;
  box-shadow: var(--shadow-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}
.locate-fab:focus-visible {
  outline: 3px solid var(--color-focus-ring);
  outline-offset: 2px;
}

/* İstasyon Paneli */
.station-panel {
  position: absolute;
  z-index: 30;
  background: var(--color-bg-surface);
  box-shadow: var(--shadow-lg);
  overflow-y: auto;
  padding: var(--spacing-6);
}
@media (min-width: 1024px) {
  .station-panel {
    top: 0;
    left: 0;
    bottom: 0;
    width: 380px;
    border-right: 1px solid var(--color-border-default);
  }
}
@media (min-width: 640px) and (max-width: 1023px) {
  .station-panel {
    top: 80px;
    left: var(--spacing-6);
    bottom: var(--spacing-6);
    width: 340px;
    border-radius: var(--radius-lg);
  }
}
@media (max-width: 639px) {
  .station-panel--sheet {
    left: 0;
    right: 0;
    bottom: 0;
    max-height: 85vh;
    border-top-left-radius: var(--radius-xl);
    border-top-right-radius: var(--radius-xl);
  }
}

.station-panel-handle {
  width: 36px;
  height: 4px;
  border-radius: var(--radius-full);
  background: var(--color-border-strong);
  margin: 0 auto var(--spacing-4);
}

.station-panel-close {
  position: absolute;
  top: var(--spacing-3);
  right: var(--spacing-3);
  min-width: 44px;
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  color: var(--color-text-secondary);
  cursor: pointer;
}
.station-panel-close:focus-visible {
  outline: 3px solid var(--color-focus-ring);
  outline-offset: 2px;
}

.station-operator-name {
  color: var(--color-text-secondary);
  font-size: 0.875rem;
  margin: 0 0 var(--spacing-1);
}

.station-title {
  color: var(--color-text-primary);
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0 0 var(--spacing-2);
}

.epdk-badge {
  display: inline-block;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
  font-size: 0.8125rem;
  background: var(--color-bg-subdued);
  border: 1px solid var(--color-border-strong);
  color: var(--color-text-secondary);
  padding: 2px 8px;
  border-radius: var(--radius-sm);
  margin-bottom: var(--spacing-4);
}

.station-badges {
  display: flex;
  gap: var(--spacing-2);
  flex-wrap: wrap;
  margin-bottom: var(--spacing-4);
}

.badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: var(--radius-full);
  font-size: 0.75rem;
  font-weight: 500;
}
.badge--success {
  background: var(--color-success-subdued);
  color: var(--color-success);
}
.badge--warning {
  background: var(--color-warning-subdued);
  color: var(--color-warning);
}
.badge--danger {
  background: var(--color-danger-subdued);
  color: var(--color-danger-on-subdued);
}

.missing-data-block {
  padding: var(--spacing-4);
  background: var(--color-bg-subdued);
  border-radius: var(--radius-lg);
  margin-bottom: var(--spacing-4);
}
.missing-data-title {
  font-size: 1.125rem;
  font-weight: 500;
  color: var(--color-text-primary);
  margin: 0 0 var(--spacing-2);
}
.missing-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: var(--color-missing-bg);
  color: var(--color-missing-text);
  padding: 4px 10px;
  border-radius: var(--radius-sm);
  font-size: 0.75rem;
  margin-bottom: var(--spacing-2);
}
.missing-line {
  color: var(--color-text-secondary);
  font-size: 0.875rem;
  margin: var(--spacing-1) 0 0;
}

.station-address {
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-2);
  color: var(--color-text-secondary);
  font-size: 0.875rem;
  margin-bottom: var(--spacing-4);
}

.station-actions {
  display: flex;
  gap: var(--spacing-2);
  margin-bottom: var(--spacing-2);
}
.station-actions-full {
  flex: 1;
}

.desktop-cta-note {
  font-size: 0.6875rem;
  color: var(--color-text-secondary);
  margin: 0 0 var(--spacing-4);
}

.station-footer {
  border-top: 1px solid var(--color-border-default);
  padding-top: var(--spacing-3);
}
.station-footer p {
  font-size: 0.6875rem;
  color: var(--color-text-secondary);
  margin: 0 0 var(--spacing-1);
}

/* Toast */
.toast {
  position: absolute;
  bottom: var(--spacing-6);
  left: 50%;
  transform: translateX(-50%);
  z-index: 40;
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  min-width: 320px;
  padding: var(--spacing-3) var(--spacing-4);
  background: var(--color-bg-elevated);
  color: var(--color-text-primary);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-xl);
}

.panel-slide-enter-active,
.panel-slide-leave-active {
  transition: transform 200ms ease-out;
}
.panel-slide-enter-from,
.panel-slide-leave-to {
  transform: translateX(-100%);
}
@media (max-width: 639px) {
  .panel-slide-enter-from,
  .panel-slide-leave-to {
    transform: translateY(100%);
  }
}

.toast-fade-enter-active,
.toast-fade-leave-active {
  transition: opacity 200ms ease-out;
}
.toast-fade-enter-from,
.toast-fade-leave-to {
  opacity: 0;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation: none !important;
    transition: none !important;
  }
}
</style>
