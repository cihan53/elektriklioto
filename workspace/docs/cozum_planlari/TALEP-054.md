# Studio Yetkilisi Çözüm Planı: TALEP-054

> **Talep:** [TALEP-054] Haritada istasyon sayıları mükerrer kayıt nedeniyle şişkin görünüyor  
> **Müşteri / Bildiren:** Proje Sahibi  
> **Bildirim Tarihi:** 2026-09-29 19:06  
> **Öncelik:** YUKSEK | **Tür:** HATA  
> **Koordinatör:** Studio Yetkilisi & Teknik Liderlik  
> **Görevlendirilen Rol:** `backend_engineer` (Backend & API Mühendisi (Fastify & PostGIS))  
> **Kategori Tespiti:** Otomatik (keyword analizi + AI destekli)  

---

## 1. Müşteri Talebi ve Problem Tanımı

Müşteri (proje sahibi) denetimi sırasında aşağıdaki durumu tespit etti:

> **Açıklama:**  
> Yayın ortamındaki haritada istasyon sayıları beklenenden çok daha yüksek görünüyor. Örneğin yalnızca İstanbul’da 13 binden fazla istasyon gösterilirken sistemdeki toplam istasyon sayısının yaklaşık 16 bin olduğu belirtiliyor. Kullanıcı, haritadaki istasyon sayılarının gerçek ve tekil veriyle tutarlı olmasını bekliyor. Veritabanına mükerrer istasyon kayıtları eklenmiş olabileceği için mevcut kayıtların incelenmesi, mükerrerlerin temizlenmesi ve harita sayılarının doğrulanması gerekiyor.

- **Etkilenen Ekran / URL:** `/`
- **Hedef Bileşen Grubu:** Backend API & Servis Katmanı

---

## 2. Kök Neden & Mimari Analiz

**Devin Analizi:**

İstasyon sayısının nereden geldiğini ve harita endpoint’inde birleşim/join kaynaklı çarpanlama olup olmadığını hızlıca kontrol ediyorum.

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
