
import { randomUUID } from 'node:crypto';
import { sql } from 'drizzle-orm';
import { getDb } from '../../db/index.js';
import { sysJobQueue } from '../../db/schema/jobs.js';
import { JobRecord, JobStatus, EnqueueOptions, QueueStats } from './queue.types.js';

/**
 * PostgreSQL FOR UPDATE SKIP LOCKED Tabanlı İş Kuyruğu (skip_locked_queue)
 * 
 * ZORUNLU KISIT: Redis/RabbitMQ eklenmez.
 * Drizzle ORM ve PostgreSQL SKIP LOCKED deseni ile kilit çakışmasız (zero lock conflict)
 * asenkron görev tüketimi sağlar. Veritabanı bağlantısı olmadığında veya birim testlerde
 * in-memory atomic repository üzerinden tam uyumlu çalışır.
 */
export class SkipLockedQueue {
  private inMemoryJobs = new Map<string, JobRecord>();
  private useInMemory: boolean;

  constructor(forceInMemory = false) {
    this.useInMemory = forceInMemory;
  }

  public setUseInMemory(val: boolean): void {
    this.useInMemory = val;
  }

  public async enqueue(
    name: string,
    payload: Record<string, unknown> = {},
    options?: EnqueueOptions
  ): Promise<JobRecord> {
    const now = new Date();
    const job: JobRecord = {
      id: randomUUID(),
      name,
      payload,
      status: 'pending',
      attempts: 0,
      max_attempts: options?.maxAttempts ?? 3,
      run_at: options?.runAt ?? now,
      locked_at: null,
      locked_by: null,
      last_error: null,
      created_at: now,
      updated_at: now,
    };

    if (!this.useInMemory) {
      try {
        const db = getDb();
        await db.insert(sysJobQueue).values({
          id: job.id,
          name: job.name,
          payload: job.payload,
          status: job.status,
          attempts: job.attempts,
          max_attempts: job.max_attempts,
          run_at: job.run_at,
          created_at: job.created_at,
          updated_at: job.updated_at,
        });
        return job;
      } catch {
        // DB ulaşılamazsa in-memory fallback
        this.useInMemory = true;
      }
    }

    this.inMemoryJobs.set(job.id, { ...job });
    return job;
  }

  /**
   * Sıradaki uygun işi kilit çakışması olmadan çeker.
   * PostgreSQL: SELECT ... FOR UPDATE SKIP LOCKED
   */
  public async acquireNextJob(workerId: string): Promise<JobRecord | null> {
    const now = new Date();

    if (!this.useInMemory) {
      try {
        const db = getDb();
        const result = await db.execute<{
          id: string;
          name: string;
          payload: Record<string, unknown>;
          status: JobStatus;
          attempts: number;
          max_attempts: number;
          run_at: string;
          locked_at: string | null;
          locked_by: string | null;
          last_error: string | null;
          created_at: string;
          updated_at: string;
        }>(sql`
          WITH next_job AS (
            SELECT id FROM sys_job_queue
            WHERE status = 'pending' AND run_at <= ${now}
            ORDER BY run_at ASC, created_at ASC
            LIMIT 1
            FOR UPDATE SKIP LOCKED
          )
          UPDATE sys_job_queue
          SET status = 'processing',
              locked_at = ${now},
              locked_by = ${workerId},
              attempts = sys_job_queue.attempts + 1,
              updated_at = ${now}
          FROM next_job
          WHERE sys_job_queue.id = next_job.id
          RETURNING sys_job_queue.*;
        `);

        if (result && result.length > 0) {
          const row = result[0];
          return {
            id: row.id,
            name: row.name,
            payload: row.payload || {},
            status: row.status,
            attempts: Number(row.attempts),
            max_attempts: Number(row.max_attempts),
            run_at: new Date(row.run_at),
            locked_at: row.locked_at ? new Date(row.locked_at) : null,
            locked_by: row.locked_by,
            last_error: row.last_error,
            created_at: new Date(row.created_at),
            updated_at: new Date(row.updated_at),
          };
        }
        return null;
      } catch {
        this.useInMemory = true;
      }
    }

    // In-Memory atomic kilitleme simülasyonu (SKIP LOCKED davranışı)
    for (const job of this.inMemoryJobs.values()) {
      if (job.status === 'pending' && job.run_at <= now) {
        job.status = 'processing';
        job.locked_at = now;
        job.locked_by = workerId;
        job.attempts += 1;
        job.updated_at = now;
        return { ...job };
      }
    }

    return null;
  }

  public async completeJob(jobId: string): Promise<void> {
    const now = new Date();

    if (!this.useInMemory) {
      try {
        const db = getDb();
        await db.execute(sql`
          UPDATE sys_job_queue
          SET status = 'completed',
              locked_at = NULL,
              locked_by = NULL,
              updated_at = ${now}
          WHERE id = ${jobId};
        `);
        return;
      } catch {
        this.useInMemory = true;
      }
    }

    const job = this.inMemoryJobs.get(jobId);
    if (job) {
      job.status = 'completed';
      job.locked_at = null;
      job.locked_by = null;
      job.updated_at = now;
    }
  }

  public async failJob(jobId: string, error: Error | string): Promise<void> {
    const errorMsg = typeof error === 'string' ? error : error.message;
    const now = new Date();

    if (!this.useInMemory) {
      try {
        const db = getDb();
        // İşin mevcut durumunu ve attempts sayısını kontrol et
        const existing = await this.getJobById(jobId);
        if (existing) {
          const isRetryable = existing.attempts < existing.max_attempts;
          if (isRetryable) {
            const backoffSeconds = Math.min(Math.pow(2, existing.attempts) * 2, 3600);
            const nextRun = new Date(Date.now() + backoffSeconds * 1000);
            await db.execute(sql`
              UPDATE sys_job_queue
              SET status = 'pending',
                  run_at = ${nextRun},
                  last_error = ${errorMsg},
                  locked_at = NULL,
                  locked_by = NULL,
                  updated_at = ${now}
              WHERE id = ${jobId};
            `);
          } else {
            await db.execute(sql`
              UPDATE sys_job_queue
              SET status = 'failed',
                  last_error = ${errorMsg},
                  locked_at = NULL,
                  locked_by = NULL,
                  updated_at = ${now}
              WHERE id = ${jobId};
            `);
          }
          return;
        }
      } catch {
        this.useInMemory = true;
      }
    }

    const job = this.inMemoryJobs.get(jobId);
    if (job) {
      const isRetryable = job.attempts < job.max_attempts;
      if (isRetryable) {
        const backoffSeconds = Math.min(Math.pow(2, job.attempts) * 2, 3600);
        job.status = 'pending';
        job.run_at = new Date(Date.now() + backoffSeconds * 1000);
        job.last_error = errorMsg;
        job.locked_at = null;
        job.locked_by = null;
        job.updated_at = now;
      } else {
        job.status = 'failed';
        job.last_error = errorMsg;
        job.locked_at = null;
        job.locked_by = null;
        job.updated_at = now;
      }
    }
  }

  public async getJobById(jobId: string): Promise<JobRecord | null> {
    if (!this.useInMemory) {
      try {
        const db = getDb();
        const result = await db.execute<{
          id: string;
          name: string;
          payload: Record<string, unknown>;
          status: JobStatus;
          attempts: number;
          max_attempts: number;
          run_at: string;
          locked_at: string | null;
          locked_by: string | null;
          last_error: string | null;
          created_at: string;
          updated_at: string;
        }>(sql`
          SELECT * FROM sys_job_queue WHERE id = ${jobId} LIMIT 1;
        `);

        if (result && result.length > 0) {
          const row = result[0];
          return {
            id: row.id,
            name: row.name,
            payload: row.payload || {},
            status: row.status,
            attempts: Number(row.attempts),
            max_attempts: Number(row.max_attempts),
            run_at: new Date(row.run_at),
            locked_at: row.locked_at ? new Date(row.locked_at) : null,
            locked_by: row.locked_by,
            last_error: row.last_error,
            created_at: new Date(row.created_at),
            updated_at: new Date(row.updated_at),
          };
        }
        return null;
      } catch {
        this.useInMemory = true;
      }
    }

    const job = this.inMemoryJobs.get(jobId);
    return job ? { ...job } : null;
  }

  public async updateJob(jobId: string, updates: Partial<JobRecord>): Promise<void> {
    if (!this.useInMemory) {
      try {
        const db = getDb();
        if (updates.run_at) {
          await db.execute(sql`UPDATE sys_job_queue SET run_at = ${updates.run_at} WHERE id = ${jobId};`);
        }
        if (updates.updated_at) {
          await db.execute(sql`UPDATE sys_job_queue SET updated_at = ${updates.updated_at} WHERE id = ${jobId};`);
        }
      } catch {
        this.useInMemory = true;
      }
    }
    const job = this.inMemoryJobs.get(jobId);
    if (job) {
      Object.assign(job, updates);
    }
  }

  /**
   * 24 saatten eski tamamlanmış işleri temizler (DoD & KVKK kuralı)
   */
  public async cleanupOldCompletedJobs(retentionHours = 24): Promise<number> {
    const threshold = new Date(Date.now() - retentionHours * 60 * 60 * 1000);
    let deletedCount = 0;

    if (!this.useInMemory) {
      try {
        const db = getDb();
        const res = await db.execute(sql`
          DELETE FROM sys_job_queue
          WHERE status = 'completed' AND updated_at < ${threshold};
        `);
        return Number((res as any)?.count || 0);
      } catch {
        this.useInMemory = true;
      }
    }

    for (const [id, job] of this.inMemoryJobs.entries()) {
      if (job.status === 'completed' && job.updated_at < threshold) {
        this.inMemoryJobs.delete(id);
        deletedCount += 1;
      }
    }

    return deletedCount;
  }

  public async getStats(): Promise<QueueStats> {
    const stats: QueueStats = {
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0,
      total: 0,
    };

    if (!this.useInMemory) {
      try {
        const db = getDb();
        const res = await db.execute<{ status: JobStatus; count: string }>(sql`
          SELECT status, COUNT(*)::text as count
          FROM sys_job_queue
          GROUP BY status;
        `);

        for (const row of res) {
          const count = Number(row.count);
          stats.total += count;
          if (row.status === 'pending') stats.pending = count;
          else if (row.status === 'processing') stats.processing = count;
          else if (row.status === 'completed') stats.completed = count;
          else if (row.status === 'failed') stats.failed = count;
        }
        return stats;
      } catch {
        this.useInMemory = true;
      }
    }

    for (const job of this.inMemoryJobs.values()) {
      stats.total += 1;
      if (job.status === 'pending') stats.pending += 1;
      else if (job.status === 'processing') stats.processing += 1;
      else if (job.status === 'completed') stats.completed += 1;
      else if (job.status === 'failed') stats.failed += 1;
    }

    return stats;
  }

  public clear(): void {
    this.inMemoryJobs.clear();
  }
}

export const skipLockedQueue = new SkipLockedQueue();
