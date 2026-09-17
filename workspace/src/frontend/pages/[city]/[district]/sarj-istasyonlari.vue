
<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRoute } from 'vue-router';
import type { StationItem } from '~/types/station';
import StationSummaryCard from '~/components/station/StationSummaryCard.vue';
import { Map, ChevronRight, AlertCircle, ArrowLeft, ChevronLeft } from 'lucide-vue-next';

const route = useRoute();
const config = useRuntimeConfig();

const cityParam = (route.params.city as string) || '';
const districtParam = (route.params.district as string) || '';

const cityName = computed(() => {
  const c = cityParam.toLocaleLowerCase('tr');
  const map: Record<string, string> = {
    'istanbul': 'İstanbul',
    'ankara': 'Ankara',
    'izmir': 'İzmir',
    'bursa': 'Bursa',
    'antalya': 'Antalya',
    'kocaeli': 'Kocaeli',
    'bolu': 'Bolu'
  };
  return map[c] || c.charAt(0).toLocaleUpperCase('tr') + c.slice(1);
});

const districtName = computed(() => {
  const d = districtParam.toLocaleLowerCase('tr');
  const map: Record<string, string> = {
    'kadikoy': 'Kadıköy',
    'besiktas': 'Beşiktaş',
    'uskudar': 'Üsküdar',
    'sisli': 'Şişli',
    'bakirkoy': 'Bakırköy',
    'atasehir': 'Ataşehir',
    'sariyer': 'Sarıyer',
    'cankaya': 'Çankaya',
    'yenimahalle': 'Yenimahalle',
    'etimesgut': 'Etimesgut',
    'konak': 'Konak',
    'karsiyaka': 'Karşıyaka',
    'bornova': 'Bornova',
    'cesme': 'Çeşme',
    'nilufer': 'Nilüfer',
    'muratpasa': 'Muratpaşa'
  };
  return map[d] || d.charAt(0).toLocaleUpperCase('tr') + d.slice(1);
});

// SSR Veri Çekimi
const { data: stationsData } = await useFetch<any>(
  `${config.public.apiBase}/stations`,
  {
    params: {
      city: cityName.value,
      district: districtName.value,
      limit: 100
    }
  }
);

const stations = computed<StationItem[]>(() => {
  if (!stationsData.value) return [];
  const list = Array.isArray(stationsData.value) ? stationsData.value : (stationsData.value.data || []);
  return list as StationItem[];
});

// Sayfalama (24/sayfa)
const pageSize = 24;
const currentPage = ref(1);

const totalPages = computed(() => Math.ceil(stations.value.length / pageSize) || 1);

const paginatedStations = computed(() => {
  const start = (currentPage.value - 1) * pageSize;
  return stations.value.slice(start, start + pageSize);
});

// SEO & Schema.org JSON-LD
useHead(() => {
  const count = stations.value.length;
  const title = `${districtName.value} ${cityName.value} Elektrikli Araç Şarj İstasyonları | elektriklioto.com`;
  const description = `${districtName.value}, ${cityName.value} genelinde EPDK lisanslı toplam ${count} elektrikli araç şarj istasyonu. ZES, Trugo, Eşarj ve tüm operatörlerin güncel adres ve EPDK sicil bilgileri.`;

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
          name: `${districtName.value} ${cityName.value} Şarj İstasyonları`,
          numberOfItems: count,
          itemListElement: paginatedStations.value.map((st, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            name: st.name,
            url: `https://elektriklioto.com/${st.operator?.slug || 'operator'}/${st.slug}`
          }))
        })
      }
    ]
  };
});
</script>

<template>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-8">
    <!-- Breadcrumb -->
    <nav class="flex items-center gap-1.5 text-xs text-text-secondary" aria-label="Breadcrumb">
      <NuxtLink to="/" class="hover:text-primary touch-target-min flex items-center">Ana Sayfa</NuxtLink>
      <ChevronRight class="w-3.5 h-3.5 text-border-strong" />
      <NuxtLink :to="`/${cityParam}/sarj-istasyonlari`" class="hover:text-primary touch-target-min flex items-center">
        {{ cityName }}
      </NuxtLink>
      <ChevronRight class="w-3.5 h-3.5 text-border-strong" />
      <span class="text-text-primary font-medium">{{ districtName }} Şarj İstasyonları</span>
    </nav>

    <!-- Başlık Bloğu (SCR-03) -->
    <header class="bg-bg-surface border border-border-default rounded-xl p-6 sm:p-8 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
      <div class="space-y-2">
        <h1 class="text-2xl sm:text-3xl font-bold text-text-primary tracking-tight">
          {{ districtName }} ({{ cityName }}) Şarj İstasyonları
        </h1>
        <p class="text-xs sm:text-sm text-text-secondary leading-relaxed max-w-2xl">
          {{ districtName }} genelinde EPDK siciline kayıtlı toplam
          <strong class="text-text-primary font-semibold">{{ stations.length }}</strong>
          şarj istasyonu bulunmaktadır.
        </p>
      </div>

      <!-- Haritada Gör Butonu -->
      <NuxtLink
        :to="`/?city=${encodeURIComponent(cityName)}&district=${encodeURIComponent(districtName)}`"
        class="h-11 px-5 rounded-md bg-primary text-on-primary font-semibold text-xs shadow-sm hover:bg-primary-hover active:bg-primary-active flex items-center justify-center gap-2 touch-target-min transition-all self-start md:self-auto flex-shrink-0"
      >
        <Map class="w-4 h-4" />
        <span>{{ districtName }} Haritasını Aç</span>
      </NuxtLink>
    </header>

    <!-- İstasyon Kartları Izgarası (3 Kolon) -->
    <section class="space-y-6">
      <div v-if="stations.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <StationSummaryCard
          v-for="station in paginatedStations"
          :key="station.id"
          :station="station"
        />
      </div>

      <!-- Boş Durum -->
      <div
        v-else
        class="p-12 text-center bg-bg-surface border border-border-default rounded-xl shadow-sm space-y-3"
      >
        <AlertCircle class="w-10 h-10 text-warning mx-auto" />
        <p class="text-sm font-semibold text-text-primary">
          Bu ilçede henüz kayıtlı şarj istasyonu bulunmamaktadır.
        </p>
        <NuxtLink
          :to="`/${cityParam}/sarj-istasyonlari`"
          class="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-on-primary text-xs font-semibold touch-target-min"
        >
          <ArrowLeft class="w-4 h-4" />
          {{ cityName }} Genelindeki İstasyonları Görüntüle
        </NuxtLink>
      </div>

      <!-- Sayfalama -->
      <nav
        v-if="totalPages > 1"
        class="flex items-center justify-center gap-2 pt-6 border-t border-border-default"
        aria-label="Sayfalama"
      >
        <button
          type="button"
          :disabled="currentPage === 1"
          @click="currentPage--"
          class="px-3 py-2 rounded border border-border-strong text-xs font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-bg-subdued touch-target-min flex items-center gap-1 text-text-primary"
        >
          <ChevronLeft class="w-4 h-4" />
          <span>Önceki</span>
        </button>

        <span class="text-xs text-text-secondary px-3 font-medium">
          Sayfa {{ currentPage }} / {{ totalPages }}
        </span>

        <button
          type="button"
          :disabled="currentPage === totalPages"
          @click="currentPage++"
          class="px-3 py-2 rounded border border-border-strong text-xs font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-bg-subdued touch-target-min flex items-center gap-1 text-text-primary"
        >
          <span>Sonraki</span>
          <ChevronRight class="w-4 h-4" />
        </button>
      </nav>
    </section>

    <!-- Zorunlu Yasal EMP Uyarısı -->
    <footer class="pt-8 border-t border-border-default text-center text-xs text-text-muted space-y-1">
      <p>Veri Kaynağı: EPDK Sicil Kaydı (Eylül 2026)</p>
      <p>
        elektriklioto.com lisanslı şarj operatörü değildir. Şarj başlatma ve faturalandırma ilgili operatörün sorumluluğundadır.
      </p>
    </footer>
  </div>
</template>
