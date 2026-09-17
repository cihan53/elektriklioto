
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
  Activity,
  Zap
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

// Birincil Aksiyon: Operatör Derin Bağlantısı veya Pano Fallback
// TALEP-003: Voltrun istasyonlarının soket tipi 'AC Tip 2' olarak gösterilmelidir (CCS yerine)
const formatConnectorType = (ct: string, st?: StationItem | null): string => {
  if (!ct) return '';
  const opName = (st?.operator?.name || (st as any)?.operator_name || '').toLowerCase();
  const opSlug = (st?.operator?.slug || '').toLowerCase();
  const isVoltrun = opName.includes('voltrun') || opSlug.includes('voltrun');

  // Müşteri Talebi: Voltrun istasyonlarında soket tipi AC Tip 2 olmalıdır
  if (isVoltrun) {
    return 'AC Tip 2';
  }

  // Genel temiz soket adı gösterimi
  if (ct === 'CCS2' || ct === 'cCCS2' || ct === 'CCS') return 'CCS';
  if (ct === 'Type 2' || ct === 'sType2' || ct === 'cType2' || ct === 'Type2') return 'AC Tip 2';
  return ct;
};

const displayConnectors = computed(() => {
  if (!props.station) return [];
  const opName = (props.station.operator?.name || (props.station as any)?.operator_name || '').toLowerCase();
  const opSlug = (props.station.operator?.slug || '').toLowerCase();
  const isVoltrun = opName.includes('voltrun') || opSlug.includes('voltrun');

  // Faz 1 Zorunlu Kısıt: Soket verisi ve güç verisi ikisi de yoksa uydurulamaz, boş kalır
  if (!props.station.connector_types && !props.station.power_kw) {
    return [];
  }

  if (isVoltrun) {
    // Voltrun istasyonlarında soket tipi her zaman AC Tip 2 olarak gösterilir
    return ['AC Tip 2'];
  }

  if (!props.station.connector_types) {
    return [];
  }

  const raw = Array.isArray(props.station.connector_types)
    ? props.station.connector_types
    : [props.station.connector_types].filter(Boolean);

  const mapped = raw.map(ct => formatConnectorType(String(ct), props.station)).filter(Boolean);
  return Array.from(new Set(mapped));
});

const handlePrimaryAction = () => {
  if (!props.station || !import.meta.client) return;

  const op = props.station.operator;
  const istasyonNo = props.station.istasyon_no;

  // Masaüstü Web: Pano Fallback + Operatör Web Sitesi Yönlendirmesi
  if (navigator.clipboard) {
    navigator.clipboard.writeText(istasyonNo).catch(() => {});
  }

  showToast(
    `İstasyon kodu (${istasyonNo}) kopyalandı! Operatör uygulamasında arama kutusuna yapıştırabilirsiniz.`,
    'info',
    4000
  );

  const targetUrl =
    props.station.deep_link?.universal_link_url ||
    op?.deep_link_config?.web_url ||
    op?.website_url ||
    `https://www.google.com/search?q=${encodeURIComponent(op.name + ' şarj istasyonu')}`;

  window.open(targetUrl, '_blank', 'noopener,noreferrer');
};

const handleDirections = () => {
  if (!props.station || !import.meta.client) return;
  const url = `https://www.google.com/maps/dir/?api=1&destination=${props.station.lat},${props.station.lon}`;
  window.open(url, '_blank', 'noopener,noreferrer');
};
</script>

<template>
  <transition
    enter-active-class="transition duration-250 ease-out"
    enter-from-class="opacity-0 translate-y-full sm:translate-y-0 sm:-translate-x-full"
    enter-to-class="opacity-100 translate-y-0 sm:translate-x-0"
    leave-active-class="transition duration-200 ease-in"
    leave-from-class="opacity-100 translate-y-0 sm:translate-x-0"
    leave-to-class="opacity-0 translate-y-full sm:translate-y-0 sm:-translate-x-full"
  >
    <section
      v-if="isOpen && station"
      class="fixed sm:absolute bottom-0 sm:bottom-auto left-0 sm:top-16 sm:bottom-0 w-full sm:w-[380px] max-h-[85vh] sm:max-h-none bg-bg-surface border-t sm:border-t-0 sm:border-r border-border-default shadow-xl z-40 flex flex-col overflow-y-auto p-5 rounded-t-xl sm:rounded-none"
      aria-labelledby="station-detail-heading"
    >
      <!-- Mobil Çekmece Tutamacı (Yalnızca Mobil) -->
      <div class="sm:hidden w-full flex items-center justify-center pb-3">
        <div class="w-9 h-1 rounded-full bg-border-strong" aria-hidden="true" />
      </div>

      <!-- Başlık ve Kapat Butonu -->
      <div class="flex items-start justify-between gap-3 border-b border-border-default pb-4">
        <div>
          <!-- Operatör Adı & Rozet -->
          <div class="flex items-center gap-2 mb-1">
            <span class="w-5 h-5 rounded-full bg-primary text-on-primary flex items-center justify-center text-xs font-bold">
              {{ station.operator.name.charAt(0) }}
            </span>
            <span class="text-sm font-semibold text-text-secondary">{{ station.operator.name }}</span>
          </div>

          <!-- İstasyon Adı -->
          <h2 id="station-detail-heading" class="text-xl font-bold text-text-primary leading-tight">
            {{ station.name }}
          </h2>

          <!-- EPDK Sicil Rozeti -->
          <div class="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-bg-subdued border border-border-strong text-xs font-mono text-text-secondary">
            <span>EPDK:</span>
            <span class="font-bold text-text-primary">{{ station.istasyon_no }}</span>
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

      <!-- Durum & Mesafe & Tazelik Rozetleri -->
      <div class="py-3 flex items-center gap-2 flex-wrap text-xs">
        <!-- Hizmet Şekli Rozeti -->
        <span
          class="inline-flex items-center gap-1 px-2.5 py-1 rounded font-medium"
          :class="station.service_type === 'Özel' ? 'bg-warning-subdued text-warning' : 'bg-success-subdued text-success'"
        >
          <span class="w-1.5 h-1.5 rounded-full bg-current"></span>
          {{ station.service_type || 'Halka Açık' }}
        </span>

        <!-- Arıza Bildirildi Rozeti (3+ Doğrulanmış İhbar) -->
        <span
          v-if="station.is_flagged_defective || station.status === 'DEFECTIVE'"
          class="inline-flex items-center gap-1 px-2.5 py-1 rounded font-medium bg-danger-subdued text-danger-on-subdued border border-danger/40"
          role="status"
          aria-label="İstasyon arızalı olarak bildirildi"
        >
          <AlertTriangle class="w-3.5 h-3.5 text-danger flex-shrink-0" />
          <span>Arıza Bildirildi (3+ Doğrulama)</span>
        </span>

        <!-- S5 US-18: 24 Saat Veri Tazeliği Nötr Gri Rozeti -->
        <span
          v-if="freshnessInfo.is_stale"
          class="inline-flex items-center gap-1 px-2.5 py-1 rounded font-medium bg-bg-subdued text-text-secondary border border-border-default"
          :title="`Veri Tazeliği: ${freshnessInfo.last_updated_text}`"
          role="status"
          aria-label="Veri tazeliği durumu"
        >
          <Clock class="w-3.5 h-3.5 text-text-secondary flex-shrink-0" />
          <span>{{ freshnessInfo.last_updated_text }}</span>
        </span>

        <!-- Mesafe Göstergesi (GPS izni varsa) -->
        <span
          v-if="distanceText"
          class="inline-flex items-center px-2.5 py-1 rounded font-medium bg-bg-subdued text-text-secondary border border-border-default"
        >
          {{ distanceText }}
        </span>
      </div>

      <!-- Adres ve Konum -->
      <div class="py-3 border-t border-border-default flex items-start gap-2.5 text-xs text-text-secondary">
        <MapPin class="w-4 h-4 text-text-secondary flex-shrink-0 mt-0.5" />
        <div>
          <p class="text-text-primary font-medium">{{ station.address || 'Adres bilgisi EPDK sicilinde belirtilmemiş.' }}</p>
          <p class="text-text-secondary mt-0.5">{{ station.district || '' }} / {{ station.city || '' }}</p>
        </div>
      </div>

      <!-- Soket ve Güç Bilgileri (Zenginleştirilmiş veya Faz 1 Boş Veri Durumu) -->
      <div class="my-3 p-3.5 rounded-lg bg-bg-subdued border border-border-default space-y-2.5">
        <div class="flex items-center justify-between">
          <span class="text-xs font-semibold text-text-primary">Soket ve Güç Bilgileri</span>
          <button
            type="button"
            @click="emit('openContribute', station)"
            class="text-xs font-semibold text-primary hover:underline touch-target-min flex items-center"
          >
            + Bilgi Ekle
          </button>
        </div>

        <!-- Soket / Güç Verisi Varsa Göster -->
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

          <div class="text-[11px] text-text-secondary space-y-1 pt-1 border-t border-border-default/60">
            <p v-if="station.current_tariff">Tarife: <span class="font-semibold text-text-primary">{{ station.current_tariff }}</span></p>
            <p v-else>Tarife: <span class="text-text-muted">Operatör Verisi Bekleniyor</span></p>
            <p>Canlı Doluluk: <span class="text-text-muted">{{ station.status || 'Canlı durum verisi henüz açılmadı' }}</span></p>
          </div>
        </div>

        <!-- Faz 1 Eksik Veri Alanı (Zorunlu Kısıt: Soket Boş Durumu) -->
        <div v-else class="space-y-2">
          <div class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium bg-missing-bg text-missing-text border border-border-default">
            <HelpCircle class="w-3.5 h-3.5" />
            <span>Operatör Verisi Bekleniyor</span>
          </div>

          <div class="text-[11px] text-text-secondary space-y-1 pt-1 border-t border-border-default/60">
            <p>Tarife: <span class="text-text-muted">Operatör Verisi Bekleniyor</span></p>
            <p>Canlı Doluluk: <span class="text-text-muted">Canlı durum verisi henüz açılmadı</span></p>
          </div>
        </div>
      </div>

      <!-- Birincil Eylem Grubu (Masaüstü vs Mobil) -->
      <div class="py-4 space-y-2.5">
        <!-- Birincil Buton: Operatör Web Sitesine Git (Masaüstü) / Şarja Başla -->
        <button
          type="button"
          @click="handlePrimaryAction"
          class="w-full h-12 rounded-md bg-primary text-on-primary text-sm font-semibold flex items-center justify-center gap-2 shadow-sm hover:bg-primary-hover active:bg-primary-active touch-target-min transition-all focus-visible:outline-none"
        >
          <span>Operatör Web Sitesine Git</span>
          <ExternalLink class="w-4 h-4" />
        </button>

        <!-- Masaüstü İkincil Bilgi -->
        <p class="text-[11px] text-text-muted text-center leading-snug">
          Masaüstü ortamında doğrudan şarj başlatılamaz; operatör web sitesine gidebilir veya QR ile telefona aktarabilirsiniz.
        </p>

        <!-- İkincil Butonlar: Yol Tarifi & Telefona Aktar -->
        <div class="grid grid-cols-2 gap-2 pt-1">
          <button
            type="button"
            @click="handleDirections"
            class="h-11 rounded-md border border-border-strong bg-bg-subdued hover:bg-border-default text-text-primary text-xs font-semibold flex items-center justify-center gap-1.5 touch-target-min transition-colors focus-visible:outline-none"
          >
            <Navigation class="w-4 h-4 text-primary" />
            <span>Yol Tarifi</span>
          </button>

          <button
            type="button"
            @click="emit('openQrBridge', station)"
            class="h-11 rounded-md border border-border-strong bg-bg-subdued hover:bg-border-default text-text-primary text-xs font-semibold flex items-center justify-center gap-1.5 touch-target-min transition-colors focus-visible:outline-none"
          >
            <QrCode class="w-4 h-4 text-text-secondary" />
            <span>Telefona Aktar</span>
          </button>
        </div>

        <!-- Arıza Bildir Butonu (Kitle Kaynaklı) -->
        <button
          type="button"
          @click="emit('openReport', station)"
          class="w-full text-center text-xs text-text-secondary hover:text-danger pt-2 touch-target-min transition-colors"
        >
          İstasyonla ilgili bir sorun mu var? <strong class="underline font-semibold">Arıza Bildir</strong>
        </button>
      </div>

      <!-- Veri Kaynağı & EMP Yasal Uyarısı (Zorunlu Kısıt) -->
      <div class="mt-auto pt-4 border-t border-border-default text-[11px] text-text-muted space-y-1">
        <p>Veri Kaynağı: EPDK Sicil Kaydı (Eylül 2026)</p>
        <p class="leading-relaxed">
          elektriklioto.com lisanslı şarj operatörü değildir. Şarj başlatma ve faturalandırma ilgili operatörün sorumluluğundadır.
        </p>
      </div>
    </section>
  </transition>
</template>
