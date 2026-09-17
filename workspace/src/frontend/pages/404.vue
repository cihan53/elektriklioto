
<script setup lang="ts">
import { Map, AlertCircle, ArrowLeft } from 'lucide-vue-next';

useHead({
  title: '404 — Aradığınız Sayfa Bulunamadı | elektriklioto.com',
  meta: [
    { name: 'robots', content: 'noindex, nofollow' }
  ]
});
</script>

<template>
  <div class="min-h-[calc(100vh-64px)] flex items-center justify-center px-4 py-12 bg-bg-base">
    <div class="max-w-md w-full bg-bg-surface border border-border-default rounded-xl p-8 shadow-md text-center space-y-6">
      <!-- Görsel / Hata Kodu -->
      <div class="text-display font-bold text-primary text-6xl lg:text-7xl tracking-tight font-sans">
        404
      </div>

      <!-- Başlık & Açıklama (SCR-10 Standart Mikro Kopya) -->
      <div class="space-y-2">
        <h1 class="text-h2 font-semibold text-text-primary">
          Aradığınız Sayfa veya İstasyon Bulunamadı
        </h1>
        <p class="text-body-md text-text-secondary leading-relaxed">
          İncelemek istediğiniz şarj istasyonu kaldırılmış veya bağlantı adresi değişmiş olabilir.
        </p>
      </div>

      <!-- Birincil Eylem Butonu (min 48px) -->
      <div class="pt-2">
        <NuxtLink
          to="/"
          class="w-full h-12 inline-flex items-center justify-center gap-2 rounded-md bg-primary text-on-primary font-semibold text-sm shadow-sm hover:bg-primary-hover active:bg-primary-active touch-target-min transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          <Map class="w-4 h-4" />
          <span>Haritayı Aç ve Keşfet</span>
        </NuxtLink>
      </div>

      <!-- Popüler Dizin Bağlantıları (Dokunma alanı webde ≥ 44x44px) -->
      <div class="pt-4 border-t border-border-default space-y-2">
        <p class="text-caption text-text-muted uppercase tracking-wider font-semibold">
          Hızlı Bağlantılar ve Rehberler
        </p>
        <div class="flex flex-wrap items-center justify-center gap-2 text-xs font-medium text-primary">
          <NuxtLink
            to="/istanbul/sarj-istasyonlari"
            class="px-3 py-2 rounded hover:bg-bg-subdued touch-target-min transition-colors"
          >
            İstanbul Şarj İstasyonları
          </NuxtLink>
          <span class="text-border-strong">•</span>
          <NuxtLink
            to="/ankara/sarj-istasyonlari"
            class="px-3 py-2 rounded hover:bg-bg-subdued touch-target-min transition-colors"
          >
            Ankara Şarj İstasyonları
          </NuxtLink>
          <span class="text-border-strong">•</span>
          <NuxtLink
            to="/izmir/sarj-istasyonlari"
            class="px-3 py-2 rounded hover:bg-bg-subdued touch-target-min transition-colors"
          >
            İzmir Şarj İstasyonları
          </NuxtLink>
          <span class="text-border-strong">•</span>
          <NuxtLink
            to="/hakkimizda"
            class="px-3 py-2 rounded hover:bg-bg-subdued touch-target-min transition-colors"
          >
            Hakkında & Yasal Bilgiler
          </NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>
