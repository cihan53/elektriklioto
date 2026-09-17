
<script setup lang="ts">
import { Shield, MapPin, Database, Zap } from 'lucide-vue-next';

useHead({
  title: 'Hakkımızda & Yasal Bildirimler | elektriklioto.com',
  meta: [
    {
      name: 'description',
      content: 'elektriklioto.com bağımsız e-Mobilite Asistanı ve Bilgi Hub\'ıdır. Lisans sınırı, KVKK ve EPDK veri kaynak bildirimleri.'
    },
    { property: 'og:title', content: 'Hakkımızda & Yasal Bildirimler | elektriklioto.com' },
    { property: 'og:type', content: 'website' }
  ]
});
</script>

<template>
  <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full space-y-8">
    <header class="bg-bg-surface border border-border-default rounded-xl p-6 sm:p-8 shadow-sm space-y-2">
      <div class="flex items-center gap-2 text-primary">
        <Zap class="w-6 h-6" />
        <span class="text-xs font-semibold uppercase tracking-wider">Hakkımızda & Yasal Statü</span>
      </div>
      <h1 class="text-2xl sm:text-3xl font-bold text-text-primary tracking-tight">
        elektriklioto.com e-Mobilite Asistanı
      </h1>
      <p class="text-sm text-text-secondary leading-relaxed">
        Türkiye genelinde faaliyet gösteren 179 lisanslı şarj operatörünü tek harita üzerinde birleştiren bağımsız bilgi hub'ı.
      </p>
    </header>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <!-- 1. Lisans Sınırı -->
      <section class="bg-bg-surface border border-border-default rounded-xl p-6 shadow-sm space-y-3">
        <div class="w-10 h-10 rounded-lg bg-warning-subdued text-warning flex items-center justify-center">
          <Shield class="w-5 h-5" />
        </div>
        <h2 class="text-base font-bold text-text-primary">Lisans Sınırı & Yasal Statü</h2>
        <p class="text-xs text-text-secondary leading-relaxed">
          Platform hiçbir aşamada lisanslı şarj operatörü değildir. EPDK lisansına tabi elektrik satışı veya faturalama yapmaz. Yasal olarak e-Mobilite Hizmet Sağlayıcısı (EMP) adayı ve bilgi platformudur.
        </p>
      </section>

      <!-- 2. Sıfır Konum Saklama & KVKK -->
      <section class="bg-bg-surface border border-border-default rounded-xl p-6 shadow-sm space-y-3">
        <div class="w-10 h-10 rounded-lg bg-success-subdued text-success flex items-center justify-center">
          <MapPin class="w-5 h-5" />
        </div>
        <h2 class="text-base font-bold text-text-primary">Sıfır Konum Saklama & KVKK</h2>
        <p class="text-xs text-text-secondary leading-relaxed">
          Kullanıcıların GPS koordinatları sunucuda kesinlikle saklanmaz. Konum verisi yalnızca istemci belleğinde (in-memory) anlık harita merkezleme amacıyla geçici olarak işlenir.
        </p>
      </section>

      <!-- 3. EPDK Veri Kaynağı -->
      <section class="bg-bg-surface border border-border-default rounded-xl p-6 shadow-sm space-y-3">
        <div class="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
          <Database class="w-5 h-5" />
        </div>
        <h2 class="text-base font-bold text-text-primary">EPDK Sicil Verisi</h2>
        <p class="text-xs text-text-secondary leading-relaxed">
          Platformdaki 16.788 şarj istasyonu resmî EPDK Şarj İstasyonları Sicili'nden tohumlanmıştır. Resmî istasyon sicil numaraları (ŞRJ/xxxx) kanonik kimlik çapasıdır.
        </p>
      </section>
    </div>

    <!-- Dipnot -->
    <footer class="pt-8 border-t border-border-default text-center text-xs text-text-muted space-y-1">
      <p>Veri Kaynağı: EPDK Sicil Kaydı (Eylül 2026)</p>
      <p>
        elektriklioto.com lisanslı şarj operatörü değildir. Şarj başlatma ve faturalandırma ilgili operatörün sorumluluğundadır.
      </p>
    </footer>
  </div>
</template>
