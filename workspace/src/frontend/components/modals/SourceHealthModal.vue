
<script setup lang="ts">
import { useSourceHealth } from '~/composables/useSourceHealth';
import { X, Activity, CheckCircle2, AlertTriangle, ShieldCheck, RefreshCw } from 'lucide-vue-next';

defineProps<{
  isOpen: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const { sources, loading, fetchSourcesHealth } = useSourceHealth();
const isTeleportDisabled = import.meta.env?.MODE === 'test' || (typeof process !== 'undefined' && process.env?.NODE_ENV === 'test');

const formatDate = (dateStr: string | null) => {
  if (!dateStr) return 'Kayıt bulunmuyor';
  try {
    const d = new Date(dateStr);
    return d.toLocaleString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
};
</script>

<template>
  <Teleport to="body" :disabled="isTeleportDisabled">
    <transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="isOpen"
        class="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="source-health-title"
      >
        <div
          class="bg-bg-surface border border-border-default rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
        >
          <!-- Modal Başlık Çubuğu -->
          <div class="px-5 py-4 border-b border-border-default flex items-center justify-between">
            <div class="flex items-center gap-2">
              <div class="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <Activity class="w-4 h-4" />
              </div>
              <div>
                <h3 id="source-health-title" class="text-base font-bold text-text-primary">
                  Veri Kaynakları Sağlık Durumu
                </h3>
                <p class="text-xs text-text-secondary">CPO ve kamu API eşitleme göstergeleri (US-18)</p>
              </div>
            </div>

            <button
              type="button"
              @click="emit('close')"
              class="touch-target-min flex items-center justify-center text-text-secondary hover:text-text-primary rounded-md p-1 focus-visible:outline-none"
              aria-label="Kapat"
            >
              <X class="w-5 h-5" />
            </button>
          </div>

          <!-- Kaynak Listesi -->
          <div class="p-5 overflow-y-auto space-y-3">
            <!-- EMP Dayanıklılık Bilgilendirme Kartı -->
            <div class="p-3.5 rounded-lg bg-bg-subdued border border-border-default text-xs space-y-1.5">
              <div class="flex items-center gap-2 text-text-primary font-semibold">
                <ShieldCheck class="w-4 h-4 text-success" />
                <span>%100 Kesintisiz Hizmet Güvencesi</span>
              </div>
              <p class="text-text-secondary leading-relaxed">
                Herhangi bir operatör veri kaynağında kesinti olması durumunda harita, arama ve rota ön planlama işlevleri kesintisiz devam eder. Bayat veriler "Son güncelleme" rozetiyle şeffaf şekilde etiketlenir.
              </p>
            </div>

            <!-- Yükleniyor Durumu -->
            <div v-if="loading" class="py-6 text-center text-xs text-text-secondary flex items-center justify-center gap-2">
              <RefreshCw class="w-4 h-4 animate-spin text-primary" />
              <span>Kaynak durumları kontrol ediliyor...</span>
            </div>

            <!-- Kaynak Kartları -->
            <div v-else class="space-y-2.5">
              <div
                v-for="source in sources"
                :key="source.id"
                class="p-3.5 rounded-lg border flex flex-col gap-2 transition-colors"
                :class="
                  source.health_status === 'STALE'
                    ? 'bg-warning-subdued border-warning/30'
                    : 'bg-bg-surface border-border-default'
                "
              >
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <span class="w-2.5 h-2.5 rounded-full" :class="source.health_status === 'STALE' ? 'bg-warning' : 'bg-success'"></span>
                    <span class="font-bold text-sm text-text-primary">{{ source.name }}</span>
                  </div>
                  <span
                    class="px-2 py-0.5 rounded text-[11px] font-semibold"
                    :class="
                      source.health_status === 'STALE'
                        ? 'bg-warning/20 text-warning'
                        : 'bg-success-subdued text-success'
                    "
                  >
                    {{ source.health_status === 'STALE' ? 'Gecikme (> 24 Saat)' : 'Aktif / Sağlıklı' }}
                  </span>
                </div>

                <div class="grid grid-cols-2 gap-2 text-xs text-text-secondary pt-1 border-t border-border-default/50">
                  <div>
                    <span class="text-text-muted text-[11px] block">Son Başarılı Senkronizasyon:</span>
                    <span class="font-medium text-text-primary">{{ formatDate(source.last_successful_sync) }}</span>
                  </div>
                  <div>
                    <span class="text-text-muted text-[11px] block">İstasyon Sayısı:</span>
                    <span class="font-bold text-text-primary">{{ source.record_count?.toLocaleString('tr-TR') || 0 }} İstasyon</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Alt Kapat Çubuğu -->
          <div class="p-4 border-t border-border-default bg-bg-subdued flex justify-end">
            <button
              type="button"
              @click="emit('close')"
              class="px-4 py-2 rounded-md bg-bg-surface border border-border-strong text-xs font-semibold text-text-primary hover:bg-border-default touch-target-min transition-colors focus-visible:outline-none"
            >
              Anladım, Kapat
            </button>
          </div>
        </div>
      </div>
    </transition>
  </Teleport>
</template>
