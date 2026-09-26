
<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { Search, X, Loader2, SearchX, MapPin, Building2, Navigation, Zap } from 'lucide-vue-next';
import { useOperators } from '~/composables/useOperators';
import { useStations } from '~/composables/useStations';
import type { StationItem } from '~/types/station';

export interface LocationSearchResult {
  id: string;
  name: string;
  type: 'city' | 'district' | 'station' | 'operator';
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
// 1. TÜRKİYE 81 İL LİSTESİ VE MERKEZ KOORDİNATLARI
// =============================================================================
const TURKEY_81_CITIES: Array<{ name: string; lat: number; lon: number }> = [
  { name: 'Adana', lat: 36.9914, lon: 35.3308 },
  { name: 'Adıyaman', lat: 37.7648, lon: 38.2786 },
  { name: 'Afyonkarahisar', lat: 38.7569, lon: 30.5401 },
  { name: 'Ağrı', lat: 39.7217, lon: 43.0519 },
  { name: 'Aksaray', lat: 38.3687, lon: 34.0254 },
  { name: 'Amasya', lat: 40.6534, lon: 35.8353 },
  { name: 'Ankara', lat: 39.9334, lon: 32.8597 },
  { name: 'Antalya', lat: 36.8969, lon: 30.7133 },
  { name: 'Ardahan', lat: 41.1105, lon: 42.7022 },
  { name: 'Artvin', lat: 41.1828, lon: 41.8183 },
  { name: 'Aydın', lat: 37.8560, lon: 27.8458 },
  { name: 'Balıkesir', lat: 39.6484, lon: 27.8826 },
  { name: 'Bartın', lat: 41.6358, lon: 32.3375 },
  { name: 'Batman', lat: 37.8812, lon: 41.1294 },
  { name: 'Bayburt', lat: 40.2552, lon: 40.2249 },
  { name: 'Bilecik', lat: 40.1426, lon: 29.9793 },
  { name: 'Bingöl', lat: 38.8855, lon: 40.4939 },
  { name: 'Bitlis', lat: 38.4006, lon: 42.1095 },
  { name: 'Bolu', lat: 40.7350, lon: 31.6061 },
  { name: 'Burdur', lat: 37.7203, lon: 30.2889 },
  { name: 'Bursa', lat: 40.1885, lon: 29.0610 },
  { name: 'Çanakkale', lat: 40.1553, lon: 26.4086 },
  { name: 'Çankırı', lat: 40.6013, lon: 33.6134 },
  { name: 'Çorum', lat: 40.5506, lon: 34.9556 },
  { name: 'Denizli', lat: 37.7765, lon: 29.0864 },
  { name: 'Diyarbakır', lat: 37.9144, lon: 40.2110 },
  { name: 'Düzce', lat: 40.8438, lon: 31.1565 },
  { name: 'Edirne', lat: 41.6771, lon: 26.5557 },
  { name: 'Elazığ', lat: 38.6810, lon: 39.2264 },
  { name: 'Erzincan', lat: 39.7500, lon: 39.4911 },
  { name: 'Erzurum', lat: 39.9043, lon: 41.2769 },
  { name: 'Eskişehir', lat: 39.7767, lon: 30.5256 },
  { name: 'Gaziantep', lat: 37.0662, lon: 37.3822 },
  { name: 'Giresun', lat: 40.9128, lon: 38.3895 },
  { name: 'Gümüşhane', lat: 40.4600, lon: 39.4718 },
  { name: 'Hakkari', lat: 37.5833, lon: 43.7408 },
  { name: 'Hatay', lat: 36.2023, lon: 36.1667 },
  { name: 'Iğdır', lat: 39.9237, lon: 44.0450 },
  { name: 'Isparta', lat: 37.7648, lon: 30.5537 },
  { name: 'İstanbul', lat: 41.0082, lon: 28.9784 },
  { name: 'İzmir', lat: 38.4237, lon: 27.1428 },
  { name: 'Kahramanmaraş', lat: 37.5858, lon: 36.9371 },
  { name: 'Karabük', lat: 41.2061, lon: 32.6277 },
  { name: 'Karaman', lat: 37.1759, lon: 33.2150 },
  { name: 'Kars', lat: 40.6013, lon: 43.0975 },
  { name: 'Kastamonu', lat: 41.3887, lon: 33.7765 },
  { name: 'Kayseri', lat: 38.7312, lon: 35.4853 },
  { name: 'Kilis', lat: 36.7184, lon: 37.1150 },
  { name: 'Kırıkkale', lat: 39.8468, lon: 33.5064 },
  { name: 'Kırklareli', lat: 41.7333, lon: 27.2244 },
  { name: 'Kırşehir', lat: 39.1425, lon: 34.1709 },
  { name: 'Kocaeli', lat: 40.7654, lon: 29.9400 },
  { name: 'Konya', lat: 37.8746, lon: 32.4846 },
  { name: 'Kütahya', lat: 39.4167, lon: 29.9833 },
  { name: 'Malatya', lat: 38.3552, lon: 38.3552 },
  { name: 'Manisa', lat: 38.6191, lon: 27.4260 },
  { name: 'Mardin', lat: 37.3212, lon: 40.7420 },
  { name: 'Mersin', lat: 36.8121, lon: 34.6415 },
  { name: 'Muğla', lat: 37.2153, lon: 28.3636 },
  { name: 'Muş', lat: 38.7432, lon: 41.5064 },
  { name: 'Nevşehir', lat: 38.6244, lon: 34.7144 },
  { name: 'Niğde', lat: 37.9667, lon: 34.6857 },
  { name: 'Ordu', lat: 40.9839, lon: 37.8797 },
  { name: 'Osmaniye', lat: 37.0742, lon: 36.2464 },
  { name: 'Rize', lat: 41.0201, lon: 40.5217 },
  { name: 'Sakarya', lat: 40.7569, lon: 30.4033 },
  { name: 'Samsun', lat: 41.2867, lon: 36.3360 },
  { name: 'Şanlıurfa', lat: 37.1674, lon: 38.7955 },
  { name: 'Siirt', lat: 37.9333, lon: 41.9420 },
  { name: 'Sinop', lat: 42.0231, lon: 35.1517 },
  { name: 'Sivas', lat: 39.7477, lon: 37.0145 },
  { name: 'Şırnak', lat: 37.5164, lon: 42.4594 },
  { name: 'Tekirdağ', lat: 40.9833, lon: 27.5110 },
  { name: 'Tokat', lat: 40.3167, lon: 36.5544 },
  { name: 'Trabzon', lat: 41.0027, lon: 39.7168 },
  { name: 'Tunceli', lat: 39.1079, lon: 39.5401 },
  { name: 'Uşak', lat: 38.6823, lon: 29.4058 },
  { name: 'Van', lat: 38.4891, lon: 43.3748 },
  { name: 'Yalova', lat: 40.6500, lon: 29.2769 },
  { name: 'Yozgat', lat: 39.8181, lon: 34.8044 },
  { name: 'Zonguldak', lat: 41.4564, lon: 31.7987 },
];

// =============================================================================
// 2. TÜRKİYE POPÜLER VE YOĞUN İLÇELERİ (Örneklem Kümesi)
// =============================================================================
const TURKEY_MAJOR_DISTRICTS: Array<{ name: string; parentName: string; lat: number; lon: number }> = [
  // İstanbul
  { name: 'Kadıköy', parentName: 'İstanbul', lat: 40.991, lon: 29.025 },
  { name: 'Beşiktaş', parentName: 'İstanbul', lat: 41.042, lon: 29.008 },
  { name: 'Şişli', parentName: 'İstanbul', lat: 41.060, lon: 28.987 },
  { name: 'Üsküdar', parentName: 'İstanbul', lat: 41.026, lon: 29.015 },
  { name: 'Ataşehir', parentName: 'İstanbul', lat: 40.983, lon: 29.117 },
  { name: 'Bakırköy', parentName: 'İstanbul', lat: 40.978, lon: 28.872 },
  { name: 'Beylikdüzü', parentName: 'İstanbul', lat: 41.001, lon: 28.647 },
  { name: 'Sarıyer', parentName: 'İstanbul', lat: 41.166, lon: 29.050 },
  { name: 'Maltepe', parentName: 'İstanbul', lat: 40.933, lon: 29.150 },
  { name: 'Kartal', parentName: 'İstanbul', lat: 40.890, lon: 29.185 },
  { name: 'Pendik', parentName: 'İstanbul', lat: 40.875, lon: 29.233 },
  { name: 'Başakşehir', parentName: 'İstanbul', lat: 41.096, lon: 28.803 },
  { name: 'Ümraniye', parentName: 'İstanbul', lat: 41.025, lon: 29.116 },
  { name: 'Fatih', parentName: 'İstanbul', lat: 41.018, lon: 28.949 },
  // Ankara
  { name: 'Çankaya', parentName: 'Ankara', lat: 39.900, lon: 32.860 },
  { name: 'Yenimahalle', parentName: 'Ankara', lat: 39.967, lon: 32.817 },
  { name: 'Etimesgut', parentName: 'Ankara', lat: 39.949, lon: 32.665 },
  { name: 'Keçiören', parentName: 'Ankara', lat: 40.003, lon: 32.864 },
  { name: 'Gölbaşı', parentName: 'Ankara', lat: 39.790, lon: 32.808 },
  { name: 'Mamak', parentName: 'Ankara', lat: 39.940, lon: 32.915 },
  // İzmir
  { name: 'Konak', parentName: 'İzmir', lat: 38.419, lon: 27.128 },
  { name: 'Karşıyaka', parentName: 'İzmir', lat: 38.459, lon: 27.110 },
  { name: 'Bornova', parentName: 'İzmir', lat: 38.468, lon: 27.218 },
  { name: 'Çeşme', parentName: 'İzmir', lat: 38.323, lon: 26.304 },
  { name: 'Urla', parentName: 'İzmir', lat: 38.322, lon: 26.764 },
  { name: 'Bayraklı', parentName: 'İzmir', lat: 38.462, lon: 27.165 },
  // Antalya & Muğla (Turizm Aksları)
  { name: 'Muratpaşa', parentName: 'Antalya', lat: 36.885, lon: 30.707 },
  { name: 'Konyaaltı', parentName: 'Antalya', lat: 36.862, lon: 30.636 },
  { name: 'Alanya', parentName: 'Antalya', lat: 36.544, lon: 31.995 },
  { name: 'Bodrum', parentName: 'Muğla', lat: 37.038, lon: 27.429 },
  { name: 'Fethiye', parentName: 'Muğla', lat: 36.621, lon: 29.116 },
  { name: 'Marmaris', parentName: 'Muğla', lat: 36.855, lon: 28.274 },
  // Bursa & Kocaeli
  { name: 'Nilüfer', parentName: 'Bursa', lat: 40.214, lon: 28.983 },
  { name: 'Osmangazi', parentName: 'Bursa', lat: 40.203, lon: 29.060 },
  { name: 'İzmit', parentName: 'Kocaeli', lat: 40.765, lon: 29.940 },
  { name: 'Gebze', parentName: 'Kocaeli', lat: 40.802, lon: 29.430 },
];

// =============================================================================
// 3. STATİK ÖRNEKLEM İSTASYON HAVUZU (Client-Side Hızlı Arama & Fallback)
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
    return;
  }

  isSearching.value = true;
  searchTimer = setTimeout(() => {
    isSearching.value = false;
    isOpen.value = true;
  }, 200);
};

const clearInput = () => {
  inputVal.value = '';
  emit('update:modelValue', '');
  isOpen.value = false;
  isSearching.value = false;
};

// =============================================================================
// FİLTRELENMİŞ ARAMA SONUÇLARI (İstasyon, İlçe, İl, Operatör)
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

// İlçe Arama Eşleşmeleri (Kadıköy, Çankaya, Bodrum vb.)
const filteredDistricts = computed(() => {
  if (!inputVal.value || inputVal.value.trim().length < 2) return [];
  const q = foldText(inputVal.value);
  return TURKEY_MAJOR_DISTRICTS.filter((d) => {
    return foldText(d.name).includes(q) || foldText(d.parentName).includes(q);
  }).slice(0, 6);
});

// 81 İl Arama Eşleşmeleri
const filteredCities = computed(() => {
  if (!inputVal.value || inputVal.value.trim().length < 2) return [];
  const q = foldText(inputVal.value);
  return TURKEY_81_CITIES.filter((c) => foldText(c.name).includes(q)).slice(0, 5);
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
      v-if="isOpen && (filteredStations.length > 0 || filteredDistricts.length > 0 || filteredCities.length > 0 || filteredOperators.length > 0)"
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

      <!-- 2. İlçeler Kategorisi (Kadıköy, Çankaya, Beşiktaş vb.) -->
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

      <!-- 3. Şehirler / İller Kategorisi (81 İl) -->
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

      <!-- 4. Spesifik İstasyonlar Kategorisi (Ad, Numara, Adres) -->
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
