
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
      class="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
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
                source.is_healthy && source.circuit_state === 'CLOSED'
                  ? 'bg-bg-surface border-border-default'
                  : 'bg-warning-subdued/40 border-warning/30'
              "
            >
              <div class="flex items-center justify-between gap-2">
                <span class="text-sm font-semibold text-text-primary">{{ source.source_name }}</span>

                <!-- Sağlık Rozeti -->
                <span
                  class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-medium"
                  :class="
                    source.is_healthy && source.circuit_state === 'CLOSED'
                      ? 'bg-success-subdued text-success'
                      : 'bg-warning-subdued text-warning'
                  "
                >
                  <component
                    :is="source.is_healthy && source.circuit_state === 'CLOSED' ? CheckCircle2 : AlertTriangle"
                    class="w-3 h-3"
                  />
                  <span>{{ source.is_healthy && source.circuit_state === 'CLOSED' ? 'Aktif' : 'Gecikmeli / Kesinti' }}</span>
                </span>
              </div>

              <!-- Detay Bilgileri -->
              <div class="grid grid-cols-2 gap-2 text-[11px] text-text-secondary border-t border-border-default/60 pt-2">
                <div>
                  <span class="text-text-muted">Son Başarılı Senkron:</span>
                  <p class="font-medium text-text-primary">{{ formatDate(source.last_successful_sync) }}</p>
                </div>
                <div>
                  <span class="text-text-muted">Devre Durumu:</span>
                  <p class="font-medium text-text-primary font-mono">{{ source.circuit_state }}</p>
                </div>
              </div>

              <div v-if="source.last_error" class="text-[10px] text-danger bg-danger-subdued/40 px-2 py-1 rounded">
                Hata Notu: {{ source.last_error }}
              </div>
            </div>
          </div>
        </div>

        <!-- Alt Kapat & Yenile Butonu -->
        <div class="px-5 py-3 border-t border-border-default flex items-center justify-between bg-bg-subdued">
          <button
            type="button"
            @click="fetchSourcesHealth"
            class="text-xs font-semibold text-primary hover:underline touch-target-min flex items-center gap-1.5"
          >
            <RefreshCw class="w-3.5 h-3.5" />
            <span>Yenile</span>
          </button>

          <button
            type="button"
            @click="emit('close')"
            class="h-9 px-4 rounded-md bg-primary text-on-primary text-xs font-semibold hover:bg-primary-hover touch-target-min transition-colors"
          >
            Anladım
          </button>
        </div>
      </div>
    </div>
  </transition>
</template>
