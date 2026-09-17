
import { workerService } from './modules/worker/worker.service.js';
import { skipLockedQueue } from './modules/queue/skip-locked-queue.js';
import { config } from './config/env.js';

console.log(`[Worker] elektriklioto-worker süreci başlatılıyor... (PID: ${process.pid})`);

// Periyodik işleri kuyruğa tanımla
async function schedulePeriodicJobs() {
  // 15 dakikada bir CPO senkronizasyon işleri
  await skipLockedQueue.enqueue('cpo_sync', {
    operatorId: 1,
    sourceName: 'ZES Canlı Veri Ucu',
    endpointUrl: 'https://api.zes.net/v1/stations/public',
  });

  await skipLockedQueue.enqueue('cpo_sync', {
    operatorId: 2,
    sourceName: 'Trugo Canlı Veri Ucu',
    endpointUrl: 'https://api.trugo.com.tr/v1/stations/public',
  });

  await skipLockedQueue.enqueue('cpo_sync', {
    operatorId: 3,
    sourceName: 'Eşarj Canlı Veri Ucu',
    endpointUrl: 'https://api.esarj.com/v1/stations/public',
  });

  // Saatlik veri tazelik ve sağlık denetimi
  await skipLockedQueue.enqueue('source_health_check', {});

  // 24 saatlik eski iş temizliği
  await skipLockedQueue.enqueue('cleanup_queue', { retentionHours: 24 });
}

// Worker döngüsünü başlat
const pollIntervalMs = config.workerPollIntervalMs || 1000;
workerService.start(pollIntervalMs);

schedulePeriodicJobs()
  .then(() => {
    console.log(`[Worker] Periyodik görevler kuyruğa eklendi. Polling aralığı: ${pollIntervalMs}ms`);
  })
  .catch((err) => {
    console.error('[Worker] Periyodik görevler eklenirken hata:', err);
  });

// Graceful shutdown
const shutdown = () => {
  console.log('[Worker] Kapanma sinyali alındı. Worker durduruluyor...');
  workerService.stop();
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
