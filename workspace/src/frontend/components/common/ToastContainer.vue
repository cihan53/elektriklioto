
<script setup lang="ts">
import { useToast } from '~/composables/useToast';
import { Info, CheckCircle, AlertTriangle, AlertCircle, X } from 'lucide-vue-next';

const { toasts, removeToast } = useToast();
</script>

<template>
  <aside
    aria-live="polite"
    aria-label="Bildirimler"
    class="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm w-[calc(100%-2rem)] pointer-events-none"
  >
    <transition-group
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0 translate-y-2 scale-95"
      enter-to-class="opacity-100 translate-y-0 scale-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100 scale-100"
      leave-to-class="opacity-0 scale-90"
    >
      <div
        v-for="t in toasts"
        :key="t.id"
        role="status"
        class="pointer-events-auto flex items-start gap-3 p-4 rounded-md shadow-xl border border-border-default bg-bg-surface text-text-primary min-h-[44px]"
      >
        <span class="flex-shrink-0 mt-0.5">
          <Info v-if="t.type === 'info' || !t.type" class="w-5 h-5 text-primary" />
          <CheckCircle v-else-if="t.type === 'success'" class="w-5 h-5 text-success" />
          <AlertTriangle v-else-if="t.type === 'warning'" class="w-5 h-5 text-warning" />
          <AlertCircle v-else-if="t.type === 'error'" class="w-5 h-5 text-danger" />
        </span>

        <p class="text-sm font-medium leading-tight flex-1">
          {{ t.message }}
        </p>

        <button
          type="button"
          @click="removeToast(t.id)"
          class="flex-shrink-0 touch-target-min -mr-2 -mt-2 inline-flex items-center justify-center text-text-secondary hover:text-text-primary rounded focus-visible:outline-none"
          aria-label="Bildirimi Kapat"
        >
          <X class="w-4 h-4" />
        </button>
      </div>
    </transition-group>
  </aside>
</template>
