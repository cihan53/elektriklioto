<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';
import {
  X,
  Sparkles,
  ExternalLink
} from 'lucide-vue-next';
import ChangelogTimeline from '~/components/common/ChangelogTimeline.vue';
import { useChangelog } from '~/composables/useChangelog';

const props = defineProps<{
  isOpen: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const { totalResolvedCount } = useChangelog();

const isTeleportDisabled =
  import.meta.env?.MODE === 'test' ||
  (typeof process !== 'undefined' && process.env?.NODE_ENV === 'test');

// ESC tuşu ile kapatma
const handleKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && props.isOpen) {
    emit('close');
  }
};

onMounted(() => {
  if (typeof window !== 'undefined') {
    window.addEventListener('keydown', handleKeyDown);
  }
});

onUnmounted(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('keydown', handleKeyDown);
  }
});
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
        class="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-3 sm:p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="changelog-modal-title"
        data-testid="changelog-modal"
        @click.self="emit('close')"
      >
        <div
          class="bg-bg-surface border border-border-default rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200"
        >
          <!-- Modal Başlık Çubuğu -->
          <div
            class="px-5 py-4 border-b border-border-default flex items-center justify-between bg-bg-surface flex-shrink-0"
          >
            <div class="flex items-center gap-3">
              <div
                class="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shadow-sm flex-shrink-0"
              >
                <Sparkles class="w-5 h-5" />
              </div>
              <div>
                <h2
                  id="changelog-modal-title"
                  class="text-base sm:text-lg font-bold text-text-primary leading-tight"
                >
                  Sürüm Notları & Güncellemeler
                </h2>
                <p class="text-xs text-text-secondary">
                  Çözülen müşteri talepleri ve sürüm geçmişi (TALEP-001..TALEP-013 ve TALEP-014..TALEP-026 — {{ totalResolvedCount }} Talep Çözüldü)
                </p>
              </div>
            </div>

            <button
              type="button"
              @click="emit('close')"
              class="w-8 h-8 rounded-lg border border-border-default bg-bg-subdued text-text-secondary hover:text-text-primary hover:bg-border-default flex items-center justify-center transition-colors touch-target-min focus-visible:outline-none cursor-pointer"
              aria-label="Kapat"
              title="Kapat"
            >
              <X class="w-4 h-4" />
            </button>
          </div>

          <!-- Modal Gövdesi: Kaydırılabilir Zaman Çizelgesi -->
          <div class="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
            <ChangelogTimeline />
          </div>

          <!-- Alt Bar & Aksiyonlar -->
          <div
            class="p-4 border-t border-border-default bg-bg-subdued flex items-center justify-between gap-3 flex-shrink-0"
          >
            <NuxtLink
              to="/guncellemeler"
              @click="emit('close')"
              class="touch-target-min px-3 py-1.5 rounded-md text-xs font-semibold text-primary hover:text-primary-hover flex items-center gap-1.5 transition-colors focus-visible:outline-none"
            >
              <span>Tam Sayfa Görünümü (/guncellemeler)</span>
              <ExternalLink class="w-3.5 h-3.5" />
            </NuxtLink>

            <button
              type="button"
              @click="emit('close')"
              class="touch-target-min px-4 py-2 rounded-md bg-bg-surface border border-border-strong text-xs font-semibold text-text-primary hover:bg-border-default transition-colors focus-visible:outline-none shadow-sm cursor-pointer"
            >
              Kapat
            </button>
          </div>
        </div>
      </div>
    </transition>
  </Teleport>
</template>
