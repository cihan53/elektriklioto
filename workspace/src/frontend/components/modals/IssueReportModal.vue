
<script setup lang="ts">
import { ref, computed } from 'vue';
import type { StationItem, IssueTypeCode, ReportResponse } from '~/types/station';
import { useUserLocation } from '~/composables/useUserLocation';
import { useProximityProof } from '~/composables/useProximityProof';
import { useStations } from '~/composables/useStations';
import { useToast } from '~/composables/useToast';
import { X, AlertTriangle, AlertCircle, CheckCircle2, ShieldAlert, RefreshCw } from 'lucide-vue-next';

const props = defineProps<{
  station: StationItem | null;
  isOpen: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'reportSubmitted', result: ReportResponse): void;
}>();

const { userCoords, calculateDistanceMeters, requestUserLocation, locationLoading, locationError } = useUserLocation();
const { getDeviceAttestation, generateNonce, generateProof } = useProximityProof();
const { submitStationReport } = useStations();
const { showToast } = useToast();

const selectedIssue = ref<IssueTypeCode>('DEFECTIVE');
const description = ref<string>('');
const isSubmitting = ref(false);
const submitError = ref<string | null>(null);

const issueTypes: { code: IssueTypeCode; label: string; desc: string }[] = [
  { code: 'DEFECTIVE', label: 'İstasyon Tamamen Kapalı / Enerji Yok', desc: 'Cihaz ekranı kapalı, elektrik gelmiyor veya şarj başlatılamıyor' },
  { code: 'CABLE_LOCKED', label: 'Kablo / Soket Fiziksel Olarak Hasarlı', desc: 'Kablo ezilmiş, soket mandalı kilitli veya kırık' },
  { code: 'ICE_BLOCK', label: 'Soket Önüne Benzinli Araç Park Etmiş (ICEing)', desc: 'Şarj alanı fosil yakıtlı araç tarafından işgal edilmiş' },
  { code: 'ACCESS_ISSUE', label: 'İstasyona Giriş / Alan Kapalı (Bariyer/İnşaat)', desc: 'Otopark kapalı, kepenk inik veya şantiye alanı' },
  { code: 'OTHER', label: 'Diğer Sorun / Yazılım Donması', desc: 'Ekran donmuş, kart okuyucu çalışmıyor veya iletişim hatası' }
];

// İstemci tarafı 50 metre mesafe kontrolü (Haversine in-memory)
const distanceMeters = computed(() => {
  if (!props.station) return null;
  return calculateDistanceMeters(props.station.lat, props.station.lon);
});

const isWithin50m = computed(() => {
  return distanceMeters.value !== null && distanceMeters.value <= 50;
});

const handleRequestLocation = async () => {
  submitError.value = null;
  await requestUserLocation();
};

const handleSubmit = async () => {
  if (!props.station) return;

  if (!isWithin50m.value) {
    showToast(
      distanceMeters.value !== null
        ? `Bildirim yapabilmek için istasyonun 50 metre yakınında olmalısınız. (Mevcut Mesafe: ~${distanceMeters.value} m)`
        : 'Arıza doğrulaması için konum izni gereklidir.',
      'error',
      4500
    );
    return;
  }

  isSubmitting.value = true;
  submitError.value = null;

  try {
    const deviceUid = getDeviceAttestation();
    const nonce = generateNonce();
    const proof = await generateProof(props.station.id, deviceUid, nonce);

    const payload = {
      issue_type: selectedIssue.value,
      nonce,
      proximity_proof: proof,
      description: description.value.trim() ? description.value.trim().slice(0, 140) : undefined
    };

    // Fastify backend API çağrısı: Sıfır Konum Saklama (Zero-Storage)
    const result = await submitStationReport(props.station.id, payload, deviceUid);

    showToast('Bildiriminiz alındı. Topluluk katkınız için teşekkürler!', 'success', 4000);

    if (result.is_flagged_defective) {
      showToast('İstasyon 3+ ihbar eşiğine ulaştı ve haritada Arızalı olarak işaretlendi.', 'info', 5000);
    }

    emit('reportSubmitted', result);
    emit('close');
    description.value = '';
  } catch (err: any) {
    const status = err?.status || err?.statusCode;
    if (status === 429) {
      submitError.value = 'Çok fazla bildirim gönderdiniz. Lütfen 5 dakika sonra tekrar deneyin.';
      showToast('Hız sınırı aşıldı. Lütfen daha sonra tekrar deneyin.', 'error', 4500);
    } else if (status === 409) {
      submitError.value = 'Bu belirteç daha önce kullanılmış (Replay attack). Lütfen formu yenileyin.';
      showToast('Belirteç çakışması oluştu. Lütfen tekrar deneyin.', 'error', 4000);
    } else if (status === 400) {
      submitError.value = 'Konumunuz istasyonla eşleşmiyor. Lütfen istasyonun yanındayken tekrar deneyin.';
      showToast('Geçersiz konum kanıtı. İstasyon yakınında olmalısınız.', 'error', 4500);
    } else {
      submitError.value = err?.data?.detail || err?.message || 'Bildirim iletilemedi. Lütfen bağlantınızı kontrol edin.';
      showToast('Bildirim gönderilirken bir hata oluştu.', 'error', 4000);
    }
  } finally {
    isSubmitting.value = false;
  }
};
</script>

<template>
  <div
    v-if="isOpen && station"
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
    role="dialog"
    aria-modal="true"
    aria-labelledby="report-modal-title"
  >
    <div
      class="w-full max-w-lg bg-bg-surface border border-border-default rounded-xl shadow-2xl p-5 sm:p-6 relative flex flex-col max-h-[90vh] overflow-y-auto"
    >
      <!-- Kapat Butonu -->
      <button
        type="button"
        @click="emit('close')"
        class="absolute top-4 right-4 touch-target-min flex items-center justify-center text-text-secondary hover:text-text-primary rounded-md focus-visible:outline-none"
        aria-label="Modalı Kapat"
      >
        <X class="w-5 h-5" />
      </button>

      <!-- Başlık -->
      <div class="flex items-center gap-2 text-danger mb-1">
        <AlertTriangle class="w-5 h-5 flex-shrink-0" />
        <h3 id="report-modal-title" class="text-lg font-bold text-text-primary">
          Arıza / Durum Bildir
        </h3>
      </div>
      <p class="text-xs text-text-secondary mb-4 leading-relaxed">
        <strong class="text-text-primary">{{ station.name }}</strong> (EPDK: {{ station.istasyon_no }})
      </p>

      <!-- 1. Konum Doğrulama Durumu (50m Güvenlik Kuralı) -->
      <div class="mb-4">
        <!-- Durum 1: Konum İzni Alınmamış / GPS Kapalı -->
        <div
          v-if="!userCoords"
          class="p-3.5 rounded-lg bg-warning-subdued border border-warning/30 text-xs text-warning flex items-start gap-3"
        >
          <AlertCircle class="w-5 h-5 flex-shrink-0 mt-0.5 text-warning" />
          <div class="space-y-1.5 flex-1">
            <p class="font-bold">Konum İzni Gerekli</p>
            <p class="text-[11px] leading-relaxed text-text-secondary">
              Arıza doğrulaması için konum izni gereklidir. İstasyonun 50m yanında olduğunuzu doğrulamadan bildirim gönderilemez.
            </p>
            <div v-if="locationError" class="text-[11px] text-danger font-medium">
              {{ locationError }}
            </div>
            <button
              type="button"
              @click="handleRequestLocation"
              :disabled="locationLoading"
              class="mt-1 px-3.5 py-1.5 bg-warning text-white rounded-md font-semibold text-xs touch-target-min flex items-center gap-1.5 hover:bg-warning/90 transition-colors focus-visible:outline-none"
            >
              <RefreshCw v-if="locationLoading" class="w-3.5 h-3.5 animate-spin" />
              <span>{{ locationLoading ? 'Konum Alınıyor...' : 'Konumumu Doğrula' }}</span>
            </button>
          </div>
        </div>

        <!-- Durum 2: İstasyon Yakınında (<= 50m Doğrulandı) -->
        <div
          v-else-if="isWithin50m"
          class="p-3 rounded-lg bg-success-subdued border border-success/30 text-xs text-success flex items-center gap-2.5"
        >
          <CheckCircle2 class="w-5 h-5 flex-shrink-0" />
          <div>
            <p class="font-bold">İstasyon yakınındasınız (~{{ distanceMeters }} m) — Doğrulandı</p>
            <p class="text-[11px] text-text-secondary leading-tight mt-0.5">
              50 metre kuralı sağlandı. Bildiriminiz kriptografik proximity proof ile tasdiklenecektir.
            </p>
          </div>
        </div>

        <!-- Durum 3: İstasyon Dışında (> 50m) -->
        <div
          v-else
          class="p-3 rounded-lg bg-danger-subdued border border-danger/30 text-xs text-danger flex items-start gap-2.5"
        >
          <ShieldAlert class="w-5 h-5 flex-shrink-0 mt-0.5 text-danger" />
          <div class="flex-1">
            <p class="font-bold">50 Metre Dışındasınız</p>
            <p class="text-[11px] text-danger-on-subdued mt-0.5 leading-relaxed">
              Bildirim yapabilmek için istasyonun 50 metre yakınında olmalısınız. (Mevcut Mesafe: ~{{ distanceMeters }} metre)
            </p>
            <button
              type="button"
              @click="handleRequestLocation"
              :disabled="locationLoading"
              class="mt-2 text-xs text-danger font-semibold underline hover:text-danger-on-subdued touch-target-min inline-flex items-center gap-1"
            >
              <span>Konumu Yeniden Kontrol Et</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Sunucu Hata Mesajı -->
      <div
        v-if="submitError"
        class="mb-3 p-2.5 rounded-md bg-danger-subdued border border-danger/40 text-xs text-danger flex items-center gap-2"
        role="alert"
      >
        <AlertCircle class="w-4 h-4 flex-shrink-0" />
        <span>{{ submitError }}</span>
      </div>

      <!-- 2. Sorun Türü Seçim Listesi -->
      <form @submit.prevent="handleSubmit" class="space-y-4">
        <div>
          <label class="block text-xs font-semibold text-text-primary mb-2">Sorun Türü Seçin</label>
          <div class="space-y-2">
            <label
              v-for="item in issueTypes"
              :key="item.code"
              class="flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all touch-target-min"
              :class="[
                selectedIssue === item.code
                  ? 'border-danger bg-danger-subdued/30 text-text-primary shadow-sm'
                  : 'border-border-default bg-bg-subdued hover:bg-border-default text-text-primary'
              ]"
            >
              <input
                type="radio"
                name="issue"
                :value="item.code"
                v-model="selectedIssue"
                class="mt-0.5 text-danger focus:ring-danger w-4 h-4"
              />
              <div class="flex-1">
                <p class="text-xs font-semibold text-text-primary">{{ item.label }}</p>
                <p class="text-[11px] text-text-secondary mt-0.5 leading-tight">{{ item.desc }}</p>
              </div>
            </label>
          </div>
        </div>

        <!-- Açıklama Giriş Alanı (Opsiyonel) -->
        <div>
          <label class="block text-xs font-semibold text-text-primary mb-1">
            Ek Detay <span class="text-text-muted font-normal">(Opsiyonel, max 140 karakter)</span>
          </label>
          <textarea
            v-model="description"
            maxlength="140"
            rows="2"
            placeholder="Örn: Ekran donmuş durumda, mandal kilitli..."
            class="w-full p-2.5 text-xs rounded-md bg-bg-subdued border border-border-default text-text-primary focus:outline-none focus:border-primary resize-none placeholder:text-text-muted"
          ></textarea>
        </div>

        <!-- Gönder Butonu -->
        <button
          type="submit"
          :disabled="!isWithin50m || isSubmitting"
          class="w-full h-12 rounded-md text-xs font-semibold flex items-center justify-center gap-2 touch-target-min transition-all focus-visible:outline-none"
          :class="[
            isWithin50m && !isSubmitting
              ? 'bg-danger text-white hover:bg-danger/90 active:scale-98 shadow-sm cursor-pointer'
              : 'bg-border-strong text-text-muted cursor-not-allowed'
          ]"
        >
          <RefreshCw v-if="isSubmitting" class="w-4 h-4 animate-spin" />
          <span>{{ isSubmitting ? 'Doğrulanıyor ve Gönderiliyor...' : 'Bildirimi Gönder' }}</span>
        </button>

        <p class="text-[10px] text-text-muted text-center leading-relaxed">
          KVKK Güvencesi: Kullanıcı GPS koordinatları sunucuda saklanmaz; yalnızca tek seferlik mesafe doğrulama sonucu kaydedilir.
        </p>
      </form>
    </div>
  </div>
</template>
