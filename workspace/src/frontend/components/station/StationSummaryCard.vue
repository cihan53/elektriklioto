
<script setup lang="ts">
import { computed } from 'vue';
import type { StationItem } from '~/types/station';
import { useSourceHealth } from '~/composables/useSourceHealth';
import { MapPin, ChevronRight, HelpCircle, AlertTriangle, Clock, Zap } from 'lucide-vue-next';

const props = defineProps<{
  station: StationItem;
}>();

const { formatFreshnessText } = useSourceHealth();

// S5 US-18: 24 Saat Veri Tazeliği Rozeti
const freshnessInfo = computed(() => {
  if (props.station?.data_freshness) {
    return props.station.data_freshness;
  }
  return formatFreshnessText(props.station?.updated_at);
});

const displayConnectors = computed(() => {
  if (!props.station.connector_types && !props.station.power_kw) return [];
  if (props.station.connector_types) {
    const raw = Array.isArray(props.station.connector_types)
      ? props.station.connector_types
      : [props.station.connector_types];
    return raw.filter(Boolean);
  }
  return [];
});
</script>

<template>
  <article
    class="bg-bg-surface border border-border-default rounded-xl shadow-md p-5 flex flex-col justify-between hover:border-primary/40 hover:shadow-lg transition-all"
  >
    <div class="space-y-3">
      <!-- Üst Bilgi & Operatör & Sicil -->
      <div class="flex items-start justify-between gap-2 flex-wrap">
        <div class="flex items-center gap-2">
          <span class="w-6 h-6 rounded-full bg-primary text-on-primary flex items-center justify-center text-xs font-bold shadow-sm">
            {{ station.operator?.name?.charAt(0) || 'Ş' }}
          </span>
          <span class="text-xs font-semibold text-text-secondary">
            {{ station.operator?.name || 'Operatör' }}
          </span>
        </div>

        <!-- EPDK Sicil Rozeti (13px Mono) -->
        <span class="inline-flex items-center px-2 py-0.5 rounded bg-bg-subdued border border-border-strong text-xs font-mono text-text-secondary">
          {{ station.istasyon_no }}
        </span>
      </div>

      <!-- İstasyon Adı & Bağlantı -->
      <h3 class="text-base font-bold text-text-primary leading-snug">
        <NuxtLink
          :to="`/${station.operator?.slug || 'operator'}/${station.slug}`"
          class="hover:text-primary transition-colors focus-visible:outline-none"
        >
          {{ station.name }}
        </NuxtLink>
      </h3>

      <!-- Adres Bilgisi -->
      <div class="flex items-start gap-2 text-xs text-text-secondary">
        <MapPin class="w-4 h-4 text-text-secondary flex-shrink-0 mt-0.5" />
        <p class="line-clamp-2">
          {{ station.address || `${station.district || ''} / ${station.city || ''}` }}
        </p>
      </div>

      <!-- Durum & Faz 1 Eksik Veri & S5 Tazelik Rozetleri -->
      <div class="flex items-center gap-2 flex-wrap pt-1">
        <!-- Hizmet Şekli Rozeti -->
        <span
          class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium"
          :class="station.service_type === 'Özel' ? 'bg-warning-subdued text-warning' : 'bg-success-subdued text-success'"
        >
          <span class="w-1.5 h-1.5 rounded-full bg-current"></span>
          {{ station.service_type || 'Halka Açık' }}
        </span>

        <!-- Arıza Bildirildi Rozeti (3+ Doğrulanmış İhbar) -->
        <span
          v-if="station.is_flagged_defective || station.status === 'DEFECTIVE'"
          class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-danger-subdued text-danger-on-subdued border border-danger/40"
        >
          <AlertTriangle class="w-3 h-3 text-danger flex-shrink-0" />
          <span>Arıza Bildirildi</span>
        </span>

        <!-- S5 US-18: 24 Saat Veri Tazeliği Rozeti -->
        <span
          v-if="freshnessInfo.is_stale"
          class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-bg-subdued text-text-secondary border border-border-default"
          :title="`Veri Tazeliği: ${freshnessInfo.last_updated_text}`"
          role="status"
          aria-label="Veri tazeliği"
        >
          <Clock class="w-3 h-3 text-text-secondary flex-shrink-0" />
          <span>{{ freshnessInfo.last_updated_text }}</span>
        </span>

        <!-- Soket Verisi Varsa Göster, Yoksa Standart Gri Eksik Veri Rozeti (Faz 1 Kuralı) -->
        <template v-if="displayConnectors.length > 0">
          <span
            v-for="c in displayConnectors"
            :key="c"
            class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-primary/10 text-primary border border-primary/20"
          >
            <Zap class="w-3 h-3 text-primary" />
            <span>{{ c }}</span>
          </span>
          <span v-if="station.power_kw" class="text-[11px] font-semibold text-primary">
            {{ station.power_kw }} kW
          </span>
        </template>
        <span
          v-else
          class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-missing-bg text-missing-text border border-border-default"
        >
          <HelpCircle class="w-3 h-3" />
          <span>Operatör Verisi Bekleniyor</span>
        </span>
      </div>
    </div>

    <!-- Alt Buton -->
    <div class="mt-4 pt-3 border-t border-border-default flex items-center justify-between">
      <span class="text-xs text-text-muted">
        {{ station.district ? `${station.district}, ${station.city}` : station.city }}
      </span>
      <NuxtLink
        :to="`/${station.operator?.slug || 'operator'}/${station.slug}`"
        class="text-xs font-semibold text-primary hover:text-primary-hover flex items-center gap-1 touch-target-min"
      >
        <span>Detaylar</span>
        <ChevronRight class="w-3.5 h-3.5" />
      </NuxtLink>
    </div>
  </article>
</template>
