# Studio Yetkilisi Çözüm Planı: TALEP-067

> **Talep:** [TALEP-067] [UAT] S35-T2 canlı kabul denetimi başarısız: [TALEP-065] Müşteri Kabulü & UAT Doğrulama Denetimi  
> **Müşteri / Bildiren:** Proje Sahibi  
> **Bildirim Tarihi:** 2026-10-02 12:19  
> **Öncelik:** YUKSEK | **Tür:** HATA  
> **Koordinatör:** Studio Yetkilisi & Teknik Liderlik  
> **Görevlendirilen Rol:** `backend_engineer` (Backend & API Mühendisi (Fastify & PostGIS))  
> **Kategori Tespiti:** Otomatik (keyword analizi + AI destekli)  

---

## 1. Müşteri Talebi ve Problem Tanımı

Müşteri (proje sahibi) denetimi sırasında aşağıdaki durumu tespit etti:

> **Açıklama:**  
> Deterministik kalite kapısı 'S35-T2' görevinde canlı kabul denetimi başarısızlığı tespit etti.

Son çıktı satırları:
```
temcisi için CORS ve CORP başlık uyumu ... [31m✗ BAŞARISIZ[0m
         [31mHata: connect ECONNREFUSED 127.0.0.1:3001[0m
  [TEST] UAT-03: Zoom 6 Türkiye genelinde 81 ilin kümeleme verisi (Clusters) ... [31m✗ BAŞARISIZ[0m
         [31mHata: connect ECONNREFUSED 127.0.0.1:3001[0m
  [TEST] UAT-04: Zoom 11 İstanbul geniş ekran BBox sorgusu (1.06° boylam, 600+ pin) ... [31m✗ BAŞARISIZ[0m
         [31mHata: connect ECONNREFUSED 127.0.0.1:3001[0m
  [TEST] UAT-05: API uç noktası canlılık ve veri modeli doğrulaması ... [31m✗ BAŞARISIZ[0m
         [31mHata: connect ECONNREFUSED 127.0.0.1:3001[0m
  [TEST] UAT-06: Web arayüzü canlı HTML sunumu (Port 3000) ... [31m✗ BAŞARISIZ[0m
         [31mHata: connect ECONNREFUSED 127.0.0.1:3000[0m

----------------------------------------------------------------------
[31m⚠️  UAT TESTLERİNDE 6 HATA TESPİT EDİLDİ! (0 Başarılı, 6 Başarısız)[0m
```

- **Etkilenen Ekran / URL:** `/`
- **Hedef Bileşen Grubu:** Backend API & Servis Katmanı

---

## 2. Kök Neden & Mimari Analiz

**Claude Analizi:**

1. **Kök Neden:** UAT betiği, `localhost:3001` (API) ve `localhost:3000` (web) üzerinde canlı/local çalışan backend ve frontend servislerine HTTP bağlantısı kurmayı bekliyor; ancak denetim çalıştırıldığı anda bu servisler ayakta değildi (ECONNREFUSED), yani test altyapı/ortam eksikliği — kod hatası değil, servislerin başlatılmamış olması.

2. **Kritik Riskler:** 
   - UAT betiğinin CI/deterministik kalite kapısında çalışması için servislerin testten önce (örn. `yerel_ortam.sh` veya eşdeğeri ile) ayağa kaldırıldığından ve sağlık kontrolünden (health check) geçtiğinden emin olunmalı; aksi halde "6 başarısız, 0 başarılı" sonucu yanlışlıkla gerçek bir regresyon gibi yorumlanıp zaman kaybına yol açabilir.
   - Port 3001/3000 çakışması (başka bir process'in portu tutması) veya `.env`/config'te yanlış port/host ayarı da aynı semptomu verebilir, bu yüzden "servis gerçekten çalışıyor mu" kontrolü otomatik hale getirilmeli (örn. testten önce retry+readiness probe).
   - Bu talep (TALEP-065) bir önceki TALEP-054 (harita kümeleme) düzeltmesiyle aynı UAT senaryolarını (Zoom 6/11 kümeleme, BBox sorgusu) kapsıyor — gerçek bir fonksiyonel regresyon olup olmadığını anlamak için servisler ayağa kalktıktan sonra testi tekrar çalıştırıp gerçek sonuçları görmek şart; mevcut loglar servislerin erişilemezliğinden öte bir şey söylemiyor.

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
