The existing report covers TALEP-042; this task is TALEP-043's UAT. Let me examine the fix and the restart/deploy mechanism.TALEP-043's fix hasn't been committed — `start_backend.sh` is untouched since Sep 26 and no PR/branch exists for issue #72. Let me verify no other restart path was changed, then reproduce the defect live on port 4000.No fix for TALEP-043 exists in the repo. Now I'll reproduce the reported defect on port 4000: occupy the port with a foreign process and simulate a restricted environment where the script's cleanup can't find `lsof`/`fuser`.Port 4000 is free. Now I'll stage the reproduction: a foreign process holding :4000 (simulating the stale old backend) and a masked `which` so `fuser`/`lsof` appear absent — the exact cPanel condition under which the script's cleanup silently no-ops.Defect fully reproduced — dead PID 53894 reported as "BAŞARILI" while stale PID 53777 still owns the port. Cleaning up and running the live regression pass.All evidence collected. Writing the UAT report for TALEP-043 — verdict REJECTED, defect reproduces live.

# UAT Kabul Raporu — TALEP-043 (Sprint S29)

> **Belge:** `workspace/docs/uat_kabul_raporu.md`
> **Görev:** TALEP-043 — Müşteri Kabulü & UAT Doğrulama Denetimi (S29-T4)
> **Talep:** Sunucuda backend yeniden başlatma işlemi başarısız olduğu halde başarılı bildiriliyor — Issue [#72](https://github.com/cihan53/elektriklioto/issues/72)
> **Ortam:** Canlı dev — `http://127.0.0.1:3000` (Nuxt 3 + Nitro devProxy), `http://127.0.0.1:3001` (Fastify API, PostGIS); restart betiği portu: `4000`
> **Yöntem:** Canlı süreç/port simülasyonu + gerçek betik çalıştırması; izole birim testi ve mock kullanılmadı
> **Tarih:** 2026-09-28

## 1. Genel Karar

**VERDICT: REJECTED — TALEP-043 düzeltmesi depoya hiç ulaşmamış; bildirilen hata canlıda aynen yeniden üretildi.**

`workspace/server-scripts/start_backend.sh` dosyası talebin açıldığı tarihten (2026-09-27) önceki sürümde duruyor (son değişiklik: Sep 26, commit `22fe1be`); issue #72'ye bağlı branch/PR/commit yok. Betik gerçek çalıştırıldığında, port 4000'i tutan yabancı (eski) süreç devam ederken yeni başlatılan süreç ölmüş olmasına rağmen `BAŞARILI` logladı ve `exit 0` ile çıktı — müşterinin bildirdiği sessiz başarısızlık birebir doğrulandı.

## 2. Canlı Yeniden Üretme Kanıtı (Kesin)

Senaryo: müşterinin tarif ettiği cPanel koşulu — eski süreç port 4000'i tutuyor, `fuser`/`lsof` kısıtlı kabuk ortamında bulunamıyor (betikteki `which fuser`/`which lsof` kontrolleri ikisi de boş dönüyor → port temizliği tamamen atlanıyor).

| Adım | Komut / Eylem | Gözlenen |
|---|---|---|
| 1 | Port 4000'e sahte "eski süreç" yerleştir (PID 53777, her isteğe `200 {marker:"STALE_PROCESS"}` döner) | Port dolu: `lsof -ti :4000` → `53777` |
| 2 | `bash workspace/server-scripts/start_backend.sh` (kısıtlı PATH: fuser/lsof yok) | `Backend API arka planda başlatıldı (PID: 53894)` |
| 3 | Betiğin sağlık kontrolü | **`BAŞARILI: Backend API yanıt veriyor ve sağlıklı! (HTTP 200)`** |
| 4 | Çıkış kodu | **`exit 0`** — çağıran deploy hattı başarı sanıyor |
| 5 | Süreç doğrulaması | `kill -0 53894` → **DEAD** (`MODULE_NOT_FOUND`; prod'da `EADDRINUSE` ile aynı sonuç) |
| 6 | Port sahipliği | `lsof -ti :4000` → hâlâ **53777** (eski süreç) |
| 7 | `curl :4000/api/v1/health` | `{"status":"OK","marker":"STALE_PROCESS"}` — yanıtı veren **eski** süreç |
| 8 | `workspace/tmp/backend.pid` | İçerik `53894` — ölü PID kaydedildi |

**Sonuç:** "Sağlıklı" raporu portu dinleyen eski süreçten geldi; yeni kod hiç devreye girmedi. Müşterinin "günlerce eski sürüm yayında kalır" senaryosu kanıtlandı.

## 3. Kök Neden (Kod Kanıtı)

`start_backend.sh` içinde üç birleşen kusur:

1. **Port temizliği kırılgan ve sessiz:** `fuser -k` / `lsof` dalına `which` kontrolüyle giriliyor; araçlar yoksa blok tamamen atlanıyor (satır ~80-88). `kill` hataları `2>/dev/null || true` ile maskeleniyor — kill başarısız olsa bile betik fark etmiyor.
2. **Sağlık kontrolü portu doğruluyor, süreci değil:** `curl :4000/api/v1/health → 200` tek başına yeterli sayılıyor. Yanıt verenin az önce başlatılan `$NEW_PID` olduğu hiç denetlenmiyor — `kill -0 $NEW_PID` kontrolü yok, yanıt gövdesinde sürüm/PID işareti aranmıyor.
3. **Hata durumunda bile `exit 0`:** `IS_READY=false` dalı yalnızca `UYARI` loglayıp "süreç tamamlandı" diyerek sıfır kodla çıkıyor; başarısızlık çağırana hiçbir zaman hata olarak dönmüyor.

## 4. UAT Senaryo Sonuç Tablosu

| ID | Senaryo | Beklenen | Ölçülen | Sonuç |
|---|---|---|---|---|
| UAT-01 | Canlı servislere bağlanma (3000 + 3001) | HTTP 200 | `/` 200; `GET /api/v1/operators` → **180** kayıt; `/api/version` → 200 `v1.0.0-faz2` | **GEÇTİ** |
| UAT-02 | Türkiye geneli küme daireleri | cluster > 0 | `zoom=6` → `type:"clusters"`, **81 küme** | **GEÇTİ** |
| UAT-03 | Büyükşehir zoom 10-12 + pin yoğunluğu | 500+ pin | İstanbul bbox `zoom=11` → **2000 pin** | **GEÇTİ** |
| UAT-04 | Pin → detay paneli verisi | ad / operatör / ŞRJ no doğru | `GEBZE OSB` / `ŞRJ/15310` / `sarjen`; soketler `CCS2, Type 2` | **GEÇTİ** |
| UAT-05 | Derin bağlantı / pano fallback | kopyalama veya yönlendirme | `deep_link`: `clipboard_fallback: true`, `clipboard_text: "ŞRJ/15310"` | **GEÇTİ** |
| UAT-06 | Konsol `TypeError` / ağ `400` taraması | sıfır kritik hata | API çağrılarında 400/500 yok; TypeError yok | **GEÇTİ** |
| UAT-07 | **TALEP-043: restart'ta eski süreç portu tutuyor** | eski süreç öldürülür VEYA açık hata + sıfır-olmayan çıkış | `BAŞARILI` + `exit 0`; yeni PID ölü, eski süreç portta | **KALDI** |
| UAT-08 | **TALEP-043: başarı yalnızca yeni süreç doğrulanınca** | sağlık kontrolü süreç kimliğini doğrular | Health check yalnızca porta bakıyor; `NEW_PID` canlılığı denetlenmiyor | **KALDI** |

## 5. Kabul için Zorunlu Düzeltmeler (DevOps'a Bağlayıcı)

1. **Port doluysa açıkça başarısız ol:** Yeni süreç başlatılmadan önce port 4000 sahipliği doğrulanmalı; temizlik sonrası port hâlâ doluysa betik `exit 1` ile `HATA` dönmeli. `fuser`/`lsof` yokluğu tek başına temizliği sessizce atlamamalı — alternatif olarak yanıt veren sürecin PID'i `/proc` veya `lsof` varsa onunla, yoksa PID dosyası + health-check kimlik doğrulamasıyla çözülmeli.
2. **Süreç kimliği doğrulaması:** Health check'ten önce/sonra `kill -0 $NEW_PID`; ayrıca `/api/v1/health` (veya `/version`) yanıtına başlatılan sürece özgü `build_id`/`started_at` işareti eklenip betikte karşılaştırılmalı — "port cevap veriyor" ≠ "yeni süreç cevap veriyor".
3. **Başarısızlıkta sıfır-olmayan çıkış:** `IS_READY=false` dalında `exit 1` zorunlu; deploy hattı ve cron ancak böyle alarm üretebilir.

## 6. Kapı Özeti

| Kapı | Durum |
|---|---|
| Canlı harita / kümeleme / pin yolculuğu | GEÇTİ (81 küme, 2000 pin, detay + clipboard fallback doğru) |
| Ağ sağlığı | GEÇTİ (400/500/TypeError = 0) |
| **TALEP-043 çekirdek senaryo (sahte başarı)** | **KALDI — hata canlıda yeniden üretildi** |
| Düzeltme mevcudiyeti | **KALDI — depoda fix yok, PR/branch yok** |

> **Sonuç:** Müşterinin bildirdiği sessiz restart başarısızlığı aynen duruyor. Görev **REDDEDİLDİ**; `devops_engineer` görevi (S29-T3) kod üretmemiş veya üretilen kod bu depoya ulaşmamıştır. Betik §5'teki üç madde karşılanmadan yeniden UAT'a gelmemelidir.

> **Varsayım:** Test, gerçek cPanel sunucusu yerine yerel port 4000 üzerinde, `fuser`/`lsof`'un bulunamadığı kısıtlı kabuk ortamı simüle edilerek koşuldu — cPanel/CloudLinux jailed shell'de bu araçların eksikliği bilinen durumdur ve betiğin temizlik dalını tamamen devre dışı bırakan kod yolu birebir aynıdır. Betik `workspace/cpanel_api_entry.cjs` dosyasını yerelde bulamadığı için yeni süreç `MODULE_NOT_FOUND` ile öldü; üretimde aynı senaryo `EADDRINUSE` ile yaşanır — her ikisinde de sonuç aynı: port eski süreçte kalır ve health check onu "sağlıklı" sanır.

> **Varsayım:** `workspace/canli.sh` (dev ortamı, portlar 3000/3001) TALEP-043 kapsamında değildir; talep metni açıkça sunucu yayınlama/port 4000 akışını işaret etmektedir. Ancak aynı "port yanıtı = süreç kimliği" karışıklığı `canli.sh`'in health-check kalıbında da mevcut olduğundan, düzeltme yapılırken bu dosyanın da gözden geçirilmesi önerilir (ayrı görev kapsamı).
