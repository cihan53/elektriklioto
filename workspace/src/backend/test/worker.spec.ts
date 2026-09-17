
import { describe, it, expect, beforeEach } from 'vitest';
import { CircuitBreakerService, BrokenCircuitError } from '../src/modules/worker/circuit-breaker.service.js';
import { AggregatorHttpClient } from '../src/modules/worker/http-client.js';
import { SourceHealthService } from '../src/modules/worker/source-health.service.js';
import { CPOSyncService } from '../src/modules/worker/cpo-sync.service.js';
import { WorkerService } from '../src/modules/worker/worker.service.js';
import { skipLockedQueue } from '../src/modules/queue/skip-locked-queue.js';
import { stationRepository } from '../src/modules/stations/station.service.js';

describe('S5 - US-17 & US-18: Circuit Breaker, CPO Sync ve Veri Tazeliği Testleri', () => {
  let cbService: CircuitBreakerService;
  let healthService: SourceHealthService;

  beforeEach(() => {
    cbService = new CircuitBreakerService(5, 1000); // 5 hata, 1s cooldown
    healthService = new SourceHealthService();
    skipLockedQueue.clear();
    skipLockedQueue.setUseInMemory(true);
    stationRepository.initDefaults();
  });

  it('TC-CB-01: Başarılı çağrılarda devre CLOSED kalmalıdır', async () => {
    const result = await cbService.execute('test-source', async () => 'OK');
    expect(result).toBe('OK');
    expect(cbService.getState('test-source')).toBe('CLOSED');
    expect(cbService.isCircuitOpen('test-source')).toBe(false);
  });

  it('TC-CB-02: 5 ardışık 5xx veya 429 hatasında Circuit Breaker OPEN durumuna geçmelidir', async () => {
    const source = 'zes-cpo-api';

    // 4 hata: Devre hala CLOSED
    for (let i = 0; i < 4; i++) {
      try {
        await cbService.execute(source, async () => {
          throw new Error(`HTTP 500 İç Sunucu Hatası #${i}`);
        });
      } catch {
        // beklenen hata
      }
      expect(cbService.getState(source)).toBe('CLOSED');
    }

    // 5. hata: Devre OPEN olmalı
    try {
      await cbService.execute(source, async () => {
        throw new Error('HTTP 429 Too Many Requests');
      });
    } catch {
      // beklenen hata
    }

    expect(cbService.getState(source)).toBe('OPEN');
    expect(cbService.isCircuitOpen(source)).toBe(true);

    // 6. çağrı: Dış uca gitmeden anında BrokenCircuitError fırlatmalı (fast-fail)
    let externalCallAttempted = false;
    await expect(
      cbService.execute(source, async () => {
        externalCallAttempted = true;
        return 'not reached';
      })
    ).rejects.toThrow(BrokenCircuitError);

    expect(externalCallAttempted).toBe(false);
  });

  it('TC-HTTP-01: Jitter fonksiyonu 500ms - 2000ms aralığında değer üretmelidir', () => {
    const client = new AggregatorHttpClient();
    for (let i = 0; i < 20; i++) {
      const jitter = client.calculateJitter(500, 2000);
      expect(jitter).toBeGreaterThanOrEqual(500);
      expect(jitter).toBeLessThanOrEqual(2000);
    }
  });

  it('TC-SYNC-01: CPO Senkronizasyonu başarılı olduğunda istasyon updated_at zamanı güncellenmelidir', async () => {
    const syncService = new CPOSyncService();
    const station = await stationRepository.findBySlug('kadikoy-moda-zes-1');
    expect(station).not.toBeNull();

    const oldDate = new Date('2026-09-06T12:00:00Z');
    station!.updated_at = oldDate;

    const result = await syncService.syncOperator(
      1, // ZES operator ID
      'ZES Test Ucu',
      'https://api.zes.net/v1/stations/public',
      async () => ({ status: 'success', stations: [] }) // Mock başarılı veri
    );

    expect(result.syncedCount).toBeGreaterThanOrEqual(1);
    expect(station!.updated_at.getTime()).toBeGreaterThan(oldDate.getTime());
  });

  it('TC-FRESH-01: 24 saatten eski istasyonlar için "Son güncelleme: X gün/saat önce" rozeti üretilmelidir', () => {
    const now = new Date('2026-09-13T12:00:00Z');

    // 2 saat önce
    const date2h = new Date('2026-09-13T10:00:00Z');
    const f2h = healthService.formatFreshness(date2h, now);
    expect(f2h.is_stale).toBe(false);
    expect(f2h.last_updated_text).toBe('Son güncelleme: 2 saat önce');

    // 25 saat önce (> 24 saat kuralı)
    const date25h = new Date('2026-09-12T11:00:00Z');
    const f25h = healthService.formatFreshness(date25h, now);
    expect(f25h.is_stale).toBe(true);
    expect(f25h.last_updated_text).toBe('Son güncelleme: 1 gün önce');

    // 3 gün önce
    const date3d = new Date('2026-09-10T12:00:00Z');
    const f3d = healthService.formatFreshness(date3d, now);
    expect(f3d.is_stale).toBe(true);
    expect(f3d.last_updated_text).toBe('Son güncelleme: 3 gün önce');

    // Boş veri
    const fNull = healthService.formatFreshness(null, now);
    expect(fNull.is_stale).toBe(true);
    expect(fNull.last_updated_text).toBe('Operatör Verisi Bekleniyor');
  });

  it('TC-FRESH-02: 24 saattir güncellenmeyen kaynaklar tespit edilmeli ancak sistem çalışmaya devam etmelidir', () => {
    const staleSources = healthService.getStaleSources(24);
    // Varsayılan tohumlanan EPDK ucu 25 saat önce olarak başlatılmıştı
    expect(staleSources.length).toBeGreaterThanOrEqual(1);
    expect(staleSources.some((s) => s.source_name === 'EPDK Kamusal Sorgu Ucu')).toBe(true);

    // Sistem %100 kesintisiz hizmet vermeli (hata fırlatmamalı)
    const allSources = healthService.getAllSources();
    expect(allSources.length).toBe(4);
  });

  it('TC-WORKER-01: Worker servisi kuyruktaki görevleri başarıyla tüketebilmelidir', async () => {
    const worker = new WorkerService('test-worker-1');

    await skipLockedQueue.enqueue('source_health_check', {});
    await skipLockedQueue.enqueue('cleanup_queue', { retentionHours: 24 });

    const processed = await worker.runBatch(5);
    expect(processed).toBe(2);

    const stats = await skipLockedQueue.getStats();
    expect(stats.completed).toBe(2);
    expect(stats.pending).toBe(0);
  });
});
