
<script setup lang="ts">
import { computed } from 'vue';
import type { StationItem } from '~/types/station';
import { useUserLocation } from '~/composables/useUserLocation';
import { useToast } from '~/composables/useToast';
import { useSourceHealth } from '~/composables/useSourceHealth';
import {
  X,
  MapPin,
  ExternalLink,
  Navigation,
  QrCode,
  AlertTriangle,
  HelpCircle,
  Clock,
  Zap,
} from 'lucide-vue-next';

const props = defineProps<{
  station: StationItem | null;
  isOpen: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'openQrBridge', station: StationItem): void;
  (e: 'openContribute', station: StationItem): void;
  (e: 'openReport', station: StationItem): void;
}>();

const { calculateDistanceKm } = useUserLocation();
const { showToast } = useToast();
const { formatFreshnessText } = useSourceHealth();

// Mesafe Gösterimi (Yalnızca istemci tarafında GPS izni varsa in-memory hesaplanır)
const distanceText = computed(() => {
  if (!props.station) return null;
  const km = calculateDistanceKm(props.station.lat, props.station.lon);
  if (km === null) return null;
  if (km < 1) return `~${Math.round(km * 1000)} m`;
  return `~${km.toFixed(1)} km`;
});

// S5 US-18: 24 Saat Kuralına Göre Veri Tazeliği Bilgisi
const freshnessInfo = computed(() => {
  if (!props.station) return { is_stale: false, last_updated_text: '' };
  if (props.station.data_freshness) {
    return props.station.data_freshness;
  }
  return formatFreshnessText(props.station.updated_at);
});

// Soket tipi biçimlendirmesi
const formatConnectorType = (ct: string, st?: StationItem | null): string => {
  if (!ct) return '';
  const opName = (st?.operator?.name || (st as any)?.operator_name || '').toLowerCase();
  const opSlug = (st?.operator?.slug || '').toLowerCase();
  const isVoltrun = opName.includes('voltrun') || opSlug.includes('voltrun');

  // Voltrun istasyonlarında soket tipi AC Tip 2 olmalıdır
  if (isVoltrun) {
    return 'AC Tip 2';
  }

  if (ct === 'CCS2' || ct === 'cCCS2' || ct === 'CCS') return 'CCS';
  if (ct === 'Type 2' || ct === 'sType2' || ct === 'cType2' || ct === 'Type2') return 'AC Tip 2';
  return ct;
};

const displayConnectors = computed(() => {
  if (!props.station) return [];
  const opName = (props.station.operator?.name || (props.station as any)?.operator_name || '').toLowerCase();
  const opSlug = (props.station.operator?.slug || '').toLowerCase();
  const isVoltrun = opName.includes('voltrun') || opSlug.includes('voltrun');

  if (!props.station.connector_types && !props.station.power_kw) {
    return [];
  }

  if (isVoltrun) {
    return ['AC Tip 2'];
  }

  if (!props.station.connector_types) {
    return [];
  }

  const raw = Array.isArray(props.station.connector_types)
    ? props.station.connector_types
    : [props.station.connector_types].filter(Boolean);

  const mapped = raw.map((ct) => formatConnectorType(String(ct), props.station)).filter(Boolean);
  return Array.from(new Set(mapped));
});

// Masaüstünde web yönlendirmesi + Pano fallback
const handleStartCharging = async () => {
  if (!props.station) return;

  const istasyonKodu = props.station.istasyon_no;
  if (import.meta.client && istasyonKodu) {
    try {
      await navigator.clipboard.writeText(istasyonKodu);
      showToast(
        `İstasyon kodu (${istasyonKodu}) panoya kopyalandı! Operatör uygulamasında arama kutusuna yapıştırabilirsiniz.`,
        'info',
        4500
      );
    } catch {
      showToast(`İstasyon kodu: ${istasyonKodu}`, 'info', 4000);
    }
  }

  const targetUrl =
    props.station.operator?.deep_link_config?.web_url ||
    props.station.operator?.deep_link_config?.store_ios ||
    `https://www.google.com/search?q=${encodeURIComponent(
      (props.station.operator?.name || 'şarj') + ' istasyonu'
    )}`;

  if (import.meta.client) {
    window.open(targetUrl, '_blank', 'noopener,noreferrer');
  }
};

const handleDirections = () => {
  if (!props.station || !import.meta.client) return;
  const url = `https://www.google.com/maps/dir/?api=1&destination=${props.station.lat},${props.station.lon}`;
  window.open(url, '_blank', 'noopener,noreferrer');
};
</script>

<template>
  <aside
    class="fixed top-16 left-0 bottom-0 z-40 w-full sm:w-[380px] bg-bg-surface border-r border-border-default shadow-xl transform transition-transform duration-300 ease-in-out flex flex-col"
    :class="isOpen && station ? 'translate-x-0' : '-translate-x-full'"
    aria-label="İstasyon Detay Paneli"
  >
    <!-- Üst Başlık & Kapat -->
    <div class="p-4 border-b border-border-default flex items-center justify-between">
      <div class="flex items-center gap-2 min-w-0">
        <span
          class="w-7 h-7 rounded-full bg-primary text-on-primary flex items-center justify-center font-bold text-xs flex-shrink-0"
        >
          {{ station?.operator?.name?.charAt(0) || 'Ş' }}
        </span>
        <div class="min-w-0 truncate">
          <p class="text-xs text-text-secondary truncate">{{ station?.operator?.name || 'Operatör' }}</p>
          <span
            v-if="distanceText"
            class="text-[11px] font-semibold text-primary"
            data-testid="distance-badge"
          >
            {{ distanceText }}
          </span>
        </div>
      </div>

      <button
        type="button"
        @click="emit('close')"
        class="touch-target-min flex items-center justify-center text-text-secondary hover:text-text-primary rounded-md p-1 focus-visible:outline-none"
        aria-label="İstasyon Detayını Kapat"
      >
        <X class="w-5 h-5" />
      </button>
    </div>

    <!-- Panel Gövdesi -->
    <div v-if="station" class="flex-1 overflow-y-auto p-4 space-y-4">
      <!-- İstasyon Adı & Kanonik Kod -->
      <div>
        <h2 class="text-lg font-bold text-text-primary leading-tight">
          {{ station.name }}
        </h2>
        <div class="flex items-center gap-2 mt-1.5 flex-wrap">
          <!-- EPDK Sicil Rozeti (13px Mono) -->
          <span
            class="inline-flex items-center px-2 py-0.5 rounded bg-bg-subdued border border-border-strong text-xs font-mono text-text-secondary"
            title="EPDK Kanonik İstasyon Sicil Numarası"
          >
            {{ station.istasyon_no }}
          </span>

          <!-- Hizmet Şekli -->
          <span
            class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
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
            class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-danger-subdued text-danger-on-subdued border border-danger/40"
          >
            <AlertTriangle class="w-3.5 h-3.5 text-danger" />
            <span>Arıza Bildirildi</span>
          </span>
        </div>
      </div>

      <!-- S5 US-18: 24 Saat Veri Tazeliği Rozeti -->
      <div
        v-if="freshnessInfo.is_stale"
        class="p-2.5 rounded-md bg-bg-subdued border border-border-default flex items-center gap-2 text-xs text-text-secondary"
        role="status"
        aria-label="Veri tazeliği durumu"
      >
        <Clock class="w-4 h-4 text-text-secondary flex-shrink-0" />
        <div>
          <span class="font-semibold text-text-primary">{{ freshnessInfo.last_updated_text }}</span>
          <p class="text-[11px] text-text-secondary">EPDK sicil kaydı referansı (Eylül 2026)</p>
        </div>
      </div>

      <!-- Adres ve Konum -->
      <div class="p-3 rounded-lg bg-bg-subdued border border-border-default space-y-1">
        <div class="flex items-start gap-2 text-xs text-text-secondary">
          <MapPin class="w-4 h-4 text-text-secondary flex-shrink-0 mt-0.5" />
          <p class="text-text-primary leading-relaxed">
            {{ station.address || `${station.district || ''} / ${station.city || ''}` }}
          </p>
        </div>
        <p v-if="station.district || station.city" class="text-[11px] text-text-secondary pl-6">
          {{ station.district }} / {{ station.city }}
        </p>
      </div>

      <!-- Soket ve Güç Bilgileri -->
      <div class="space-y-2">
        <h3 class="text-xs font-bold text-text-primary uppercase tracking-wider">
          Soket ve Güç Bilgileri
        </h3>

        <!-- Gerçek veri varsa göster -->
        <div v-if="displayConnectors.length > 0" class="space-y-1.5">
          <div
            v-for="c in displayConnectors"
            :key="c"
            class="p-2.5 rounded-md border border-border-default bg-bg-surface flex items-center justify-between text-xs"
          >
            <div class="flex items-center gap-2">
              <Zap class="w-4 h-4 text-primary" />
              <span class="font-semibold text-text-primary">{{ c }}</span>
            </div>
            <span v-if="station.power_kw" class="font-bold text-primary">{{ station.power_kw }} kW</span>
          </div>
        </div>

        <!-- Faz 1 Standart Gri "Operatör Verisi Bekleniyor" Rozeti -->
        <div
          v-else
          class="p-3 rounded-md bg-missing-bg border border-border-default flex items-center justify-between gap-2"
        >
          <div class="flex items-center gap-2">
            <HelpCircle class="w-4 h-4 text-missing-text flex-shrink-0" />
            <div>
              <p class="text-xs font-semibold text-missing-text">Operatör Verisi Bekleniyor</p>
              <p class="text-[11px] text-text-secondary">Soket tipi ve güç bilgisi bekleniyor</p>
            </div>
          </div>

          <!-- Topluluk Katkı Butonu CTA -->
          <button
            type="button"
            @click="emit('openContribute', station)"
            class="touch-target-min px-2.5 py-1.5 rounded bg-bg-surface hover:bg-bg-subdued border border-border-strong text-xs font-medium text-text-primary flex-shrink-0 transition-colors focus-visible:outline-none"
            aria-label="Soket veya Fiyat Bilgisi Ekle"
          >
            + Bilgi Ekle
          </button>
        </div>
      </div>

      <!-- Tarife & Canlı Doluluk Durumu -->
      <div class="space-y-1 text-xs text-text-secondary border-t border-border-default pt-3">
        <p>
          <strong class="text-text-primary">Tarife:</strong>
          <span v-if="station.current_tariff" class="text-text-primary font-medium ml-1">{{ station.current_tariff }}</span>
          <span v-else class="text-missing-text font-medium ml-1">Operatör Verisi Bekleniyor</span>
        </p>
        <p>
          <strong class="text-text-primary">Canlı Doluluk:</strong>
          <span class="text-text-muted ml-1">Canlı durum verisi henüz açılmadı</span>
        </p>
      </div>

      <!-- Aksiyon Butonları -->
      <div class="space-y-2 pt-2">
        <!-- Birincil CTA Butonu (Masaüstü: Web Sitesi + Pano Fallback) -->
        <button
          type="button"
          @click="handleStartCharging"
          class="w-full h-12 rounded-md bg-primary hover:bg-primary-hover active:bg-primary-active text-on-primary font-semibold text-sm shadow-md flex items-center justify-center gap-2 transition-all touch-target-min focus-visible:outline-none"
        >
          <span>Operatör Web Sitesine Git ↗</span>
          <ExternalLink class="w-4 h-4" />
        </button>
        <p class="text-[11px] text-text-secondary text-center leading-tight">
          Masaüstü ortamında doğrudan şarj başlatılamaz; operatör web sitesine gidebilir veya QR ile telefona aktarabilirsiniz.
        </p>

        <!-- İkincil Aksiyonlar -->
        <div class="grid grid-cols-2 gap-2 pt-1">
          <button
            type="button"
            @click="handleDirections"
            class="h-11 rounded-md border border-border-strong bg-bg-subdued hover:bg-border-default text-text-primary font-medium text-xs flex items-center justify-center gap-1.5 transition-colors touch-target-min focus-visible:outline-none"
          >
            <Navigation class="w-4 h-4 text-primary" />
            <span>Yol Tarifi Al</span>
          </button>

          <button
            type="button"
            @click="emit('openQrBridge', station)"
            class="h-11 rounded-md border border-border-strong bg-bg-subdued hover:bg-border-default text-text-primary font-medium text-xs flex items-center justify-center gap-1.5 transition-colors touch-target-min focus-visible:outline-none"
            aria-label="Telefona Aktar (QR)"
          >
            <QrCode class="w-4 h-4 text-primary" />
            <span>Telefona Aktar (QR)</span>
          </button>
        </div>

        <!-- Arıza Bildir Bağlantı Butonu -->
        <button
          type="button"
          @click="emit('openReport', station)"
          class="w-full py-2.5 text-xs text-text-secondary hover:text-danger flex items-center justify-center gap-1.5 transition-colors touch-target-min focus-visible:outline-none"
        >
          <AlertTriangle class="w-3.5 h-3.5" />
          <span>İstasyonla ilgili bir sorun mu var? Arıza Bildir</span>
        </button>
      </div>

      <!-- Yasal ve Veri Beyanı Dipnotu -->
      <div class="border-t border-border-default pt-3 text-[11px] text-text-muted space-y-1">
        <p>Veri Kaynağı: EPDK Sicil Kaydı (Eylül 2026)</p>
        <p class="leading-relaxed">
          elektriklioto.com EPDK lisanslı şarj operatörü değildir. Şarj başlatma ve faturalandırma ilgili operatörün sorumluluğundadır.
        </p>
        <div class="pt-1.5 flex items-center justify-between">
          <a
            href="/hakkimizda"
            class="text-primary hover:text-primary-hover font-medium touch-target-min flex items-center gap-1 transition-colors"
          >
            <span>Hakkında, KVKK & Yasal Sözleşmeler</span>
            <span>↗</span>
          </a>
        </div>
      </div>
    </div>
  </aside>
</template>
