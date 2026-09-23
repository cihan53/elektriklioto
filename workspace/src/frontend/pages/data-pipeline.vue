
<script setup lang="ts">
import {
  Database,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  ShieldCheck,
  Server,
  Layers,
  ArrowRight
} from 'lucide-vue-next';

useHead({
  title: 'Veri Boru Hattı & Canlı Kaynak Durumu | elektriklioto.com',
  meta: [
    {
      name: 'description',
      content: 'EPDK, Voltrun ve ZES canlı veri kaynaklarının senkronizasyon durumu, veri boru hattı mimarisi ve sıfır-kayıt güvenlik kalkanı.'
    },
    { property: 'og:title', content: 'Veri Boru Hattı & Canlı Kaynak Durumu | elektriklioto.com' },
    {
      property: 'og:description',
      content: 'elektriklioto.com CPO ve EPDK canlı veri boru hattı ve senkronizasyon göstergeleri.'
    },
    { property: 'og:type', content: 'website' },
    { property: 'og:url', content: 'https://elektriklioto.com/data-pipeline' }
  ],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: 'elektriklioto.com Veri Boru Hattı Durumu',
        url: 'https://elektriklioto.com/data-pipeline',
        description: 'CPO ve EPDK canlı veri boru hattı ve senkronizasyon göstergeleri.'
      })
    }
  ]
});

const sources = [
  {
    id: 'epdk',
    name: 'EPDK Resmi Portalı',
    desc: 'Kamu şarj ağı operatörleri ve resmi istasyon kimlikleri (ŞRJ/xxxx).',
    status: 'ACTIVE',
    mode: 'Canlı Web / Checkpoint',
    records: '16.788 Kayıt',
    badgeClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
  },
  {
    id: 'voltrun',
    name: 'Voltrun CPO API',
    desc: 'Voltrun şarj istasyonları, soket tipleri ve tarife bilgileri.',
    status: 'ACTIVE',
    mode: 'Canlı REST / Yerel Yedek',
    records: '2.622 Kayıt (1.135 Merkez)',
    badgeClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
  },
  {
    id: 'zes',
    name: 'Zorlu Energy Solutions (ZES)',
    desc: 'ZES şarj istasyonları, AC/DC konfigürasyonları ve canlı doluluk verisi.',
    status: 'ACTIVE',
    mode: 'Canlı REST / Yerel Yedek',
    records: '2.508 Kayıt',
    badgeClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
  }
];

const totalStations = '3.643';
const syncStrategy = 'Canlı API -> Yerel Cache -> Uzak Fallback';
</script>

<template>
  <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 w-full space-y-8">
    <!-- Breadcrumb -->
    <nav class="flex items-center gap-1.5 text-xs text-text-secondary" aria-label="Breadcrumb">
      <NuxtLink to="/" class="hover:text-primary min-h-[44px] min-w-[44px] flex items-center transition-colors">
        Ana Sayfa
      </NuxtLink>
      <ChevronRight class="w-3.5 h-3.5 text-border-strong" />
      <span class="text-text-primary font-medium">Veri Boru Hattı</span>
    </nav>

    <!-- Başlık & Hero Bloğu -->
    <div class="p-6 sm:p-8 rounded-2xl bg-bg-surface border border-border-default shadow-sm space-y-4 relative overflow-hidden">
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div class="space-y-2">
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 class="w-3.5 h-3.5" />
            <span>ETL Pipeline Operasyonel & Dağıtım Doğrulandı (TALEP-018)</span>
          </div>
          <h1 class="text-2xl sm:text-3xl font-bold tracking-tight text-text-primary">
            Canlı Veri Boru Hattı & Kaynak Durumu
          </h1>
          <p class="text-sm sm:text-base text-text-secondary max-w-2xl">
            EPDK, Voltrun ve ZES ağlarından toplanan ham veriler standart StationModel şemasına dönüştürülür,
            sıfır-kayıt güvenlik kalkanı ve atomik yazma mekanizmalarıyla sisteme aktarılır.
          </p>
        </div>

        <div class="flex sm:flex-col items-center sm:items-end justify-between border-t sm:border-t-0 pt-4 sm:pt-0 border-border-default">
          <span class="text-xs text-text-secondary">Normalize İstasyon</span>
          <span class="text-2xl sm:text-3xl font-extrabold text-primary font-mono">{{ totalStations }}</span>
          <span class="text-xs text-text-muted mt-0.5">PostGIS / PostgreSQLExt</span>
        </div>
      </div>
    </div>

    <!-- Kaynak Kartları -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
      <div
        v-for="source in sources"
        :key="source.id"
        class="p-5 rounded-xl bg-bg-surface border border-border-default flex flex-col justify-between space-y-4 hover:border-primary/40 transition-colors"
      >
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <span class="text-xs font-mono font-semibold uppercase tracking-wider text-text-muted">{{ source.id }}</span>
            <span :class="['text-xs px-2.5 py-0.5 rounded-full font-medium border', source.badgeClass]">
              {{ source.status }}
            </span>
          </div>
          <h2 class="text-base font-bold text-text-primary">{{ source.name }}</h2>
          <p class="text-xs text-text-secondary leading-relaxed">{{ source.desc }}</p>
        </div>

        <div class="pt-3 border-t border-border-default text-xs space-y-1.5">
          <div class="flex justify-between text-text-secondary">
            <span>Çalışma Modu:</span>
            <span class="font-medium text-text-primary">{{ source.mode }}</span>
          </div>
          <div class="flex justify-between text-text-secondary">
            <span>Ham Hacim:</span>
            <span class="font-medium text-text-primary font-mono">{{ source.records }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Güvenlik & Mimari Detayları -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
      <div class="p-6 rounded-xl bg-bg-surface border border-border-default space-y-3">
        <div class="flex items-center gap-2.5 text-text-primary font-semibold">
          <ShieldCheck class="w-5 h-5 text-emerald-500" />
          <h3 class="text-base">Sıfır-Kayıt Güvenlik Kalkanı</h3>
        </div>
        <p class="text-xs sm:text-sm text-text-secondary leading-relaxed">
          Veri çekme veya ağ kesintisi anında 0 istasyon dönmesi durumunda mevcut üretim veritabanı ve
          <code class="font-mono text-xs bg-bg-canvas px-1.5 py-0.5 rounded">cpo_stations.json</code> dosyası asla ezilmez.
          Hata anında işlem durdurulur ve mevcut snapshot korunur.
        </p>
      </div>

      <div class="p-6 rounded-xl bg-bg-surface border border-border-default space-y-3">
        <div class="flex items-center gap-2.5 text-text-primary font-semibold">
          <RefreshCw class="w-5 h-5 text-primary" />
          <h3 class="text-base">Çok Aşamalı Fallback Zinciri</h3>
        </div>
        <p class="text-xs sm:text-sm text-text-secondary leading-relaxed">
          Senkronizasyon öncelikle <code class="font-mono text-xs bg-bg-canvas px-1.5 py-0.5 rounded">curl_input.txt</code>
          üzerinden canlı API sorgularını dener. curl_input.txt ve veri önbellekleri dağıtım paketine dahil edilerek (TALEP-018)
          uzak sunucuda GitHub raw bağlantılarına düşmeden doğrudan canlı kaynaklardan senkronizasyon sağlanır.
        </p>
      </div>
    </div>
  </div>
</template>
