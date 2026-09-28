# Studio Yetkilisi Çözüm Planı: TALEP-046

> **Talep:** [TALEP-046] [UAT] S31-T2 canlı kabul denetimi başarısız: [TALEP-045] Müşteri Kabulü & UAT Doğrulama Denetimi  
> **Müşteri / Bildiren:** Proje Sahibi  
> **Bildirim Tarihi:** 2026-09-28 21:34  
> **Öncelik:** YUKSEK | **Tür:** HATA  
> **Koordinatör:** Studio Yetkilisi & Teknik Liderlik  
> **Görevlendirilen Rol:** `backend_engineer` (Backend & API Mühendisi (Fastify & PostGIS))  
> **Kategori Tespiti:** Otomatik (keyword analizi + AI destekli)  

---

## 1. Müşteri Talebi ve Problem Tanımı

Müşteri (proje sahibi) denetimi sırasında aşağıdaki durumu tespit etti:

> **Açıklama:**  
> Canlı UAT denetimi (scripts/uat_live_audit.mjs) 'S31-T2' görevinde başarısız oldu.

Son çıktı satırları:
```
al Software Studio — Canlı UAT & Kullanıcı Denetimi Başlatılıyor[0m
[36m======================================================================[0m

  [TEST] UAT-01: Fastify Backend API canlı sağlık kontrolü (Port 3001) ... [32m✓ GEÇTİ[0m
  [TEST] UAT-02: Web istemcisi için CORS ve CORP başlık uyumu ... [32m✓ GEÇTİ[0m
  [TEST] UAT-03: Zoom 6 Türkiye genelinde 81 ilin kümeleme verisi (Clusters) ... [32m✓ GEÇTİ[0m
  [TEST] UAT-04: Zoom 11 İstanbul geniş ekran BBox sorgusu (1.06° boylam, 600+ pin) ... [32m✓ GEÇTİ[0m
  [TEST] UAT-05: API uç noktası canlılık ve veri modeli doğrulaması ... [32m✓ GEÇTİ[0m
  [TEST] UAT-06: Web arayüzü canlı HTML sunumu (Port 3000) ... [31m✗ BAŞARISIZ[0m
         [31mHata: Web arayüzü HTTP 500 döndü[0m

----------------------------------------------------------------------
[31m⚠️  UAT TESTLERİNDE 1 HATA TESPİT EDİLDİ! (5 Başarılı, 1 Başarısız)[0m
```

- **Etkilenen Ekran / URL:** `/`
- **Hedef Bileşen Grubu:** Backend API & Servis Katmanı

---

## 2. Kök Neden & Mimari Analiz

**Devin Analizi:**

Hızlıca canlı durumu ve frontend yapılandırmasını kontrol edeyim.

**İlgili Dosyalar & Modüller:**
   - `workspace/src/backend/src/modules/`
   - `workspace/src/backend/src/app.ts`
   - `workspace/src/frontend/components/StationMap.vue`
   - `workspace/src/frontend/pages/index.vue`

---

## 3. Ekip İçin Adım Adım Aksiyon Planı

### Aşama A: İnceleme ve Hazırlık (`backend_engineer`)
- İlgili Fastify modülündeki rota tanımı ve handler mantığını incele.
- Sorunun lokal ortamda (`./canli.sh` → 3001) yeniden üretilebilirliğini teyit et.

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
