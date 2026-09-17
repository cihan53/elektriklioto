
<script setup lang="ts">
import { useTheme } from '~/composables/useTheme';
import { Zap, Sun, Moon, Monitor } from 'lucide-vue-next';

const { currentTheme, applyTheme } = useTheme();

const toggleTheme = () => {
  if (currentTheme.value === 'system') applyTheme('light');
  else if (currentTheme.value === 'light') applyTheme('dark');
  else applyTheme('system');
};
</script>

<template>
  <header
    class="h-16 w-full bg-bg-surface border-b border-border-default px-4 lg:px-6 flex items-center justify-between z-30 sticky top-0"
  >
    <!-- Marka & Logo -->
    <NuxtLink
      to="/"
      class="flex items-center gap-2 touch-target-min text-primary font-bold text-xl tracking-tight focus-visible:outline-none"
      aria-label="elektriklioto.com Ana Sayfa"
    >
      <div class="w-9 h-9 rounded-md bg-primary text-on-primary flex items-center justify-center shadow-sm">
        <Zap class="w-5 h-5 fill-current" />
      </div>
      <span class="text-text-primary font-bold text-lg lg:text-xl">
        elektrikli<span class="text-primary">oto</span><span class="text-xs text-text-secondary font-normal">.com</span>
      </span>
    </NuxtLink>

    <!-- Navigasyon ve Kontroller -->
    <div class="flex items-center gap-3">
      <!-- EMP Lisans Rozeti (Masaüstü) -->
      <span
        class="hidden md:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-bg-subdued text-text-secondary border border-border-default"
      >
        <span class="w-2 h-2 rounded-full bg-success"></span>
        e-Mobilite Asistanı
      </span>

      <!-- Tema Değiştirici -->
      <button
        type="button"
        @click="toggleTheme"
        class="touch-target-min px-2.5 py-1.5 rounded-md border border-border-default bg-bg-subdued text-text-secondary hover:text-text-primary hover:bg-border-default flex items-center gap-1.5 text-xs font-medium transition-colors"
        :title="`Tema: ${currentTheme}`"
        aria-label="Tema Değiştir"
      >
        <Sun v-if="currentTheme === 'light'" class="w-4 h-4 text-warning" />
        <Moon v-else-if="currentTheme === 'dark'" class="w-4 h-4 text-primary" />
        <Monitor v-else class="w-4 h-4" />
        <span class="hidden sm:inline capitalize">{{ currentTheme }}</span>
      </button>
    </div>
  </header>
</template>
