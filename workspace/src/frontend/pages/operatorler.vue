
<script setup lang="ts">
import { ref, computed } from 'vue';
import { useOperators } from '~/composables/useOperators';
import type { OperatorItem } from '~/types/station';
import { ChevronRight, Search, Building2, Map, ArrowDownWideNarrow, ArrowDownAZ } from 'lucide-vue-next';

// TALEP-041 (TALEP-044 ile önceliklendirildi):
// "Tüm Operatörler" dizini varsayılan olarak toplam istasyon sayısına göre
// ÇOKTAN AZA sıralanır; istasyon sayısı gösterilir. Eşit sayıdaki markalar
// Türkçe alfabetik sırayla listelenir. Bu varsayılan sıralama kaldırılmamalıdır.
const { operators, loading, error, fetchOperators } = useOperators();

await fetchOperators();

const searchQuery = ref('');
const sortMode = ref<'count' | 'alpha'>('count');

const normText = (s: string) => {
  return (s || '')
    .toLocaleLowerCase('tr')
    .trim()
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c');
};

// TALEP-041: Varsayılan sıralama = istasyon sayısı (çoktan aza), eşitlikte Türkçe alfabetik
const sortedOperators = computed<OperatorItem[]>(() => {
  const list = [...(operators.value || [])];
  if (sortMode.value === 'alpha') {
    return list.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'tr'));
  }
  return list.sort((a, b) => {
    const countA = a.station_count ?? 0;
    const countB = b.station_count ?? 0;
    if (countB !== countA) return countB - countA;
    return (a.name || '').localeCompare(b.name || '', 'tr');
  });
});

const filteredOperators = computed<OperatorItem[]>(() => {
  const q = normText(searchQuery.value);
  if (!q) return sortedOperators.value;
  return sortedOperators.value.filter(
    op => normText(op.name).includes(q) || normText(op.slug).includes(q)
  );
});

const totalOperatorCount = computed(() => (operators.value || []).length);

const totalStationCount = computed(() =>
  (operators.value || []).reduce((acc, op) => acc + (op.station_count || 0), 0)
);

const formatCount = (n: number) => new Intl.NumberFormat('tr-TR').format(n || 0);

// SEO & Schema.org JSON-LD
useHead(() => {
  const title = 'Tüm Şarj Operatörleri ve Markaları | elektriklioto.com';
  const description = `Türkiye'deki EPDK siciline kayıtlı ${totalOperatorCount.value} şarj ağı operatörü, istasyon sayısına göre sıralanmış tam liste. ZES, Trugo, Eşarj ve diğer tüm markalar.`;

  return {
    title,
    meta: [
      { name: 'description', content: description },
      { property: 'og:title', content: title },
      { property: 'og:description', content: description },
      { property: 'og:type', content: 'website' }
    ],
    script: [
      {
        type: 'application/ld+json',
        innerHTML: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'ItemList',
          name: 'Türkiye Elektrikli Araç Şarj Ağı Operatörleri',
          numberOfItems: filteredOperators.value.length,
          itemListElement: filteredOperators.value.slice(0, 50).map((op, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            name: op.name,
            url: `https://elektriklioto.com/${op.slug}`
          }))
        })
      }
    ]
  };
});
</script>

<template>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-8">
    <!-- Breadcrumb -->
    <nav class="flex items-center gap-1.5 text-xs text-text-secondary" aria-label="Breadcrumb">
      <NuxtLink to="/" class="hover:text-primary touch-target-min flex items-center">Ana Sayfa</NuxtLink>
      <ChevronRight class="w-3.5 h-3.5 text-border-strong" />
      <span class="text-text-primary font-medium">Tüm Operatörler</span>
    </nav>

    <!-- Başlık ve Özet Alanı -->
    <header class="bg-bg-surface border border-border-default rounded-xl p-6 sm:p-8 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
      <div class="space-y-2">
        <h1 class="text-2xl sm:text-3xl font-bold text-text-primary tracking-tight">
          Tüm Şarj Operatörleri ve Markaları
        </h1>
        <p class="text-xs sm:text-sm text-text-secondary leading-relaxed max-w-2xl">
          EPDK siciline kayıtlı toplam
          <strong class="text-text-primary font-semibold">{{ formatCount(totalOperatorCount) }}</strong>
          şarj ağı operatörü ve
          <strong class="text-text-primary font-semibold">{{ formatCount(totalStationCount) }}</strong>
          istasyon listelenmektedir. Liste varsayılan olarak istasyon sayısına göre çoktan aza sıralanır.
        </p>
      </div>

      <NuxtLink
        to="/"
        class="h-11 px-5 rounded-md bg-primary text-on-primary font-semibold text-xs shadow-sm hover:bg-primary-hover active:bg-primary-active flex items-center justify-center gap-2 touch-target-min transition-all self-start md:self-auto flex-shrink-0 focus-visible:outline-none"
      >
        <Map class="w-4 h-4" />
        <span>Tüm Operatörleri Haritada Gör</span>
      </NuxtLink>
    </header>

    <!-- Arama ve Sıralama Kontrolleri -->
    <section class="flex flex-col sm:flex-row sm:items-center gap-3">
      <div class="relative flex items-center flex-1">
        <Search class="w-4 h-4 text-text-muted absolute left-3 pointer-events-none" />
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Operatör veya marka ara..."
          aria-label="Operatör ara"
          class="w-full h-12 text-sm pl-10 pr-4 rounded-md bg-bg-surface border border-border-strong text-text-primary focus:outline-none focus:border-primary placeholder:text-text-muted"
        />
      </div>

      <!-- TALEP-041: Varsayılan sıralama istasyon sayısıdır; alfabetik yalnızca opsiyoneldir -->
      <div class="flex items-center gap-2 flex-shrink-0" role="group" aria-label="Sıralama Seçimi">
        <button
          type="button"
          @click="sortMode = 'count'"
          :aria-pressed="sortMode === 'count'"
          class="touch-target-min h-12 px-4 rounded-md text-xs font-medium border flex items-center gap-2 transition-colors focus-visible:outline-none"
          :class="sortMode === 'count'
            ? 'bg-primary text-on-primary border-primary shadow-sm'
            : 'bg-bg-surface text-text-secondary border-border-default hover:bg-bg-subdued'"
        >
          <ArrowDownWideNarrow class="w-4 h-4" />
          <span>İstasyon Sayısı</span>
        </button>

        <button
          type="button"
          @click="sortMode = 'alpha'"
          :aria-pressed="sortMode === 'alpha'"
          class="touch-target-min h-12 px-4 rounded-md text-xs font-medium border flex items-center gap-2 transition-colors focus-visible:outline-none"
          :class="sortMode === 'alpha'
            ? 'bg-primary text-on-primary border-primary shadow-sm'
            : 'bg-bg-surface text-text-secondary border-border-default hover:bg-bg-subdued'"
        >
          <ArrowDownAZ class="w-4 h-4" />
          <span>Alfabetik</span>
        </button>
      </div>
    </section>

    <!-- Hata Durumu -->
    <div
      v-if="error"
      class="p-4 rounded-lg bg-danger-subdued border border-danger text-danger-on-subdued text-xs font-medium"
      role="alert"
    >
      Operatör listesi yüklenemedi. Gösterilen liste son bilinen kayıtlardan oluşabilir.
    </div>

    <!-- Operatör Kart Izgarası -->
    <section class="space-y-6">
      <div
        v-if="filteredOperators.length > 0"
        class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
      >
        <NuxtLink
          v-for="(op, index) in filteredOperators"
          :key="op.slug"
          :to="`/${op.slug}`"
          class="group bg-bg-surface border border-border-default rounded-xl p-4 shadow-sm hover:border-primary hover:shadow-md transition-all flex items-center gap-3 touch-target-min focus-visible:outline-none"
        >
          <!-- Sıra Numarası (istasyon sayısı sıralamasında görünür) -->
          <span
            v-if="sortMode === 'count' && !searchQuery"
            class="w-7 h-7 flex-shrink-0 rounded-full bg-bg-subdued text-text-secondary text-xs font-bold flex items-center justify-center tabular-nums"
            aria-hidden="true"
          >
            {{ index + 1 }}
          </span>

          <!-- Marka Amblemi -->
          <span
            class="w-10 h-10 flex-shrink-0 rounded-lg bg-primary text-on-primary flex items-center justify-center text-base font-bold"
          >
            {{ (op.name || '?').charAt(0).toLocaleUpperCase('tr') }}
          </span>

          <div class="min-w-0 flex-1">
            <p class="text-sm font-semibold text-text-primary truncate group-hover:text-primary">
              {{ op.name }}
            </p>
            <p class="text-xs text-text-secondary tabular-nums">
              {{ formatCount(op.station_count || 0) }} istasyon
            </p>
          </div>

          <ChevronRight class="w-4 h-4 text-text-muted flex-shrink-0 group-hover:text-primary" />
        </NuxtLink>
      </div>

      <!-- Yükleniyor Durumu -->
      <div
        v-else-if="loading"
        class="p-12 text-center bg-bg-surface border border-border-default rounded-xl text-sm text-text-secondary"
      >
        Operatör listesi yükleniyor...
      </div>

      <!-- Boş Durum -->
      <div
        v-else
        class="p-12 text-center bg-bg-surface border border-border-default rounded-xl shadow-sm space-y-3"
      >
        <Building2 class="w-10 h-10 text-text-muted mx-auto" />
        <p class="text-sm font-semibold text-text-primary">
          Aramanızla eşleşen operatör bulunamadı.
        </p>
        <p class="text-xs text-text-secondary">
          Farklı bir marka adı deneyin veya listenin tamamını görmek için aramayı temizleyin.
        </p>
      </div>
    </section>

    <!-- Zorunlu Yasal EMP Uyarısı -->
    <footer class="pt-8 border-t border-border-default text-center text-xs text-text-muted space-y-1">
      <p>Veri Kaynağı: EPDK Sicil Kaydı (Eylül 2026)</p>
      <p>
        elektriklioto.com lisanslı şarj operatörü değildir. Şarj başlatma ve faturalandırma ilgili operatörün sorumluluğundadır.
      </p>
    </footer>
  </div>
</template>
