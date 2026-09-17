
<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import {
  X,
  Zap,
  Shield,
  MapPin,
  Database,
  Cpu,
  ExternalLink,
  CheckCircle2,
  Lock,
  FileText,
  Info,
  Layers,
  Sparkles,
  Server,
  AlertCircle
} from 'lucide-vue-next';

const props = defineProps<{
  isOpen: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const isTeleportDisabled = import.meta.env?.MODE === 'test' || (typeof process !== 'undefined' && process.env?.NODE_ENV === 'test');

type TabKey = 'misyon' | 'sozlesmeler' | 'kvkk' | 'kaynaklar' | 'surum';
const activeTab = ref<TabKey>('misyon');

const tabs: { key: TabKey; label: string; icon: any }[] = [
  { key: 'misyon', label: 'Misyon', icon: Zap },
  { key: 'sozlesmeler', label: 'Yasal Statü', icon: Shield },
  { key: 'kvkk', label: 'KVKK & Gizlilik', icon: Lock },
  { key: 'kaynaklar', label: 'Veri Kaynakları', icon: Database },
  { key: 'surum', label: 'Canlı Sürüm', icon: Cpu },
];

// ESC tuşu ile kapatma
const handleKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && props.isOpen) {
    emit('close');
  }
};

onMounted(() => {
  if (typeof window !== 'undefined') {
    window.addEventListener('keydown', handleKeyDown);
  }
});

onUnmounted(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('keydown', handleKeyDown);
  }
});
</script>

<template>
  <Teleport to="body" :disabled="isTeleportDisabled">
    <transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="isOpen"
        class="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-3 sm:p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="about-modal-title"
        @click.self="emit('close')"
      >
        <div
          class="bg-bg-surface border border-border-default rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200"
        >
          <!-- Modal Başlık Çubuğu -->
          <div class="px-5 py-4 border-b border-border-default flex items-center justify-between bg-bg-surface">
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shadow-sm">
                <Zap class="w-5 h-5 fill-current" />
              </div>
              <div>
                <h2 id="about-modal-title" class="text-base sm:text-lg font-bold text-text-primary leading-tight">
                  Hakkında & Yasal Bilgiler
                </h2>
                <p class="text-xs text-text-secondary">
                  elektriklioto.com e-Mobilite Asistanı ve Bilgi Hub'ı
                </p>
              </div>
            </div>

            <button
              type="button"
              @click="emit('close')"
              class="touch-target-min flex items-center justify-center text-text-secondary hover:text-text-primary rounded-md p-1.5 focus-visible:outline-none transition-colors"
              aria-label="Kapat"
            >
              <X class="w-5 h-5" />
            </button>
          </div>

          <!-- Sekme Butonları -->
          <div class="px-4 py-2 border-b border-border-default bg-bg-subdued flex items-center gap-1.5 overflow-x-auto scrollbar-none">
            <button
              v-for="t in tabs"
              :key="t.key"
              type="button"
              @click="activeTab = t.key"
              class="px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 touch-target-min focus-visible:outline-none"
              :class="
                activeTab === t.key
                  ? 'bg-bg-surface text-primary shadow-sm font-semibold border border-border-default'
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-surface/50'
              "
            >
              <component :is="t.icon" class="w-3.5 h-3.5" />
              <span>{{ t.label }}</span>
            </button>
          </div>

          <!-- Sekme İçerikleri (Kaydırılabilir Alan) -->
          <div class="p-5 overflow-y-auto space-y-4 text-xs leading-relaxed text-text-secondary">
            <!-- 1. Misyon & Vizyon -->
            <div v-if="activeTab === 'misyon'" class="space-y-4">
              <div class="p-4 rounded-lg bg-bg-subdued border border-border-default space-y-2">
                <div class="flex items-center gap-2 text-primary font-bold text-sm">
                  <Sparkles class="w-4 h-4" />
                  <span>Tek Haritada 179 Lisanslı Operatör</span>
                </div>
                <p class="text-text-secondary leading-relaxed">
                  elektriklioto.com, elektrikli araç (EV) sürücülerinin sahada onlarca farklı şarj operatörü (CPO) için 30-35 ayrı mobil uygulama yüklemek ve yolda kaybolmak zorunda kalması krizini çözen merkezi bir <strong class="text-text-primary">e-Mobilite Asistanı ve Bilgi Hub'ıdır</strong>.
                </p>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div class="p-3.5 rounded-lg border border-border-default bg-bg-surface space-y-1.5">
                  <div class="flex items-center gap-2 text-text-primary font-semibold">
                    <CheckCircle2 class="w-4 h-4 text-success" />
                    <span>Tek Harita Arayüzü</span>
                  </div>
                  <p class="text-text-secondary text-[11px] leading-relaxed">
                    ZES, Trugo, Eşarj, Voltrun ve 175+ diğer operatörün istasyonlarını tek bir haritada akıcı ve responsive olarak sunar.
                  </p>
                </div>

                <div class="p-3.5 rounded-lg border border-border-default bg-bg-surface space-y-1.5">
                  <div class="flex items-center gap-2 text-text-primary font-semibold">
                    <CheckCircle2 class="w-4 h-4 text-success" />
                    <span>Akıllı Derin Bağlantı</span>
                  </div>
                  <p class="text-text-secondary text-[11px] leading-relaxed">
                    İlgili operatörün mobil uygulamasına hedef soket parametresiyle doğrudan atlar; uygulama yoksa panoya kopyalar.
                  </p>
                </div>

                <div class="p-3.5 rounded-lg border border-border-default bg-bg-surface space-y-1.5">
                  <div class="flex items-center gap-2 text-text-primary font-semibold">
                    <CheckCircle2 class="w-4 h-4 text-success" />
                    <span>Kitle-Kaynaklı Arıza Teyidi</span>
                  </div>
                  <p class="text-text-secondary text-[11px] leading-relaxed">
                    Kullanıcı bildirimleri ve 50m yakınlık kanıtı (proximity proof) ile çalışmayan veya işgal edilmiş (ICEing) soketleri işaretler.
                  </p>
                </div>

                <div class="p-3.5 rounded-lg border border-border-default bg-bg-surface space-y-1.5">
                  <div class="flex items-center gap-2 text-text-primary font-semibold">
                    <CheckCircle2 class="w-4 h-4 text-success" />
                    <span>Sıfır Hesap Zorunluluğu</span>
                  </div>
                  <p class="text-text-secondary text-[11px] leading-relaxed">
                    Harita keşfi, arama, filtreleme ve istasyon inceleme için hesap açma zorunluluğu yoktur; KVKK yüzeyi asgaridedir.
                  </p>
                </div>
              </div>
            </div>

            <!-- 2. Kullanım Koşulları & Yasal Statü -->
            <div v-else-if="activeTab === 'sozlesmeler'" class="space-y-4">
              <div class="p-4 rounded-lg bg-warning-subdued border border-warning/30 space-y-2">
                <div class="flex items-center gap-2 text-warning font-bold text-sm">
                  <AlertCircle class="w-4 h-4 flex-shrink-0" />
                  <span>Yasal Uyarı & Lisans Sınırı (Zorunlu EMP Beyanı)</span>
                </div>
                <p class="text-text-primary text-xs leading-relaxed">
                  Platform hiçbir aşamada lisanslı şarj operatörü değildir. EPDK lisansına tabi elektrik enerjisi satışı, şarj hizmeti bedeli tahsilatı ve faturalama yapmaz. Yasal olarak bağımsız bir e-Mobilite Hizmet Sağlayıcısı (EMP) adayı ve bilgi platformudur.
                </p>
              </div>

              <div class="space-y-2.5">
                <div class="p-3 rounded-lg border border-border-default bg-bg-surface space-y-1">
                  <h3 class="font-bold text-text-primary text-xs flex items-center gap-1.5">
                    <FileText class="w-3.5 h-3.5 text-primary" />
                    <span>Operatör ve İstasyon Sorumluluğu</span>
                  </h3>
                  <p class="text-text-secondary text-[11px] leading-relaxed">
                    Fiziksel şarj operasyonu, soket güvenliği, elektrik tedariki ve nihai ücretlendirme işlemi tamamen ilgili CPO'nun (Şarj Ağı İşletmecisi) sorumluluğundadır. elektriklioto.com yalnızca operasyonel yönlendirme ve bilgi sağlama köprüsü kurar.
                  </p>
                </div>

                <div class="p-3 rounded-lg border border-border-default bg-bg-surface space-y-1">
                  <h3 class="font-bold text-text-primary text-xs flex items-center gap-1.5">
                    <FileText class="w-3.5 h-3.5 text-primary" />
                    <span>Tarife ve Fiyat Bilgileri</span>
                  </h3>
                  <p class="text-text-secondary text-[11px] leading-relaxed">
                    Sitede sunulan tarife bilgileri kamusal açık veri ve CPO uç noktalarından derlenmiş olup bilgi amaçlıdır. Nihai ve bağlayıcı tarife, şarj başlatma anında operatör uygulamasında gösterilen tarifedir.
                  </p>
                </div>

                <div class="p-3 rounded-lg border border-border-default bg-bg-surface space-y-1">
                  <h3 class="font-bold text-text-primary text-xs flex items-center gap-1.5">
                    <FileText class="w-3.5 h-3.5 text-primary" />
                    <span>Topluluk Katkı Kuralları</span>
                  </h3>
                  <p class="text-text-secondary text-[11px] leading-relaxed">
                    Kullanıcılar tarafından yapılan arıza ihbarları ve veri katkıları sistem moderasyonundan geçer. Yanıltıcı bildirimler bot koruma algoritmaları ve IP rate-limiting ile engellenir.
                  </p>
                </div>
              </div>
            </div>

            <!-- 3. KVKK & Konum Gizliliği -->
            <div v-else-if="activeTab === 'kvkk'" class="space-y-4">
              <div class="p-4 rounded-lg bg-success-subdued border border-success/30 space-y-2">
                <div class="flex items-center gap-2 text-success font-bold text-sm">
                  <Lock class="w-4 h-4 flex-shrink-0" />
                  <span>Sıfır Konum Saklama İlkesi (Zero Location Storage)</span>
                </div>
                <p class="text-text-primary text-xs leading-relaxed">
                  Kullanıcıların GPS koordinatları sunucuda kesinlikle saklanmaz, diske yazılmaz ve veritabanında tutulamaz. KVKK ve GDPR uyumu donanım seviyesinde korunur.
                </p>
              </div>

              <div class="space-y-2.5">
                <div class="p-3 rounded-lg border border-border-default bg-bg-surface space-y-1">
                  <h3 class="font-bold text-text-primary text-xs flex items-center gap-1.5">
                    <MapPin class="w-3.5 h-3.5 text-primary" />
                    <span>Geçici (In-Memory) İşleme</span>
                  </h3>
                  <p class="text-text-secondary text-[11px] leading-relaxed">
                    Tarayıcıda verilen konum izni yalnızca istemci belleğinde (in-memory) haritayı merkezlemek ve en yakın istasyon mesafesini yerel olarak hesaplamak için anlık kullanılır.
                  </p>
                </div>

                <div class="p-3 rounded-lg border border-border-default bg-bg-surface space-y-1">
                  <h3 class="font-bold text-text-primary text-xs flex items-center gap-1.5">
                    <Shield class="w-3.5 h-3.5 text-primary" />
                    <span>Proximity Proof Kriptografik Kanıt</span>
                  </h3>
                  <p class="text-text-secondary text-[11px] leading-relaxed">
                    Arıza bildirimi gönderilirken sunucuya ham GPS koordinatınız iletilmez; istemcinin istasyona 50 metre yakınında olduğunu doğrulayan tek kullanımlık süreli bir kanıt (HMAC proof) iletilir.
                  </p>
                </div>

                <div class="p-3 rounded-lg border border-border-default bg-bg-surface space-y-1">
                  <h3 class="font-bold text-text-primary text-xs flex items-center gap-1.5">
                    <Layers class="w-3.5 h-3.5 text-primary" />
                    <span>Geçmiş Seyahat ve Güzergah Kaydı Yasaktır</span>
                  </h3>
                  <p class="text-text-secondary text-[11px] leading-relaxed">
                    Sunucu tarafında kullanıcıya veya cihaza bağlı geçmiş rota, koordinat veya konum kaydı tutulması teknik mimari sözleşmesi gereğince engellenmiştir.
                  </p>
                </div>
              </div>
            </div>

            <!-- 4. Veri Kaynakları -->
            <div v-else-if="activeTab === 'kaynaklar'" class="space-y-4">
              <div class="p-4 rounded-lg bg-bg-subdued border border-border-default space-y-2">
                <div class="flex items-center gap-2 text-primary font-bold text-sm">
                  <Database class="w-4 h-4" />
                  <span>EPDK Sicil Verisi & CPO Entegrasyonları</span>
                </div>
                <p class="text-text-secondary text-xs leading-relaxed">
                  Platformdaki 16.788 şarj istasyonu resmî <strong class="text-text-primary">EPDK Şarj İstasyonları Sorgulama Sistemi</strong>'nden tohumlanmıştır. Resmî sicil numaraları (<code class="font-mono text-primary font-semibold">ŞRJ/xxxx</code>) kanonik istasyon kimliğinin değişmez çapasıdır.
                </p>
              </div>

              <div class="space-y-2.5">
                <div class="p-3 rounded-lg border border-border-default bg-bg-surface space-y-1">
                  <h3 class="font-bold text-text-primary text-xs">179 Lisanslı Şarj Operatörü</h3>
                  <p class="text-text-secondary text-[11px] leading-relaxed">
                    EPDK siciline kayıtlı tüm operatörlerin kurumsal unvanları, marka eşanlamlıları ve derin bağlantı (deep-link) şemaları normalize edilerek yönetilir.
                  </p>
                </div>

                <div class="p-3 rounded-lg border border-border-default bg-bg-surface space-y-1">
                  <h3 class="font-bold text-text-primary text-xs">Açık Veri Uçları & Circuit Breaker</h3>
                  <p class="text-text-secondary text-[11px] leading-relaxed">
                    Dış CPO veri uçlarından çekilen anlık doluluk ve tarife güncellemeleri, kaynakların kesintiye uğraması durumunda platformu çökertmeyen devre kesici (Circuit Breaker) mimarisiyle korunur.
                  </p>
                </div>

                <div class="p-3 rounded-lg border border-border-default bg-bg-surface space-y-1">
                  <h3 class="font-bold text-text-primary text-xs">Tazelik Beyanı</h3>
                  <p class="text-text-secondary text-[11px] leading-relaxed">
                    Kanonik referans: <strong>EPDK Sicil Kaydı (Eylül 2026)</strong>. Güncellenen istasyonlarda göreceli zaman damgası şeffaf olarak gösterilir.
                  </p>
                </div>
              </div>
            </div>

            <!-- 5. Canlı Sürüm & Versiyon Bilgileri -->
            <div v-else-if="activeTab === 'surum'" class="space-y-4">
              <div class="p-4 rounded-lg bg-bg-subdued border border-border-default space-y-2">
                <div class="flex items-center gap-2 text-primary font-bold text-sm">
                  <Server class="w-4 h-4" />
                  <span>Canlı Çalışma Ortamı & Sürüm Bilgileri</span>
                </div>
                <p class="text-text-secondary text-xs leading-relaxed">
                  elektriklioto.com üretim ortamında aktif olarak hizmet veren modüler monolit mimarisiyle çalışmaktadır.
                </p>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div class="p-3 rounded-lg border border-border-default bg-bg-surface">
                  <span class="text-[11px] text-text-muted block">Platform Sürümü (SemVer):</span>
                  <span class="font-bold text-sm text-text-primary">v1.0.0-faz1</span>
                </div>

                <div class="p-3 rounded-lg border border-border-default bg-bg-surface">
                  <span class="text-[11px] text-text-muted block">Build / Dağıtım Kimliği:</span>
                  <span class="font-semibold text-xs text-text-primary">build 102 (2026-09-17)</span>
                </div>

                <div class="p-3 rounded-lg border border-border-default bg-bg-surface">
                  <span class="text-[11px] text-text-muted block">Frontend Çatısı:</span>
                  <span class="font-semibold text-xs text-text-primary">Nuxt 3.15 / Vue 3 (SSR/SSG)</span>
                </div>

                <div class="p-3 rounded-lg border border-border-default bg-bg-surface">
                  <span class="text-[11px] text-text-muted block">Backend Çatısı:</span>
                  <span class="font-semibold text-xs text-text-primary">Node.js 22 / Fastify TypeScript</span>
                </div>

                <div class="p-3 rounded-lg border border-border-default bg-bg-surface">
                  <span class="text-[11px] text-text-muted block">Veritabanı & Mekânsal Motor:</span>
                  <span class="font-semibold text-xs text-text-primary">PostgreSQL 16 + PostGIS 3.4</span>
                </div>

                <div class="p-3 rounded-lg border border-border-default bg-bg-surface">
                  <span class="text-[11px] text-text-muted block">Erişilebilirlik Standardı:</span>
                  <span class="font-semibold text-xs text-success flex items-center gap-1">
                    <CheckCircle2 class="w-3.5 h-3.5" />
                    <span>WCAG 2.1 AA Sertifikalı</span>
                  </span>
                </div>
              </div>

              <div class="p-3 rounded-lg border border-border-default bg-bg-surface text-center">
                <span class="text-[11px] text-text-muted block">Kanonik Alan Adı:</span>
                <span class="font-bold text-sm text-primary">elektriklioto.com</span>
                <span class="text-[11px] text-text-secondary block mt-0.5">API: api.elektriklioto.com</span>
              </div>
            </div>
          </div>

          <!-- Alt Bar & Aksiyonlar -->
          <div class="p-4 border-t border-border-default bg-bg-subdued flex items-center justify-between gap-3">
            <a
              href="/hakkimizda"
              @click="emit('close')"
              class="touch-target-min px-3 py-1.5 rounded-md text-xs font-semibold text-primary hover:text-primary-hover flex items-center gap-1.5 transition-colors focus-visible:outline-none"
            >
              <span>Detaylı Sayfayı Aç (/hakkimizda)</span>
              <ExternalLink class="w-3.5 h-3.5" />
            </a>

            <button
              type="button"
              @click="emit('close')"
              class="touch-target-min px-4 py-2 rounded-md bg-bg-surface border border-border-strong text-xs font-semibold text-text-primary hover:bg-border-default transition-colors focus-visible:outline-none shadow-sm"
            >
              Anladım, Kapat
            </button>
          </div>
        </div>
      </div>
    </transition>
  </Teleport>
</template>
