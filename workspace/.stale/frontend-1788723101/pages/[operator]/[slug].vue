
<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRoute } from 'vue-router';
import type { StationItem, StationDetailResponse } from '~/types/station';
import { useToast } from '~/composables/useToast';
import QrBridgeModal from '~/components/modals/QrBridgeModal.vue';
import ContributeModal from '~/components/modals/ContributeModal.vue';
import IssueReportModal from '~/components/modals/IssueReportModal.vue';
import {
  MapPin,
  ExternalLink,
  Navigation,
  QrCode,
  AlertTriangle,
  HelpCircle,
  ChevronRight,
  ArrowLeft
} from 'lucide-vue-next';

const route = useRoute();
const config = useRuntimeConfig();
const { showToast } = useToast();

const operatorParam = route.params.operator as string;
const slugParam = route.params.slug as string;

// SSR Veri Çekimi
const { data: response, error } = await useFetch<StationDetailResponse>(
  `${config.public.apiBase}/stations/${encodeURIComponent(slugParam)}`
);

const station = computed<StationItem | null>(() => response.value?.data || null);

// Modal durumları
const isQrModalOpen = ref(false);
const isContributeModalOpen = ref(false);
const isReportModalOpen = ref(false);

// Deep-link & Clipboard Fallback Mekanizması
const handlePrimaryAction = () => {
  if (!station.value) return;

  const istasyonNo = station.value.istasyon_no || '';
  const op = station.value.operator;

  if (import.meta.client) {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(istasyonNo).catch(() => {});
    }

    showToast(
      `İstasyon kodu (${istasyonNo}) kopyalandı! Operatör uygulamasında arama kutusuna yapıştırabilirsiniz.`,
      'info',
      4000
    );

    const targetUrl =
      station.value.deep_link?.universal_link_url ||
      op?.deep_link_config?.web_url ||
      op?.website_url ||
      `https://www.google.com/search?q=${encodeURIComponent(op.name + ' şarj istasyonu')}`;

    window.open(targetUrl, '_blank', 'noopener,noreferrer');
  }
};

const handleDirections = () => {
  if (!station.value || !import.meta.client) return;
  const url = `https://www.google.com/maps/dir/?api=1&destination=${station.value.lat},${station.value.lon}`;
  window.open(url, '_blank', 'noopener,noreferrer');
};

// SEO Meta ve Schema.org JSON-LD (Zorunlu Kısıt)
useHead(() => {
  if (!station.value) {
    return { title: 'İstasyon Bulunamadı — elektriklioto.com' };
  }

  const st = station.value;
  const title = `${st.name} — ${st.operator.name} Şarj İstasyonu | elektriklioto.com`;
  const description = `${st.name} (${st.istasyon_no}) elektrikli araç şarj istasyonu adresi: ${st.address || ''}, ${st.district || ''}/${st.city || ''}. ${st.operator.name} şarj ağı.`;

  return {
    title,
    meta: [
      { name: 'description', content: description },
      { property: 'og:title', content: title },
      { property: 'og:description', content: description },
      { property: 'og:type', content: 'place' }
    ],
    script: [
      {
        type: 'application/ld+json',
        innerHTML: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'ChargingStation',
          name: st.name,
          identifier: st.istasyon_no,
          operator: {
            '@type': 'Organization',
            name: st.operator.name
          },
          geo: {
            '@type': 'GeoCoordinates',
            latitude: st.lat,
            longitude: st.lon
          },
          address: {
            '@type': 'PostalAddress',
            streetAddress: st.address || '',
            addressLocality: st.district || '',
            addressRegion: st.city || '',
            addressCountry: 'TR'
          }
        })
      }
    ]
  };
});
</script>

<template>
  <div class="max-w-4xl mx-auto px-4 py-6 sm:py-8 w-full">
    <!-- Breadcrumb -->
    <nav class="flex items-center gap-1.5 text-xs text-text-secondary mb-6 flex-wrap" aria-label="Breadcrumb">
      <NuxtLink to="/" class="hover:text-primary touch-target-min flex items-center">Ana Sayfa</NuxtLink>
      <ChevronRight class="w-3.5 h-3.5 text-border-strong" />
      <span class="text-text-secondary">{{ station?.operator.name || operatorParam }}</span>
      <ChevronRight class="w-3.5 h-3.5 text-border-strong" />
      <span class="text-text-primary font-medium truncate max-w-xs">{{ station?.name || slugParam }}</span>
    </nav>

    <!-- Hata Durumu (404) -->
    <div v-if="error || !station" class="p-8 text-center bg-bg-surface border border-border-default rounded-xl">
      <AlertTriangle class="w-12 h-12 text-warning mx-auto mb-3" />
      <h1 class="text-xl font-bold text-text-primary">İstasyon Bulunamadı</h1>
      <p class="text-sm text-text-secondary mt-1 max-w-md mx-auto">
        Aradığınız şarj istasyonu EPDK sicilinde bulunamadı veya bağlantı adresi değişmiş olabilir.
      </p>
      <NuxtLink
        to="/"
        class="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-on-primary text-sm font-medium touch-target-min"
      >
        <ArrowLeft class="w-4 h-4" />
        Haritaya Dön
      </NuxtLink>
    </div>

    <!-- İstasyon Detay İçeriği -->
    <article v-else class="bg-bg-surface border border-border-default rounded-xl shadow-md p-6 sm:p-8 space-y-6">
      <!-- Üst Başlık & Operatör -->
      <div class="border-b border-border-default pb-6">
        <div class="flex items-center gap-2 mb-2">
          <span class="w-6 h-6 rounded-full bg-primary text-on-primary flex items-center justify-center text-xs font-bold">
            {{ station.operator.name.charAt(0) }}
          </span>
          <span class="text-sm font-semibold text-text-secondary">{{ station.operator.name }}</span>
        </div>

        <h1 class="text-2xl sm:text-3xl font-bold text-text-primary leading-tight">
          {{ station.name }}
        </h1>

        <div class="flex items-center gap-2 mt-3 flex-wrap">
          <!-- EPDK Sicil Rozeti -->
          <div class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-bg-subdued border border-border-strong text-xs font-mono text-text-secondary">
            <span>EPDK:</span>
            <span class="font-bold text-text-primary">{{ station.istasyon_no }}</span>
          </div>

          <!-- Hizmet Şekli -->
          <span
            class="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium"
            :class="station.service_type === 'Özel' ? 'bg-warning-subdued text-warning' : 'bg-success-subdued text-success'"
          >
            <span class="w-1.5 h-1.5 rounded-full bg-current"></span>
            {{ station.service_type || 'Halka Açık' }}
          </span>
        </div>
      </div>

      <!-- Adres Bloğu -->
      <div class="flex items-start gap-3 text-sm text-text-secondary">
        <MapPin class="w-5 h-5 text-text-secondary flex-shrink-0 mt-0.5" />
        <div>
          <p class="text-text-primary font-medium">{{ station.address || 'Adres bilgisi EPDK sicilinde belirtilmemiş.' }}</p>
          <p class="mt-0.5">{{ station.district || '' }} / {{ station.city || '' }}</p>
        </div>
      </div>

      <!-- Faz 1 Eksik Veri Alanı (Zorunlu Kısıt) -->
      <div class="p-4 rounded-lg bg-bg-subdued border border-border-default space-y-3">
        <div class="flex items-center justify-between">
          <h2 class="text-sm font-semibold text-text-primary">Soket ve Güç Bilgileri</h2>
          <button
            type="button"
            @click="isContributeModalOpen = true"
            class="text-xs font-semibold text-primary hover:underline touch-target-min"
          >
            + Bilgi Ekle
          </button>
        </div>

        <!-- Standart Nötr Gri Rozet -->
        <div class="p-3 rounded-md bg-missing-bg border border-border-default flex items-center justify-between gap-2">
          <div class="flex items-center gap-2 text-xs text-missing-text font-medium">
            <HelpCircle class="w-4 h-4 text-text-secondary flex-shrink-0" />
            <span>Operatör Verisi Bekleniyor</span>
          </div>
          <span class="text-[11px] text-text-muted">Faz 1 Sicil</span>
        </div>

        <div class="text-xs text-text-secondary space-y-1">
          <p>Tarife: <span class="text-text-muted">Operatör Verisi Bekleniyor</span></p>
          <p>Canlı Doluluk: <span class="text-text-muted">Canlı durum verisi henüz açılmadı</span></p>
        </div>
      </div>

      <!-- Aksiyon Butonları -->
      <div class="space-y-3 pt-2">
        <button
          type="button"
          @click="handlePrimaryAction"
          class="w-full h-12 rounded-md bg-primary hover:bg-primary-hover text-on-primary font-medium text-sm flex items-center justify-center gap-2 shadow-sm transition-transform active:scale-[0.98] touch-target-min focus-visible:outline-none"
        >
          <span>Operatör Web Sitesine Git</span>
          <ExternalLink class="w-4 h-4" />
        </button>
        <p class="text-xs text-text-muted text-center">
          Masaüstü ortamında doğrudan şarj başlatılamaz; operatör web sitesine gidebilir veya QR ile telefona aktarabilirsiniz.
        </p>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2">
          <button
            type="button"
            @click="handleDirections"
            class="h-11 rounded-md border border-border-strong bg-bg-subdued hover:bg-border-default text-text-primary text-xs font-medium flex items-center justify-center gap-1.5 touch-target-min focus-visible:outline-none"
          >
            <Navigation class="w-4 h-4" />
            <span>Yol Tarifi Al</span>
          </button>

          <button
            type="button"
            @click="isQrModalOpen = true"
            class="h-11 rounded-md border border-border-strong bg-bg-subdued hover:bg-border-default text-text-primary text-xs font-medium flex items-center justify-center gap-1.5 touch-target-min focus-visible:outline-none"
          >
            <QrCode class="w-4 h-4" />
            <span>Telefona Aktar</span>
          </button>

          <NuxtLink
            to="/"
            class="h-11 rounded-md border border-border-strong bg-bg-subdued hover:bg-border-default text-text-primary text-xs font-medium flex items-center justify-center gap-1.5 touch-target-min focus-visible:outline-none"
          >
            <MapPin class="w-4 h-4 text-primary" />
            <span>Haritada Gör</span>
          </NuxtLink>
        </div>

        <button
          type="button"
          @click="isReportModalOpen = true"
          class="w-full text-center py-2 text-xs font-medium text-danger hover:underline flex items-center justify-center gap-1.5 touch-target-min focus-visible:outline-none"
        >
          <AlertTriangle class="w-3.5 h-3.5" />
          <span>İstasyonla ilgili sorun mu var? Arıza Bildir</span>
        </button>
      </div>

      <!-- Dipnot ve Yasal EMP Beyanı -->
      <footer class="pt-6 border-t border-border-default text-xs text-text-secondary leading-relaxed space-y-1">
        <p class="font-medium text-text-muted">
          Veri Kaynağı: EPDK Sicil Kaydı (Eylül 2026)
        </p>
        <p class="text-text-muted">
          elektriklioto.com lisanslı şarj operatörü değildir. Şarj başlatma ve faturalandırma ilgili operatörün sorumluluğundadır.
        </p>
      </footer>
    </article>

    <!-- Modallar -->
    <QrBridgeModal
      :station="station"
      :is-open="isQrModalOpen"
      @close="isQrModalOpen = false"
    />

    <ContributeModal
      :station="station"
      :is-open="isContributeModalOpen"
      @close="isContributeModalOpen = false"
    />

    <IssueReportModal
      :station="station"
      :is-open="isReportModalOpen"
      @close="isReportModalOpen = false"
    />
  </div>
</template>
