
<script setup lang="ts">
import { ref, computed } from 'vue';
import {
  Sparkles,
  CheckCircle2,
  Bug,
  Zap,
  Search,
  X,
  ExternalLink,
  Tag,
  Clock
} from 'lucide-vue-next';

export interface ChangelogItem {
  id: string;
  title: string;
  category: 'feature' | 'bug' | 'ux' | 'data' | 'infra';
  categoryLabel: string;
  scope: string;
  description: string;
  status: 'COZULDU' | 'GELISTIRILIYOR' | 'PLANLANDI';
  githubIssueNumber?: number;
  date: string;
}

export interface ReleaseVersion {
  version: string;
  buildId: string;
  date: string;
  isLatest: boolean;
  summary: string;
  items: ChangelogItem[];
}

const props = withDefaults(
  defineProps<{
    initialCategory?: string;
    showSearch?: boolean;
  }>(),
  {
    initialCategory: 'all',
    showSearch: true
  }
);

const searchQuery = ref('');
const selectedCategory = ref(props.initialCategory);

const categories = [
  { key: 'all', label: 'Tümü' },
  { key: 'feature', label: 'Özellikler (İstek)' },
  { key: 'bug', label: 'Hata Düzeltmeleri' },
  { key: 'ux', label: 'UX & Arayüz' },
  { key: 'data', label: 'Veri & Altyapı' }
];

const releases: ReleaseVersion[] = [
  {
    version: 'v1.0.0-faz2',
    buildId: 'build 102',
    date: '18 Eylül 2026',
    isLatest: true,
    summary: 'Faz 2 Şeffaflık & Canlı Senkronizasyon: Sürüm notları ekranı, canlı deploy algılama ve 20s otomatik sayfa yenileme desteği.',
    items: [
      {
        id: 'TALEP-013',
        title: 'Değişiklik Günlüğü (Changelog / Sürüm Notları) ekranı ve modalı',
        category: 'feature',
        categoryLabel: 'Yeni Özellik',
        scope: '/guncellemeler & ChangelogModal.vue',
        description: "Uygulamada çözülen müşteri taleplerini (TALEP-001..TALEP-013), giderilen hataları, eklenen özellikleri ve SemVer sürüm etiketlerini zaman çizelgesi / kart yapısıyla sunan 'Sürüm Notları & Güncellemeler' ekranı ve modalı yayına alındı.",
        status: 'COZULDU',
        githubIssueNumber: 13,
        date: '2026-09-18'
      },
      {
        id: 'TALEP-012',
        title: 'Canlı sürüm güncelleme uyarısı ve 20 saniye otomatik yenileme',
        category: 'feature',
        categoryLabel: 'Yeni Özellik',
        scope: 'UpdateNotificationModal.vue & useVersionCheck.ts',
        description: 'Yeni deploy çıktığında tüm açık sayfalarda 20 saniyelik geri sayımla otomatik yenileme uyarısı gösterilmesi ve istemcinin güncel koda senkronize olması sağlandı.',
        status: 'COZULDU',
        githubIssueNumber: 12,
        date: '2026-09-18'
      }
    ]
  },
  {
    version: 'v0.9.5',
    buildId: 'build 101',
    date: '18 Eylül 2026',
    isLatest: false,
    summary: 'Veritabanı Entegrasyonu & Header Düzeltmesi: PostgreSQL + PostGIS canlı arama entegrasyonu ve mükerrer menü temizliği.',
    items: [
      {
        id: 'TALEP-010',
        title: 'Aramalar ve istasyon kayıtlarının veritabanı senkronizasyonu',
        category: 'data',
        categoryLabel: 'Veri & Altyapı',
        scope: 'Fastify Backend & PostGIS',
        description: 'Arama ve istasyon verilerinin doğrudan PostgreSQL + PostGIS veritabanından dinamik ve coğrafi BBox sorgusuyla çekilmesi sağlandı.',
        status: 'COZULDU',
        githubIssueNumber: 10,
        date: '2026-09-18'
      },
      {
        id: 'TALEP-011',
        title: 'Top menüdeki mükerrer Hakkında bağlantısının kaldırılması',
        category: 'ux',
        categoryLabel: 'UX İyileştirme',
        scope: 'components/common/HeaderNav.vue',
        description: 'Masaüstü üst barında mükerrer duran bağlantı kaldırıldı, sağ üstteki onaylı Hakkında modal butonu korundu.',
        status: 'COZULDU',
        githubIssueNumber: 11,
        date: '2026-09-18'
      }
    ]
  },
  {
    version: 'v0.9.0',
    buildId: 'build 98',
    date: '17 Eylül 2026',
    isLatest: false,
    summary: 'Yasal EMP Statüsü & Katman Çakışması İyileştirmesi: 5 sekmeli Hakkında paneli, KVKK politikası ve MapLibre z-index optimizasyonu.',
    items: [
      {
        id: 'TALEP-009',
        title: 'Hakkında, Kullanıcı Sözleşmeleri, KVKK ve Canlı Sürüm Paneli',
        category: 'feature',
        categoryLabel: 'Yeni Özellik',
        scope: 'AboutModal.vue & /hakkimizda',
        description: 'Yasal EMP lisans bildirimleri, KVKK gizlilik politikası, veri tazelik beyanları ve canlı sürüm bilgilerini içeren modal ve sayfa yayınlandı.',
        status: 'COZULDU',
        githubIssueNumber: 9,
        date: '2026-09-17'
      },
      {
        id: 'TALEP-008',
        title: 'Harita pinleri ve küme baloncuklarının modal üzerine taşma sorunu (z-index)',
        category: 'bug',
        categoryLabel: 'Hata Düzeltme',
        scope: 'StationMap.vue & assets/css/main.css',
        description: 'MapLibre DOM pinlerinin ve kümeleme baloncuklarının açılır modalların üzerine taşması z-index hiyerarşisiyle kalıcı olarak çözüldü.',
        status: 'COZULDU',
        githubIssueNumber: 8,
        date: '2026-09-17'
      },
      {
        id: 'TALEP-007',
        title: 'Tüm Operatörler açılır listesinde menü taşması ve istenmeyen scrollbar',
        category: 'ux',
        categoryLabel: 'UX İyileştirme',
        scope: 'components/map/FilterChips.vue',
        description: 'Operatör seçim dropdown açılır listesinde oluşan istenmeyen scroll çubuğu ve menü taşması giderildi.',
        status: 'COZULDU',
        githubIssueNumber: 7,
        date: '2026-09-17'
      }
    ]
  },
  {
    version: 'v0.8.0',
    buildId: 'build 90',
    date: '17 Eylül 2026',
    isLatest: false,
    summary: 'Gelişmiş Arama & GADM 4.1 Entegrasyonu: İl ve ilçe bazlı otomatik tamamlama, coğrafi sınır odaklanması ve mavi nokta konum göstergesi.',
    items: [
      {
        id: 'TALEP-004',
        title: 'Arama kutusunda ilçe, il ve istasyon aramasıyla harita odaklanması',
        category: 'feature',
        categoryLabel: 'Yeni Özellik',
        scope: 'components/map/SearchInput.vue',
        description: 'Kadıköy, Çankaya, Bodrum gibi ilçeler ile 81 il ve istasyon adlarıyla anlık arama ve harita bbox odaklanması sağlandı.',
        status: 'COZULDU',
        githubIssueNumber: 4,
        date: '2026-09-17'
      },
      {
        id: 'TALEP-005',
        title: 'GADM 4.1 Türkiye resmi il ve ilçe sınır/merkez koordinatları',
        category: 'data',
        categoryLabel: 'Veri & Altyapı',
        scope: 'Backend Search & CBS Modülü',
        description: "Türkiye'nin 81 il ve 973 ilçesinin resmi coğrafi sınır ve merkez koordinatları veritabanı ve arama servisine entegre edildi.",
        status: 'COZULDU',
        githubIssueNumber: 5,
        date: '2026-09-17'
      },
      {
        id: 'TALEP-006',
        title: 'Kullanıcı anlık konumunu gösteren mavi nokta baloncuk göstergesi',
        category: 'ux',
        categoryLabel: 'UX İyileştirme',
        scope: 'components/map/VectorMap.vue & useUserLocation.ts',
        description: 'Konum izni verildiğinde haritada kullanıcının gerçek GPS noktasını gösteren mavi dalgalanan konum halkası eklendi.',
        status: 'COZULDU',
        githubIssueNumber: 6,
        date: '2026-09-17'
      }
    ]
  },
  {
    version: 'v0.7.0',
    buildId: 'build 82',
    date: '17 Eylül 2026',
    isLatest: false,
    summary: 'İlk Canlı Sürüm & Operatör Senkronizasyonu: Harita filtre senkronizasyonu, Google Analytics ve CPO soket düzeltmeleri.',
    items: [
      {
        id: 'TALEP-001',
        title: 'Harita filtre butonları ile alt liste senkronizasyonu',
        category: 'bug',
        categoryLabel: 'Hata Düzeltme',
        scope: 'components/map/FilterChips.vue',
        description: 'Filtrelerde AC/DC seçildiğinde haritadaki pinlerle birlikte liste görünümünün de senkronize güncellenmesi sağlandı.',
        status: 'COZULDU',
        githubIssueNumber: 1,
        date: '2026-09-17'
      },
      {
        id: 'TALEP-002',
        title: 'Google Analytics (G-BKMTW8EH4K) canlı izleme entegrasyonu',
        category: 'infra',
        categoryLabel: 'Altyapı & Analitik',
        scope: 'components/common/GoogleAnalytics.vue',
        description: 'Site sahibi için Google Analytics 4 takip kodu güvenli ve çerez uyumlu olarak yerleştirildi.',
        status: 'COZULDU',
        githubIssueNumber: 2,
        date: '2026-09-17'
      },
      {
        id: 'TALEP-003',
        title: 'Voltrun istasyonlarında soket tipi ve güç düzeltmesi',
        category: 'bug',
        categoryLabel: 'Hata Düzeltme',
        scope: 'Backend Aggregator & EPDK Seed',
        description: 'Voltrun istasyonlarında yanlış görünen soket tipi verisi doğru AC Type 2 standardına çekildi.',
        status: 'COZULDU',
        githubIssueNumber: 3,
        date: '2026-09-17'
      }
    ]
  }
];

const filteredReleases = computed(() => {
  const query = searchQuery.value.trim().toLowerCase();
  const category = selectedCategory.value;

  return releases
    .map((rel) => {
      const matchingItems = rel.items.filter((item) => {
        if (category !== 'all') {
          if (category === 'data' && (item.category === 'data' || item.category === 'infra')) {
            // veri ve altyapı
          } else if (item.category !== category) {
            return false;
          }
        }

        if (query) {
          const matchId = item.id.toLowerCase().includes(query);
          const matchTitle = item.title.toLowerCase().includes(query);
          const matchDesc = item.description.toLowerCase().includes(query);
          const matchScope = item.scope.toLowerCase().includes(query);
          const matchVersion = rel.version.toLowerCase().includes(query);
          return matchId || matchTitle || matchDesc || matchScope || matchVersion;
        }

        return true;
      });

      return {
        ...rel,
        items: matchingItems
      };
    })
    .filter((rel) => rel.items.length > 0);
});

const totalResolvedCount = computed(() => {
  return releases.reduce((sum, r) => sum + r.items.length, 0);
});

const getCategoryBadgeClass = (category: string) => {
  switch (category) {
    case 'feature':
      return 'bg-primary/10 text-primary border-primary/20';
    case 'bug':
      return 'bg-danger-subdued text-danger-on-subdued border-danger/20';
    case 'ux':
      return 'bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300 border-purple-200 dark:border-purple-800';
    case 'data':
    case 'infra':
    default:
      return 'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200 dark:border-blue-800';
  }
};
</script>

<template>
  <div class="space-y-6" data-testid="changelog-timeline-container">
    <!-- İstatistik ve Özet Çubuğu -->
    <div
      class="p-4 rounded-xl bg-bg-surface border border-border-default shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4"
    >
      <div class="flex items-center gap-3">
        <div
          class="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0"
        >
          <Sparkles class="w-5 h-5" />
        </div>
        <div>
          <h2 class="text-sm sm:text-base font-bold text-text-primary leading-tight">
            Geliştirme & Müşteri Talep Havuzu
          </h2>
          <p class="text-xs text-text-secondary mt-0.5">
            Canlı sisteme yansıtılan tüm hata çözümleri ve özellik eklemeleri
          </p>
        </div>
      </div>

      <div class="flex items-center gap-2 text-xs">
        <span
          class="px-2.5 py-1 rounded-md bg-success-subdued text-success font-semibold border border-success/20 flex items-center gap-1.5"
        >
          <CheckCircle2 class="w-3.5 h-3.5" />
          <span>{{ totalResolvedCount }} Talep Çözüldü</span>
        </span>
        <span
          class="px-2.5 py-1 rounded-md bg-bg-subdued text-text-secondary font-mono border border-border-default"
        >
          {{ releases.length }} Sürüm
        </span>
      </div>
    </div>

    <!-- Arama ve Kategori Filtreleri -->
    <div class="space-y-3">
      <div v-if="showSearch" class="relative">
        <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-text-secondary">
          <Search class="w-4 h-4" />
        </div>
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Talep veya güncelleme ara (örn: TALEP-002, harita, analytics, pin)..."
          class="w-full pl-10 pr-10 py-2.5 bg-bg-surface border border-border-default rounded-lg text-sm text-text-primary placeholder:text-text-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus-ring touch-target-min transition-colors"
          data-testid="changelog-search-input"
        />
        <button
          v-if="searchQuery"
          type="button"
          @click="searchQuery = ''"
          class="absolute inset-y-0 right-0 pr-3 flex items-center text-text-secondary hover:text-text-primary touch-target-min"
          aria-label="Aramayı Temizle"
        >
          <X class="w-4 h-4" />
        </button>
      </div>

      <!-- Kategori Hapları -->
      <div class="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
        <button
          v-for="cat in categories"
          :key="cat.key"
          type="button"
          @click="selectedCategory = cat.key"
          class="touch-target-min px-3 py-1.5 rounded-full border text-xs font-medium transition-all cursor-pointer whitespace-nowrap focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus-ring"
          :class="[
            selectedCategory === cat.key
              ? 'bg-primary text-on-primary border-primary shadow-sm'
              : 'bg-bg-surface text-text-secondary border-border-default hover:bg-bg-subdued hover:text-text-primary'
          ]"
          :aria-pressed="selectedCategory === cat.key"
        >
          {{ cat.label }}
        </button>
      </div>
    </div>

    <!-- Sürüm Listesi & Zaman Çizelgesi -->
    <div v-if="filteredReleases.length > 0" class="space-y-8 relative before:absolute before:inset-0 before:left-3.5 sm:before:left-4 before:w-0.5 before:bg-border-default">
      <div
        v-for="release in filteredReleases"
        :key="release.version"
        class="relative pl-8 sm:pl-10 space-y-3"
        data-testid="release-version-card"
      >
        <!-- Zaman Çizelgesi Noktası -->
        <div
          class="absolute left-1.5 sm:left-2 top-1.5 w-4 h-4 rounded-full border-2 bg-bg-surface flex items-center justify-center -translate-x-1/2"
          :class="release.isLatest ? 'border-primary shadow-sm shadow-primary/30' : 'border-border-strong'"
        >
          <div
            class="w-1.5 h-1.5 rounded-full"
            :class="release.isLatest ? 'bg-primary animate-pulse' : 'bg-text-secondary'"
          ></div>
        </div>

        <!-- Sürüm Başlık Kartı -->
        <div
          class="p-4 rounded-xl border bg-bg-surface transition-all"
          :class="release.isLatest ? 'border-primary/40 shadow-sm' : 'border-border-default'"
        >
          <div class="flex flex-wrap items-center justify-between gap-2 border-b border-border-default pb-3">
            <div class="flex items-center gap-2.5">
              <span class="font-mono text-base sm:text-lg font-bold text-text-primary tracking-tight">
                {{ release.version }}
              </span>
              <span
                v-if="release.isLatest"
                class="px-2 py-0.5 rounded-full text-[11px] font-bold bg-primary text-on-primary tracking-wide shadow-sm"
              >
                GÜNCEL SÜRÜM
              </span>
              <span class="px-2 py-0.5 rounded-md text-[11px] font-mono text-text-secondary bg-bg-subdued border border-border-default">
                {{ release.buildId }}
              </span>
            </div>

            <div class="flex items-center gap-1 text-xs text-text-secondary font-medium">
              <Clock class="w-3.5 h-3.5" />
              <span class="tabular-nums">{{ release.date }}</span>
            </div>
          </div>

          <p class="text-xs text-text-secondary mt-2.5 leading-relaxed">
            {{ release.summary }}
          </p>

          <!-- Sürüm İçindeki Maddeler / Kartlar -->
          <div class="mt-4 space-y-2.5">
            <div
              v-for="item in release.items"
              :key="item.id"
              class="p-3 sm:p-3.5 rounded-lg border border-border-default bg-bg-subdued/60 hover:bg-bg-subdued transition-colors space-y-2"
              data-testid="changelog-item"
            >
              <div class="flex flex-wrap items-center justify-between gap-2">
                <div class="flex items-center gap-2 flex-wrap">
                  <!-- Talep ID Rozeti -->
                  <span
                    class="font-mono text-xs font-bold px-2 py-0.5 rounded bg-bg-surface border border-border-strong text-primary"
                  >
                    {{ item.id }}
                  </span>

                  <!-- Kategori Rozeti -->
                  <span
                    class="text-[11px] font-semibold px-2 py-0.5 rounded border"
                    :class="getCategoryBadgeClass(item.category)"
                  >
                    {{ item.categoryLabel }}
                  </span>

                  <!-- Kapsam Rozeti -->
                  <span class="text-[11px] font-mono text-text-muted bg-bg-surface px-1.5 py-0.5 rounded border border-border-default">
                    {{ item.scope }}
                  </span>
                </div>

                <!-- Durum Rozeti -->
                <span
                  class="text-[11px] font-medium text-success flex items-center gap-1"
                >
                  <CheckCircle2 class="w-3.5 h-3.5" />
                  <span>Çözüldü</span>
                </span>
              </div>

              <!-- Başlık -->
              <h4 class="text-xs sm:text-sm font-semibold text-text-primary leading-snug">
                {{ item.title }}
              </h4>

              <!-- Açıklama -->
              <p class="text-xs text-text-secondary leading-relaxed">
                {{ item.description }}
              </p>

              <!-- Alt Çubuk: GitHub Issue & Tarih -->
              <div class="pt-1 flex items-center justify-between text-[11px] text-text-muted">
                <span class="flex items-center gap-1">
                  <Tag class="w-3 h-3" />
                  <span>Müşteri Kabul Testinden Geçti</span>
                </span>
                <span v-if="item.githubIssueNumber" class="text-primary hover:underline font-mono">
                  #{{ item.githubIssueNumber }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Boş Durum (Sonuç Bulunamadı) -->
    <div
      v-else
      class="p-8 rounded-xl border border-border-default bg-bg-surface text-center space-y-3"
      data-testid="changelog-empty-state"
    >
      <div class="w-12 h-12 rounded-full bg-bg-subdued text-text-secondary flex items-center justify-center mx-auto">
        <Search class="w-6 h-6" />
      </div>
      <h3 class="text-sm font-bold text-text-primary">
        Arama Kriterine Uygun Güncelleme Bulunamadı
      </h3>
      <p class="text-xs text-text-secondary max-w-sm mx-auto">
        "{{ searchQuery }}" aramasıyla eşleşen bir değişiklik kaydı bulunamadı. Lütfen farklı bir anahtar kelime deneyin veya filtreleri temizleyin.
      </p>
      <button
        type="button"
        @click="searchQuery = ''; selectedCategory = 'all'"
        class="touch-target-min px-4 py-1.5 rounded-md bg-bg-subdued border border-border-strong text-xs font-semibold text-text-primary hover:bg-border-default transition-colors"
      >
        Filtreleri Sıfırla
      </button>
    </div>
  </div>
</template>
