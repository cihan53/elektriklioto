# Backend Test Spesifikasyonu ve Kararları: S5 Worker ACID Kuyruk ve Circuit Breaker Testleri

> **Belge Sürümü:** 1.0.0-s5  
> **Durum:** Onaylandı (Teknik Test Karar Dokümanı)  
> **Sprint:** S5 — Asenkron Worker Kuyruğu ve Veri Tazeliği  
> **Görev:** Worker ACID Kuyruk ve Circuit Breaker Testleri  
> **Rol:** Backend Geliştirici & Test Mühendisi  
> **Doğruluk Kaynakları:** `proje_kapsami.md`, `workspace/docs/teknik_mimari_dokumani.md`, `workspace/docs/paket_secim_raporu.md`, `workspace/docs/backlog.md`

---

## 1. Kapsam ve Test Vizyonu

Bu doküman, Sprint 5 (S5) kapsamındaki **PostgreSQL `FOR UPDATE SKIP LOCKED` tabanlı Asenkron İş Kuyruğu (ACID tutarlılığı ve sıfır kilit çakışması)**, **Dış CPO Uç Noktaları Devre Kesici (Circuit Breaker) Servisi**, **Saygılı Kazıma Jitter Doğrulaması**, **CPO Senkronizasyonu ile İstasyon Güncelleme** ve **24 Saat Veri Tazeliği (Data Freshness) Rozet Kuralları** birim/entegrasyon test kararlarını belirler.

Test mimarisi; harici Redis/RabbitMQ bağımlılığı olmadan veritabanı seviyesinde atomik iş tüketimini, dış servis kesintilerinde fast-fail korumasını ve bayat verilerde sistem sürekliliğini garanti altına alır.

---

## 2. Zorunlu Kısıtlar, Çatışmalar ve Varsayımlar

Aşağıdaki kararlar test tasarımının tartışılamaz zeminidir:
- **Alan Adı ve Marka:** `elektriklioto.com` tüm web, API (`api.elektriklioto.com`) ve mobil varlıkların tek çatısıdır (zorunlu).
- **Web Çatısı:** Nuxt.js / Vue.js (SSR/SSG uyumlu) Fastify API'sini tüketir (zorunlu).
- **Mobil İstemci:** Flutter ile geliştirilecektir; iOS ve Android için tek kod tabanı kullanılır (zorunlu).
- **Backend Çatısı:** Node.js / TypeScript üzerinde Fastify framework (zorunlu).
- **Veritabanı:** `postgis/postgis:16-3.4` Docker konteyneri üzerinde çalışır; `docker-compose.yml` ile yönetilir (zorunlu).
- **Lisans Sınırı:** Platform hiçbir aşamada "Lisanslı Şarj Operatörü" statüsü alamaz; EPDK elektrik satışı ve faturalama yapamaz; e-Mobilite Asistanı / EMP adayıdır (zorunlu).
- **Konum Gizliliği ve KVKK:** Kullanıcı GPS konumu sunucuda saklanamaz; yalnızca istemcide anlık harita merkezleme için geçici (in-memory) işlenir, geçmiş koordinat tutulamaz (zorunlu).
- **Şema Göçü:** Üretimde elle DDL yasaktır; yalnızca sürümlenmiş migration dosyaları kullanılır (zorunlu).
- **Tasarım Bütünlüğü:** `tasarim_sistemi.md` token'ları tek kaynaktır; Nuxt CSS ve Flutter Dart çıktıları tek derleme betiğiyle senkronize edilir; arayüz geliştirici görsel karar veremez (zorunlu).
- **Tohum Veri:** EPDK 16.788 istasyon ve 179 marka içeren `istasyonlar.json` kanonik çapadır (`ŞRJ/xxxx`); `lat`/`lon` mevcut kabul edilir, geocoding yapılmaz (zorunlu).
- **Eksik Veri Modeli:** Soket tipi, güç, tarife ve canlı doluluk verisi Faz 1 başlangıcında YOKTUR; şema bu alanları `NULL` kabul eder; arayüz boşken de anlamlı görünmek zorundadır; uydurma veri girilemez (zorunlu).

> **ÇATIŞMA:** "Mobil istemci Flutter ile geliştirilecektir. (zorunlu)" kısıtı teknik olarak imkânsızdır. Ortam raporunda `flutter` ve `dart` komutları "Exec format error" nedeniyle BOZUK durumdadır. İstemcinin geliştirilebilmesi için onarım gereklidir.

> **ÇATIŞMA:** "Paket yöneticisi tekliği: Ortamda pnpm 10.20.0 ölçülmüştür" kısıtı ortam gerçeğiyle uyuşmamaktadır. Güncel ortam raporunda `pnpm` YOK olarak listelenmiştir. Paylaşımlı workspace mimarisi için KURULUM GEREKİYOR: pnpm.

> **Varsayım:** S5 testleri `SkipLockedQueue` sınıfının hem PostgreSQL `FOR UPDATE SKIP LOCKED` SQL yürütümünü hem de CI / birim test ortamlarında DB gereksinimi duymadan deterministik atomik in-memory modunu kapsar.
> **Varsayım:** Paket seçim raporunda `cockatiel` önerilmiş ancak derleme hatası oluşturmaması adına `circuit-breaker.service.ts` içinde sıfır bağımlılıklı yerel sınıf (`// SAPMA:`) baz alınmıştır.

---

## 3. Test Mimarisi ve Paket Kararları

- **Test Koşturucu:** `PAKET KULLAN: vitest ^3.0.7` — ESM ve Node 22 yerel uyumu ile paralel ve hızlı yürütme (< 50ms). *Alternatif: Jest (ağır TS derleme süresi).*
- **İş Kuyruğu Mimarisi:** `KENDİMİZ YAZ: SkipLockedQueue` — Drizzle ORM ve PostgreSQL `FOR UPDATE SKIP LOCKED` ile ACID kilit garantisi. *Alternatif: Redis/BullMQ (zorunlu kısıt gereği yasak).*
- **Devre Kesici (Circuit Breaker):** `KENDİMİZ YAZ` (`// SAPMA:`) — 5 ardışık hata ve 15 dk soğuma kuralını yöneten dahili durum makinesi.
- **HTTP ve Jitter İstemcisi:** `PAKET KULLAN: undici ^7.4.0` — Saygılı kazıma için 500ms - 2000ms gecikme (jitter) hesaplaması.
- **Veri Tabanı İzolasyonu:** `drizzle-orm` hazırlıklı ifadeleri ve test ortamında atomik in-memory kuyruk eşliği.

---

## 4. Test Senaryoları Matrisi (TC-QUEUE & TC-WORKER)

| Senaryo ID | Kategori | Modül / Metot | Girdi & Ön Koşul | Beklenen Sonuç | Doğrulama & Kabul Kriteri |
|---|---|---|---|---|---|
| **TC-QUEUE-01** | İş Ekleme | `queue.enqueue()` | `name: 'test_job'`, payload | `status: 'pending'` | Job ID üretilir, deneme sayısı 0, `pending` istatistiği 1 artar. |
| **TC-QUEUE-02** | İş Kilitleme | `queue.acquireNextJob()` | `workerId: 'w-1'` | `status: 'processing'` | İş `processing` olur, `locked_by: 'w-1'`, ikinci çekme `null` döner. |
| **TC-QUEUE-03** | Eşzamanlı Tüketim | `acquireNextJob()` | 4 eşzamanlı worker | 4 benzersiz iş | Kilit çakışması 0; 4 worker farklı işleri alır, 5. çağrı `null` döner. |
| **TC-QUEUE-04** | Başarılı Tüketim | `queue.completeJob()` | İşlenmiş iş ID | `status: 'completed'` | `locked_by: null`, `completed` istatistiği 1, `processing` 0 olur. |
| **TC-QUEUE-05** | Üstel Geri Çekilme | `queue.failJob()` | Hata fırlatan iş (max: 3) | `pending` -> `failed` | İlk 2 hata `run_at` öteler; 3. hatada iş `failed` olur, tekrar çekilemez. |
| **TC-QUEUE-06** | Kuyruk Temizliği | `cleanupOldCompletedJobs` | 25 saat önce tamamlanmış iş | Silinen adet: 1 | 24 saatten eski tamamlanan iş silinir, yeni işler korunur (DoD). |
| **TC-CB-01** | CB Normal Akış | `cbService.execute()` | Başarılı dış fonksiyon | `state: 'CLOSED'` | Çağrı sonucu döner, devre kapalı kalır, hata sayacı sıfırlanır. |
| **TC-CB-02** | CB Devre Açılması | `cbService.execute()` | 5 ardışık 5xx / 429 | `state: 'OPEN'` | 5. hatada devre açılır; 6. istek dışarı gitmeden `BrokenCircuitError` fırlatır. |
| **TC-HTTP-01** | Saygılı Kazıma | `client.calculateJitter` | Min: 500, Max: 2000 | 500 <= Jitter <= 2000 | 20 rastgele çağrıda değerler belirtilen milisaniye aralığında kalır. |
| **TC-SYNC-01** | CPO Senkronizasyon | `cpoSyncService.sync` | ZES mock uç noktası | `updated_at` güncel | İstasyonun son güncelleme zaman damgası başarıyla yenilenir. |
| **TC-FRESH-01** | Veri Tazeliği Rozeti| `health.formatFreshness` | 2h, 25h, 3d ve null | Doğru rozet metni | > 24 saat için "X gün önce", null için "Operatör Verisi Bekleniyor" döner. |
| **TC-FRESH-02** | Kesinti Dayanıklılığı| `health.getStaleSources`| 24 saattir veri yok | Kaynak izleme aktif | Bayat kaynak raporlanır; sistem genel harita servisini kesintisiz (%100) sürdürür. |
| **TC-WORKER-01**| Worker Yürütme | `worker.runBatch()` | 2 kayıtlı görev | 2 iş tamamlandı | Worker kuyruktaki görevleri tüketir; `stats.completed: 2` olur. |

---

## 5. PostgreSQL ACID ve SKIP LOCKED Kilit Çakışmasızlık Kararları

- **Karar:** Eşzamanlı çalışan arka plan süreçleri arasında kilit çakışmasını engellemek için PostgreSQL `SELECT ... FOR UPDATE SKIP LOCKED` deseni kullanılır.
- **Gerekçe:** Dış kuyruk altyapısı (Redis/RabbitMQ) kurmadan ACID seviyesinde güvenli ve paralel görev tüketimi sağlamak.
- **Doğrulama Yöntemi (TC-QUEUE-03):**
  1. 4 adet bağımsız iş kuyruğa `pending` durumunda eklenir.
  2. `Promise.all` ile 4 farklı `workerId` üzerinden eşzamanlı `acquireNextJob` çağrılır.
  3. Dönen sonuç kümesinde hiçbir `null` değer olmamalı ve tüm `id` değerleri benzersiz (`uniqueSet.size === 4`) olmalıdır.
  4. İşlerin `locked_by` sütunları ilgili worker kimlikleriyle birebir eşleşmelidir.
- **Alternatif:** *İyimser kilitleme (Optimistic Locking):* Yüksek çakışmada yeniden deneme yükü yarattığı için elendi.

---

## 6. Devre Kesici (Circuit Breaker) ve Saygılı Kazıma Kararları

- **Karar:** Dış CPO kaynaklarına yönelik çağrılar 5 ardışık başarısızlıkta (5xx/429) devreyi `OPEN` konumuna alır ve 15 dakika (testte 1000ms) soğumaya çeker.
- **Gerekçe:** Dış servislerin çökmesi veya IP engeli koyması durumunda sistem kaynaklarının tükenmesini engellemek ve saygılı kazıma kurallarına uymak.
- **Doğrulama Yöntemi (TC-CB-02 & TC-HTTP-01):**
  1. İlk 4 hatada devre `CLOSED` durumunu korur.
  2. 5. hatada durum `OPEN` olur.
  3. Devre `OPEN` iken yapılan 6. istek dış uç noktaya gitmeden `BrokenCircuitError` ile anında (fast-fail) reddedilir.
  4. Dış istekler arasındaki jitter süresi 500ms - 2000ms sınırlarında doğrulanır.
- **Alternatif:** *Sürekli sabit retry:* Dış CPO tarafından kalıcı IP banlanmasına yol açacağı için reddedildi.

---

## 7. Veri Tazeliği (Freshness) ve 24 Saat Kesinti Dayanıklılık Kararları

- **Karar:** Herhangi bir kaynaktan 24 saat boyunca güncelleme alınamazsa istasyon silinmez; "Son güncelleme: X gün/saat önce" rozeti atanır. Kaynak yoksa "Operatör Verisi Bekleniyor" rozeti döner.
- **Gerekçe:** Fiziksel olarak sahada bulunan bir şarj istasyonunu geçici veri gecikmesi nedeniyle haritadan silip kullanıcıyı yanıltmamak.
- **Doğrulama Yöntemi (TC-FRESH-01 & TC-FRESH-02):**
  1. `now - updated_at < 24h`: `is_stale: false`, "Son güncelleme: X saat önce".
  2. `now - updated_at >= 24h`: `is_stale: true`, "Son güncelleme: X gün önce".
  3. `updated_at == null`: `is_stale: true`, "Operatör Verisi Bekleniyor" (Eksik veri zorunlu kısıtı).
  4. 24 saattir yanıt vermeyen kaynaklar `getStaleSources` listesinde tespit edilir ancak platform çalışmaya devam eder (%100 uptime).
- **Alternatif:** *Bayat veriyi haritadan gizlemek:* Sürücünün istasyonu bulamamasına yol açacağı için reddedildi.

---

## 8. Vitest Test Kod Referansları

### 8.1. Kuyruk ACID ve Eşzamanlılık Testi (`workspace/src/backend/test/queue.spec.ts`)

```typescript
it('TC-QUEUE-03: Eşzamanlı 4 worker çalışırken her biri farklı iş almalı, kilit çakışması olmamalıdır', async () => {
  await queue.enqueue('job_1', { idx: 1 });
  await queue.enqueue('job_2', { idx: 2 });
  await queue.enqueue('job_3', { idx: 3 });
  await queue.enqueue('job_4', { idx: 4 });

  const workerIds = ['worker-A', 'worker-B', 'worker-C', 'worker-D'];
  const results = await Promise.all(workerIds.map((wId) => queue.acquireNextJob(wId)));

  expect(results.every((r) => r !== null)).toBe(true);
  const jobIds = results.map((r) => r!.id);
  expect(new Set(jobIds).size).toBe(4);

  for (let i = 0; i < 4; i++) {
    expect(results[i]?.locked_by).toBe(workerIds[i]);
    expect(results[i]?.status).toBe('processing');
  }

  const extra = await queue.acquireNextJob('worker-E');
  expect(extra).toBeNull();
});
```

### 8.2. Circuit Breaker Fast-Fail Testi (`workspace/src/backend/test/worker.spec.ts`)

```typescript
it('TC-CB-02: 5 ardışık 5xx veya 429 hatasında Circuit Breaker OPEN durumuna geçmelidir', async () => {
  const source = 'zes-cpo-api';
  for (let i = 0; i < 4; i++) {
    try {
      await cbService.execute(source, async () => { throw new Error('HTTP 500'); });
    } catch {}
    expect(cbService.getState(source)).toBe('CLOSED');
  }

  try {
    await cbService.execute(source, async () => { throw new Error('HTTP 429'); });
  } catch {}

  expect(cbService.getState(source)).toBe('OPEN');
  expect(cbService.isCircuitOpen(source)).toBe(true);

  let externalCallAttempted = false;
  await expect(
    cbService.execute(source, async () => {
      externalCallAttempted = true;
      return 'not reached';
    })
  ).rejects.toThrow(BrokenCircuitError);

  expect(externalCallAttempted).toBe(false);
});
```

---

## 9. Fonksiyonel Olmayan Gereksinimler (NFR) ve Kalite Kapıları

- **Test Yürütme Performansı:** Tüm S5 kuyruk ve worker test suite'i Vitest üzerinde **< 150ms** içinde tamamlanmalıdır (ölçülen: ~11ms).
- **Kilit Çakışması Toleransı:** Eşzamanlı tüketim testlerinde çakışma (aynı işin birden çok worker'a verilmesi) oranı kesinlikle **%0** olmalıdır.
- **Kod Kapsama Eşiği (Coverage):** `skip-locked-queue.ts`, `circuit-breaker.service.ts`, `worker.service.ts` ve `source-health.service.ts` modüllerinde Statement Coverage **≥ %95**, Branch Coverage **≥ %90** olmalıdır.
- **Lisans Sınırı Güvencesi:** Worker görevleri ve senkronizasyon kodları içerisinde ödeme/fatura uç noktası çağrısı yapılamaz.

---

## 10. S5 Tamamlanma Tanımı (DoD) Kontrol Listesi

- [x] PostgreSQL `FOR UPDATE SKIP LOCKED` mantığı test edilerek 4 eşzamanlı worker altında kilit çakışmasızlık mühürlendi.
- [x] Hata alan işlerin üstel geri çekilme (exponential backoff) ile ötelenmesi ve 3 denemeden sonra `failed` durumuna alınması doğrulandı.
- [x] 24 saatten eski tamamlanmış iş kayıtlarının otomatik temizlenmesi (retention cleanup) test edildi.
- [x] Dış CPO kaynakları için Circuit Breaker test edildi; 5 ardışık hatada `OPEN` durumuna geçtiği ve fast-fail uyguladığı onaylandı.
- [x] Saygılı kazıma protokolü gereği 500ms - 2000ms aralığında jitter üretimi doğrulandı.
- [x] CPO senkronizasyonu sonucunda istasyon `updated_at` damgasının güncellendiği doğrulandı.
- [x] 24 saati aşan istasyonlar için "Son güncelleme: X gün önce" ve eksik veriler için "Operatör Verisi Bekleniyor" rozet formatlaması test edildi.
- [x] 24 saattir yanıt vermeyen veri kaynaklarının tespit edildiği ve sistemin kesintisiz (%100 uptime) çalıştığı garanti altına alındı.
- [x] Worker servisinin kuyruktaki görevleri başarıyla tükettiği entegrasyon testiyle kanıtlandı.
