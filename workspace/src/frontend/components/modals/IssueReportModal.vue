
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

const { calculateDistanceMeters, requestUserLocation, locationLoading, locationError } = useUserLocation();
const { getDeviceAttestation, generateNonce, generateProof } = useProximityProof();
const { submitStationReport } = useStations();
const { showToast } = useToast();
const isTeleportDisabled = import.meta.env?.MODE === 'test' || (typeof process !== 'undefined' && process.env?.NODE_ENV === 'test');

const selectedIssue = ref<IssueTypeCode>('DEFECTIVE');
const description = ref<string>('');
const isSubmitting = ref(false);
const submitError = ref<string | null>(null);

const issueTypes: { code: IssueTypeCode; label: string; desc: string }[] = [
  { code: 'DEFECTIVE', label: 'İstasyon Tamamen Kapalı / Enerji Yok', desc: 'Cihaz ekranı kapalı, elektrik gelmiyor veya şarj başlatılamıyor' },
  { code: 'CABLE_LOCKED', label: 'Kablo / Soket Fiziksel Olarak Hasarlı', desc: 'Kablo ezilmiş, soket mandalı kilitli veya kırık' },
  { code: 'ICE_BLOCK', label: 'Soket Önüne Benzinli Araç Park Etmiş (ICEing)', desc: 'Şarj alanı fosil yakıtlı araç tarafından işgal edilmiş' },
  { code: 'ACCESS_ISSUE', label: 'İstasyona Giriş / Alan Kapalı (Bariyer/İnşaat)', desc: 'Otopark kapalı, kepenk inik veya şantiye alanı' },
  { code: 'OTHER', label: 'Diğer Sorun / Yazılım Donması', desc: 'Ekran donmuş, kart okuyucu çalışmıyor veya iletişim hatası' },
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
      description: description.value.trim() ? description.value.trim().slice(0, 140) : undefined,
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
      submitError.value = 'Bu istasyon için son 15 dakika içinde zaten bir bildirimde bulundunuz.';
      showToast('Tekrarlanan bildirim engellendi.', 'warning', 4000);
    } else {
      submitError.value = err.message || 'Bildirim kaydedilemedi. Lütfen tekrar deneyin.';
    }
  } finally {
    isSubmitting.value = false;
  }
};
</script>

<template>
  <Teleport to="body" :disabled="isTeleportDisabled">
    <div
      v-if="isOpen && station"
      class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-modal-title"
    >
      <div
        class="w-full max-w-lg bg-bg-surface border border-border-default rounded-xl shadow-2xl p-6 relative flex flex-col max-h-[90vh] overflow-y-auto"
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
          <ShieldAlert class="w-6 h-6 text-danger" />
          <h3 id="report-modal-title" class="text-base font-bold text-text-primary">
            Arıza / Durum Bildir
          </h3>
        </div>
        <p class="text-xs text-text-secondary mb-4 leading-relaxed">
          <strong class="text-text-primary">{{ station.name }}</strong> için arıza durumu bildirin.
          <span class="block text-[11px] text-text-muted mt-0.5">
            KVKK Güvencesi: Konum koordinatlarınız sunucuda asla saklanmaz. Yalnızca 50m yakınlık doğrulama kanıtı iletilir.
          </span>
        </p>

        <!-- 1. Konum İzni ve 50m Yakınlık Kontrolü -->
        <div class="mb-4 p-3.5 rounded-lg border text-xs space-y-2" :class="isWithin50m ? 'bg-success-subdued border-success/30' : 'bg-warning-subdued border-warning/30'">
          <div class="flex items-start justify-between gap-2">
            <div class="flex items-center gap-2">
              <CheckCircle2 v-if="isWithin50m" class="w-4 h-4 text-success flex-shrink-0" />
              <AlertTriangle v-else class="w-4 h-4 text-warning flex-shrink-0" />
              <span class="font-bold text-text-primary">
                {{ isWithin50m ? 'Konum Doğrulandı (İstasyon Yanındasınız)' : '50 Metre Yakınlık Şartı' }}
              </span>
            </div>

            <button
              type="button"
              @click="handleRequestLocation"
              :disabled="locationLoading"
              class="px-2 py-1 rounded bg-bg-surface border border-border-strong text-[11px] font-semibold text-text-primary hover:bg-border-default touch-target-min flex items-center gap-1 flex-shrink-0 transition-colors focus-visible:outline-none"
            >
              <RefreshCw class="w-3 h-3" :class="{ 'animate-spin': locationLoading }" />
              <span>{{ locationLoading ? 'Alınıyor...' : 'Konumu Yenile' }}</span>
            </button>
          </div>

          <p class="text-text-secondary leading-relaxed">
            <template v-if="isWithin50m">
              İstasyona olan mesafeniz: <strong class="text-success font-mono">~{{ distanceMeters }} metre</strong>. Bildirim gönderebilirsiniz.
            </template>
            <template v-else-if="distanceMeters !== null">
              Mevcut mesafe: <strong class="text-danger font-mono">~{{ distanceMeters }} metre</strong>. Asılsız ihbarları önlemek için bildirim yalnızca istasyonun 50 metre yakınındayken gönderilebilir.
            </template>
            <template v-else>
              Yakınlık doğrulaması için tarayıcınızın konum iznini onaylamanız gerekmektedir.
            </template>
          </p>

          <p v-if="locationError" class="text-danger text-[11px] font-medium">
            {{ locationError }}
          </p>
        </div>

        <!-- 2. Arıza Türü Seçimi -->
        <div class="space-y-3 mb-4">
          <label class="block text-xs font-bold text-text-primary uppercase tracking-wider">
            Sorun Türü
          </label>
          <div class="space-y-2">
            <label
              v-for="it in issueTypes"
              :key="it.code"
              class="flex items-start gap-2.5 p-3 rounded-lg border border-border-default cursor-pointer transition-colors touch-target-min"
              :class="selectedIssue === it.code ? 'bg-primary/5 border-primary ring-1 ring-primary' : 'bg-bg-surface hover:bg-bg-subdued'"
            >
              <input
                type="radio"
                name="issueType"
                :value="it.code"
                v-model="selectedIssue"
                class="mt-0.5 text-primary focus:ring-primary"
              />
              <div class="text-xs leading-tight">
                <span class="font-bold text-text-primary block">{{ it.label }}</span>
                <span class="text-text-secondary text-[11px] block mt-0.5">{{ it.desc }}</span>
              </div>
            </label>
          </div>
        </div>

        <!-- 3. İsteğe Bağlı Açıklama (Maks 140 Karakter) -->
        <div class="mb-4">
          <label class="block text-xs font-semibold text-text-primary mb-1">
            Açıklama (İsteğe Bağlı - Maks 140 Karakter)
          </label>
          <textarea
            v-model="description"
            maxlength="140"
            rows="2"
            placeholder="Ek detay ekleyin (örn: Ekran donmuş durumda)..."
            class="w-full text-xs p-2.5 rounded-md border border-border-default bg-bg-surface text-text-primary focus:outline-none focus:border-primary placeholder:text-text-muted resize-none"
          ></textarea>
          <span class="text-[10px] text-text-muted float-right mt-0.5">
            {{ description.length }}/140
          </span>
        </div>

        <!-- Hata Uyarısı -->
        <div v-if="submitError" class="mb-4 p-2.5 rounded-md bg-danger-subdued border border-danger/30 text-danger text-xs flex items-center gap-2">
          <AlertCircle class="w-4 h-4 flex-shrink-0" />
          <span>{{ submitError }}</span>
        </div>

        <!-- Gönder Butonu -->
        <button
          type="button"
          @click="handleSubmit"
          :disabled="!isWithin50m || isSubmitting"
          class="w-full h-12 rounded-md font-semibold text-xs flex items-center justify-center gap-2 shadow-md transition-all touch-target-min focus-visible:outline-none"
          :class="
            isWithin50m && !isSubmitting
              ? 'bg-danger hover:bg-danger/90 text-white'
              : 'bg-bg-subdued text-text-muted border border-border-default cursor-not-allowed'
          "
        >
          <ShieldAlert class="w-4 h-4" />
          <span>{{ isSubmitting ? 'Bildirim İletiliyor...' : 'Doğrulanmış Bildirimi Gönder' }}</span>
        </button>
      </div>
    </div>
  </Teleport>
</template>
