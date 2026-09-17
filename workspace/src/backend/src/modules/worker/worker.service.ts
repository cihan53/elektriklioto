
import { randomUUID } from 'node:crypto';
import { skipLockedQueue } from '../queue/skip-locked-queue.js';
import { cpoSyncService } from './cpo-sync.service.js';
import { sourceHealthService } from './source-health.service.js';

export type JobHandler = (payload: Record<string, unknown>) => Promise<any>;

/**
 * PostgreSQL SKIP LOCKED Tabanlı Arka Plan Worker Servisi
 * 
 * Bağımsız bir süreçte (worker process) çalışır.
 * Kuyruktan FOR UPDATE SKIP LOCKED ile işleri tüketir,
 * hata durumunda üstel geri çekilme (exponential backoff) uygular.
 */
export class WorkerService {
  private workerId: string;
  private isRunning = false;
  private pollTimer: NodeJS.Timeout | null = null;
  private handlers = new Map<string, JobHandler>();

  constructor(workerId?: string) {
    this.workerId = workerId || `worker-${randomUUID().slice(0, 8)}`;
    this.registerDefaultHandlers();
  }

  public getWorkerId(): string {
    return this.workerId;
  }

  public registerHandler(name: string, handler: JobHandler): void {
    this.handlers.set(name, handler);
  }

  private registerDefaultHandlers(): void {
    // 1. CPO Senkronizasyon Görevi
    this.registerHandler('cpo_sync', async (payload) => {
      const operatorId = Number(payload.operatorId || 1);
      const sourceName = String(payload.sourceName || 'ZES Canlı Veri Ucu');
      const endpointUrl = String(payload.endpointUrl || 'https://api.zes.net/v1/stations/public');
      return cpoSyncService.syncOperator(operatorId, sourceName, endpointUrl);
    });

    // 2. Sağlık ve Tazelik Değerlendirme Görevi
    this.registerHandler('source_health_check', async () => {
      const staleSources = sourceHealthService.getStaleSources(24);
      return {
        evaluated_at: new Date().toISOString(),
        stale_count: staleSources.length,
        stale_sources: staleSources.map((s) => s.source_name),
      };
    });

    // 3. 24 Saatlik Kuyruk Temizleme Görevi
    this.registerHandler('cleanup_queue', async (payload) => {
      const retentionHours = Number(payload.retentionHours || 24);
      const deletedCount = await skipLockedQueue.cleanupOldCompletedJobs(retentionHours);
      return { deleted_count: deletedCount };
    });
  }

  /**
   * Sıradaki tek bir işi kuyruktan çeker ve işler.
   * @returns boolean - Bir iş işlendiyse true, kuyruk boşsa false
   */
  public async processNextJob(): Promise<boolean> {
    const job = await skipLockedQueue.acquireNextJob(this.workerId);
    if (!job) {
      return false;
    }

    try {
      const handler = this.handlers.get(job.name);
      if (!handler) {
        throw new Error(`Kayıtlı iş işleyicisi (handler) bulunamadı: ${job.name}`);
      }

      await handler(job.payload);
      await skipLockedQueue.completeJob(job.id);
      return true;
    } catch (err: any) {
      await skipLockedQueue.failJob(job.id, err);
      return true;
    }
  }

  /**
   * Kuyruktaki tüm uygun işleri tek seferde boşalana kadar işler (test ve senkron çalışma için).
   */
  public async runBatch(maxJobs = 50): Promise<number> {
    let processed = 0;
    while (processed < maxJobs) {
      const hadJob = await this.processNextJob();
      if (!hadJob) break;
      processed += 1;
    }
    return processed;
  }

  /**
   * Worker sürecini sürekli dinleme döngüsünde başlatır.
   */
  public start(pollIntervalMs = 1000): void {
    if (this.isRunning) return;
    this.isRunning = true;

    const poll = async () => {
      if (!this.isRunning) return;

      try {
        await this.processNextJob();
      } catch (err) {
        console.error(`[${this.workerId}] İş yürütülürken hata:`, err);
      } finally {
        if (this.isRunning) {
          this.pollTimer = setTimeout(poll, pollIntervalMs);
        }
      }
    };

    this.pollTimer = setTimeout(poll, pollIntervalMs);
  }

  public stop(): void {
    this.isRunning = false;
    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
      this.pollTimer = null;
    }
  }

  public isActive(): boolean {
    return this.isRunning;
  }
}

export const workerService = new WorkerService();
