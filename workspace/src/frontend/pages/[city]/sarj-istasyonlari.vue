
<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRoute } from 'vue-router';
import type { StationItem } from '~/types/station';
import StationSummaryCard from '~/components/station/StationSummaryCard.vue';
import { Map, ChevronRight, AlertCircle, ArrowLeft, ChevronLeft } from 'lucide-vue-next';

const route = useRoute();
const config = useRuntimeConfig();

const cityParam = (route.params.city as string) || '';

// Türkçe karakter katlama ve baş harf büyütme
const cityName = computed(() => {
  const c = cityParam.toLocaleLowerCase('tr');
  const map: Record<string, string> = {
    'istanbul': 'İstanbul',
    'ankara': 'Ankara',
    'izmir': 'İzmir',
    'bursa': 'Bursa',
    'antalya': 'Antalya',
    'kocaeli': 'Kocaeli',
    'bolu': 'Bolu',
    'adana': 'Adana',
    'konya': 'Konya',
    'eskisehir': 'Eskişehir',
    'gaziantep': 'Gaziantep',
    'mugla': 'Muğla'
  };
  return map[c] || c.charAt(0).toLocaleUpperCase('tr') + c.slice(1);
});

// İl bazında popüler ilçeler listesi (Hızlı SEO linkleri)
const districtOptions = computed(() => {
  const c = cityParam.toLocaleLowerCase('tr');
  const dMap: Record<string, { name: string; slug: string }[]> = {
    'istanbul': [
      { name: 'Kadıköy', slug: 'kadikoy' },
      { name: 'Beşiktaş', slug: 'besiktas' },
      { name: 'Üsküdar', slug: 'uskudar' },
      { name: 'Şişli', slug: 'sisli' },
      { name: 'Bakırköy', slug: 'bakirkoy' },
      { name: 'Ataşehir', slug: 'atasehir' },
      { name: 'Sarıyer', slug: 'sariyer' }
    ],
    'ankara': [
      { name: 'Çankaya', slug: 'cankaya' },
      { name: 'Yenimahalle', slug: 'yenimahalle' },
      { name: 'Etimesgut', slug: 'etimesgut' },
      { name: 'Keçiören', slug: 'kecioren' }
    ],
    'izmir': [
      { name: 'Konak', slug: 'konak' },
      { name: 'Karşıyaka', slug: 'karsiyaka' },
      { name: 'Bornova', slug: 'bornova' },
      { name: 'Çeşme', slug: 'cesme' },
      { name: 'Urla', slug: 'urla' }
    ]
  };
  return dMap[c] || [];
});

// SSR Veri Çekimi
const { data: stationsData, error } = await useFetch<any>(
  `${config.public.apiBase}/stations`,
  {
    params: {
      city: cityName.value,
      limit: 100
    }
  }
);

const stations = computed<StationItem[]>(() => {
  if (!stationsData.value) return [];
  const list = Array.isArray(stationsData.value) ? stationsData.value : (stationsData.value.data || []);
  return list as StationItem[];
});

// Sayfalama Durumu (24 istasyon / sayfa)
const pageSize = 24;
const currentPage = ref(1);

const totalPages = computed(() => Math.ceil(stations.value.length / pageSize) || 1);

const paginatedStations = computed(() => {
  const start = (currentPage.value - 1) * pageSize;
  return stations.value.slice(start, start + pageSize);
});

// SEO & Schema.org JSON-LD (Zorunlu Kısıt)
useHead(() => {
  const count = stations.value.length;
  const title = `${cityName.value} Elektrikli Araç Şarj İstasyonları | elektriklioto.com`;
  const description = `${cityName.value} genelinde EPDK siciline kayıtlı güncel ${count} elektrikli araç şarj istasyonu listesi ve haritası. ZES, Trugo, Eşarj ve 170+ operatörün şarj noktaları.`;

  return {
    title,
    meta: [
      { name: 'description', content: description },
      { property: 'og:title', content: title },
      { property: 'og:description', content: description },
      { property: 'og:type', content: 'website' }
    ],
    script: [
      {
        type: 'application/ld+json',
        innerHTML: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'ItemList',
          name: `${cityName.value} Elektrikli Araç Şarj İstasyonları`,
          description,
          numberOfItems: count,
          itemListElement: paginatedStations.value.map((st, index) => ({
            '@type': 'ChargingStation',
            position: index + 1,
            name: st.name,
            identifier: st.istasyon_no,
            geo: {
              '@type': 'GeoCoordinates',
              latitude: st.lat,
              longitude: st.lon
            },
            address: {
              '@type': 'PostalAddress',
              addressLocality: st.district || '',
              addressRegion: st.city || cityName.value,
              addressCountry: 'TR'
            }
          }))
        })
      }
    ]
  };
});
</script>

<template>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-8">
    <!-- Breadcrumb (İçerik Haritası) -->
    <nav class="flex items-center gap-1.5 text-xs text-text-secondary" aria-label="Breadcrumb">
      <NuxtLink to="/" class="hover:text-primary touch-target-min flex items-center">Ana Sayfa</NuxtLink>
      <ChevronRight class="w-3.5 h-3.5 text-border-strong" />
      <span class="text-text-primary font-medium">{{ cityName }} Şarj İstasyonları</span>
    </nav>

    <!-- Başlık ve Özet Bloğu (SCR-03) -->
    <header class="bg-bg-surface border border-border-default rounded-xl p-6 sm:p-8 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
      <div class="space-y-2">
        <h1 class="text-2xl sm:text-3xl font-bold text-text-primary tracking-tight">
          {{ cityName }} Elektrikli Araç Şarj İstasyonları
        </h1>
        <p class="text-sm text-text-secondary max-w-2xl leading-relaxed">
          {{ cityName }} genelinde EPDK siciline kayıtlı toplam
          <strong class="text-text-primary font-semibold">{{ stations.length }}</strong>
          şarj istasyonu listelenmektedir. ZES, Trugo, Eşarj ve 170+ operatörün güncel lokasyonlarını inceleyin.
        </p>
      </div>

      <!-- Haritada Gör Eylem Butonu -->
      <NuxtLink
        :to="`/?city=${encodeURIComponent(cityName)}`"
        class="inline-flex items-center justify-center gap-2 h-12 px-6 rounded-md bg-primary text-on-primary font-semibold text-sm shadow-sm hover:bg-primary-hover active:bg-primary-active touch-target-min transition-all flex-shrink-0 focus-visible:outline-none"
      >
        <Map class="w-4 h-4" />
        <span>{{ cityName }} İstasyonlarını Haritada Gör</span>
      </NuxtLink>
    </header>

    <!-- İlçe Kırılımları (Hızlı Filtre Çipleri) -->
    <div v-if="districtOptions.length > 0" class="space-y-2">
      <h2 class="text-xs font-semibold text-text-secondary uppercase tracking-wider">
        Öne Çıkan İlçeler
      </h2>
      <div class="flex flex-wrap gap-2">
        <NuxtLink
          v-for="d in districtOptions"
          :key="d.slug"
          :to="`/${cityParam}/${d.slug}/sarj-istasyonlari`"
          class="px-3 py-1.5 rounded-full text-xs font-medium bg-bg-surface border border-border-default text-text-primary hover:border-primary hover:text-primary transition-colors touch-target-min flex items-center"
        >
          {{ d.name }}
        </NuxtLink>
      </div>
    </div>

    <!-- İstasyon Kart Izgarası (3 Kolon Masaüstü, 2 Kolon Tablet, 1 Kolon Mobil) -->
    <div v-if="paginatedStations.length > 0" class="space-y-6">
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <StationSummaryCard
          v-for="st in paginatedStations"
          :key="st.id"
          :station="st"
        />
      </div>

      <!-- Sayfalama (Pagination) -->
      <div
        v-if="totalPages > 1"
        class="flex items-center justify-center gap-2 pt-6 border-t border-border-default"
      >
        <button
          type="button"
          @click="currentPage = Math.max(1, currentPage - 1)"
          :disabled="currentPage === 1"
          class="h-11 px-4 rounded-md border border-border-default bg-bg-surface text-text-primary text-xs font-semibold flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-bg-subdued touch-target-min"
        >
          <ChevronLeft class="w-4 h-4" />
          <span>Önceki</span>
        </button>

        <span class="text-xs font-medium text-text-secondary px-3">
          Sayfa {{ currentPage }} / {{ totalPages }}
        </span>

        <button
          type="button"
          @click="currentPage = Math.min(totalPages, currentPage + 1)"
          :disabled="currentPage === totalPages"
          class="h-11 px-4 rounded-md border border-border-default bg-bg-surface text-text-primary text-xs font-semibold flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-bg-subdued touch-target-min"
        >
          <span>Sonraki</span>
          <ChevronRight class="w-4 h-4" />
        </button>
      </div>
    </div>

    <!-- Boş Durum -->
    <div v-else class="p-12 text-center bg-bg-surface border border-border-default rounded-xl space-y-3">
      <AlertCircle class="w-10 h-10 text-text-muted mx-auto" />
      <h2 class="text-lg font-bold text-text-primary">Bu ilde kayıtlı istasyon bulunamadı</h2>
      <p class="text-xs text-text-secondary max-w-md mx-auto">
        {{ cityName }} ili için henüz EPDK sicilinde aktif istasyon kaydı bulunamadı veya arama kriterleri eşleşmedi.
      </p>
      <NuxtLink
        to="/"
        class="inline-flex items-center gap-2 px-4 py-2 bg-primary text-on-primary rounded-md text-xs font-semibold touch-target-min"
      >
        <ArrowLeft class="w-4 h-4" />
        Türkiye Haritasına Dön
      </NuxtLink>
    </div>

    <!-- Yasal EMP Dipnot Bildirimi -->
    <footer class="pt-8 border-t border-border-default text-center text-xs text-text-muted space-y-1">
      <p>Veri Kaynağı: EPDK Sicil Kaydı (Eylül 2026)</p>
      <p>
        elektriklioto.com lisanslı şarj operatörü değildir. Şarj başlatma ve faturalandırma ilgili operatörün sorumluluğundadır.
      </p>
    </footer>
  </div>
</template>
