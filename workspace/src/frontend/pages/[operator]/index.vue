
<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import type { OperatorItem, StationItem } from '~/types/station';
import StationSummaryCard from '~/components/station/StationSummaryCard.vue';
import { Map, ChevronRight, Building2, ExternalLink, ArrowLeft } from 'lucide-vue-next';

const route = useRoute();
const config = useRuntimeConfig();

const operatorParam = (route.params.operator as string) || '';

// SSR Veri Çekimi: Operatör detay ve istasyonları
const { data: operatorData, error } = await useFetch<any>(
  `${config.public.apiBase}/operators/${encodeURIComponent(operatorParam)}`
);

const { data: stationsData } = await useFetch<any>(
  `${config.public.apiBase}/stations`,
  {
    params: {
      operator: operatorParam,
      limit: 48
    }
  }
);

const operator = computed<OperatorItem | null>(() => {
  return operatorData.value?.data || operatorData.value || null;
});

const stations = computed<StationItem[]>(() => {
  if (!stationsData.value) return [];
  const list = Array.isArray(stationsData.value) ? stationsData.value : (stationsData.value.data || []);
  return list as StationItem[];
});

const operatorTitle = computed(() => operator.value?.name || operatorParam.toUpperCase());

// SEO & Schema.org JSON-LD
useHead(() => {
  const opName = operatorTitle.value;
  const title = `${opName} Şarj İstasyonları ve Ağı | elektriklioto.com`;
  const description = `${opName} elektrikli araç şarj istasyonları listesi, haritası ve güncel EPDK sicil bilgileri. elektriklioto.com e-Mobilite Asistanı.`;

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
          '@type': 'Organization',
          name: opName,
          url: operator.value?.website_url || `https://elektriklioto.com/${operatorParam}`,
          description
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
      <span class="text-text-primary font-medium">{{ operatorTitle }}</span>
    </nav>

    <!-- Operatör Hero Tanıtım Kartı (SCR-04) -->
    <header class="bg-bg-surface border border-border-default rounded-xl p-6 sm:p-8 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
      <div class="flex items-start gap-4">
        <!-- Logo / Avatar -->
        <div class="w-16 h-16 rounded-xl bg-primary text-on-primary flex items-center justify-center text-2xl font-bold shadow-md flex-shrink-0">
          {{ operatorTitle.charAt(0) }}
        </div>

        <div class="space-y-1.5">
          <div class="flex items-center gap-2">
            <h1 class="text-2xl sm:text-3xl font-bold text-text-primary tracking-tight">
              {{ operatorTitle }} Şarj İstasyonları
            </h1>
          </div>

          <p class="text-xs text-text-secondary flex items-center gap-1.5">
            <Building2 class="w-4 h-4 text-text-muted" />
            <span>EPDK Lisanslı Şarj Ağı İşletmecisi</span>
          </p>

          <!-- İstatistik Rozetleri -->
          <div class="flex items-center gap-3 pt-2 text-xs">
            <span class="inline-flex items-center px-2.5 py-1 rounded-full bg-primary/10 text-primary font-semibold">
              {{ stations.length }} İstasyon Listelendi
            </span>
            <span class="inline-flex items-center px-2.5 py-1 rounded-full bg-bg-subdued text-text-secondary border border-border-default">
              Resmî EPDK Verisi
            </span>
          </div>
        </div>
      </div>

      <!-- Aksiyon Butonları -->
      <div class="flex items-center gap-3 flex-wrap">
        <NuxtLink
          to="/"
          class="h-11 px-4 rounded-lg bg-primary hover:bg-primary-hover active:bg-primary-active text-on-primary font-medium text-xs flex items-center gap-2 shadow-sm transition-colors touch-target-min"
        >
          <Map class="w-4 h-4" />
          <span>Haritada Görüntüle</span>
        </NuxtLink>

        <a
          v-if="operator?.website_url"
          :href="operator.website_url"
          target="_blank"
          rel="noopener noreferrer"
          class="h-11 px-4 rounded-lg border border-border-strong bg-bg-surface hover:bg-bg-subdued text-text-primary font-medium text-xs flex items-center gap-2 transition-colors touch-target-min"
        >
          <span>Resmî Web Sitesi</span>
          <ExternalLink class="w-3.5 h-3.5 text-text-muted" />
        </a>
      </div>
    </header>

    <!-- İstasyon Kartları Izgarası (Grid) -->
    <main class="space-y-4">
      <div class="flex items-center justify-between">
        <h2 class="text-lg font-bold text-text-primary">
          {{ operatorTitle }} Lokasyonları
        </h2>
        <span class="text-xs text-text-muted">Son güncelleme: Eylül 2026</span>
      </div>

      <!-- İstasyon Listesi -->
      <div v-if="stations.length > 0" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StationSummaryCard
          v-for="st in stations"
          :key="st.id"
          :station="st"
        />
      </div>

      <!-- Boş Durum (Empty State) -->
      <div
        v-else
        class="bg-bg-surface border border-border-default rounded-xl p-12 text-center space-y-3"
      >
        <p class="text-sm font-semibold text-text-primary">Bu operatöre ait henüz istasyon listelenmedi.</p>
        <p class="text-xs text-text-secondary">Harita üzerinden Türkiye genelindeki tüm şarj ağlarını keşfedebilirsiniz.</p>
        <NuxtLink
          to="/"
          class="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline touch-target-min"
        >
          <ArrowLeft class="w-4 h-4" />
          <span>Canlı Haritaya Dön</span>
        </NuxtLink>
      </div>
    </main>
  </div>
</template>
