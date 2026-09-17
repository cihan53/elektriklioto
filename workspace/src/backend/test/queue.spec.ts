
import { describe, it, expect, beforeEach } from 'vitest';
import { SkipLockedQueue } from '../src/modules/queue/skip-locked-queue.js';

describe('S5 - US-16: PostgreSQL FOR UPDATE SKIP LOCKED İş Kuyruğu Testleri', () => {
  let queue: SkipLockedQueue;

  beforeEach(() => {
    queue = new SkipLockedQueue(true); // In-memory atomic test modu
  });

  it('TC-QUEUE-01: İş başarıyla kuyruğa eklenmeli ve pending durumunda olmalıdır', async () => {
    const job = await queue.enqueue('test_job', { foo: 'bar' });

    expect(job.id).toBeDefined();
    expect(job.name).toBe('test_job');
    expect(job.status).toBe('pending');
    expect(job.attempts).toBe(0);
    expect(job.max_attempts).toBe(3);
    expect(job.payload).toEqual({ foo: 'bar' });

    const stats = await queue.getStats();
    expect(stats.pending).toBe(1);
    expect(stats.total).toBe(1);
  });

  it('TC-QUEUE-02: Worker işi aldığında processing durumuna geçmeli ve locked_by atanmalıdır', async () => {
    await queue.enqueue('sync_task', { operatorId: 1 });

    const acquired = await queue.acquireNextJob('worker-node-1');
    expect(acquired).not.toBeNull();
    expect(acquired?.name).toBe('sync_task');
    expect(acquired?.status).toBe('processing');
    expect(acquired?.locked_by).toBe('worker-node-1');
    expect(acquired?.attempts).toBe(1);

    // Başka bir worker aynı anda aldığında kuyruk boş dönmelidir (kilit çakışması 0)
    const secondTry = await queue.acquireNextJob('worker-node-2');
    expect(secondTry).toBeNull();
  });

  it('TC-QUEUE-03: Eşzamanlı 4 worker çalışırken her biri farklı iş almalı, kilit çakışması olmamalıdır', async () => {
    // 4 bağımsız iş ekle
    await queue.enqueue('job_1', { idx: 1 });
    await queue.enqueue('job_2', { idx: 2 });
    await queue.enqueue('job_3', { idx: 3 });
    await queue.enqueue('job_4', { idx: 4 });

    const workerIds = ['worker-A', 'worker-B', 'worker-C', 'worker-D'];

    // 4 worker eşzamanlı olarak iş çekiyor
    const results = await Promise.all(
      workerIds.map((wId) => queue.acquireNextJob(wId))
    );

    // Hiçbiri null dönmemeli
    expect(results.every((r) => r !== null)).toBe(true);

    // Alınan iş ID'leri tamamen benzersiz olmalı (kilit çakışması 0 kuralı)
    const jobIds = results.map((r) => r!.id);
    const uniqueJobIds = new Set(jobIds);
    expect(uniqueJobIds.size).toBe(4);

    // Alınan işlerin locked_by değerleri eşleşmeli
    for (let i = 0; i < 4; i++) {
      expect(results[i]?.locked_by).toBe(workerIds[i]);
      expect(results[i]?.status).toBe('processing');
    }

    // 5. istek null dönmeli
    const extra = await queue.acquireNextJob('worker-E');
    expect(extra).toBeNull();
  });

  it('TC-QUEUE-04: Başarılı iş tamamlandı (completed) durumuna alınmalıdır', async () => {
    const job = await queue.enqueue('complete_task', {});
    await queue.acquireNextJob('worker-1');

    await queue.completeJob(job.id);

    const updated = await queue.getJobById(job.id);
    expect(updated?.status).toBe('completed');
    expect(updated?.locked_by).toBeNull();

    const stats = await queue.getStats();
    expect(stats.completed).toBe(1);
    expect(stats.processing).toBe(0);
  });

  it('TC-QUEUE-05: Başarısız iş üstel geri çekilme (exponential backoff) ile denenmeli, 3 denemeden sonra failed olmalıdır', async () => {
    const job = await queue.enqueue('flaky_task', {}, { maxAttempts: 3 });

    // 1. Deneme
    const a1 = await queue.acquireNextJob('worker-1');
    expect(a1?.attempts).toBe(1);
    await queue.failJob(job.id, new Error('Geçici ağ hatası'));

    let j = await queue.getJobById(job.id);
    expect(j?.status).toBe('pending');
    expect(j?.last_error).toBe('Geçici ağ hatası');
    expect(j?.run_at.getTime()).toBeGreaterThan(Date.now()); // Gelecekte bir zamana ötelendi

    // Yeniden deneme için run_at zamanını şimdiye çekelim
    await queue.updateJob(job.id, { run_at: new Date(Date.now() - 1000) });

    // 2. Deneme
    const a2 = await queue.acquireNextJob('worker-1');
    expect(a2?.attempts).toBe(2);
    await queue.failJob(job.id, 'Zaman aşımı');

    j = await queue.getJobById(job.id);
    expect(j?.status).toBe('pending');
    await queue.updateJob(job.id, { run_at: new Date(Date.now() - 1000) });

    // 3. Deneme (Son hak)
    const a3 = await queue.acquireNextJob('worker-1');
    expect(a3?.attempts).toBe(3);
    await queue.failJob(job.id, 'Kalıcı hata');

    // 3 deneme bittiği için artık 'failed' olmalı
    j = await queue.getJobById(job.id);
    expect(j?.status).toBe('failed');
    expect(j?.last_error).toBe('Kalıcı hata');

    // Tekrar acquire edilmemeli
    const next = await queue.acquireNextJob('worker-1');
    expect(next).toBeNull();
  });

  it('TC-QUEUE-06: 24 saatten eski tamamlanmış işler temizlenmelidir', async () => {
    const jobOld = await queue.enqueue('old_task', {});
    await queue.acquireNextJob('worker-1');
    await queue.completeJob(jobOld.id);

    // 25 saat öncesine simüle et
    await queue.updateJob(jobOld.id, {
      updated_at: new Date(Date.now() - 25 * 60 * 60 * 1000),
    });

    const jobNew = await queue.enqueue('new_task', {});
    await queue.acquireNextJob('worker-1');
    await queue.completeJob(jobNew.id);

    const deleted = await queue.cleanupOldCompletedJobs(24);
    expect(deleted).toBe(1);

    expect(await queue.getJobById(jobOld.id)).toBeNull();
    expect(await queue.getJobById(jobNew.id)).not.toBeNull();
  });
});
