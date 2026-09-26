# Studio Yetkilisi Çözüm Planı: TALEP-025

> **Talep:** [TALEP-025] Canlı Sürüm Bilgisi Ekranında Sistem Altyapısı ve Veritabanı Bilgilerinin Açıkça Gösterilmesinin Kaldırılması  
> **Müşteri / Bildiren:** Proje Sahibi  
> **Bildirim Tarihi:** 2026-09-26 10:34  
> **Öncelik:** YUKSEK | **Tür:** HATA  
> **Koordinatör:** Studio Yetkilisi & Teknik Liderlik  
> **Görevlendirilen Rol:** `backend_engineer` (Backend & API Mühendisi (Fastify & PostGIS))  
> **Kategori Tespiti:** Otomatik (keyword analizi + AI destekli)  

---

## 1. Müşteri Talebi ve Problem Tanımı

Müşteri (proje sahibi) denetimi sırasında aşağıdaki durumu tespit etti:

> **Açıklama:**  
> Sitedeki 'Canlı Sürüm Bilgileri' ve 'Hakkında' alanını incelediğimde, herkese açık şekilde sistemin kullandığı altyapı çatısı ve veritabanı motoru gibi dahili teknik bilgilerin listelendiğini fark ettim. Bu tür iç mimari ve sistem detaylarının doğrudan ziyaretçilere gösterilmesi sistem güvenliği açısından zafiyet ve risk teşkil edebilir. Sıradan bir ziyaretçi veya araç sahibinin yalnızca genel sürüm numarası ve yayın tarihini görmesi yeterlidir; kullanılan teknoloji çatısı ve veritabanı türü gibi hassas altyapı detaylarının bu ekrandan tamamen kaldırılmasını talep ediyorum.

- **Etkilenen Ekran / URL:** `/hakkimizda`
- **Hedef Bileşen Grubu:** Backend API & Servis Katmanı

---

## 2. Kök Neden & Mimari Analiz

**Claude Analizi:**

**1. Kök Neden:** "Hakkımızda"/"Canlı Sürüm Bilgileri" ekranı muhtemelen debug/diagnostic amaçlı eklenmiş bir endpoint veya template üzerinden framework adı, sürümü ve veritabanı motoru gibi bilgileri (örn. runtime bilgisi, ORM/driver adı, environment metadata) doğrudan sorgulayıp arayüze basıyor; production ortamına geçerken bu "bilgilendirme" amaçlı çıktı filtrelenmemiş.

**2. Kritik Riskler:**
- Bu tür bilgi ifşası, saldırganların hedefe özgü (framework/DB'ye yönelik) bilinen açıkları veya CVE'leri hedeflemesini kolaylaştırır (information disclosure → attack surface daraltma).
- Sadece görünen metni gizlemek yetmez; veriyi üreten API/endpoint response'unda hâlâ dönüyor olabilir — kaldırma işlemi backend seviyesinde (response payload'dan) yapılmalı, sadece frontend'de render edilmemesi yeterli değil.
- Sürüm numarası ve yayın tarihi gibi "zararsız" alanlar bırakılacaksa, bunların da dolaylı yoldan (örn. sürüm numarasından framework versiyonu çıkarımı) bilgi sızdırmadığından emin olunmalı.
- Benzer diagnostic/debug endpoint'lerin (health check, status sayfaları vb.) başka yerlerde de aynı hataya sahip olup olmadığı kontrol edilmeli.

**İlgili Dosyalar & Modüller:**
   - `workspace/src/backend/src/modules/`
   - `workspace/src/backend/src/app.ts`
   - `workspace/src/frontend/components/StationDetailModal.vue`

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
