
<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRoute } from 'vue-router';
import type { StationItem, StationDetailResponse, ReportResponse } from '~/types/station';
import { useToast } from '~/composables/useToast';
import { useSourceHealth } from '~/composables/useSourceHealth';
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
  ArrowLeft,
  Clock,
  Zap
} from 'lucide-vue-next';

const route = useRoute();
const config = useRuntimeConfig();
const { showToast } = useToast();
const { formatFreshnessText } = useSourceHealth();

const operatorParam = route.params.operator as string;
const slugParam = route.params.slug as string;

// SSR Veri Çekimi
const { data: response, error } = await useFetch<StationDetailResponse>(
  `${config.public.apiBase}/stations/${encodeURIComponent(slugParam)}`
);

const station = computed<StationItem | null>(() => response.value?.data || null);

// S5 US-18: 24 Saat Veri Tazeliği Rozeti
const freshnessInfo = computed(() => {
  if (station.value?.data_freshness) {
    return station.value.data_freshness;
  }
  return formatFreshnessText(station.value?.updated_at);
});

// TALEP-003: Voltrun istasyonlarında soket tipi AC Tip 2 olarak gösterilir
const isVoltrun = computed(() => {
  const opName = (station.value?.operator?.name || (station.value as any)?.operator_name || '').toLowerCase();
  const opSlug = (station.value?.operator?.slug || '').toLowerCase();
  return opName.includes('voltrun') || opSlug.includes('voltrun');
});

const formatConnectorType = (ct: string): string => {
  if (isVoltrun.value) {
    return 'AC Tip 2';
  }
  if (ct === 'CCS2' || ct === 'cCCS2' || ct === 'CCS') return 'CCS';
  if (ct === 'Type 2' || ct === 'sType2' || ct === 'cType2' || ct === 'Type2') return 'AC Tip 2';
  return ct;
};

const displayConnectors = computed(() => {
  if (!station.value) return [];
  const opName = (station.value.operator?.name || (station.value as any)?.operator_name || '').toLowerCase();
  const opSlug = (station.value.operator?.slug || '').toLowerCase();
  const voltrun = opName.includes('voltrun') || opSlug.includes('voltrun');

  if (!station.value.connector_types && !station.value.power_kw) {
    return [];
  }

  if (voltrun) {
    return ['AC Tip 2'];
  }

  if (!station.value.connector_types) {
    return [];
  }

  const raw = Array.isArray(station.value.connector_types)
    ? station.value.connector_types
    : [station.value.connector_types].filter(Boolean);

  const mapped = raw.map(ct => formatConnectorType(String(ct))).filter(Boolean);
  return Array.from(new Set(mapped));
});

// Modal durumları
const isQrModalOpen = ref(false);
const isContributeModalOpen = ref(false);
const isReportModalOpen = ref(false);

const handlePrimaryAction = () => {
  if (!station.value) return;

  if (station.value.operator?.website_url) {
    window.open(station.value.operator.website_url, '_blank');
  } else if (station.value.istasyon_no) {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(station.value.istasyon_no);
    }
    showToast(`İstasyon kodu (${station.value.istasyon_no}) kopyalandı! Operatör uygulamasında yapıştırabilirsiniz.`, 'info');
    window.open(`https://www.google.com/search?q=${encodeURIComponent(station.value.operator.name + ' şarj istasyonu')}`, '_blank');
  }
};

const handleDirections = () => {
  if (!station.value) return;
  const url = `https://www.google.com/maps/dir/?api=1&destination=${station.value.lat},${station.value.lon}`;
  window.open(url, '_blank');
};

const handleReportSubmitted = (result: ReportResponse) => {
  if (result.is_flagged_defective && station.value) {
    station.value.is_flagged_defective = true;
    station.value.status = 'DEFECTIVE';
  }
};

// SEO & Schema.org ChargingStation JSON-LD (Zorunlu Kısıt)
useHead(() => {
  const st = station.value;
  if (!st) {
    return {
      title: 'İstasyon Detayı | elektriklioto.com',
      meta: [{ name: 'robots', content: 'noindex, nofollow' }]
    };
  }

  const title = `${st.name} — ${st.operator?.name || ''} Şarj İstasyonu | elektriklioto.com`;
  const description = `${st.name} şarj istasyonu detayları, adres, EPDK sicil no (${st.istasyon_no}), operatör bilgileri ve navigasyon.`;

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
          '@type': 'ChargingStation',
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
            addressRegion: st.city || '',
            streetAddress: st.address || '',
            addressCountry: 'TR'
          }
        })
      }
    ]
  };
});
</script>

<template>
  <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-6">
    <!-- Breadcrumb -->
    <nav class="flex items-center gap-1.5 text-xs text-text-secondary" aria-label="Breadcrumb">
      <NuxtLink to="/" class="hover:text-primary touch-target-min flex items-center">Ana Sayfa</NuxtLink>
      <ChevronRight class="w-3.5 h-3.5 text-border-strong" />
      <NuxtLink :to="`/${operatorParam}`" class="hover:text-primary touch-target-min flex items-center">
        {{ station?.operator?.name || operatorParam }}
      </NuxtLink>
      <ChevronRight class="w-3.5 h-3.5 text-border-strong" />
      <span class="text-text-primary font-medium truncate max-w-xs">{{ station?.name || slugParam }}</span>
    </nav>

    <!-- Hata Durumu (404) -->
    <div v-if="error || !station" class="p-12 text-center bg-bg-surface border border-border-default rounded-xl space-y-3">
      <AlertTriangle class="w-12 h-12 text-warning mx-auto" />
      <h1 class="text-xl font-bold text-text-primary">İstasyon Kaydı Bulunamadı</h1>
      <p class="text-xs text-text-secondary max-w-md mx-auto">
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

          <!-- Arıza Bildirildi Rozeti (3+ Doğrulanmış İhbar) -->
          <span
            v-if="station.is_flagged_defective || station.status === 'DEFECTIVE'"
            class="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium bg-danger-subdued text-danger-on-subdued border border-danger/40"
            role="status"
            aria-label="İstasyon arızalı olarak bildirildi"
          >
            <AlertTriangle class="w-3.5 h-3.5 text-danger flex-shrink-0" />
            <span>Arıza Bildirildi (3+ Doğrulama)</span>
          </span>

          <!-- S5 US-18: 24 Saat Veri Tazeliği Rozeti -->
          <span
            v-if="freshnessInfo.is_stale"
            class="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium bg-bg-subdued text-text-secondary border border-border-default"
            :title="`Veri Tazeliği: ${freshnessInfo.last_updated_text}`"
            role="status"
            aria-label="Veri tazeliği durumu"
          >
            <Clock class="w-3.5 h-3.5 text-text-secondary flex-shrink-0" />
            <span>{{ freshnessInfo.last_updated_text }}</span>
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

      <!-- Soket ve Güç Bilgileri (Zenginleştirilmiş veya Faz 1 Boş Veri Durumu) -->
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

        <!-- Soket / Güç Verisi Varsa Göster (TALEP-003: Voltrun için AC Tip 2) -->
        <div v-if="(displayConnectors.length > 0) || station.power_kw" class="space-y-2">
          <div class="flex flex-wrap items-center gap-1.5">
            <span
              v-for="(ct, cidx) in displayConnectors"
              :key="cidx"
              class="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold bg-primary/10 text-primary border border-primary/20"
            >
              <Zap class="w-3.5 h-3.5" />
              <span>{{ ct }}</span>
            </span>
            <span
              v-if="station.power_kw"
              class="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold bg-bg-surface text-text-primary border border-border-strong"
            >
              <span>{{ station.power_kw }} kW</span>
            </span>
          </div>

          <div class="text-xs text-text-secondary space-y-1 pt-1 border-t border-border-default/60">
            <p v-if="station.current_tariff">Tarife: <span class="font-semibold text-text-primary">{{ station.current_tariff }}</span></p>
            <p v-else>Tarife: <span class="text-text-muted">Operatör Verisi Bekleniyor</span></p>
            <p>Canlı Doluluk: <span class="text-text-muted">{{ station.status || 'Canlı durum verisi henüz açılmadı' }}</span></p>
          </div>
        </div>

        <!-- Faz 1 Eksik Veri Alanı (Zorunlu Kısıt: Soket Boş Durumu) -->
        <div v-else class="space-y-2">
          <div class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium bg-missing-bg text-missing-text border border-border-default">
            <HelpCircle class="w-4 h-4" />
            <span>Operatör Verisi Bekleniyor</span>
          </div>

          <div class="text-xs text-text-secondary space-y-1 pt-2 border-t border-border-default/60">
            <p>Tarife: <span class="text-text-muted">Operatör Verisi Bekleniyor</span></p>
            <p>Canlı Doluluk: <span class="text-text-muted">Canlı durum verisi henüz açılmadı</span></p>
          </div>
        </div>
      </div>

      <!-- Aksiyon Butonları -->
      <div class="space-y-3 pt-2">
        <button
          type="button"
          @click="handlePrimaryAction"
          class="w-full h-12 rounded-md bg-primary text-on-primary text-sm font-semibold flex items-center justify-center gap-2 shadow-sm hover:bg-primary-hover active:bg-primary-active touch-target-min transition-all focus-visible:outline-none"
        >
          <ExternalLink class="w-4 h-4" />
          <span>Operatör Web Sitesine Git ↗</span>
        </button>

        <p class="text-xs text-text-secondary text-center leading-tight">
          Masaüstü ortamında doğrudan şarj başlatılamaz; operatör web sitesine gidebilir veya QR ile telefona aktarabilirsiniz.
        </p>

        <div class="grid grid-cols-2 gap-3 pt-1">
          <button
            type="button"
            @click="handleDirections"
            class="h-11 rounded-md border border-border-strong bg-bg-subdued hover:bg-border-default text-text-primary text-xs font-semibold flex items-center justify-center gap-1.5 touch-target-min transition-colors"
          >
            <Navigation class="w-4 h-4 text-primary" />
            <span>Yol Tarifi</span>
          </button>

          <button
            type="button"
            @click="isQrModalOpen = true"
            class="h-11 rounded-md border border-border-strong bg-bg-subdued hover:bg-border-default text-text-primary text-xs font-semibold flex items-center justify-center gap-1.5 touch-target-min transition-colors"
          >
            <QrCode class="w-4 h-4 text-text-secondary" />
            <span>Telefona Aktar</span>
          </button>
        </div>

        <button
          type="button"
          @click="isReportModalOpen = true"
          class="w-full h-11 inline-flex items-center justify-center gap-1.5 text-xs text-text-secondary hover:text-danger touch-target-min transition-colors"
        >
          <AlertTriangle class="w-4 h-4" />
          <span>İstasyonla ilgili bir sorun mu var? Arıza Bildir</span>
        </button>
      </div>

      <!-- Tazelik ve Yasal EMP Beyanı (Zorunlu Kısıt) -->
      <div class="pt-6 text-xs text-text-muted space-y-1 leading-relaxed border-t border-border-default/60">
        <p>Veri Kaynağı: EPDK Sicil Kaydı (Eylül 2026)</p>
        <p v-if="freshnessInfo.is_stale" class="text-text-secondary font-medium">
          Veri Tazeliği: {{ freshnessInfo.last_updated_text }}
        </p>
        <p>
          elektriklioto.com lisanslı şarj operatörü değildir. Şarj başlatma ve faturalandırma ilgili operatörün sorumluluğundadır.
        </p>
      </div>
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
      @report-submitted="handleReportSubmitted"
    />
  </div>
</template>
