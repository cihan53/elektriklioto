
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
              class="w-8 h-8 rounded-lg border border-border-default bg-bg-subdued text-text-secondary hover:text-text-primary hover:bg-border-default flex items-center justify-center transition-colors touch-target-min focus-visible:outline-none cursor-pointer"
              aria-label="Kapat"
              title="Kapat"
            >
              <X class="w-4 h-4" />
            </button>
          </div>

          <!-- Sekme Başlıkları -->
          <div class="flex border-b border-border-default bg-bg-subdued/50 px-3 overflow-x-auto">
            <button
              v-for="tab in tabs"
              :key="tab.key"
              type="button"
              @click="activeTab = tab.key"
              class="touch-target-min px-3 py-2.5 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap cursor-pointer focus-visible:outline-none"
              :class="[
                activeTab === tab.key
                  ? 'border-primary text-primary bg-bg-surface'
                  : 'border-transparent text-text-secondary hover:text-text-primary hover:bg-bg-subdued'
              ]"
            >
              <component :is="tab.icon" class="w-3.5 h-3.5" />
              <span>{{ tab.label }}</span>
            </button>
          </div>

          <!-- Modal İçeriği (Sekmeler) -->
          <div class="p-5 overflow-y-auto flex-1 text-xs space-y-4">
            <!-- 1. Misyon Sekmesi -->
            <div v-if="activeTab === 'misyon'" class="space-y-3.5">
              <div class="p-3.5 rounded-lg bg-primary/5 border border-primary/20 space-y-2">
                <h3 class="font-bold text-sm text-text-primary flex items-center gap-2">
                  <Zap class="w-4 h-4 text-primary" />
                  <span>Sürücü Odaklı e-Mobilite Hub'ı</span>
                </h3>
                <p class="text-text-secondary leading-relaxed">
                  elektriklioto.com, elektrikli araç (EV) sürücülerinin 30'dan fazla farklı operatör uygulaması arasında kaybolmasını önlemek, tek haritada tüm şarj ağlarını şeffafça sunmak için tasarlanmış bağımsız bir asistan platformdur.
                </p>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div class="p-3 rounded-lg border border-border-default bg-bg-surface space-y-1.5">
                  <div class="flex items-center gap-1.5 font-semibold text-text-primary text-xs">
                    <CheckCircle2 class="w-4 h-4 text-success" />
                    <span>16.788 İstasyon & 179 Marka</span>
                  </div>
                  <p class="text-text-secondary text-[11px] leading-relaxed">
                    EPDK resmi lisanslı şarj ağı işletmecilerinin tüm istasyonları tek çatı altında taranabilir.
                  </p>
                </div>

                <div class="p-3 rounded-lg border border-border-default bg-bg-surface space-y-1.5">
                  <div class="flex items-center gap-1.5 font-semibold text-text-primary text-xs">
                    <CheckCircle2 class="w-4 h-4 text-success" />
                    <span>Akıllı Derin Bağlantı (Deep-Link)</span>
                  </div>
                  <p class="text-text-secondary text-[11px] leading-relaxed">
                    Şarj başlatmak istediğinizde doğrudan ilgili operatörün uygulamasına soket kimliğiyle köprü kurulur.
                  </p>
                </div>
              </div>
            </div>

            <!-- 2. Yasal Statü & Lisans Sınırı -->
            <div v-else-if="activeTab === 'sozlesmeler'" class="space-y-3.5">
              <div class="p-3.5 rounded-lg bg-warning/10 border border-warning/30 space-y-2">
                <div class="flex items-center gap-2 text-warning font-bold text-xs">
                  <AlertCircle class="w-4 h-4" />
                  <span>Zorunlu EMP Beyanı & Yasal Konumlandırma</span>
                </div>
                <p class="text-text-primary text-xs leading-relaxed font-medium">
                  elektriklioto.com hiçbir aşamada kendisini EPDK lisanslı bir "Şarj Ağı İşletmecisi" veya elektrik satıcısı olarak konumlandıramaz.
                </p>
                <p class="text-text-secondary text-[11px] leading-relaxed">
                  Platformumuz yasal olarak bağımsız bir e-Mobilite Hizmet Sağlayıcısı (EMP) ve bilgilendirme asistanıdır. Elektrik satışı, faturalandırma ve şarj donanımı yönetimi doğrudan ilgili lisanslı operatörün sorumluluğundadır.
                </p>
              </div>

              <div class="space-y-2 text-text-secondary leading-relaxed text-[11px]">
                <h4 class="font-bold text-text-primary text-xs">Kullanım Şartları Özeti</h4>
                <ul class="list-disc pl-4 space-y-1">
                  <li>Haritada gösterilen veriler resmi kamu kayıtları ve kitle kaynaklı sürücü bildirimleriyle derlenmektedir.</li>
                  <li>Tarife ve fiyatlar bilgi amaçlıdır; bağlayıcı nihai tarife ilgili operatörün faturasında geçerlidir.</li>
                  <li>Ödeme işlemleri sitemiz üzerinden yapılmaz; operatörün resmi uygulamasına yönlendirilirsiniz.</li>
                </ul>
              </div>
            </div>

            <!-- 3. KVKK ve Konum Gizliliği -->
            <div v-else-if="activeTab === 'kvkk'" class="space-y-3.5">
              <div class="p-3.5 rounded-lg bg-success/10 border border-success/30 space-y-2">
                <div class="flex items-center gap-2 text-success font-bold text-xs">
                  <Lock class="w-4 h-4" />
                  <span>Sıfır Konum Saklama İlkesi (Zero-GPS Storage)</span>
                </div>
                <p class="text-text-primary text-xs leading-relaxed font-medium">
                  Kullanıcılarımızın GPS konumu kesinlikle sunucularımızda saklanmaz, kaydedilmez veya profillenmez.
                </p>
              </div>

              <div class="space-y-2 text-text-secondary text-[11px] leading-relaxed">
                <h4 class="font-bold text-text-primary text-xs">Gizlilik Taahhütlerimiz:</h4>
                <ul class="list-disc pl-4 space-y-1">
                  <li><strong>Geçici Bellek (In-Memory):</strong> Anlık GPS koordinatınız sadece tarayıcınızda/cihazınızda en yakın istasyonu harita üzerinde göstermek için anlık işlenir.</li>
                  <li><strong>Hesapsız Kullanım:</strong> Haritayı kullanmak, filtrelemek ve arama yapmak için üye olmanız veya kişisel veri paylaşmanız gerekmez.</li>
                  <li><strong>Güvenli Doğrulama:</strong> Arıza bildirimlerinde konumunuz gönderilmez; mesafe cihazınızda hesaplanıp tek kullanımlık kriptografik kanıt üretilir.</li>
                </ul>
              </div>
            </div>

            <!-- 4. Veri Kaynakları & Tazelik -->
            <div v-else-if="activeTab === 'kaynaklar'" class="space-y-3.5">
              <div class="p-3.5 rounded-lg bg-bg-subdued border border-border-default space-y-2">
                <div class="flex items-center gap-2 text-primary font-bold text-xs">
                  <Database class="w-4 h-4" />
                  <span>EPDK Kanonik İstasyon Çapası</span>
                </div>
                <p class="text-text-secondary text-xs leading-relaxed">
                  Veritabanımız, Enerji Piyasası Düzenleme Kurumu (EPDK) Şarj İstasyonları Sorgulama Sistemi'nden derlenen 16.788 resmi istasyon sicil kaydını içerir.
                </p>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div class="p-3 rounded-lg border border-border-default bg-bg-surface space-y-1">
                  <h3 class="font-bold text-text-primary text-xs">Kanonik Kimlik</h3>
                  <p class="text-text-secondary text-[11px] leading-relaxed">
                    Her istasyon resmi <strong>ŞRJ/xxxx</strong> sicil numarası ile doğrulanmıştır.
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
                  elektriklioto.com güncel ve kararlı sürümüyle elektrikli araç kullanıcılarına hizmet vermektedir.
                </p>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div class="p-3 rounded-lg border border-border-default bg-bg-surface">
                  <span class="text-[11px] text-text-muted block">Platform Sürümü (SemVer):</span>
                  <span class="font-bold text-sm text-text-primary">v1.0.0-faz1</span>
                </div>

                <div class="p-3 rounded-lg border border-border-default bg-bg-surface">
                  <span class="text-[11px] text-text-muted block">Yayın Tarihi:</span>
                  <span class="font-semibold text-xs text-text-primary">18 Eylül 2026 (build 102)</span>
                </div>

                <div class="p-3 rounded-lg border border-border-default bg-bg-surface">
                  <span class="text-[11px] text-text-muted block">Çalışma Durumu:</span>
                  <span class="font-semibold text-xs text-success flex items-center gap-1.5 mt-0.5">
                    <span class="w-2 h-2 rounded-full bg-success animate-pulse"></span>
                    <span>Canlı / Tüm Servisler Aktif</span>
                  </span>
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

              <div class="p-3 rounded-lg border border-primary/20 bg-primary/5 text-center">
                <a
                  href="/guncellemeler"
                  @click="emit('close')"
                  class="text-xs font-bold text-primary hover:underline flex items-center justify-center gap-1.5 touch-target-min"
                >
                  <Sparkles class="w-4 h-4" />
                  <span>Sürüm Notları & Değişiklik Günlüğü (/guncellemeler)</span>
                  <ExternalLink class="w-3.5 h-3.5" />
                </a>
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
              class="touch-target-min px-4 py-2 rounded-md bg-bg-surface border border-border-strong text-xs font-semibold text-text-primary hover:bg-border-default transition-colors focus-visible:outline-none shadow-sm cursor-pointer"
            >
              Anladım, Kapat
            </button>
          </div>
        </div>
      </div>
    </transition>
  </Teleport>
</template>
