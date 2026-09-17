
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
          <div class="flex flex-wrap items-center gap-2 pt-1">
            <span class="inline-flex items-center px-2.5 py-0.5 rounded bg-bg-subdued border border-border-strong text-xs font-medium text-text-primary">
              {{ stations.length }} İstasyon Gösteriliyor
            </span>
            <span class="inline-flex items-center px-2.5 py-0.5 rounded bg-success-subdued text-success text-xs font-medium">
              Aktif Lisans
            </span>
          </div>
        </div>
      </div>

      <!-- Ağ Haritası Filtreleme Aksiyonu -->
      <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <NuxtLink
          :to="`/?operator=${encodeURIComponent(operatorParam)}`"
          class="h-11 px-5 rounded-md bg-primary text-on-primary font-semibold text-xs shadow-sm hover:bg-primary-hover active:bg-primary-active flex items-center justify-center gap-2 touch-target-min transition-all"
        >
          <Map class="w-4 h-4" />
          <span>Ağ Haritasında Filtrele</span>
        </NuxtLink>

        <a
          v-if="operator?.website_url"
          :href="operator.website_url"
          target="_blank"
          rel="noopener noreferrer"
          class="h-11 px-4 rounded-md border border-border-strong bg-bg-surface hover:bg-bg-subdued text-text-primary font-semibold text-xs flex items-center justify-center gap-1.5 touch-target-min transition-colors"
        >
          <span>Resmî Web Sitesi</span>
          <ExternalLink class="w-3.5 h-3.5 text-text-secondary" />
        </a>
      </div>
    </header>

    <!-- İstasyon Kartları Izgarası (3 Kolon) -->
    <section class="space-y-4">
      <div class="flex items-center justify-between">
        <h2 class="text-lg font-bold text-text-primary">
          Kayıtlı Şarj Noktaları
        </h2>
        <span class="text-xs text-text-secondary">
          Toplam {{ stations.length }} nokta
        </span>
      </div>

      <div v-if="stations.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <StationSummaryCard
          v-for="station in stations"
          :key="station.id"
          :station="station"
        />
      </div>

      <!-- Boş Durum -->
      <div
        v-else
        class="p-12 text-center bg-bg-surface border border-border-default rounded-xl shadow-sm space-y-3"
      >
        <p class="text-sm font-semibold text-text-primary">
          Bu operatöre ait aktif istasyon kaydı henüz işlenmemiştir.
        </p>
        <p class="text-xs text-text-secondary">
          Harita üzerinde diğer operatörlerin şarj noktalarını inceleyebilirsiniz.
        </p>
        <NuxtLink
          to="/"
          class="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-on-primary text-xs font-semibold touch-target-min"
        >
          <ArrowLeft class="w-4 h-4" />
          Haritayı Aç
        </NuxtLink>
      </div>
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
