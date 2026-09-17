
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
      { name: 'Etimesgut', slug: 'etimesgut' }
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
      <span class="text-text-primary font-medium">{{ cityName }} Şarj İstasyonları</span>
    </nav>

    <!-- Başlık ve Özet Alanı (SCR-03) -->
    <header class="bg-bg-surface border border-border-default rounded-xl p-6 sm:p-8 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
      <div class="space-y-2">
        <h1 class="text-2xl sm:text-3xl font-bold text-text-primary tracking-tight">
          {{ cityName }} Elektrikli Araç Şarj İstasyonları
        </h1>
        <p class="text-xs sm:text-sm text-text-secondary leading-relaxed max-w-2xl">
          {{ cityName }} genelinde EPDK siciline kayıtlı toplam
          <strong class="text-text-primary font-semibold">{{ stations.length }}</strong>
          şarj istasyonu listelenmektedir.
        </p>
      </div>

      <!-- Haritada Gör Butonu -->
      <NuxtLink
        :to="`/?city=${encodeURIComponent(cityName)}`"
        class="h-11 px-5 rounded-md bg-primary text-on-primary font-semibold text-xs shadow-sm hover:bg-primary-hover active:bg-primary-active flex items-center justify-center gap-2 touch-target-min transition-all self-start md:self-auto flex-shrink-0"
      >
        <Map class="w-4 h-4" />
        <span>{{ cityName }} İstasyonlarını Haritada Gör</span>
      </NuxtLink>
    </header>

    <!-- Hızlı İlçe Seçim Butonları -->
    <section v-if="districtOptions.length > 0" class="space-y-2">
      <h2 class="text-xs font-bold text-text-muted uppercase tracking-wider">
        Öne Çıkan İlçeler
      </h2>
      <div class="flex flex-wrap items-center gap-2">
        <NuxtLink
          v-for="d in districtOptions"
          :key="d.slug"
          :to="`/${cityParam}/${d.slug}/sarj-istasyonlari`"
          class="px-3 py-1.5 rounded-full bg-bg-surface border border-border-strong hover:border-primary text-text-primary text-xs font-medium transition-colors touch-target-min flex items-center"
        >
          {{ d.name }}
        </NuxtLink>
      </div>
    </section>

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
          Bu şehirde henüz kayıtlı şarj istasyonu bulunmamaktadır.
        </p>
        <NuxtLink
          to="/"
          class="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-on-primary text-xs font-semibold touch-target-min"
        >
          <ArrowLeft class="w-4 h-4" />
          Haritayı Aç ve Keşfet
        </NuxtLink>
      </div>

      <!-- Sayfalama (Pagination) -->
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
