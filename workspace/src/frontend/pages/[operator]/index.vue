
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
          <div class="flex items-center gap-2 pt-1 flex-wrap">
            <span class="inline-flex items-center px-2.5 py-1 rounded bg-bg-subdued border border-border-default text-xs font-semibold text-text-primary">
              {{ stations.length }} Kayıtlı İstasyon
            </span>
            <span class="inline-flex items-center px-2.5 py-1 rounded bg-success-subdued text-success text-xs font-semibold">
              Aktif EPDK Lisansı
            </span>
          </div>
        </div>
      </div>

      <!-- Ağ Haritası Aksiyon Butonu -->
      <NuxtLink
        :to="`/?operator=${encodeURIComponent(operatorParam)}`"
        class="inline-flex items-center justify-center gap-2 h-12 px-6 rounded-md bg-primary text-on-primary font-semibold text-sm shadow-sm hover:bg-primary-hover active:bg-primary-active touch-target-min transition-all flex-shrink-0 focus-visible:outline-none"
      >
        <Map class="w-4 h-4" />
        <span>{{ operatorTitle }} İstasyonlarını Haritada Filtrele</span>
      </NuxtLink>
    </header>

    <!-- İstasyon Kart Izgarası -->
    <div v-if="stations.length > 0" class="space-y-4">
      <h2 class="text-lg font-bold text-text-primary">
        {{ operatorTitle }} İstasyon Kataloğu
      </h2>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <StationSummaryCard
          v-for="st in stations"
          :key="st.id"
          :station="st"
        />
      </div>
    </div>

    <!-- Boş Durum -->
    <div v-else class="p-12 text-center bg-bg-surface border border-border-default rounded-xl space-y-3">
      <Building2 class="w-10 h-10 text-text-muted mx-auto" />
      <h2 class="text-lg font-bold text-text-primary">İstasyon kaydı bulunamadı</h2>
      <p class="text-xs text-text-secondary max-w-md mx-auto">
        Bu operatöre ait aktif istasyon kaydı henüz sisteme işlenmemiş veya filtrelerle eşleşmedi.
      </p>
      <NuxtLink
        to="/"
        class="inline-flex items-center gap-2 px-4 py-2 bg-primary text-on-primary rounded-md text-xs font-semibold touch-target-min"
      >
        <ArrowLeft class="w-4 h-4" />
        Haritaya Dön
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
