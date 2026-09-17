
<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRoute } from 'vue-router';
import type { RouteBridgeDecodedResponse } from '~/types/station';
import { useToast } from '~/composables/useToast';
import { renderSVG } from 'uqr';
import {
  Route,
  MapPin,
  Map,
  Copy,
  Check,
  Smartphone,
  AlertCircle,
  ArrowLeft
} from 'lucide-vue-next';

const route = useRoute();
const config = useRuntimeConfig();
const { showToast } = useToast();

const payloadParam = (route.params.payload as string) || '';
const isCopied = ref(false);

// Backend Route Bridge Decode API Çağrısı (BUG-VIS-01 fix)
const decodeUrl = computed(() => {
  const base = (config.public.apiBase || '/api/v1').replace(/\/+$/, '');
  return `${base}/routes/bridge/decode/${encodeURIComponent(payloadParam)}`;
});

const { data: routeData, error } = await useFetch<any>(decodeUrl);

const decoded = computed<RouteBridgeDecodedResponse | null>(() => {
  if (!routeData.value) return null;
  return routeData.value.data || routeData.value;
});

const currentUrl = computed(() => {
  return `https://elektriklioto.com/r/${payloadParam}`;
});

// Dinamik SVG QR Kod (uqr)
const qrSvg = computed(() => {
  if (!currentUrl.value) return '';
  try {
    return renderSVG(currentUrl.value, { border: 2 });
  } catch {
    return '';
  }
});

const copyLink = async () => {
  if (!import.meta.client || !currentUrl.value) return;
  try {
    await navigator.clipboard.writeText(currentUrl.value);
    isCopied.value = true;
    showToast('Rota bağlantısı kopyalandı!', 'success');
    setTimeout(() => {
      isCopied.value = false;
    }, 2500);
  } catch {
    showToast('Kopyalama başarısız oldu.', 'error');
  }
};

// SEO
useHead(() => {
  const title = decoded.value?.title
    ? `${decoded.value.title} — Paylaşılan Rota | elektriklioto.com`
    : 'Paylaşılan Şarj Rotası | elektriklioto.com';
  const description = 'Web üzerinden oluşturulan elektrikli araç şarj rotası ve durak istasyonları.';

  return {
    title,
    meta: [
      { name: 'description', content: description },
      { property: 'og:title', content: title },
      { property: 'og:description', content: description },
      { property: 'og:type', content: 'website' }
    ]
  };
});
</script>

<template>
  <div class="max-w-3xl mx-auto px-4 py-8 w-full space-y-6">
    <!-- Hata Durumu (Geçersiz veya Süresi Dolmuş Rota) -->
    <div
      v-if="error || !decoded"
      class="p-8 text-center bg-bg-surface border border-border-default rounded-xl shadow-md space-y-3"
    >
      <AlertCircle class="w-12 h-12 text-warning mx-auto" />
      <h1 class="text-xl font-bold text-text-primary">Geçersiz veya Süresi Dolmuş Rota Bağlantısı</h1>
      <p class="text-xs text-text-secondary max-w-md mx-auto">
        Bu rota bağlantısının süresi dolmuş veya bağlantı adresi hatalı olabilir. Lütfen yeni bir rota oluşturun.
      </p>
      <NuxtLink
        to="/"
        class="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-on-primary text-xs font-semibold touch-target-min"
      >
        <ArrowLeft class="w-4 h-4" />
        Haritaya Dön
      </NuxtLink>
    </div>

    <!-- Rota İçeriği -->
    <div v-else class="space-y-6">
      <!-- Üst Başlık Kartı -->
      <header class="bg-bg-surface border border-border-default rounded-xl p-6 shadow-md space-y-3">
        <div class="flex items-center gap-2 text-primary">
          <Route class="w-6 h-6" />
          <span class="text-xs font-semibold uppercase tracking-wider">Web-Mobil Rota Köprüsü</span>
        </div>

        <h1 class="text-2xl font-bold text-text-primary">
          {{ decoded.title || 'Planlanan Şarj Rotası' }}
        </h1>

        <p class="text-xs text-text-secondary">
          Bu rotada toplam <strong class="text-text-primary font-semibold">{{ decoded.stops?.length || 0 }}</strong> şarj durağı bulunmaktadır.
        </p>

        <!-- Hızlı Aksiyonlar -->
        <div class="flex flex-wrap items-center gap-3 pt-2">
          <NuxtLink
            :to="`/?route=${encodeURIComponent(payloadParam)}`"
            class="inline-flex items-center gap-2 h-11 px-5 rounded-md bg-primary text-on-primary font-semibold text-xs shadow-sm hover:bg-primary-hover active:bg-primary-active touch-target-min transition-all"
          >
            <Map class="w-4 h-4" />
            <span>Haritada Rota Olarak Aç</span>
          </NuxtLink>

          <button
            type="button"
            @click="copyLink"
            class="inline-flex items-center gap-1.5 h-11 px-4 rounded-md border border-border-strong bg-bg-subdued hover:bg-border-default text-text-primary font-semibold text-xs touch-target-min transition-colors"
          >
            <Check v-if="isCopied" class="w-4 h-4 text-success" />
            <Copy v-else class="w-4 h-4 text-text-secondary" />
            <span>{{ isCopied ? 'Kopyalandı!' : 'Bağlantıyı Kopyala' }}</span>
          </button>
        </div>
      </header>

      <!-- İki Kolon Düzen: Sol Duraklar Listesi, Sağ QR Kod -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <!-- Sol: Durak Listesi -->
        <div class="md:col-span-2 space-y-3">
          <h2 class="text-sm font-bold text-text-primary">
            Rota Durakları ({{ decoded.stops?.length || 0 }})
          </h2>

          <div class="space-y-2">
            <div
              v-for="(stop, idx) in decoded.stops"
              :key="(typeof stop === 'object' && stop ? (stop as any).station_id : null) || idx"
              class="p-4 rounded-xl bg-bg-surface border border-border-default shadow-sm flex items-start gap-3"
            >
              <div class="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                {{ idx + 1 }}
              </div>

              <div class="flex-1 space-y-1">
                <div class="flex items-center justify-between gap-2">
                  <h3 class="text-sm font-bold text-text-primary">
                    {{ (typeof stop === 'object' && stop && (stop as any).name) ? (stop as any).name : (typeof stop === 'string' ? `Durak: ${stop}` : `Şarj Durağı ${idx + 1}`) }}
                  </h3>
                  <span v-if="typeof stop === 'object' && stop && (stop as any).operator_slug" class="text-[11px] font-semibold text-text-secondary uppercase">
                    {{ (stop as any).operator_slug }}
                  </span>
                </div>

                <div v-if="typeof stop === 'object' && stop && (stop as any).lat != null && (stop as any).lon != null" class="flex items-center gap-1 text-xs text-text-secondary">
                  <MapPin class="w-3.5 h-3.5 flex-shrink-0" />
                  <span>{{ Number((stop as any).lat).toFixed(4) }}, {{ Number((stop as any).lon).toFixed(4) }}</span>
                </div>
                <div v-else-if="typeof stop === 'string'" class="flex items-center gap-1 text-xs text-text-muted">
                  <MapPin class="w-3.5 h-3.5 flex-shrink-0" />
                  <span>İstasyon Kodu / ID: {{ stop }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Sağ: Taranabilir QR Kod Kutusu (SCR-05) -->
        <aside class="bg-bg-surface border border-border-default rounded-xl p-5 shadow-md flex flex-col items-center text-center space-y-3 h-fit">
          <div class="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center shadow-inner">
            <Smartphone class="w-5 h-5" />
          </div>

          <h3 class="text-sm font-bold text-text-primary">
            Mobil Uygulamaya Aktar
          </h3>
          <p class="text-[11px] text-text-secondary leading-relaxed">
            Telefonunuzun kamerasıyla QR kodu tarayarak rotayı anında mobil uygulamaya yükleyin.
          </p>

          <div class="p-2 bg-white rounded-lg border border-border-strong shadow-inner">
            <div
              v-if="qrSvg"
              class="w-44 h-44 flex items-center justify-center [&>svg]:w-full [&>svg]:h-full"
              v-html="qrSvg"
            />
          </div>

          <p class="text-[10px] text-text-muted">
            Sıfır Konum Saklama: Rota koordinatları sunucuda tutulmaz.
          </p>
        </aside>
      </div>

      <!-- Zorunlu Yasal EMP Uyarısı -->
      <footer class="pt-6 border-t border-border-default text-center text-xs text-text-muted space-y-1">
        <p>Veri Kaynağı: EPDK Sicil Kaydı (Eylül 2026)</p>
        <p>
          elektriklioto.com lisanslı şarj operatörü değildir. Şarj başlatma ve faturalandırma ilgili operatörün sorumluluğundadır.
        </p>
      </footer>
    </div>
  </div>
</template>
