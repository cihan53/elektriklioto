
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
  { name: 'Kırıkkale', lat: 39.8468, lon: 33.5067 },
  { name: 'Kırklareli', lat: 41.7333, lon: 27.2244 },
  { name: 'Kırşehir', lat: 39.1425, lon: 34.1709 },
  { name: 'Kilis', lat: 36.7184, lon: 37.1150 },
  { name: 'Kocaeli', lat: 40.7654, lon: 29.9400 },
  { name: 'Konya', lat: 37.8746, lon: 32.4846 },
  { name: 'Kütahya', lat: 39.4167, lon: 29.9833 },
  { name: 'Malatya', lat: 38.3552, lon: 38.3196 },
  { name: 'Manisa', lat: 38.6191, lon: 27.4265 },
  { name: 'Mardin', lat: 37.3212, lon: 40.7339 },
  { name: 'Mersin', lat: 36.8121, lon: 34.6415 },
  { name: 'Muğla', lat: 37.2153, lon: 28.3636 },
  { name: 'Muş', lat: 38.7432, lon: 41.4911 },
  { name: 'Nevşehir', lat: 38.6244, lon: 34.7142 },
  { name: 'Niğde', lat: 37.9667, lon: 34.6857 },
  { name: 'Ordu', lat: 40.9839, lon: 37.8797 },
  { name: 'Osmaniye', lat: 37.0742, lon: 36.2464 },
  { name: 'Rize', lat: 41.0201, lon: 40.5219 },
  { name: 'Sakarya', lat: 40.7569, lon: 30.4060 },
  { name: 'Samsun', lat: 41.2928, lon: 36.3361 },
  { name: 'Şanlıurfa', lat: 37.1674, lon: 38.7955 },
  { name: 'Siirt', lat: 37.9333, lon: 41.9420 },
  { name: 'Sinop', lat: 42.0231, lon: 35.1553 },
  { name: 'Sivas', lat: 39.7477, lon: 37.0145 },
  { name: 'Şırnak', lat: 37.5164, lon: 42.4594 },
  { name: 'Tekirdağ', lat: 40.9833, lon: 27.5110 },
  { name: 'Tokat', lat: 40.3167, lon: 36.5544 },
  { name: 'Trabzon', lat: 41.0027, lon: 39.7168 },
  { name: 'Tunceli', lat: 39.1079, lon: 39.5483 },
  { name: 'Uşak', lat: 38.6823, lon: 29.4058 },
  { name: 'Van', lat: 38.4891, lon: 43.3832 },
  { name: 'Yalova', lat: 40.6500, lon: 29.2769 },
  { name: 'Yozgat', lat: 39.8181, lon: 34.8044 },
  { name: 'Zonguldak', lat: 41.4564, lon: 31.7987 },
];

// =============================================================================
// 2. TÜRKİYE ÖNEMLİ VE POPÜLER İLÇELERİ (TALEP-004: Kadıköy, Çankaya, Bodrum vb.)
// =============================================================================
const TURKEY_MAJOR_DISTRICTS: Array<{ name: string; parentName: string; lat: number; lon: number }> = [
  // İstanbul
  { name: 'Kadıköy', parentName: 'İstanbul', lat: 40.9876, lon: 29.0234 },
  { name: 'Beşiktaş', parentName: 'İstanbul', lat: 41.0428, lon: 29.0077 },
  { name: 'Şişli', parentName: 'İstanbul', lat: 41.0600, lon: 28.9870 },
  { name: 'Üsküdar', parentName: 'İstanbul', lat: 41.0267, lon: 29.0153 },
  { name: 'Bakırköy', parentName: 'İstanbul', lat: 40.9780, lon: 28.8720 },
  { name: 'Beyoğlu', parentName: 'İstanbul', lat: 41.0370, lon: 28.9770 },
  { name: 'Sarıyer', parentName: 'İstanbul', lat: 41.1660, lon: 29.0500 },
  { name: 'Ataşehir', parentName: 'İstanbul', lat: 40.9840, lon: 29.1060 },
  { name: 'Ümraniye', parentName: 'İstanbul', lat: 41.0250, lon: 29.1170 },
  { name: 'Maltepe', parentName: 'İstanbul', lat: 40.9240, lon: 29.1310 },
  { name: 'Kartal', parentName: 'İstanbul', lat: 40.8900, lon: 29.1900 },
  { name: 'Pendik', parentName: 'İstanbul', lat: 40.8750, lon: 29.2330 },
  { name: 'Tuzla', parentName: 'İstanbul', lat: 40.8160, lon: 29.3000 },
  { name: 'Fatih', parentName: 'İstanbul', lat: 41.0180, lon: 28.9400 },
  { name: 'Beylikdüzü', parentName: 'İstanbul', lat: 41.0010, lon: 28.6420 },
  { name: 'Başakşehir', parentName: 'İstanbul', lat: 41.0960, lon: 28.8030 },
  { name: 'Esenyurt', parentName: 'İstanbul', lat: 41.0340, lon: 28.6800 },
  { name: 'Silivri', parentName: 'İstanbul', lat: 41.0740, lon: 28.2480 },
  // Ankara
  { name: 'Çankaya', parentName: 'Ankara', lat: 39.9000, lon: 32.8600 },
  { name: 'Yenimahalle', parentName: 'Ankara', lat: 39.9700, lon: 32.8000 },
  { name: 'Keçiören', parentName: 'Ankara', lat: 39.9900, lon: 32.8600 },
  { name: 'Etimesgut', parentName: 'Ankara', lat: 39.9500, lon: 32.6800 },
  { name: 'Mamak', parentName: 'Ankara', lat: 39.9300, lon: 32.9100 },
  { name: 'Sincan', parentName: 'Ankara', lat: 39.9600, lon: 32.5800 },
  { name: 'Gölbaşı', parentName: 'Ankara', lat: 39.7900, lon: 32.8100 },
  { name: 'Altındağ', parentName: 'Ankara', lat: 39.9400, lon: 32.8700 },
  // İzmir
  { name: 'Konak', parentName: 'İzmir', lat: 38.4189, lon: 27.1287 },
  { name: 'Karşıyaka', parentName: 'İzmir', lat: 38.4590, lon: 27.1120 },
  { name: 'Bornova', parentName: 'İzmir', lat: 38.4690, lon: 27.2180 },
  { name: 'Çeşme', parentName: 'İzmir', lat: 38.3236, lon: 26.3044 },
  { name: 'Urla', parentName: 'İzmir', lat: 38.3220, lon: 26.7640 },
  { name: 'Buca', parentName: 'İzmir', lat: 38.3880, lon: 27.1770 },
  { name: 'Bayraklı', parentName: 'İzmir', lat: 38.4630, lon: 27.1680 },
  { name: 'Çiğli', parentName: 'İzmir', lat: 38.4900, lon: 27.0600 },
  { name: 'Seferihisar', parentName: 'İzmir', lat: 38.1960, lon: 26.8380 },
  { name: 'Foça', parentName: 'İzmir', lat: 38.6700, lon: 26.7560 },
  // Muğla
  { name: 'Bodrum', parentName: 'Muğla', lat: 37.0345, lon: 27.4305 },
  { name: 'Marmaris', parentName: 'Muğla', lat: 36.8550, lon: 28.2740 },
  { name: 'Fethiye', parentName: 'Muğla', lat: 36.6210, lon: 29.1160 },
  { name: 'Datça', parentName: 'Muğla', lat: 36.7250, lon: 27.6850 },
  { name: 'Milas', parentName: 'Muğla', lat: 37.3160, lon: 27.7800 },
  { name: 'Menteşe', parentName: 'Muğla', lat: 37.2150, lon: 28.3630 },
  { name: 'Ortaca', parentName: 'Muğla', lat: 36.8380, lon: 28.7670 },
  // Antalya
  { name: 'Muratpaşa', parentName: 'Antalya', lat: 36.8870, lon: 30.7080 },
  { name: 'Konyaaltı', parentName: 'Antalya', lat: 36.8650, lon: 30.6350 },
  { name: 'Kepez', parentName: 'Antalya', lat: 36.9300, lon: 30.6900 },
  { name: 'Alanya', parentName: 'Antalya', lat: 36.5438, lon: 31.9998 },
  { name: 'Manavgat', parentName: 'Antalya', lat: 36.7870, lon: 31.4420 },
  { name: 'Kemer', parentName: 'Antalya', lat: 36.6020, lon: 30.5600 },
  { name: 'Kaş', parentName: 'Antalya', lat: 36.2000, lon: 29.6380 },
  { name: 'Serik', parentName: 'Antalya', lat: 36.9170, lon: 31.1000 },
  // Bursa
  { name: 'Nilüfer', parentName: 'Bursa', lat: 40.2140, lon: 28.9800 },
  { name: 'Osmangazi', parentName: 'Bursa', lat: 40.1980, lon: 29.0600 },
  { name: 'Yıldırım', parentName: 'Bursa', lat: 40.1900, lon: 29.1100 },
  { name: 'Mudanya', parentName: 'Bursa', lat: 40.3750, lon: 28.8820 },
  { name: 'İnegöl', parentName: 'Bursa', lat: 40.0780, lon: 29.5130 },
  // Kocaeli & Sakarya
  { name: 'İzmit', parentName: 'Kocaeli', lat: 40.7654, lon: 29.9400 },
  { name: 'Gebze', parentName: 'Kocaeli', lat: 40.8028, lon: 29.4307 },
  { name: 'Darıca', parentName: 'Kocaeli', lat: 40.7740, lon: 29.4050 },
  { name: 'Gölcük', parentName: 'Kocaeli', lat: 40.7180, lon: 29.8220 },
  { name: 'Adapazarı', parentName: 'Sakarya', lat: 40.7800, lon: 30.4000 },
  { name: 'Serdivan', parentName: 'Sakarya', lat: 40.7600, lon: 30.3700 },
  { name: 'Sapanca', parentName: 'Sakarya', lat: 40.6920, lon: 30.2640 },
  // Diğer İller
  { name: 'Ayvalık', parentName: 'Balıkesir', lat: 39.3190, lon: 26.6950 },
  { name: 'Edremit', parentName: 'Balıkesir', lat: 39.5960, lon: 27.0240 },
  { name: 'Bandırma', parentName: 'Balıkesir', lat: 40.3520, lon: 27.9770 },
  { name: 'Kuşadası', parentName: 'Aydın', lat: 37.8579, lon: 27.2610 },
  { name: 'Didim', parentName: 'Aydın', lat: 37.3850, lon: 27.2570 },
  { name: 'Pamukkale', parentName: 'Denizli', lat: 37.9137, lon: 29.1187 },
  { name: 'Seyhan', parentName: 'Adana', lat: 36.9950, lon: 35.3200 },
  { name: 'Çukurova', parentName: 'Adana', lat: 37.0500, lon: 35.2800 },
  { name: 'Tepebaşı', parentName: 'Eskişehir', lat: 39.7900, lon: 30.5000 },
  { name: 'Odunpazarı', parentName: 'Eskişehir', lat: 39.7600, lon: 30.5300 },
  { name: 'Melikgazi', parentName: 'Kayseri', lat: 38.7200, lon: 35.5000 },
  { name: 'Selçuklu', parentName: 'Konya', lat: 37.9000, lon: 32.4900 },
  { name: 'Şahinbey', parentName: 'Gaziantep', lat: 37.0500, lon: 37.3600 },
  { name: 'Şehitkamil', parentName: 'Gaziantep', lat: 37.0800, lon: 37.3800 },
  { name: 'Atakum', parentName: 'Samsun', lat: 41.3200, lon: 36.2700 },
  { name: 'Ortahisar', parentName: 'Trabzon', lat: 41.0000, lon: 39.7200 },
  { name: 'Çorlu', parentName: 'Tekirdağ', lat: 41.1600, lon: 27.8000 },
  { name: 'Süleymanpaşa', parentName: 'Tekirdağ', lat: 40.9800, lon: 27.5100 },
  { name: 'Gerede', parentName: 'Bolu', lat: 40.8000, lon: 32.2000 },
  { name: 'Mengen', parentName: 'Bolu', lat: 40.9500, lon: 32.0500 },
];

// Bilinen başlangıç / örnek istasyonlar (Canlı ağda daima hızlı erişim)
const SEED_STATIONS: StationItem[] = [
  {
    id: '018f3a9e-6b8a-7890-a1b2-c3d4e5f6a7b8',
    istasyon_no: 'ŞRJ/10423',
    slug: 'kadikoy-moda-zes-1',
    name: 'ZES Kadıköy Moda Otoparkı',
    address: 'Caferağa Mah. Moda Cad. No:12',
    city: 'İstanbul',
    district: 'Kadıköy',
    lat: 40.987654,
    lon: 29.023456,
    operator: { id: 1, name: 'ZES', slug: 'zes', is_active: true },
    is_flagged_defective: false,
    service_type: 'Halka Açık',
  },
  {
    id: '018f3a9e-6b8a-7890-a1b2-c3d4e5f6a7b9',
    istasyon_no: 'ŞRJ/9999',
    slug: 'yerel-sarj-noktasi',
    name: 'Yerel Butik Şarj',
    address: 'Köy İçi Mevkii',
    city: 'Muğla',
    district: 'Bodrum',
    lat: 37.0345,
    lon: 27.4305,
    operator: { id: 4, name: 'Voltrun', slug: 'voltrun', is_active: true },
    is_flagged_defective: false,
    service_type: 'Halka Açık',
  },
  {
    id: '018f3a9e-6b8a-7890-a1b2-c3d4e5f6a7c1',
    istasyon_no: 'ŞRJ/2002',
    slug: 'besiktas-meydan-trugo',
    name: 'Trugo Beşiktaş Meydan',
    address: 'Sinanpaşa Mah. Beşiktaş Cad. No:8',
    city: 'İstanbul',
    district: 'Beşiktaş',
    lat: 41.0428,
    lon: 29.0077,
    operator: { id: 2, name: 'Trugo', slug: 'trugo', is_active: true },
    is_flagged_defective: false,
    service_type: 'Halka Açık',
  },
  {
    id: '018f3a9e-6b8a-7890-a1b2-c3d4e5f6a7c2',
    istasyon_no: 'ŞRJ/3003',
    slug: 'cankaya-kule-esarj',
    name: 'Eşarj Çankaya Kule',
    address: 'Kavaklıdere Mah. Atatürk Bulvarı No:140',
    city: 'Ankara',
    district: 'Çankaya',
    lat: 39.9042,
    lon: 32.8611,
    operator: { id: 3, name: 'Eşarj', slug: 'esarj', is_active: true },
    is_flagged_defective: false,
    service_type: 'Halka Açık',
  },
];

watch(
  () => props.modelValue,
  (v) => {
    inputVal.value = v;
  }
);

let searchTimeout: ReturnType<typeof setTimeout> | null = null;

const onInput = (e: Event) => {
  const val = (e.target as HTMLInputElement).value;
  inputVal.value = val;
  emit('update:modelValue', val);

  if (searchTimeout) clearTimeout(searchTimeout);

  if (val.trim().length >= 2) {
    isSearching.value = true;
    isOpen.value = true;
    fetchOperators();
    searchTimeout = setTimeout(() => {
      isSearching.value = false;
    }, 200);
  } else {
    isSearching.value = false;
    isOpen.value = false;
  }
};

const clearInput = () => {
  inputVal.value = '';
  emit('update:modelValue', '');
  isOpen.value = false;
};

// =============================================================================
// FİLTRELEME HESAPLAMALARI
// =============================================================================

// İstasyon Arama Eşleşmeleri
const filteredStations = computed(() => {
  if (!inputVal.value || inputVal.value.trim().length < 2) return [];
  const q = foldText(inputVal.value);

  // Mevcut yüklenmiş istasyonlar + Bilinen çekirdek istasyonlar
  const allPool: StationItem[] = [...stations.value];
  for (const s of SEED_STATIONS) {
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

// Operatör Arama Eşleşmeleri
const filteredOperators = computed(() => {
  if (!inputVal.value || inputVal.value.trim().length < 2) return [];
  const q = foldText(inputVal.value);
  return operators.value
    .filter((op) => foldText(op.name).includes(q))
    .slice(0, 5);
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
        class="touch-target-min flex items-center justify-center text-text-secondary hover:text-text-primary rounded focus-visible:outline-none"
        aria-label="Aramayı Temizle"
      >
        <X class="w-4 h-4" />
      </button>
    </div>

    <!-- Otomatik Tamamlama Açılır Menüsü (SCR-01.2) -->
    <div
      v-if="isOpen && inputVal.length >= 2"
      class="absolute left-0 right-0 top-14 bg-bg-surface border border-border-default rounded-md shadow-lg max-h-80 overflow-y-auto z-50 p-2 space-y-2.5"
      role="listbox"
    >
      <!-- 1. İSTASYON EŞLEŞMELERİ (Öncelikli) -->
      <div v-if="filteredStations.length > 0">
        <div class="px-2 py-1 text-[11px] font-bold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
          <Zap class="w-3.5 h-3.5 text-primary" />
          <span>İstasyonlar</span>
        </div>
        <div class="space-y-1">
          <button
            v-for="st in filteredStations"
            :key="st.id"
            type="button"
            @click="handleSelectStation(st)"
            class="w-full text-left px-3 py-2 text-sm rounded hover:bg-bg-subdued flex items-center justify-between gap-2 touch-target-min transition-colors"
            role="option"
          >
            <div class="flex items-center gap-2 min-w-0">
              <Zap class="w-4 h-4 text-primary flex-shrink-0" />
              <div class="truncate">
                <p class="font-medium text-text-primary truncate text-xs sm:text-sm">{{ st.name }}</p>
                <p class="text-[11px] text-text-secondary truncate">
                  {{ st.operator?.name || 'Şarj Noktası' }} • {{ st.district || '' }} {{ st.city ? `/ ${st.city}` : '' }}
                </p>
              </div>
            </div>
            <span class="text-[10px] font-mono px-1.5 py-0.5 rounded bg-bg-subdued border border-border-default text-text-secondary flex-shrink-0">
              {{ st.istasyon_no || 'EPDK' }}
            </span>
          </button>
        </div>
      </div>

      <!-- 2. İLÇE EŞLEŞMELERİ (TALEP-004: Kadıköy, Çankaya, Bodrum vb.) -->
      <div v-if="filteredDistricts.length > 0">
        <div class="px-2 py-1 text-[11px] font-bold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
          <Navigation class="w-3.5 h-3.5 text-primary" />
          <span>İlçeler</span>
        </div>
        <div class="space-y-1">
          <button
            v-for="d in filteredDistricts"
            :key="`${d.parentName}-${d.name}`"
            type="button"
            @click="handleSelectDistrict(d)"
            class="w-full text-left px-3 py-2 text-sm rounded hover:bg-bg-subdued flex items-center justify-between gap-2 touch-target-min transition-colors"
            role="option"
          >
            <div class="flex items-center gap-2 min-w-0">
              <Navigation class="w-4 h-4 text-primary flex-shrink-0" />
              <span class="font-medium text-text-primary">{{ d.name }}</span>
              <span class="text-xs text-text-secondary">({{ d.parentName }})</span>
            </div>
            <span class="text-[11px] text-primary font-medium flex-shrink-0">İlçe Haritası ↗</span>
          </button>
        </div>
      </div>

      <!-- 3. ŞEHİR EŞLEŞMELERİ (81 İl) -->
      <div v-if="filteredCities.length > 0">
        <div class="px-2 py-1 text-[11px] font-bold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
          <MapPin class="w-3.5 h-3.5 text-primary" />
          <span>Şehirler (81 İl)</span>
        </div>
        <div class="space-y-1">
          <button
            v-for="c in filteredCities"
            :key="c.name"
            type="button"
            @click="handleSelectCity(c)"
            class="w-full text-left px-3 py-2 text-sm rounded hover:bg-bg-subdued flex items-center justify-between gap-2 touch-target-min transition-colors"
            role="option"
          >
            <div class="flex items-center gap-2 min-w-0">
              <MapPin class="w-4 h-4 text-primary flex-shrink-0" />
              <span class="font-medium text-text-primary">{{ c.name }}</span>
            </div>
            <span class="text-[11px] text-primary font-medium flex-shrink-0">Şehir Merkezi ↗</span>
          </button>
        </div>
      </div>

      <!-- 4. OPERATÖR EŞLEŞMELERİ -->
      <div v-if="filteredOperators.length > 0">
        <div class="px-2 py-1 text-[11px] font-bold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
          <Building2 class="w-3.5 h-3.5 text-primary" />
          <span>Operatörler</span>
        </div>
        <div class="space-y-1">
          <button
            v-for="op in filteredOperators"
            :key="op.id"
            type="button"
            @click="handleSelectOperator(op.slug, op.name)"
            class="w-full text-left px-3 py-2 text-sm rounded hover:bg-bg-subdued flex items-center gap-2 touch-target-min transition-colors"
            role="option"
          >
            <Building2 class="w-4 h-4 text-text-secondary flex-shrink-0" />
            <span class="font-medium text-text-primary">{{ op.name }}</span>
          </button>
        </div>
      </div>

      <!-- 5. SONUÇ BULUNAMADI DURUMU -->
      <div
        v-if="
          !isSearching &&
          filteredStations.length === 0 &&
          filteredDistricts.length === 0 &&
          filteredCities.length === 0 &&
          filteredOperators.length === 0
        "
        class="p-4 text-center text-text-secondary text-sm space-y-1"
        role="status"
        aria-live="polite"
      >
        <SearchX class="w-6 h-6 mx-auto text-text-muted mb-1" />
        <p class="font-semibold text-text-primary text-xs">Sonuç bulunamadı</p>
        <p class="text-[11px] text-text-secondary">
          İlçe (Kadıköy, Bodrum vb.), il veya istasyon adı yazarak tekrar deneyin.
        </p>
      </div>
    </div>
  </div>
</template>
