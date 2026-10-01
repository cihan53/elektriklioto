
<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { Search, X, Loader2, SearchX, MapPin, Building2, Navigation, Zap } from 'lucide-vue-next';
import { useOperators } from '~/composables/useOperators';
import { useStations } from '~/composables/useStations';
import { fetchGadmSearch, type GadmSearchItem } from './geoSearch';
import { TURKEY_81_CITIES, TURKEY_ALL_DISTRICTS } from './turkeyDistricts';
import type { StationItem } from '~/types/station';

export interface LocationSearchResult {
  id: string;
  name: string;
  type: 'city' | 'district' | 'neighborhood' | 'station' | 'operator';
  parentName?: string;
  lat?: number;
  lon?: number;
  zoom?: number;
  stationData?: StationItem;
  operatorSlug?: string;
}

const props = defineProps<{
  modelValue: string;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', val: string): void;
  (e: 'selectOperator', slug: string): void;
  (e: 'selectCity', name: string): void;
  (e: 'selectLocation', item: LocationSearchResult): void;
  (e: 'selectStation', st: StationItem): void;
}>();

const config = useRuntimeConfig();
const { operators, fetchOperators } = useOperators();
const { stations, selectStation } = useStations();

// Harita animasyonu için reaktif hedef koordinat durumu
const mapFlyToTarget = useState<{ lon: number; lat: number; zoom: number; timestamp: number } | null>(
  'map-fly-to-target',
  () => null
);

const isOpen = ref(false);
const isSearching = ref(false);
const inputVal = ref(props.modelValue);

// TALEP-045: GADM CBS arama sonuçları (81 il / 973 ilçe / mahalleler tam kapsam).
// Uzak API erişilemediğinde veya eksik döndüğünde yerel TURKEY_ALL_DISTRICTS
// dizini (81 ilin tamamı, 973 ilçe) birleştirilir; Esenler gibi ilçeler artık
// yalnızca API'ye değil her durumda listelenir.
const remoteGeoResults = ref<GadmSearchItem[]>([]);
let geoSearchToken = 0;

// Türkçe karakter ve harf katlama fonksiyonu (Türkçe ve İngilizce klavye uyumlu)
const foldText = (s: string) => {
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

// =============================================================================
// STATİK ÖRNEKLEM İSTASYON HAVUZU (Client-Side Hızlı Arama & Fallback)
// =============================================================================
const SAMPLE_STATIONS: StationItem[] = [
  {
    id: 'zes-zorlu-center-istanbul',
    istasyon_no: 'ŞRJ/1001',
    slug: 'zes-zorlu-center-istanbul',
    name: 'ZES - Zorlu Center AVM',
    address: 'Levazım Mah. Koru Sok. No:2 Beşiktaş / İSTANBUL',
    city: 'İstanbul',
    district: 'Beşiktaş',
    lat: 41.0667,
    lon: 29.0175,
    operator: { id: 1, slug: 'zes', name: 'ZES', is_active: true },
    is_flagged_defective: false,
    connector_types: null,
    power_kw: null,
    current_tariff: null,
    connectors: null,
    status: null,
  },
  {
    id: 'trugo-bursa-otoyol-o5',
    istasyon_no: 'ŞRJ/1002',
    slug: 'trugo-bursa-otoyol-o5',
    name: 'Trugo - O-5 Otoyolu Oksijen 68 Dinlenme Tesisi',
    address: 'O-5 Otoyolu 68. km Nilüfer / BURSA',
    city: 'Bursa',
    district: 'Nilüfer',
    lat: 40.2315,
    lon: 28.8924,
    operator: { id: 2, slug: 'trugo', name: 'Trugo', is_active: true },
    is_flagged_defective: false,
    connector_types: null,
    power_kw: null,
    current_tariff: null,
    connectors: null,
    status: null,
  },
  {
    id: 'esarj-ankara-panora-avm',
    istasyon_no: 'ŞRJ/1003',
    slug: 'esarj-ankara-panora-avm',
    name: 'Eşarj - Panora Alışveriş ve Yaşam Merkezi',
    address: 'Turan Güneş Bulvarı No:182 Oran, Çankaya / ANKARA',
    city: 'Ankara',
    district: 'Çankaya',
    lat: 39.8492,
    lon: 32.8465,
    operator: { id: 3, slug: 'esarj', name: 'Eşarj', is_active: true },
    is_flagged_defective: false,
    connector_types: null,
    power_kw: null,
    current_tariff: null,
    connectors: null,
    status: null,
  },
  {
    id: 'voltrun-kadikoy-moda',
    istasyon_no: 'ŞRJ/1004',
    slug: 'voltrun-kadikoy-moda',
    name: 'Voltrun - Moda Sahil Otoparkı',
    address: 'Moda Cad. No:45 Kadıköy / İSTANBUL',
    city: 'İstanbul',
    district: 'Kadıköy',
    lat: 40.9850,
    lon: 29.0280,
    operator: { id: 4, slug: 'voltrun', name: 'Voltrun', is_active: true },
    is_flagged_defective: false,
    connector_types: null,
    power_kw: null,
    current_tariff: null,
    connectors: null,
    status: null,
  },
  {
    id: 'sharznet-izmir-mavibahce-avm',
    istasyon_no: 'ŞRJ/1005',
    slug: 'sharznet-izmir-mavibahce-avm',
    name: 'Sharz.net - MaviBahçe AVM',
    address: 'Mavişehir Mah. Caher Dudayev Blv. No:40 Karşıyaka / İZMİR',
    city: 'İzmir',
    district: 'Karşıyaka',
    lat: 38.4876,
    lon: 27.0678,
    operator: { id: 5, slug: 'sharznet', name: 'Sharz.net', is_active: true },
    is_flagged_defective: false,
    connector_types: null,
    power_kw: null,
    current_tariff: null,
    connectors: null,
    status: null,
  },
  {
    id: 'zes-antalya-mall-of-antalya',
    istasyon_no: 'ŞRJ/1006',
    slug: 'zes-antalya-mall-of-antalya',
    name: 'ZES - Mall of Antalya & Deepo Outlet',
    address: 'Altınova Sinan Mah. Serik Cad. No:309 Kepez / ANTALYA',
    city: 'Antalya',
    district: 'Kepez',
    lat: 36.9328,
    lon: 30.7745,
    operator: { id: 1, slug: 'zes', name: 'ZES', is_active: true },
    is_flagged_defective: false,
    connector_types: null,
    power_kw: null,
    current_tariff: null,
    connectors: null,
    status: null,
  },
  {
    id: 'trugo-bolu-dagi-dinlenme',
    istasyon_no: 'ŞRJ/1007',
    slug: 'trugo-bolu-dagi-dinlenme',
    name: 'Trugo - Bolu Dağı Dinlenme Tesisleri (Highway Outlet)',
    address: 'Anadolu Otoyolu Bolu Dağı Geçişi Paşaköy Mevkii / BOLU',
    city: 'Bolu',
    district: 'Merkez',
    lat: 40.7580,
    lon: 31.4870,
    operator: { id: 2, slug: 'trugo', name: 'Trugo', is_active: true },
    is_flagged_defective: false,
    connector_types: null,
    power_kw: null,
    current_tariff: null,
    connectors: null,
    status: null,
  },
];

// Debounce zamanlayıcısı
let searchTimer: any = null;

watch(
  () => props.modelValue,
  (newVal) => {
    inputVal.value = newVal;
  }
);

const onInput = (e: Event) => {
  const target = e.target as HTMLInputElement;
  const val = target.value;
  inputVal.value = val;
  emit('update:modelValue', val);

  if (searchTimer) clearTimeout(searchTimer);

  if (!val || val.trim().length < 2) {
    isOpen.value = false;
    isSearching.value = false;
    remoteGeoResults.value = [];
    return;
  }

  isSearching.value = true;
  searchTimer = setTimeout(async () => {
    // TALEP-045: GADM CBS dizininden tüm il/ilçe/mahalle sonuçlarını getir.
    // Sıralı eski yanıtların yeni sorguyu ezmesini token ile engelle.
    const token = ++geoSearchToken;
    const geo = await fetchGadmSearch(config.public.apiBase, val, 15);
    if (token === geoSearchToken) {
      remoteGeoResults.value = geo;
    }
    isSearching.value = false;
    isOpen.value = true;
  }, 200);
};

const clearInput = () => {
  inputVal.value = '';
  emit('update:modelValue', '');
  isOpen.value = false;
  isSearching.value = false;
  remoteGeoResults.value = [];
};

// =============================================================================
// FİLTRELENMİŞ ARAMA SONUÇLARI (İstasyon, İlçe, Mahalle, İl, Operatör)
// =============================================================================

// İstasyon Arama Eşleşmeleri (Hafızadaki istasyonlar + Örneklem havuzu)
const filteredStations = computed(() => {
  if (!inputVal.value || inputVal.value.trim().length < 2) return [];
  const q = foldText(inputVal.value);

  const allPool = [...stations.value];
  for (const s of SAMPLE_STATIONS) {
    if (!allPool.some((item) => item.id === s.id || item.slug === s.slug)) {
      allPool.push(s);
    }
  }

  return allPool
    .filter((st) => {
      const nameMatch = foldText(st.name).includes(q);
      const codeMatch = foldText(st.istasyon_no || '').includes(q);
      const addrMatch = foldText(st.address || '').includes(q);
      const districtMatch = foldText(st.district || '').includes(q);
      const cityMatch = foldText(st.city || '').includes(q);
      return nameMatch || codeMatch || addrMatch || districtMatch || cityMatch;
    })
    .slice(0, 5);
});

// İlçe Arama Eşleşmeleri — TALEP-045: GADM API sonuçları önceliklidir; yerel
// TURKEY_ALL_DISTRICTS dizini (81 il, 973 ilçe tam kapsam) API erişilemediğinde
// veya eksik döndüğünde birleştirilir. Esenler gibi örneklem dışı ilçeler
// artık her durumda listelenir.
const filteredDistricts = computed(() => {
  if (!inputVal.value || inputVal.value.trim().length < 2) return [];
  const q = foldText(inputVal.value);
  const seen = new Set<string>();
  const out: Array<{ name: string; parentName: string; lat: number; lon: number; slug?: string }> = [];

  for (const r of remoteGeoResults.value) {
    if (r.type !== 'district' || !r.coordinates) continue;
    const key = `${r.province_name}|${r.name}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      name: r.name,
      parentName: r.province_name,
      lat: r.coordinates.lat,
      lon: r.coordinates.lon,
      slug: r.slug,
    });
  }

  // Yerel tam kapsamlı dizin: ada göre eşleşme öncelikli, il adıyla yapılan
  // sorgular (ör. "istanbul") ilin tüm ilçelerini alfabetik listeler.
  const localMatches = TURKEY_ALL_DISTRICTS.filter(
    (d) => foldText(d.name).includes(q) || foldText(d.parentName).includes(q)
  ).sort((a, b) => {
    const aN = foldText(a.name);
    const bN = foldText(b.name);
    const aRank = aN === q ? 0 : aN.startsWith(q) ? 1 : aN.includes(q) ? 2 : 3;
    const bRank = bN === q ? 0 : bN.startsWith(q) ? 1 : bN.includes(q) ? 2 : 3;
    if (aRank !== bRank) return aRank - bRank;
    return a.name.localeCompare(b.name, 'tr');
  });

  for (const d of localMatches) {
    const key = `${d.parentName}|${d.name}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(d);
  }

  return out.slice(0, 6);
});

// Mahalle Arama Eşleşmeleri — TALEP-045: GADM API (Level 3) sonuçları
const filteredNeighborhoods = computed(() => {
  if (!inputVal.value || inputVal.value.trim().length < 2) return [];
  const seen = new Set<string>();
  const out: Array<{ name: string; parentName: string; lat: number; lon: number }> = [];

  for (const r of remoteGeoResults.value) {
    if (r.type !== 'neighborhood' || !r.coordinates) continue;
    const key = `${r.district_name || ''}|${r.name}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      name: r.name,
      parentName: `${r.district_name ? r.district_name + ', ' : ''}${r.province_name}`,
      lat: r.coordinates.lat,
      lon: r.coordinates.lon,
    });
  }

  return out.slice(0, 4);
});

// 81 İl Arama Eşleşmeleri — TALEP-045: GADM API sonuçları yerel listeyle birleşir
const filteredCities = computed(() => {
  if (!inputVal.value || inputVal.value.trim().length < 2) return [];
  const q = foldText(inputVal.value);
  const seen = new Set<string>();
  const out: Array<{ name: string; lat: number; lon: number }> = [];

  for (const r of remoteGeoResults.value) {
    if (r.type !== 'province' || !r.coordinates) continue;
    const key = r.name;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ name: r.name, lat: r.coordinates.lat, lon: r.coordinates.lon });
  }

  for (const c of TURKEY_81_CITIES) {
    if (!foldText(c.name).includes(q)) continue;
    if (seen.has(c.name)) continue;
    seen.add(c.name);
    out.push(c);
  }

  return out.slice(0, 5);
});

// Operatör Arama Eşleşmeleri (TALEP-023: 179 lisanslı EPDK operatör havuzunda arama)
const filteredOperators = computed(() => {
  if (!inputVal.value || inputVal.value.trim().length < 2) return [];
  const q = foldText(inputVal.value);
  return operators.value
    .filter((op) => foldText(op.name).includes(q) || foldText(op.slug).includes(q))
    .slice(0, 8);
});

// =============================================================================
// SEÇİM VE HARİTA ANİMASYONU (flyTo) TETİKLEYİCİLERİ
// =============================================================================

const handleSelectStation = (st: StationItem) => {
  inputVal.value = st.name;
  emit('update:modelValue', st.name);
  selectStation(st);
  emit('selectStation', st);

  const res: LocationSearchResult = {
    id: st.id,
    name: st.name,
    type: 'station',
    parentName: `${st.district || ''} / ${st.city || ''}`,
    lat: st.lat,
    lon: st.lon,
    zoom: 15,
    stationData: st,
  };
  emit('selectLocation', res);

  // Haritayı yumuşak animasyonla (flyTo) istasyon konumuna odakla
  mapFlyToTarget.value = { lon: st.lon, lat: st.lat, zoom: 15, timestamp: Date.now() };
  isOpen.value = false;
};

const handleSelectDistrict = (d: { name: string; parentName: string; lat: number; lon: number }) => {
  const displayLabel = `${d.name}, ${d.parentName}`;
  inputVal.value = displayLabel;
  emit('update:modelValue', displayLabel);
  emit('selectCity', d.parentName);

  const res: LocationSearchResult = {
    id: `district-${d.name}`,
    name: d.name,
    type: 'district',
    parentName: d.parentName,
    lat: d.lat,
    lon: d.lon,
    zoom: 13,
  };
  emit('selectLocation', res);

  // Haritayı yumuşak animasyonla (flyTo) ilçe merkezine odakla
  mapFlyToTarget.value = { lon: d.lon, lat: d.lat, zoom: 13, timestamp: Date.now() };
  isOpen.value = false;
};

const handleSelectNeighborhood = (n: { name: string; parentName: string; lat: number; lon: number }) => {
  const displayLabel = `${n.name}, ${n.parentName}`;
  inputVal.value = displayLabel;
  emit('update:modelValue', displayLabel);

  const res: LocationSearchResult = {
    id: `neighborhood-${n.name}`,
    name: n.name,
    type: 'neighborhood',
    parentName: n.parentName,
    lat: n.lat,
    lon: n.lon,
    zoom: 14,
  };
  emit('selectLocation', res);

  // Haritayı yumuşak animasyonla (flyTo) mahalle merkezine odakla
  mapFlyToTarget.value = { lon: n.lon, lat: n.lat, zoom: 14, timestamp: Date.now() };
  isOpen.value = false;
};

const handleSelectCity = (c: { name: string; lat: number; lon: number }) => {
  inputVal.value = c.name;
  emit('update:modelValue', c.name);
  emit('selectCity', c.name);

  const res: LocationSearchResult = {
    id: `city-${c.name}`,
    name: c.name,
    type: 'city',
    lat: c.lat,
    lon: c.lon,
    zoom: 11,
  };
  emit('selectLocation', res);

  // Haritayı yumuşak animasyonla (flyTo) il merkezine odakla
  mapFlyToTarget.value = { lon: c.lon, lat: c.lat, zoom: 11, timestamp: Date.now() };
  isOpen.value = false;
};

const handleSelectOperator = (slug: string, name: string) => {
  inputVal.value = name;
  emit('update:modelValue', name);
  emit('selectOperator', slug);

  const res: LocationSearchResult = {
    id: `operator-${slug}`,
    name,
    type: 'operator',
    operatorSlug: slug,
  };
  emit('selectLocation', res);
  isOpen.value = false;
};
</script>

<template>
  <div class="relative w-full max-w-[380px]">
    <!-- Arama Kutusu -->
    <div
      class="h-12 w-full bg-bg-surface border border-border-strong rounded-md shadow-md flex items-center px-3 gap-2 transition-colors focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20"
    >
      <Search class="w-5 h-5 text-text-secondary flex-shrink-0" />

      <input
        type="text"
        :value="inputVal"
        @input="onInput"
        @focus="inputVal.length >= 2 && (isOpen = true)"
        placeholder="İstasyon, ilçe veya operatör ara..."
        class="w-full bg-transparent text-text-primary text-base placeholder:text-text-muted focus:outline-none"
        aria-label="İstasyon, ilçe veya operatör arama"
        aria-autocomplete="list"
        :aria-expanded="isOpen"
      />

      <!-- Yükleniyor Göstergesi -->
      <Loader2 v-if="isSearching" class="w-4 h-4 text-primary animate-spin flex-shrink-0" />

      <!-- Temizleme Butonu -->
      <button
        v-if="inputVal && !isSearching"
        type="button"
        @click="clearInput"
        class="p-1 text-text-muted hover:text-text-primary rounded-full transition-colors touch-target-min"
        aria-label="Aramayı Temizle"
      >
        <X class="w-4 h-4" />
      </button>
    </div>

    <!-- Açılır Arama Sonuç Paneli (Autocomplete Dropdown - z-50 & Floating) -->
    <div
      v-if="isOpen && (filteredStations.length > 0 || filteredDistricts.length > 0 || filteredNeighborhoods.length > 0 || filteredCities.length > 0 || filteredOperators.length > 0)"
      class="absolute left-0 top-14 w-full bg-bg-surface border border-border-default rounded-md shadow-xl overflow-hidden z-50 max-h-96 overflow-y-auto divide-y divide-border-default"
      role="listbox"
    >
      <!-- 1. Operatörler Kategorisi (ZES, Trugo, Eşarj vb.) -->
      <div v-if="filteredOperators.length > 0" class="p-2 space-y-1">
        <div class="px-2 py-1 text-xs font-semibold text-text-muted flex items-center gap-1.5 uppercase tracking-wider">
          <Building2 class="w-3.5 h-3.5 text-primary" />
          <span>Şarj Ağları & Operatörler</span>
        </div>
        <button
          v-for="op in filteredOperators"
          :key="op.id"
          type="button"
          @click="handleSelectOperator(op.slug, op.name)"
          class="w-full text-left px-2.5 py-2 rounded hover:bg-bg-subdued flex items-center justify-between transition-colors touch-target-min"
        >
          <div class="flex items-center gap-2">
            <span class="w-2 h-2 rounded-full bg-primary flex-shrink-0"></span>
            <span class="text-sm font-medium text-text-primary">{{ op.name }}</span>
          </div>
          <span class="text-xs text-text-muted bg-bg-subdued px-2 py-0.5 rounded border border-border-default">Operatör</span>
        </button>
      </div>

      <!-- 2. İlçeler Kategorisi (Kadıköy, Çankaya, Esenler vb. — TALEP-045: tam kapsam) -->
      <div v-if="filteredDistricts.length > 0" class="p-2 space-y-1">
        <div class="px-2 py-1 text-xs font-semibold text-text-muted flex items-center gap-1.5 uppercase tracking-wider">
          <Navigation class="w-3.5 h-3.5 text-success" />
          <span>İlçeler (Bölgesel Odaklanma)</span>
        </div>
        <button
          v-for="d in filteredDistricts"
          :key="`${d.parentName}-${d.name}`"
          type="button"
          @click="handleSelectDistrict(d)"
          class="w-full text-left px-2.5 py-2 rounded hover:bg-bg-subdued flex items-center justify-between transition-colors touch-target-min"
        >
          <div class="flex items-center gap-2">
            <MapPin class="w-4 h-4 text-text-muted flex-shrink-0" />
            <span class="text-sm font-medium text-text-primary">{{ d.name }}</span>
          </div>
          <span class="text-xs text-text-secondary">{{ d.parentName }}</span>
        </button>
      </div>

      <!-- 3. Mahalleler Kategorisi (TALEP-045: GADM Level 3 sonuçları) -->
      <div v-if="filteredNeighborhoods.length > 0" class="p-2 space-y-1">
        <div class="px-2 py-1 text-xs font-semibold text-text-muted flex items-center gap-1.5 uppercase tracking-wider">
          <MapPin class="w-3.5 h-3.5 text-text-secondary" />
          <span>Mahalleler</span>
        </div>
        <button
          v-for="n in filteredNeighborhoods"
          :key="`${n.parentName}-${n.name}`"
          type="button"
          @click="handleSelectNeighborhood(n)"
          class="w-full text-left px-2.5 py-2 rounded hover:bg-bg-subdued flex items-center justify-between transition-colors touch-target-min"
        >
          <div class="flex items-center gap-2">
            <MapPin class="w-4 h-4 text-text-muted flex-shrink-0" />
            <span class="text-sm font-medium text-text-primary">{{ n.name }}</span>
          </div>
          <span class="text-xs text-text-secondary">{{ n.parentName }}</span>
        </button>
      </div>

      <!-- 4. Şehirler / İller Kategorisi (81 İl) -->
      <div v-if="filteredCities.length > 0" class="p-2 space-y-1">
        <div class="px-2 py-1 text-xs font-semibold text-text-muted flex items-center gap-1.5 uppercase tracking-wider">
          <MapPin class="w-3.5 h-3.5 text-primary" />
          <span>Şehirler (81 İl)</span>
        </div>
        <button
          v-for="c in filteredCities"
          :key="c.name"
          type="button"
          @click="handleSelectCity(c)"
          class="w-full text-left px-2.5 py-2 rounded hover:bg-bg-subdued flex items-center justify-between transition-colors touch-target-min"
        >
          <div class="flex items-center gap-2">
            <span class="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0"></span>
            <span class="text-sm font-medium text-text-primary">{{ c.name }}</span>
          </div>
          <span class="text-xs text-text-muted">İl Merkezi</span>
        </button>
      </div>

      <!-- 5. Spesifik İstasyonlar Kategorisi (Ad, Numara, Adres) -->
      <div v-if="filteredStations.length > 0" class="p-2 space-y-1">
        <div class="px-2 py-1 text-xs font-semibold text-text-muted flex items-center gap-1.5 uppercase tracking-wider">
          <Zap class="w-3.5 h-3.5 text-warning" />
          <span>Şarj İstasyonları</span>
        </div>
        <button
          v-for="st in filteredStations"
          :key="st.id"
          type="button"
          @click="handleSelectStation(st)"
          class="w-full text-left px-2.5 py-2 rounded hover:bg-bg-subdued flex flex-col gap-0.5 transition-colors touch-target-min"
        >
          <div class="flex items-center justify-between gap-2">
            <span class="text-sm font-medium text-text-primary truncate">{{ st.name }}</span>
            <span v-if="st.operator?.name" class="text-xs font-bold text-primary flex-shrink-0">
              {{ st.operator.name }}
            </span>
          </div>
          <div class="flex items-center gap-2 text-xs text-text-muted truncate">
            <span v-if="st.istasyon_no" class="font-mono text-text-secondary">{{ st.istasyon_no }}</span>
            <span>•</span>
            <span class="truncate">{{ st.district || st.city }}</span>
          </div>
        </button>
      </div>
    </div>

    <!-- Sonuç Bulunamadı Durumu -->
    <div
      v-else-if="isOpen && inputVal.length >= 2 && !isSearching"
      class="absolute left-0 top-14 w-full bg-bg-surface border border-border-default rounded-md shadow-xl p-4 z-50 text-center space-y-1"
      role="status"
      aria-live="polite"
    >
      <SearchX class="w-6 h-6 text-text-muted mx-auto" />
      <p class="text-sm font-semibold text-text-primary">Sonuç bulunamadı</p>
      <p class="text-xs text-text-secondary">İstasyon adı, il, ilçe (ör: Kadıköy) veya operatör adı yazın.</p>
    </div>
  </div>
</template>
