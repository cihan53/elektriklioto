
<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRoute } from 'vue-router';
import type { StationItem, ReportResponse } from '~/types/station';
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
const { data: response, error } = await useFetch<any>(
  `${config.public.apiBase}/stations/${encodeURIComponent(slugParam)}`
);

// UAT-04: API doğrudan istasyon nesnesi veya { data: station } döndüğünde güvenli çözümleme
const station = computed<StationItem | null>(() => {
  const val = response.value as any;
  if (!val) return null;
  return val.data || (val.id ? val : null);
});

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
      showToast(
        `İstasyon kodu (${station.value.istasyon_no}) kopyalandı! Operatör uygulamasında yapıştırabilirsiniz.`,
        'info'
      );
    }
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

// SEO Meta ve Schema.org JSON-LD (PO-501 & PO-1001)
useHead(() => {
  if (!station.value) {
    return {
      title: 'İstasyon Bulunamadı | elektriklioto.com'
    };
  }

  const opName = station.value.operator?.name || 'Şarj İstasyonu';
  const title = `${station.value.name} — ${opName} Şarj İstasyonu | elektriklioto.com`;
  const description = `${station.value.name}, ${station.value.district || ''} ${station.value.city || ''} konumundaki ${opName} elektrikli araç şarj istasyonu. EPDK Sicil No: ${station.value.istasyon_no}.`;

  const schemaJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ChargingStation',
    name: station.value.name,
    identifier: station.value.istasyon_no,
    provider: {
      '@type': 'Organization',
      name: opName
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: station.value.lat,
      longitude: station.value.lon
    },
    address: {
      '@type': 'PostalAddress',
      streetAddress: station.value.address || '',
      addressLocality: station.value.district || '',
      addressRegion: station.value.city || '',
      addressCountry: 'TR'
    }
  };

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
        innerHTML: JSON.stringify(schemaJsonLd)
      }
    ]
  };
});
</script>

<template>
  <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
    <!-- Hata Durumu (404 / Bulunamadı) -->
    <div
      v-if="error || !station"
      class="bg-bg-surface border border-border-default rounded-xl p-8 text-center shadow-md space-y-4"
    >
      <AlertTriangle class="w-12 h-12 text-warning mx-auto" />
      <h1 class="text-xl font-bold text-text-primary">İstasyon Kaydı Bulunamadı</h1>
      <p class="text-xs text-text-secondary max-w-md mx-auto">
        Aradığınız şarj istasyonu kaldırılmış veya bağlantı adresi değişmiş olabilir.
      </p>
      <NuxtLink
        to="/"
        class="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-on-primary text-xs font-semibold touch-target-min"
      >
        <ArrowLeft class="w-4 h-4" />
        Haritaya Dön
      </NuxtLink>
    </div>

    <!-- İstasyon Detay İçeriği -->
    <div v-else class="space-y-6">
      <!-- Breadcrumb (İçerik Haritası) -->
      <nav class="flex items-center gap-1.5 text-xs text-text-secondary" aria-label="Breadcrumb">
        <NuxtLink to="/" class="hover:text-primary touch-target-min flex items-center">Ana Sayfa</NuxtLink>
        <ChevronRight class="w-3.5 h-3.5 text-border-strong" />
        <NuxtLink
          v-if="station.city"
          :to="`/${station.city.toLowerCase()}/sarj-istasyonlari`"
          class="hover:text-primary touch-target-min flex items-center"
        >
          {{ station.city }}
        </NuxtLink>
        <ChevronRight v-if="station.city" class="w-3.5 h-3.5 text-border-strong" />
        <span class="text-text-primary font-medium truncate">{{ station.name }}</span>
      </nav>

      <!-- Ana İstasyon Kartı -->
      <article class="bg-bg-surface border border-border-default rounded-xl shadow-md overflow-hidden">
        <!-- Başlık ve Operatör Bilgisi -->
        <header class="p-6 sm:p-8 border-b border-border-default space-y-3">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div class="flex items-center gap-2">
              <span class="w-3 h-3 rounded-full bg-primary"></span>
              <span class="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                {{ station.operator?.name || 'Lisanslı Şarj Operatörü' }}
              </span>
            </div>

            <!-- 24 Saat Veri Tazeliği Rozeti (US-18) -->
            <div
              class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border"
              :class="
                freshnessInfo.isStale
                  ? 'bg-warning-subdued text-warning border-warning/30'
                  : 'bg-bg-subdued text-text-secondary border-border-strong'
              "
              :title="freshnessInfo.subText"
            >
              <Clock class="w-3.5 h-3.5" />
              <span>{{ freshnessInfo.text }}</span>
            </div>
          </div>

          <h1 class="text-2xl sm:text-3xl font-bold text-text-primary tracking-tight">
            {{ station.name }}
          </h1>

          <!-- Rozetler Grubu -->
          <div class="flex flex-wrap items-center gap-2 pt-1">
            <!-- EPDK Sicil Rozeti -->
            <span
              class="inline-flex items-center px-2.5 py-1 rounded bg-bg-subdued border border-border-strong text-xs font-mono font-medium text-text-secondary"
            >
              EPDK: {{ station.istasyon_no }}
            </span>

            <!-- Hizmet Şekli -->
            <span
              class="inline-flex items-center px-2.5 py-1 rounded text-xs font-medium"
              :class="
                station.service_type === 'Özel'
                  ? 'bg-warning-subdued text-warning'
                  : 'bg-success-subdued text-success'
              "
            >
              {{ station.service_type || 'Halka Açık' }}
            </span>

            <!-- Arıza Rozeti -->
            <span
              v-if="station.is_flagged_defective || station.status === 'DEFECTIVE'"
              class="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-danger-subdued text-danger font-medium text-xs border border-danger/20"
            >
              <AlertTriangle class="w-3.5 h-3.5" />
              <span>Arıza Bildirildi (3+ Doğrulama)</span>
            </span>
          </div>
        </header>

        <!-- Detay Gövdesi -->
        <div class="p-6 sm:p-8 space-y-6">
          <!-- Adres Bölümü -->
          <section class="space-y-1.5">
            <h2 class="text-xs font-bold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
              <MapPin class="w-4 h-4 text-primary" />
              <span>Konum ve Adres</span>
            </h2>
            <p class="text-sm text-text-primary leading-relaxed">
              {{ station.address || 'Adres bilgisi EPDK sicilinde kayıtlıdır.' }}
            </p>
            <p v-if="station.district || station.city" class="text-xs text-text-secondary">
              {{ station.district }} / {{ station.city }}
            </p>
          </section>

          <!-- Soket ve Güç Bilgileri -->
          <section class="space-y-3 pt-4 border-t border-border-default">
            <h2 class="text-xs font-bold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
              <Zap class="w-4 h-4 text-primary" />
              <span>Soket ve Güç Bilgileri</span>
            </h2>

            <!-- Voltrun veya Gerçek Soket Verisi Varsa -->
            <div v-if="displayConnectors.length > 0" class="space-y-2">
              <div
                v-for="c in displayConnectors"
                :key="c"
                class="p-3.5 rounded-lg border border-border-default bg-bg-surface flex items-center justify-between text-sm"
              >
                <div class="flex items-center gap-2">
                  <Zap class="w-4 h-4 text-primary" />
                  <span class="font-semibold text-text-primary">{{ c }}</span>
                </div>
                <span v-if="station.power_kw" class="font-bold text-primary">{{ station.power_kw }} kW</span>
              </div>
            </div>

            <!-- Faz 1 Standart Gri Rozet (VERİ YOK) -->
            <div
              v-else
              class="p-4 rounded-lg bg-missing-bg border border-border-default flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div class="flex items-center gap-2.5">
                <HelpCircle class="w-5 h-5 text-missing-text flex-shrink-0" />
                <div>
                  <p class="text-xs font-semibold text-missing-text">Operatör Verisi Bekleniyor</p>
                  <p class="text-[11px] text-text-secondary">Soket tipi, güç ve anlık durum bilgisi bekleniyor</p>
                </div>
              </div>

              <!-- Topluluk Katkı Butonu CTA -->
              <button
                type="button"
                @click="isContributeModalOpen = true"
                class="touch-target-min px-3 py-1.5 rounded bg-bg-surface hover:bg-bg-subdued border border-border-strong text-xs font-medium text-text-primary flex-shrink-0 transition-colors focus-visible:outline-none"
              >
                + Bilgi Ekle
              </button>
            </div>
          </section>

          <!-- Tarife & Canlı Doluluk Durumu -->
          <section class="space-y-2 text-xs text-text-secondary pt-4 border-t border-border-default">
            <p>
              <strong class="text-text-primary">Tarife:</strong>
              <span class="text-missing-text font-medium ml-1">Operatör Verisi Bekleniyor</span>
            </p>
            <p>
              <strong class="text-text-primary">Canlı Doluluk:</strong>
              <span class="text-text-muted ml-1">Canlı durum verisi henüz açılmadı</span>
            </p>
          </section>

          <!-- Birincil ve İkincil Aksiyon Butonları -->
          <div class="space-y-3 pt-4 border-t border-border-default">
            <!-- Birincil CTA (Masaüstü: Web Sitesi + Pano Fallback) -->
            <button
              type="button"
              @click="handlePrimaryAction"
              class="w-full h-12 rounded-md bg-primary hover:bg-primary-hover active:bg-primary-active text-on-primary font-semibold text-sm shadow-md flex items-center justify-center gap-2 transition-all touch-target-min focus-visible:outline-none"
            >
              <span>Operatör Web Sitesine Git ↗</span>
              <ExternalLink class="w-4 h-4" />
            </button>
            <p class="text-[11px] text-text-secondary text-center leading-tight">
              Masaüstü ortamında doğrudan şarj başlatılamaz; operatör web sitesine gidebilir veya QR ile telefona aktarabilirsiniz.
            </p>

            <!-- İkincil Aksiyonlar (2 Kolon) -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                @click="handleDirections"
                class="h-11 rounded-md border border-border-strong bg-bg-subdued hover:bg-border-default text-text-primary font-medium text-xs flex items-center justify-center gap-2 transition-colors touch-target-min focus-visible:outline-none"
              >
                <Navigation class="w-4 h-4 text-primary" />
                <span>Yol Tarifi Al</span>
              </button>

              <button
                type="button"
                @click="isQrModalOpen = true"
                class="h-11 rounded-md border border-border-strong bg-bg-subdued hover:bg-border-default text-text-primary font-medium text-xs flex items-center justify-center gap-2 transition-colors touch-target-min focus-visible:outline-none"
              >
                <QrCode class="w-4 h-4 text-primary" />
                <span>Telefona Aktar (QR)</span>
              </button>
            </div>

            <!-- Arıza Bildir Butonu -->
            <button
              type="button"
              @click="isReportModalOpen = true"
              class="w-full py-2.5 text-xs text-text-secondary hover:text-danger flex items-center justify-center gap-1.5 transition-colors touch-target-min focus-visible:outline-none"
            >
              <AlertTriangle class="w-3.5 h-3.5" />
              <span>İstasyonla ilgili bir sorun mu var? Arıza Bildir</span>
            </button>
          </div>
        </div>

        <!-- Zorunlu Yasal EMP ve Veri Kaynak Beyanı -->
        <footer class="p-6 bg-bg-subdued border-t border-border-default text-center text-xs text-text-muted space-y-1">
          <p>Veri Kaynağı: EPDK Sicil Kaydı (Eylül 2026)</p>
          <p class="leading-relaxed">
            elektriklioto.com lisanslı şarj operatörü değildir. Şarj başlatma ve faturalandırma ilgili operatörün sorumluluğundadır.
          </p>
        </footer>
      </article>

      <!-- Web-Mobil QR Aktarım Modalı (SCR-05) -->
      <QrBridgeModal
        :station="station"
        :is-open="isQrModalOpen"
        @close="isQrModalOpen = false"
      />

      <!-- Topluluk Veri Katkı Modalı (SCR-07) -->
      <ContributeModal
        :station="station"
        :is-open="isContributeModalOpen"
        @close="isContributeModalOpen = false"
      />

      <!-- Arıza Bildirim Modalı (SCR-06) -->
      <IssueReportModal
        :station="station"
        :is-open="isReportModalOpen"
        @close="isReportModalOpen = false"
        @report-submitted="handleReportSubmitted"
      />
    </div>
  </div>
</template>
