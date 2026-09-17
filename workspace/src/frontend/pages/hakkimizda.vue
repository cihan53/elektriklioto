
<script setup lang="ts">
import {
  Shield,
  MapPin,
  Database,
  Zap,
  Cpu,
  FileText,
  Lock,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Map,
  Server,
  Info,
  ChevronRight,
  Layers,
  Sparkles,
  Smartphone
} from 'lucide-vue-next';

useHead({
  title: 'Hakkımızda & Yasal Bildirimler | elektriklioto.com',
  meta: [
    {
      name: 'description',
      content: 'elektriklioto.com bağımsız e-Mobilite Asistanı ve Bilgi Hub\'ıdır. Lisans sınırı, Kullanım Koşulları, KVKK/Gizlilik, EPDK veri kaynakları ve canlı sürüm bilgileri.'
    },
    { property: 'og:title', content: 'Hakkımızda & Yasal Bildirimler | elektriklioto.com' },
    {
      property: 'og:description',
      content: '16.788 şarj istasyonu ve 179 lisanslı operatör tek haritada. Bağımsız e-Mobilite Asistanı yasal statü ve sistem bilgileri.'
    },
    { property: 'og:type', content: 'website' },
    { property: 'og:url', content: 'https://elektriklioto.com/hakkimizda' }
  ],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'AboutPage',
        name: 'elektriklioto.com Hakkında ve Yasal Bildirimler',
        url: 'https://elektriklioto.com/hakkimizda',
        description: 'elektriklioto.com bağımsız e-Mobilite Hizmet Sağlayıcısı (EMP) ve Bilgi Hub\'ı misyonu, kullanım koşulları, KVKK gizlilik politikası ve canlı sürüm bilgileri.'
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
      <span class="text-text-primary font-medium">Hakkımızda & Yasal Bildirimler</span>
    </nav>

    <!-- Üst Başlık & Misyon Hero Bloğu -->
    <header class="bg-bg-surface border border-border-default rounded-xl p-6 sm:p-8 shadow-sm space-y-4">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div class="space-y-2">
          <div class="flex items-center gap-2 text-primary">
            <Zap class="w-6 h-6 fill-current" />
            <span class="text-xs font-semibold uppercase tracking-wider">Hakkımızda & Yasal Statü</span>
          </div>
          <h1 class="text-2xl sm:text-3xl font-bold text-text-primary tracking-tight">
            elektriklioto.com e-Mobilite Asistanı
          </h1>
          <p class="text-xs sm:text-sm text-text-secondary leading-relaxed max-w-2xl">
            Türkiye genelinde faaliyet gösteren 179 lisanslı şarj ağı operatörünü (CPO) tek harita üzerinde birleştiren, sürücüleri 30-35 farklı mobil uygulama yükleme derdinden kurtaran bağımsız bir e-Mobilite Hizmet Sağlayıcısı (EMP) ve Bilgi Hub'ıdır.
          </p>
        </div>

        <NuxtLink
          to="/"
          class="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-on-primary hover:bg-primary-hover active:bg-primary-active font-semibold text-xs shadow-sm transition-all touch-target-min flex-shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          <Map class="w-4 h-4" />
          <span>Haritayı Aç ve Keşfet</span>
        </NuxtLink>
      </div>

      <!-- Hızlı Bölüm Gezinme Çubuğu (TALEP-009) -->
      <div class="pt-4 border-t border-border-default flex flex-wrap items-center gap-2 text-xs">
        <span class="text-text-muted font-medium text-[11px] mr-1 hidden sm:inline">Hızlı Gezinme:</span>
        <a
          href="#misyon"
          class="px-2.5 py-1 rounded-md bg-bg-subdued hover:bg-border-default text-text-secondary hover:text-text-primary transition-colors touch-target-min flex items-center"
        >
          Misyon
        </a>
        <a
          href="#yasal-statu"
          class="px-2.5 py-1 rounded-md bg-bg-subdued hover:bg-border-default text-text-secondary hover:text-text-primary transition-colors touch-target-min flex items-center"
        >
          Yasal Statü
        </a>
        <a
          href="#kvkk"
          class="px-2.5 py-1 rounded-md bg-bg-subdued hover:bg-border-default text-text-secondary hover:text-text-primary transition-colors touch-target-min flex items-center"
        >
          KVKK & Gizlilik
        </a>
        <a
          href="#kaynaklar"
          class="px-2.5 py-1 rounded-md bg-bg-subdued hover:bg-border-default text-text-secondary hover:text-text-primary transition-colors touch-target-min flex items-center"
        >
          Veri Kaynakları
        </a>
        <a
          href="#sozlesmeler"
          class="px-2.5 py-1 rounded-md bg-bg-subdued hover:bg-border-default text-text-secondary hover:text-text-primary transition-colors touch-target-min flex items-center"
        >
          Kullanım Koşulları
        </a>
        <a
          href="#surum"
          class="px-2.5 py-1 rounded-md bg-bg-subdued hover:bg-border-default text-text-secondary hover:text-text-primary transition-colors touch-target-min flex items-center"
        >
          Canlı Sürüm
        </a>
      </div>
    </header>

    <!-- Temel İlkeler ve Yasal Taahhütler (3 Kolon) -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <!-- 1. Lisans Sınırı & Zorunlu EMP Beyanı -->
      <section
        id="yasal-statu"
        class="bg-bg-surface border border-border-default rounded-xl p-6 shadow-sm space-y-3 flex flex-col justify-between"
      >
        <div class="space-y-3">
          <div class="w-10 h-10 rounded-lg bg-warning-subdued text-warning flex items-center justify-center">
            <Shield class="w-5 h-5" />
          </div>
          <h2 class="text-base font-bold text-text-primary">Lisans Sınırı & Yasal Statü</h2>
          <p class="text-xs text-text-secondary leading-relaxed">
            Platform hiçbir aşamada lisanslı şarj operatörü değildir. EPDK lisansına tabi elektrik enerjisi satışı veya faturalama yapmaz. Yasal olarak e-Mobilite Hizmet Sağlayıcısı (EMP) adayı ve bağımsız bilgi platformudur.
          </p>
        </div>
        <div class="pt-2 border-t border-border-default text-[11px] text-text-muted">
          Şarj işlemi ilgili lisanslı operatörün uygulamasında tamamlanır.
        </div>
      </section>

      <!-- 2. Sıfır Konum Saklama & KVKK -->
      <section
        id="kvkk"
        class="bg-bg-surface border border-border-default rounded-xl p-6 shadow-sm space-y-3 flex flex-col justify-between"
      >
        <div class="space-y-3">
          <div class="w-10 h-10 rounded-lg bg-success-subdued text-success flex items-center justify-center">
            <MapPin class="w-5 h-5" />
          </div>
          <h2 class="text-base font-bold text-text-primary">Sıfır Konum Saklama & KVKK</h2>
          <p class="text-xs text-text-secondary leading-relaxed">
            Kullanıcıların GPS koordinatları sunucuda kesinlikle saklanmaz ve kaydedilmez. Konum izni yalnızca istemci belleğinde (in-memory) anlık harita merkezleme amacıyla geçici olarak işlenir; geçmiş seyahat kaydı tutulamaz.
          </p>
        </div>
        <div class="pt-2 border-t border-border-default text-[11px] text-text-muted">
          Arıza ihbarlarında 50m Proximity Proof (HMAC-SHA256) kullanılır.
        </div>
      </section>

      <!-- 3. EPDK Sicil Verisi -->
      <section
        id="kaynaklar"
        class="bg-bg-surface border border-border-default rounded-xl p-6 shadow-sm space-y-3 flex flex-col justify-between"
      >
        <div class="space-y-3">
          <div class="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <Database class="w-5 h-5" />
          </div>
          <h2 class="text-base font-bold text-text-primary">EPDK Sicil Verisi</h2>
          <p class="text-xs text-text-secondary leading-relaxed">
            Platformdaki 16.788 şarj istasyonu resmî EPDK Şarj İstasyonları Sicili'nden tohumlanmıştır. Resmî istasyon sicil numaraları (<code class="font-mono text-primary font-semibold">ŞRJ/xxxx</code>) kanonik kimlik çapasıdır.
          </p>
        </div>
        <div class="pt-2 border-t border-border-default text-[11px] text-text-muted">
          Kanonik Tohum Referansı: Eylül 2026
        </div>
      </section>
    </div>

    <!-- Misyon & Çözülen Problem Detayı (TALEP-009) -->
    <section id="misyon" class="bg-bg-surface border border-border-default rounded-xl p-6 sm:p-8 shadow-sm space-y-4">
      <div class="flex items-center gap-2 text-text-primary font-bold text-lg border-b border-border-default pb-3">
        <Zap class="w-5 h-5 text-primary" />
        <h2>Misyonumuz ve Çözülen Problem</h2>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-text-secondary leading-relaxed">
        <div class="space-y-2">
          <h3 class="font-semibold text-text-primary text-sm">Uygulama Çöplüğüne Son</h3>
          <p>
            Elektrikli araç sahipleri yola çıktıklarında ZES, Trugo, Eşarj, Voltrun ve onlarca farklı şarj ağı operatörü için onlarca ayrı uygulama yüklemek, her birinde ayrı hesap açmak ve rota boyunca hangi istasyonun nerede olduğunu aramak zorunda kalmaktadır. elektriklioto.com tüm ağları tek haritada toplayarak bu bilişsel yükü ortadan kaldırır.
          </p>
        </div>

        <div class="space-y-2">
          <h3 class="font-semibold text-text-primary text-sm">Akıllı Derin Bağlantı (Deep-Linking)</h3>
          <p>
            Platform üzerinden seçtiğiniz istasyonda şarj başlatmak istediğinizde, sistem operatörün kendi mobil uygulamasına doğrudan hedef istasyon koduyla atlar. Uygulama yüklü değilse veya harici parametre desteklenmiyorsa istasyon kodunu panoya kopyalayarak (Clipboard Fallback) kesintisiz bir deneyim sunar.
          </p>
        </div>
      </div>
    </section>

    <!-- Kullanım Koşulları & Sözleşme Detayları (TALEP-009) -->
    <section id="sozlesmeler" class="bg-bg-surface border border-border-default rounded-xl p-6 sm:p-8 shadow-sm space-y-4">
      <div class="flex items-center gap-2 text-text-primary font-bold text-lg border-b border-border-default pb-3">
        <FileText class="w-5 h-5 text-primary" />
        <h2>Kullanım Koşulları ve Hizmet Sözleşmesi</h2>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-text-secondary leading-relaxed">
        <div class="space-y-2">
          <h3 class="font-semibold text-text-primary text-sm">1. Hizmetin Niteliği ve Kapsamı</h3>
          <p>
            elektriklioto.com, elektrikli araç sürücülerine istasyon arama, güzergah üzerindeki soketleri filtreleme, CPO uygulamalarına operasyonel derin bağlantı (Deep-Linking & Clipboard Fallback) ile erişim ve kitle-kaynaklı arıza durumu inceleme hizmeti sunar. Platform doğrudan enerji satışı veya ödeme tahsilatı yapmaz.
          </p>
        </div>

        <div class="space-y-2">
          <h3 class="font-semibold text-text-primary text-sm">2. Operatör Sorumluluk Sınırı</h3>
          <p>
            Şarj istasyonlarının operasyonel sürekliliği, elektrik şebekesi güvenliği, soketlerin çalışır durumda olması, kablo mandalı kilitlenmesi ve tarife ücretlendirmesi tamamen lisans sahibi şarj ağı işletmecisinin (CPO) yasal sorumluluğundadır.
          </p>
        </div>

        <div class="space-y-2">
          <h3 class="font-semibold text-text-primary text-sm">3. Topluluk Katkısı ve Bildirim Kuralları</h3>
          <p>
            Kullanıcılar istasyon arıza ihbarı ve eksik soket/güç verisi eklerken dürüst ve doğru bilgi vermekle yükümlüdür. Kötü niyetli veya sahte arıza bildirimlerini engellemek için mesafe doğrulama (&lt; 50m) ve IP tabanlı hız sınırlama algoritmaları işletilir.
          </p>
        </div>

        <div class="space-y-2">
          <h3 class="font-semibold text-text-primary text-sm">4. Fikri Mülkiyet ve Ticari Markalar</h3>
          <p>
            Sitede yer alan CPO logoları, operatör unvanları ve tescilli markalar ilgili hak sahiplerine aittir; platformda yalnızca sürücülere bilgi verme ve ilgili operatörün hizmetine yönlendirme amacıyla atıf yapılmaktadır.
          </p>
        </div>
      </div>
    </section>

    <!-- Canlı Sürüm & Sistem Bilgileri (TALEP-009) -->
    <section id="surum" class="bg-bg-surface border border-border-default rounded-xl p-6 sm:p-8 shadow-sm space-y-4">
      <div class="flex items-center gap-2 text-text-primary font-bold text-lg border-b border-border-default pb-3">
        <Server class="w-5 h-5 text-primary" />
        <h2>Canlı Sürüm ve Sistem Mimarisi</h2>
      </div>

      <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div class="p-3.5 rounded-lg bg-bg-subdued border border-border-default">
          <span class="text-[11px] text-text-muted block">Platform Sürümü:</span>
          <span class="font-bold text-sm text-text-primary font-mono">v1.0.0-faz1</span>
        </div>

        <div class="p-3.5 rounded-lg bg-bg-subdued border border-border-default">
          <span class="text-[11px] text-text-muted block">Build / Dağıtım:</span>
          <span class="font-bold text-sm text-text-primary font-mono">build 102 (2026-09-17)</span>
        </div>

        <div class="p-3.5 rounded-lg bg-bg-subdued border border-border-default">
          <span class="text-[11px] text-text-muted block">Çalışma Modu:</span>
          <span class="font-semibold text-xs text-success flex items-center gap-1.5 mt-0.5">
            <span class="w-2 h-2 rounded-full bg-success animate-pulse"></span>
            <span>Canlı / Production</span>
          </span>
        </div>

        <div class="p-3.5 rounded-lg bg-bg-subdued border border-border-default">
          <span class="text-[11px] text-text-muted block">Erişilebilirlik:</span>
          <span class="font-bold text-xs text-primary flex items-center gap-1 mt-0.5">
            <CheckCircle2 class="w-3.5 h-3.5 text-success" />
            <span>WCAG 2.1 AA</span>
          </span>
        </div>
      </div>

      <div class="pt-2 text-xs text-text-secondary leading-relaxed space-y-1">
        <p>
          <strong class="text-text-primary">Teknoloji Yığını:</strong> Nuxt 3.15 (SSR/SSG), Vue 3 Composition API, Fastify Node.js 22 REST API, PostgreSQL 16 + PostGIS 3.4 Mekânsal CBS Motoru.
        </p>
        <p>
          <strong class="text-text-primary">Kanonik Alan Adı:</strong> <span class="font-mono text-primary">elektriklioto.com</span> (API: <span class="font-mono text-primary">api.elektriklioto.com</span>)
        </p>
      </div>
    </section>

    <!-- Dipnot ve Yasal Uyarı -->
    <footer class="pt-6 border-t border-border-default text-center text-xs text-text-muted space-y-1.5">
      <p class="font-medium text-text-secondary">Veri Kaynağı: EPDK Sicil Kaydı (Eylül 2026)</p>
      <p class="leading-relaxed max-w-xl mx-auto">
        elektriklioto.com lisanslı şarj operatörü değildir. Şarj başlatma, enerji ikmali ve faturalandırma ilgili operatörün sorumluluğundadır.
      </p>
    </footer>
  </div>
</template>
