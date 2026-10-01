# Studio Yetkilisi Çözüm Planı: TALEP-047

> **Talep:** [TALEP-047] [UAT] S32-T1 canlı kabul denetimi başarısız: [TALEP-046] [UAT] S31-T2 canlı kabul denetimi başarısız: [TALEP-045] Müşteri Kab  
> **Müşteri / Bildiren:** Proje Sahibi  
> **Bildirim Tarihi:** 2026-09-28 21:47  
> **Öncelik:** YUKSEK | **Tür:** HATA  
> **Koordinatör:** Studio Yetkilisi & Teknik Liderlik  
> **Görevlendirilen Rol:** `backend_engineer` (Backend & API Mühendisi (Fastify & PostGIS))  
> **Kategori Tespiti:** Otomatik (keyword analizi + AI destekli)  

---

## 1. Müşteri Talebi ve Problem Tanımı

Müşteri (proje sahibi) denetimi sırasında aşağıdaki durumu tespit etti:

> **Açıklama:**  
> Canlı UAT denetimi (scripts/uat_live_audit.mjs) 'S32-T1' görevinde başarısız oldu.

Son çıktı satırları:
```
2: Web istemcisi için CORS ve CORP başlık uyumu ... [31m✗ BAŞARISIZ[0m
         [31mHata: connect ECONNREFUSED 127.0.0.1:3001[0m
  [TEST] UAT-03: Zoom 6 Türkiye genelinde 81 ilin kümeleme verisi (Clusters) ... [31m✗ BAŞARISIZ[0m
         [31mHata: connect ECONNREFUSED 127.0.0.1:3001[0m
  [TEST] UAT-04: Zoom 11 İstanbul geniş ekran BBox sorgusu (1.06° boylam, 600+ pin) ... [31m✗ BAŞARISIZ[0m
         [31mHata: connect ECONNREFUSED 127.0.0.1:3001[0m
  [TEST] UAT-05: API uç noktası canlılık ve veri modeli doğrulaması ... [31m✗ BAŞARISIZ[0m
         [31mHata: connect ECONNREFUSED 127.0.0.1:3001[0m
  [TEST] UAT-06: Web arayüzü canlı HTML sunumu (Port 3000) ... [31m✗ BAŞARISIZ[0m
         [31mHata: Web arayüzü HTTP 500 döndü[0m

----------------------------------------------------------------------
[31m⚠️  UAT TESTLERİNDE 6 HATA TESPİT EDİLDİ! (0 Başarılı, 6 Başarısız)[0m
```

- **Etkilenen Ekran / URL:** `/`
- **Hedef Bileşen Grubu:** Backend API & Servis Katmanı

---

## 2. Kök Neden & Mimari Analiz

**Claude Analizi:**

## Kök Neden

`ECONNREFUSED 127.0.0.1:3001` hatası, port 3001'de dinleyen hiçbir sürecin olmadığını gösteriyor — yani backend servisi UAT denetimi çalıştığı anda ayakta değil; bu bir kod hatası değil, bir servis erişilebilirlik sorunu. Port 3000'deki HTTP 500 ise web istemcisinin ayakta olduğunu ama muhtemelen backend'e (3001) bağlanamadığı için hata döndürdüğünü gösteriyor, yani tek kök neden zincirleme etki yaratıyor: backend down → web 500. Bu, TALEP-043'te ("backend yeniden başlatma işlemi başarısız olduğu halde başarılı bildiriliyor") tespit edilen sorunla örtüşüyor: deploy/restart betiği süreci gerçekten ayağa kaldırmadan "başarılı" raporluyor olabilir, ya da süreç kaldırılıyor ama crash-loop / bellek limiti gibi bir nedenle kısa sürede çöküyor.

## Kritik Riskler

1. **Yalancı yeşil (false positive) restart bildirimi**: Deploy/restart script'i gerçek sağlık kontrolü (health check) yapmadan "başarılı" diyorsa, bu üçüncü kez aynı semptomla karşılaşılmasının nedeni olabilir — TALEP-043'teki düzeltmenin kapsamı gözden geçirilmeli.
2. **Süreç yöneticisi (PM2/systemd) crash-loop'ta olabilir**: Backend ayakta kalamıyor olabilir; loglar (`pm2 logs` veya ilgili servis logları) incelenmeden kök neden kesinleşmez.
3. **UAT script zamanlama sorunu**: Denetim, deploy sonrası servisler tam ayağa kalkmadan tetikleniyor olabilir; restart sonrası bir "readiness" bekleme/retry mekanizması eksik olabilir.
4. **Tekrarlayan desen**: Bu, art arda 3. benzer canlı denetim hatası (TALEP-044/045/046 ardından); kalıcı çözüm yerine geçici restart'larla kapatılıyorsa, üretimde güvenilirlik riski büyümeye devam edecektir — kök neden analizi ve otomatik health-check/alerting eklenmeli.

**İlgili Dosyalar & Modüller:**
   - `workspace/src/backend/src/modules/`
   - `workspace/src/backend/src/app.ts`
   - `workspace/src/frontend/components/StationMap.vue`
   - `workspace/src/frontend/pages/index.vue`

---

## 3. Ekip İçin Adım Adım Aksiyon Planı

### Aşama A: İnceleme ve Hazırlık (`backend_engineer`)
- İlgili Fastify modülündeki rota tanımı ve handler mantığını incele.
- Sorunun lokal ortamda (`./yerel_ortam.sh` → 3001) yeniden üretilebilirliğini teyit et.

### Aşama B: Kodlama ve Çözüm
- İlgili route veya servis katmanında gerekli düzeltmeyi yap.
- Tip uyuşmazlığı, null/undefined kontrolleri ve async hataları kontrol et.
- Swagger/OpenAPI belgesi gerekiyorsa güncelle.

### Aşama C: Test ve Doğrulama (`uat_auditor` / `qa_lead`)
- API endpoint'ini `curl` veya Swagger UI üzerinden manuel test et.
- Tarayıcı konsolunda 0 hata olduğunu doğrula.

---

## 4. Kabul Kriterleri (Definition of Done)

- [ ] İlgili API endpoint'i beklenen yanıtı döndürüyor.
- [ ] Tarayıcı konsolunda TypeError veya Uncaught hatası bulunmuyor.
- [ ] Mevcut çalışan rotalar bozulmamış.
- [ ] Değişiklik tamamlandıktan sonra talep durumu `COZULDU` olarak güncellendi.
