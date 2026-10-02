# Studio Yetkilisi Çözüm Planı: TALEP-063

> **Talep:** [TALEP-063] Yerel test ortamı ve canlı ortam harita istasyon sayısı uyumsuzluğu  
> **Müşteri / Bildiren:** Proje Sahibi  
> **Bildirim Tarihi:** 2026-10-02 11:03  
> **Öncelik:** NORMAL | **Tür:** HATA  
> **Koordinatör:** Studio Yetkilisi & Teknik Liderlik  
> **Görevlendirilen Rol:** `backend_engineer` (Backend & API Mühendisi (Fastify & PostGIS))  
> **Kategori Tespiti:** Otomatik (keyword analizi + AI destekli)  

---

## 1. Müşteri Talebi ve Problem Tanımı

Müşteri (proje sahibi) denetimi sırasında aşağıdaki durumu tespit etti:

> **Açıklama:**  
> Kullanıcı, harita üzerinde görüntülenen şarj istasyonu sayısının yerel test ortamı ile canlı ortam arasında farklılık gösterdiğini, canlı ortamda çok daha fazla istasyon listelenirken yerel ortamda istasyonların eksik göründüğünü iletti. Yerel test ortamındaki istasyon veri tabanı / tohum veri (seed) setinin canlı ortam verileriyle tutarlı hale getirilmesi bekleniyor.

- **Etkilenen Ekran / URL:** `/`
- **Hedef Bileşen Grubu:** Backend API & Servis Katmanı

---

## 2. Kök Neden & Mimari Analiz

**Claude Analizi:**

## 1. Kök Neden
Canlı ortam istasyon verisini EPDK'dan periyodik bir cURL tabanlı import akışıyla güncellerken (bkz. önceki EPDK veri yenileme notu), yerel ortam `seed_postgres.py` tarafından `cpo_stations.json`'dan üretilen statik `seed_data.sql` dosyasına bağımlı — bu dosya üretildiği andaki bir anlık görüntüyü (snapshot) temsil ediyor ve canlıdaki güncel/daha kapsamlı veri setiyle senkron değil. Ayrıca `597244d` (TALEP-054) commit'i canlıda mükerrer kayıtlardan kaynaklı şişkin sayım sorununu düzelttiğine göre, iki ortam arasında hem veri kaynağı hem de sayım/dedup mantığı farklılaşmış olabilir.

## 2. Kritik Riskler
- Seed script'i (`seed_postgres.py`) çalıştırılıp `seed_data.sql` yeniden üretilirken kaynak JSON (`cpo_stations.json`/`operators.json`) güncel değilse sorun çözülmez, sadece "eski" veri yeniden tohumlanır — önce kaynağın EPDK import akışıyla taze olduğundan emin olunmalı.
- `workspace/infra/server-scripts/seed_postgres.py` ile `workspace/server-scripts/seed_postgres.py` iki ayrı kopya olarak duruyor (diff'te görülüyor); ikisi senkron tutulmazsa hangi ortamın hangi script'i çalıştırdığı belirsizleşir ve farklılık tekrar oluşur.
- TALEP-054'teki dedup/sayım mantığı yerelde de aynı şekilde uygulanmazsa, veri eşitlense bile harita üzerindeki görünen sayı yine tutarsız kalabilir — seed verisiyle birlikte sayım sorgusu/view'ı da doğrulanmalı.
- Büyük `seed_data.sql` (66k+ satır) ile uğraşırken idempotent olmayan INSERT'ler yerel veritabanında yinelenen kayıt veya constraint hatasına yol açabilir; uygulama öncesi tabloların temizlenip temizlenmediği kontrol edilmeli.

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
