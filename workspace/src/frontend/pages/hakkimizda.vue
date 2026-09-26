
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
      content: 'elektriklioto.com e-Mobilite Asistanı yasal statüsü, EPDK lisans sınırları, KVKK konum gizliliği taahhüdü ve açık veri politikaları.'
    },
    { property: 'og:title', content: 'Hakkımızda & Yasal Bildirimler | elektriklioto.com' },
    {
      property: 'og:description',
      content: 'Bağımsız e-Mobilite Asistanı ve Bilgi Hub’ı: EPDK lisans sınırları, KVKK sıfır konum saklama ilkesi ve kullanım şartları.'
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
        name: 'elektriklioto.com Hakkımızda ve Yasal Bildirimler',
        url: 'https://elektriklioto.com/hakkimizda',
        description: 'elektriklioto.com bağımsız bir e-Mobilite Hizmet Sağlayıcısı (EMP) ve EV sürücü bilgi asistanıdır.'
      })
    }
  ]
});
</script>

<template>
  <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-10">
    <!-- Breadcrumb İçerik Haritası -->
    <nav class="flex items-center gap-1.5 text-xs text-text-secondary" aria-label="Breadcrumb">
      <NuxtLink to="/" class="hover:text-primary touch-target-min flex items-center transition-colors">
        Ana Sayfa
      </NuxtLink>
      <ChevronRight class="w-3.5 h-3.5 text-border-strong" />
      <span class="text-text-primary font-medium">Hakkımızda & Yasal Bildirimler</span>
    </nav>

    <!-- Başlık & Hero Bloğu -->
    <div class="space-y-4 border-b border-border-default pb-8">
      <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">
        <Info class="w-3.5 h-3.5" />
        <span>Kurumsal & Yasal Çerçeve</span>
      </div>
      <h1 class="text-2xl sm:text-3xl lg:text-4xl font-bold text-text-primary tracking-tight">
        Hakkımızda ve Yasal Bildirimler
      </h1>
      <p class="text-sm sm:text-base text-text-secondary leading-relaxed max-w-3xl">
        elektriklioto.com, elektrikli araç (EV) kullanıcılarının Türkiye'deki tüm şarj ağlarını tek bir ekranda, güvenilir, şeffaf ve bağımsız bir şekilde görmesini sağlayan bir <strong>e-Mobilite Asistanı ve Bilgi Hub'ıdır</strong>.
      </p>
    </div>

    <!-- Hızlı Gezinme Kartları -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      <a
        href="#yasal-statu"
        class="p-4 rounded-xl border border-border-default bg-bg-surface hover:border-primary/50 hover:bg-bg-subdued/50 transition-all space-y-2 group"
      >
        <div class="w-8 h-8 rounded-lg bg-warning/10 text-warning flex items-center justify-center group-hover:scale-105 transition-transform">
          <AlertCircle class="w-4 h-4" />
        </div>
        <h3 class="font-bold text-xs text-text-primary group-hover:text-primary transition-colors">Yasal Statü & Lisans</h3>
        <p class="text-[11px] text-text-secondary leading-normal">EPDK lisans kısıtları ve bağımsız asistanlık beyanı.</p>
      </a>

      <a
        href="#kvkk"
        class="p-4 rounded-xl border border-border-default bg-bg-surface hover:border-primary/50 hover:bg-bg-subdued/50 transition-all space-y-2 group"
      >
        <div class="w-8 h-8 rounded-lg bg-success/10 text-success flex items-center justify-center group-hover:scale-105 transition-transform">
          <Shield class="w-4 h-4" />
        </div>
        <h3 class="font-bold text-xs text-text-primary group-hover:text-primary transition-colors">KVKK & Konum Gizliliği</h3>
        <p class="text-[11px] text-text-secondary leading-normal">Sıfır konum saklama taahhüdü ve veri koruma.</p>
      </a>

      <a
        href="#veri-kaynaklari"
        class="p-4 rounded-xl border border-border-default bg-bg-surface hover:border-primary/50 hover:bg-bg-subdued/50 transition-all space-y-2 group"
      >
        <div class="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center group-hover:scale-105 transition-transform">
          <Database class="w-4 h-4" />
        </div>
        <h3 class="font-bold text-xs text-text-primary group-hover:text-primary transition-colors">Veri Kaynakları</h3>
        <p class="text-[11px] text-text-secondary leading-normal">16.788 EPDK sicil kaydı ve kitle kaynaklı güncellemeler.</p>
      </a>

      <a
        href="#surum"
        class="p-4 rounded-xl border border-border-default bg-bg-surface hover:border-primary/50 hover:bg-bg-subdued/50 transition-all space-y-2 group"
      >
        <div class="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center group-hover:scale-105 transition-transform">
          <Server class="w-4 h-4" />
        </div>
        <h3 class="font-bold text-xs text-text-primary group-hover:text-primary transition-colors">Canlı Sürüm & Durum</h3>
        <p class="text-[11px] text-text-secondary leading-normal">v1.0.0-faz1 sürümü ve yayın bilgileri.</p>
      </a>
    </div>

    <!-- 1. Yasal Statü & Lisans Beyanı -->
    <section id="yasal-statu" class="bg-bg-surface border border-border-default rounded-xl p-6 sm:p-8 shadow-sm space-y-4">
      <div class="flex items-center gap-2 text-warning font-bold text-lg border-b border-border-default pb-3">
        <AlertCircle class="w-5 h-5" />
        <h2>Yasal Statü ve Zorunlu EMP Konumlandırma Beyanı</h2>
      </div>

      <div class="p-4 rounded-lg bg-warning/10 border border-warning/30 space-y-2">
        <p class="text-xs sm:text-sm font-bold text-text-primary leading-relaxed">
          elektriklioto.com hiçbir aşamada kendisini EPDK lisanslı bir "Şarj Ağı İşletmecisi" veya elektrik enerjisi satıcısı olarak konumlandıramaz.
        </p>
        <p class="text-xs text-text-secondary leading-relaxed">
          Platformumuz yasal olarak bağımsız bir e-Mobilite Hizmet Sağlayıcısı (EMP) adayı ve sürücü bilgilendirme asistanıdır. Enerji Piyasası Düzenleme Kurumu (EPDK) mevzuatına tabi elektrik enerjisi satışı, faturalandırma ve donanım işletimi doğrudan ilgili lisanslı şarj ağı operatörünün sorumluluğundadır.
        </p>
      </div>

      <div class="space-y-3 text-xs sm:text-sm text-text-secondary leading-relaxed">
        <h3 class="font-bold text-text-primary text-sm">Akıllı Derin Bağlantı (Deep-Linking) Modeli:</h3>
        <p>
          Kullanıcılar istasyon detayında "Operatörde Aç / Şarja Başla" eylemini seçtiğinde, işlem sitemiz üzerinden tahsil edilmez; ilgili şarj operatörünün (ZES, Trugo, Eşarj vb.) resmi mobil uygulamasına doğrudan hedef soket parametresiyle yönlendirme sağlanır.
        </p>
        <p>
          Uygulama cihazda yüklü değilse ilgili mobil mağazaya yönlendirilir veya desteklenmeyen şemalarda istasyon kodu panoya kopyalanarak sürücüye rehberlik edilir.
        </p>
      </div>
    </section>

    <!-- 2. KVKK ve Konum Gizliliği -->
    <section id="kvkk" class="bg-bg-surface border border-border-default rounded-xl p-6 sm:p-8 shadow-sm space-y-4">
      <div class="flex items-center gap-2 text-success font-bold text-lg border-b border-border-default pb-3">
        <Shield class="w-5 h-5" />
        <h2>KVKK & GDPR Uyumlu Sıfır Konum Saklama İlkesi</h2>
      </div>

      <p class="text-xs sm:text-sm text-text-secondary leading-relaxed">
        6698 sayılı Kişisel Verilerin Korunması Kanunu (KVKK) ve Genel Veri Koruma Tüzüğü (GDPR) kapsamında, sürücülerin hareket serbestisi ve seyahat gizliliği en temel değerimizdir:
      </p>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
        <div class="p-4 rounded-lg bg-bg-subdued border border-border-default space-y-1.5">
          <div class="flex items-center gap-2 font-bold text-text-primary text-xs">
            <Lock class="w-4 h-4 text-success" />
            <span>Geçici (In-Memory) İşleme</span>
          </div>
          <p class="text-text-secondary text-xs leading-relaxed">
            Kullanıcının anlık GPS koordinatları sunucuda <strong>kesinlikle kalıcı olarak saklanamaz</strong>; yalnızca tarayıcı üzerinde harita merkezleme amacıyla istemci belleğinde geçici işlenir.
          </p>
        </div>

        <div class="p-4 rounded-lg bg-bg-subdued border border-border-default space-y-1.5">
          <div class="flex items-center gap-2 font-bold text-text-primary text-xs">
            <MapPin class="w-4 h-4 text-success" />
            <span>Sınır Kutusu (BBox) Güvenliği</span>
          </div>
          <p class="text-text-secondary text-xs leading-relaxed">
            Sunucuya kullanıcının tam konumu değil, harita ekranının dikdörtgen sınır koordinatları (<code class="text-[11px] font-mono">bbox</code>) iletilir. Sunucu sürücünün tam koordinatını bilmez.
          </p>
        </div>

        <div class="p-4 rounded-lg bg-bg-subdued border border-border-default space-y-1.5">
          <div class="flex items-center gap-2 font-bold text-text-primary text-xs">
            <CheckCircle2 class="w-4 h-4 text-success" />
            <span>Proximity Proof ile Arıza Bildirimi</span>
          </div>
          <p class="text-text-secondary text-xs leading-relaxed">
            Arıza ihbarlarında istasyona &lt; 50m yakınlık şartı aranır; ancak kullanıcının konumu değil, yalnızca mesafenin doğrulandığına dair tek kullanımlık kriptografik kanıt iletilir.
          </p>
        </div>

        <div class="p-4 rounded-lg bg-bg-subdued border border-border-default space-y-1.5">
          <div class="flex items-center gap-2 font-bold text-text-primary text-xs">
            <Smartphone class="w-4 h-4 text-success" />
            <span>Zorunsuz Hesap & Yerel Saklama</span>
          </div>
          <p class="text-text-secondary text-xs leading-relaxed">
            Harita gezintisi ve filtreleme için hesap açma zorunluluğu yoktur. Favori istasyonlar sürücünün kendi cihazının yerel hafızasında saklanır.
          </p>
        </div>
      </div>
    </section>

    <!-- 3. Veri Kaynakları & Eksik Veri Şeffaflığı -->
    <section id="veri-kaynaklari" class="bg-bg-surface border border-border-default rounded-xl p-6 sm:p-8 shadow-sm space-y-4">
      <div class="flex items-center gap-2 text-primary font-bold text-lg border-b border-border-default pb-3">
        <Database class="w-5 h-5" />
        <h2>Veri Kaynakları ve Eksik Veri Şeffaflığı</h2>
      </div>

      <div class="space-y-3 text-xs sm:text-sm text-text-secondary leading-relaxed">
        <p>
          elektriklioto.com Faz 1 veritabanı, <strong>Enerji Piyasası Düzenleme Kurumu (EPDK) Şarj İstasyonları Sorgulama Sistemi</strong> resmi sicil kayıtlarından tohumlanmıştır. Sistemde 16.788 istasyon ve 179 lisanslı marka kanonik resmi kimlikleriyle (<code class="text-xs font-mono font-bold">ŞRJ/xxxx</code>) indekslenmiştir.
        </p>

        <div class="p-4 rounded-lg bg-primary/5 border border-primary/20 space-y-2">
          <h3 class="font-bold text-text-primary text-xs flex items-center gap-2">
            <Zap class="w-4 h-4 text-primary" />
            <span>Eksik Veri (Null Data) İlkemiz:</span>
          </h3>
          <p class="text-xs leading-relaxed">
            EPDK sicil kayıtlarında soket tipi, güç (kW), tarife ve anlık doluluk verisi bulunmamaktadır. Platformumuz sürücüleri yanıltmamak adına <strong>kesinlikle uydurma / sahte veri göstermez</strong>.
          </p>
          <p class="text-xs leading-relaxed">
            Bu alanlar arayüzde standart gri <span class="px-2 py-0.5 rounded bg-missing-bg text-missing-text font-semibold text-[11px]">Operatör Verisi Bekleniyor</span> rozetiyle gösterilir ve topluluk katkısına açıktır.
          </p>
        </div>
      </div>
    </section>

    <!-- 4. Kullanım Şartları ve Sorumluluk Reddi -->
    <section id="kullanim-sartlari" class="bg-bg-surface border border-border-default rounded-xl p-6 sm:p-8 shadow-sm space-y-4">
      <div class="flex items-center gap-2 text-text-primary font-bold text-lg border-b border-border-default pb-3">
        <FileText class="w-5 h-5 text-primary" />
        <h2>Kullanım Şartları ve Sorumluluk Reddi (Disclaimer)</h2>
      </div>

      <div class="space-y-3 text-xs sm:text-sm text-text-secondary leading-relaxed">
        <div class="space-y-2">
          <h3 class="font-semibold text-text-primary text-sm">1. Bilgilendirme Amaçlı Hizmet</h3>
          <p>
            Haritada listelenen adres, konum, operatör unvanı ve çalışma şekli bilgileri resmi kamu kayıtlarından ve sürücü geri bildirimlerinden derlenmiştir. elektriklioto.com, fiziksel istasyonların anlık operasyonel durumu, kapalı yollar veya operatör fiyat değişikliklerinden doğabilecek doğrudan veya dolaylı aksaklıklardan sorumlu tutulamaz.
          </p>
        </div>

        <div class="space-y-2">
          <h3 class="font-semibold text-text-primary text-sm">2. Fiyat ve Tarife Bilgileri</h3>
          <p>
            Sistemde yer alan tarife bilgileri yalnızca gösterge niteliğindedir. Nihai geçerli şarj tarifesi, faturayı düzenleyen ve işlemi yürüten lisanslı şarj ağı operatörünün sözleşmesinde ve uygulamasında geçerlidir.
          </p>
        </div>

        <div class="space-y-2">
          <h3 class="font-semibold text-text-primary text-sm">3. Topluluk Katkısı ve Güvenilirlik</h3>
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
        <h2>Canlı Sürüm Bilgileri</h2>
      </div>

      <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div class="p-3.5 rounded-lg bg-bg-subdued border border-border-default">
          <span class="text-[11px] text-text-muted block">Platform Sürümü:</span>
          <span class="font-bold text-sm text-text-primary font-mono">v1.0.0-faz1</span>
        </div>

        <div class="p-3.5 rounded-lg bg-bg-subdued border border-border-default">
          <span class="text-[11px] text-text-muted block">Yayın Tarihi:</span>
          <span class="font-bold text-sm text-text-primary font-mono">18 Eylül 2026</span>
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

      <div class="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-lg bg-primary/5 border border-primary/20">
        <div>
          <span class="font-bold text-xs sm:text-sm text-text-primary block">Sürüm Geçmişi & Değişiklik Günlüğü</span>
          <span class="text-[11px] text-text-secondary">Uygulamada çözülen müşteri talepleri (TALEP-001..TALEP-013), sürüm notları ve yenilikler.</span>
        </div>
        <NuxtLink
          to="/guncellemeler"
          class="touch-target-min px-3.5 py-2 rounded-lg bg-primary hover:bg-primary-hover text-on-primary text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-sm focus-visible:outline-none flex-shrink-0"
        >
          <Sparkles class="w-3.5 h-3.5" />
          <span>Sürüm Notlarını İncele →</span>
        </NuxtLink>
      </div>

      <div class="pt-2 text-xs text-text-secondary leading-relaxed space-y-1">
        <p>
          <strong class="text-text-primary">Kanonik Alan Adı:</strong> <span class="font-mono text-primary">elektriklioto.com</span>
        </p>
      </div>
    </section>

    <!-- Alt Aksiyon Çubuğu -->
    <div class="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-border-default">
      <NuxtLink
        to="/"
        class="touch-target-min w-full sm:w-auto px-6 py-3 rounded-xl bg-primary hover:bg-primary-hover text-on-primary font-semibold text-sm flex items-center justify-center gap-2 transition-colors shadow-sm focus-visible:outline-none"
      >
        <Map class="w-4 h-4" />
        <span>Haritaya Dön ve İstasyonları Keşfet</span>
      </NuxtLink>

      <span class="text-xs text-text-muted text-center sm:text-right">
        Son Güncelleme: 18 Eylül 2026 • © elektriklioto.com
      </span>
    </div>
  </div>
</template>
