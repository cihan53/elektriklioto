
<script setup lang="ts">
import { onMounted } from 'vue';
import {
  Sparkles,
  Map,
  Info,
  ChevronRight,
  CheckCircle2,
  Clock,
  RefreshCw
} from 'lucide-vue-next';
import ChangelogTimeline from '~/components/common/ChangelogTimeline.vue';
import { useChangelog } from '~/composables/useChangelog';

const {
  latestVersion,
  latestReleaseDate,
  totalResolvedCount,
  isSyncing,
  refresh,
  initChangelogSync
} = useChangelog();

onMounted(() => {
  initChangelogSync();
});

useHead({
  title: 'Sürüm Notları & Değişiklik Günlüğü | elektriklioto.com',
  meta: [
    {
      name: 'description',
      content: "elektriklioto.com üzerinde çözülen müşteri talepleri (TALEP-001..TALEP-026), giderilen hatalar, eklenen özellikler ve SemVer sürüm geçmişi."
    },
    { property: 'og:title', content: 'Sürüm Notları & Değişiklik Günlüğü | elektriklioto.com' },
    {
      property: 'og:description',
      content: 'elektriklioto.com canlı sürüm notları, hata çözümleri ve geliştirme zaman çizelgesi.'
    },
    { property: 'og:type', content: 'website' },
    { property: 'og:url', content: 'https://elektriklioto.com/guncellemeler' }
  ],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: 'elektriklioto.com Sürüm Notları & Değişiklik Günlüğü',
        url: 'https://elektriklioto.com/guncellemeler',
        description: 'elektriklioto.com üzerinde çözülen müşteri talepleri, giderilen hatalar ve sürüm geçmişi.'
      })
    }
  ]
});
</script>

<template>
  <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 w-full space-y-8">
    <!-- Breadcrumb İçerik Haritası -->
    <nav class="flex items-center gap-1.5 text-xs text-text-secondary" aria-label="Breadcrumb">
      <NuxtLink to="/" class="hover:text-primary touch-target-min flex items-center transition-colors">
        Ana Sayfa
      </NuxtLink>
      <ChevronRight class="w-3.5 h-3.5 text-border-strong" />
      <span class="text-text-primary font-medium">Sürüm Notları & Güncellemeler</span>
    </nav>

    <!-- Başlık & Hero Bloğu -->
    <div
      class="p-6 sm:p-8 rounded-2xl bg-bg-surface border border-border-default shadow-sm space-y-4 relative overflow-hidden"
    >
      <div
        class="absolute -right-10 -bottom-10 w-48 h-48 bg-primary/5 rounded-full blur-3xl pointer-events-none"
      />

      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div class="flex items-center gap-4">
          <div
            class="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0 shadow-sm"
          >
            <Sparkles class="w-6 h-6" />
          </div>
          <div>
            <h1 class="text-xl sm:text-2xl lg:text-3xl font-bold text-text-primary tracking-tight">
              Sürüm Notları & Değişiklik Günlüğü
            </h1>
            <p class="text-xs sm:text-sm text-text-secondary mt-1">
              elektriklioto.com üzerinde hayata geçirilen güncellemeler, giderilen hatalar ve sürüm geçmişi
            </p>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <button
            type="button"
            @click="refresh"
            :disabled="isSyncing"
            class="touch-target-min px-3 py-2 rounded-lg bg-bg-subdued border border-border-default text-text-secondary hover:text-text-primary hover:bg-border-default text-xs font-semibold flex items-center gap-1.5 transition-colors focus-visible:outline-none cursor-pointer"
            title="Listeyi Canlı Güncelle"
          >
            <RefreshCw class="w-4 h-4" :class="{ 'animate-spin': isSyncing }" />
            <span class="hidden sm:inline">Güncelle</span>
          </button>

          <NuxtLink
            to="/"
            class="touch-target-min px-4 py-2 rounded-lg bg-primary hover:bg-primary-hover text-on-primary text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm focus-visible:outline-none"
          >
            <Map class="w-4 h-4" />
            <span>Haritaya Git</span>
          </NuxtLink>

          <NuxtLink
            to="/hakkimizda"
            class="touch-target-min px-4 py-2 rounded-lg bg-bg-subdued border border-border-default text-text-secondary hover:text-text-primary hover:bg-border-default text-xs font-semibold flex items-center gap-1.5 transition-colors focus-visible:outline-none"
          >
            <Info class="w-4 h-4" />
            <span>Hakkında</span>
          </NuxtLink>
        </div>
      </div>

      <!-- Bilgi Rozetleri -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
        <div class="p-3 rounded-lg bg-bg-subdued/80 border border-border-default">
          <span class="text-[11px] text-text-muted block">Aktif Sürüm</span>
          <span class="font-mono text-sm font-bold text-primary">{{ latestVersion }}</span>
        </div>

        <div class="p-3 rounded-lg bg-bg-subdued/80 border border-border-default">
          <span class="text-[11px] text-text-muted block">Çözülen Talepler</span>
          <span class="font-mono text-sm font-bold text-success">{{ totalResolvedCount }} Müşteri Talebi</span>
        </div>

        <div class="p-3 rounded-lg bg-bg-subdued/80 border border-border-default">
          <span class="text-[11px] text-text-muted block">Yayın Tarihi</span>
          <span class="text-xs sm:text-sm font-semibold text-text-primary">{{ latestReleaseDate }}</span>
        </div>

        <div class="p-3 rounded-lg bg-bg-subdued/80 border border-border-default">
          <span class="text-[11px] text-text-muted block">Sistem Durumu</span>
          <span class="text-xs font-semibold text-success flex items-center gap-1 mt-0.5">
            <CheckCircle2 class="w-3.5 h-3.5" />
            <span>Tüm Servisler Aktif</span>
          </span>
        </div>
      </div>
    </div>

    <!-- Zaman Çizelgesi Bileşeni -->
    <ChangelogTimeline />

    <!-- Yasal Bildirim ve Şeffaflık Dipnotu -->
    <div class="p-4 rounded-xl border border-border-default bg-bg-surface text-center space-y-1 text-xs text-text-secondary">
      <p>
        elektriklioto.com, elektrikli araç sürücülerine şeffaf, güvenilir ve tarafsız bilgi sağlayan bağımsız bir e-Mobilite asistanıdır.
      </p>
      <p class="text-[11px] text-text-muted">
        Öneri veya karşılaştığınız hataları iletmek için Hakkında panelindeki bildirim kanallarını kullanabilirsiniz.
      </p>
    </div>
  </div>
</template>
