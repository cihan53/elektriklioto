
<script setup lang="ts">
import { ref } from 'vue';
import { useTheme } from '~/composables/useTheme';
import { useSourceHealth } from '~/composables/useSourceHealth';
import { Zap, Sun, Moon, Monitor, Map, Activity, Info } from 'lucide-vue-next';
import SourceHealthModal from '~/components/modals/SourceHealthModal.vue';
import AboutModal from '~/components/modals/AboutModal.vue';
import GoogleAnalytics from '~/components/common/GoogleAnalytics.vue';

const { currentTheme, applyTheme } = useTheme();
const { isModalOpen, hasOutage, openModal, closeModal } = useSourceHealth();
const isAboutModalOpen = ref(false);

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
    <!-- Google Analytics İzleme Bileşeni (TALEP-002: G-BKMTW8EH4K) -->
    <GoogleAnalytics />

    <!-- Marka & Logo -->
    <div class="flex items-center gap-6">
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

      <!-- Masaüstü Hızlı Dizin Menüsü (SCR-03 SEO Dizin Bağlantıları) -->
      <!-- TALEP-011: Orta menüdeki mükerrer Hakkında bağlantısı kaldırıldı, sağdaki doğru modal butonu korundu -->
      <nav class="hidden lg:flex items-center gap-1 text-sm font-medium text-text-secondary">
        <NuxtLink
          to="/"
          class="px-3 py-1.5 rounded-md hover:text-text-primary hover:bg-bg-subdued touch-target-min flex items-center gap-1.5 transition-colors"
          active-class="text-primary font-semibold"
        >
          <Map class="w-4 h-4" />
          <span>Harita</span>
        </NuxtLink>
        <NuxtLink
          to="/istanbul/sarj-istasyonlari"
          class="px-3 py-1.5 rounded-md hover:text-text-primary hover:bg-bg-subdued touch-target-min transition-colors"
          active-class="text-primary font-semibold"
        >
          İstanbul
        </NuxtLink>
        <NuxtLink
          to="/ankara/sarj-istasyonlari"
          class="px-3 py-1.5 rounded-md hover:text-text-primary hover:bg-bg-subdued touch-target-min transition-colors"
          active-class="text-primary font-semibold"
        >
          Ankara
        </NuxtLink>
        <NuxtLink
          to="/izmir/sarj-istasyonlari"
          class="px-3 py-1.5 rounded-md hover:text-text-primary hover:bg-bg-subdued touch-target-min transition-colors"
          active-class="text-primary font-semibold"
        >
          İzmir
        </NuxtLink>
        <NuxtLink
          to="/zes"
          class="px-3 py-1.5 rounded-md hover:text-text-primary hover:bg-bg-subdued touch-target-min transition-colors"
          active-class="text-primary font-semibold"
        >
          ZES
        </NuxtLink>
        <NuxtLink
          to="/trugo"
          class="px-3 py-1.5 rounded-md hover:text-text-primary hover:bg-bg-subdued touch-target-min transition-colors"
          active-class="text-primary font-semibold"
        >
          Trugo
        </NuxtLink>
      </nav>
    </div>

    <!-- Navigasyon ve Kontroller -->
    <div class="flex items-center gap-2 sm:gap-3">
      <!-- Hakkında & Yasal Modal Butonu (TALEP-009 & TALEP-011: Doğru ve onaylı sağ buton) -->
      <button
        type="button"
        @click="isAboutModalOpen = true"
        class="touch-target-min px-2.5 py-1.5 rounded-md border border-border-default bg-bg-subdued text-text-secondary hover:text-text-primary hover:bg-border-default flex items-center gap-1.5 text-xs font-medium transition-colors focus-visible:outline-none"
        title="Hakkında, Sözleşmeler, KVKK ve Canlı Sürüm (TALEP-009)"
        aria-label="Hakkında ve Yasal Bilgiler"
      >
        <Info class="w-3.5 h-3.5 text-primary" />
        <span class="hidden sm:inline">Hakkında</span>
      </button>

      <!-- Veri Kaynakları Sağlık Durumu Butonu (US-18) -->
      <button
        type="button"
        @click="openModal"
        class="touch-target-min px-2.5 py-1.5 rounded-md border border-border-default bg-bg-subdued text-text-secondary hover:text-text-primary hover:bg-border-default flex items-center gap-1.5 text-xs font-medium transition-colors focus-visible:outline-none"
        title="Veri Kaynakları Sağlık Durumu (US-18)"
        aria-label="Veri Kaynakları Sağlık Durumu"
      >
        <span
          class="w-2 h-2 rounded-full"
          :class="hasOutage ? 'bg-warning animate-pulse' : 'bg-success'"
        ></span>
        <Activity class="w-3.5 h-3.5 text-text-secondary" />
        <span class="hidden sm:inline">Kaynaklar</span>
      </button>

      <!-- Tema Seçici Buton -->
      <button
        type="button"
        @click="toggleTheme"
        class="touch-target-min p-2 rounded-md border border-border-default bg-bg-subdued text-text-secondary hover:text-text-primary hover:bg-border-default flex items-center justify-center transition-colors focus-visible:outline-none"
        :title="`Tema: ${currentTheme}`"
        aria-label="Tema Değiştir"
      >
        <Sun v-if="currentTheme === 'light'" class="w-4 h-4 text-warning" />
        <Moon v-else-if="currentTheme === 'dark'" class="w-4 h-4 text-primary" />
        <Monitor v-else class="w-4 h-4 text-text-secondary" />
      </button>
    </div>

    <!-- Sağlık Durumu Modal Entegrasyonu -->
    <SourceHealthModal :is-open="isModalOpen" @close="closeModal" />

    <!-- Hakkında ve Yasal Bilgiler Modal Entegrasyonu (TALEP-009) -->
    <AboutModal :is-open="isAboutModalOpen" @close="isAboutModalOpen = false" />
  </header>
</template>
