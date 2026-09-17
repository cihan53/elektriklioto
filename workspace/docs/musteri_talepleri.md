# elektriklioto.com — Müşteri Denetim & Talep Havuzu

> **Son Güncelleme:** 2026-09-17 19:21  
> **Toplam Bildirim:** 8  

Bu doküman, site sahibinin / müşterinin yaptığı denetimler sonucunda iletilen istek, hata ve geri bildirimleri içerir.

---

## 1. Genel Durum Özeti

| ID | Tür | Öncelik | Durum | Başlık | Ekran / URL | İlgili Rol | GitHub Issue | Plan |
|---|---|---|---|---|---|---|---|---|
| **TALEP-008** | Hata / Bug | Kritik (P1) | 🔨 Geliştiriliyor | Harita pinleri ve kümeleme baloncuklarının modal pencerelerin (QrBridgeModal vb.) üzerine taşması (z-index katman çakışması) | `/` | `web_engineer` | [#8](https://github.com/cihan53/elektriklioto/issues/8) | [Plan Oku](workspace/docs/cozum_planlari/TALEP-008.md) |
| **TALEP-007** | Hata / Bug | Yüksek (P2) | 🔨 Geliştiriliyor | Tüm operatörler açılır menüsü (dropdown) açıldığında menü taşması ve istenmeyen scroll çubuğu oluşması | `/` | `web_engineer` | [#7](https://github.com/cihan53/elektriklioto/issues/7) | [Plan Oku](workspace/docs/cozum_planlari/TALEP-007.md) |
| **TALEP-006** | Hata / Bug | Kritik (P1) | 🔨 Geliştiriliyor | Konum izni verildiğinde kullanıcının anlık konumunu gösteren mavi nokta/baloncuk eksik | `/harita` | `web_engineer` | [#6](https://github.com/cihan53/elektriklioto/issues/6) | [Plan Oku](workspace/docs/cozum_planlari/TALEP-006.md) |
| **TALEP-005** | Yeni İstek / Özellik | Yüksek (P2) | 🔨 Geliştiriliyor | GADM 4.1 Türkiye resmi il, ilçe ve mahalle koordinatlarının entegrasyonu | `/harita` | `backend_engineer` | [#5](https://github.com/cihan53/elektriklioto/issues/5) | [Plan Oku](workspace/docs/cozum_planlari/TALEP-005.md) |
| **TALEP-004** | Yeni İstek / Özellik | Yüksek (P2) | 🔨 Geliştiriliyor | Arama kutusunda ilçe, il ve istasyon araması ve harita odaklanması | `/` | `web_engineer` | [#4](https://github.com/cihan53/elektriklioto/issues/4) | [Plan Oku](workspace/docs/cozum_planlari/TALEP-004.md) |
| **TALEP-003** | Hata / Bug | Normal (P3) | 🔨 Geliştiriliyor | Haritada Voltrun istasyonlarının soket tipi yanlış görünüyor | `/` | `web_engineer` | [#3](https://github.com/cihan53/elektriklioto/issues/3) | [Plan Oku](workspace/docs/cozum_planlari/TALEP-003.md) |
| **TALEP-002** | Hata / Bug | Normal (P3) | ✅ Çözüldü | google analytics hesabım var kodu G-BKMTW8EH4K trafiği izleye bilmem için bunun siteye eklenmesi gerekiyor | `/` | `web_engineer` | [#2](https://github.com/cihan53/elektriklioto/issues/2) | [Plan Oku](workspace/docs/cozum_planlari/TALEP-002.md) |
| **TALEP-001** | Hata / Bug | Normal (P3) | ✅ Çözüldü | Haritada filtre butonuna basınca liste senkronize olmuyor | `/` | `web_engineer` | [#1](https://github.com/cihan53/elektriklioto/issues/1) | [Plan Oku](workspace/docs/cozum_planlari/TALEP-001.md) |

---

## 2. Talep Detayları ve Geri Bildirim Notları

### [TALEP-008] Harita pinleri ve kümeleme baloncuklarının modal pencerelerin (QrBridgeModal vb.) üzerine taşması (z-index katman çakışması) (🔨 Geliştiriliyor)
- **Bildirim Tarihi:** 2026-09-17 19:21
- **Tür / Öncelik:** Hata / Bug / Kritik (P1)
- **İlgili Ekran / Sayfa:** `/`
- **Görevli Rol:** `web_engineer`
- 🐙 **GitHub Issue:** [#8](https://github.com/cihan53/elektriklioto/issues/8)

**Müşteri Açıklaması / Hata Adımları:**
> Karekod (QrBridgeModal), Arıza Bildirimi veya Katkı Sağla modalı açıldığında, MapLibre harita üzerindeki pinler ve kümeleme baloncukları (marker/cluster elements) modal penceresinin ve karartma katmanının (backdrop) üzerinde kalmakta; karekodun ve modal içeriğinin önünü kapatarak görseli ve tıklanabilirliği bozmaktadır. z-index hiyerarşisinin düzeltilmesi (Modal: z-50/z-[100], Harita markerları: z-10) gerekmektedir.

**Studio Yetkilisi Notu:**
> Sprint S11 panosuna eklendi (S11-T1 ve S11-T2). Geliştirme başladı.

- 📄 **Çözüm Planı:** [workspace/docs/cozum_planlari/TALEP-008.md](workspace/docs/cozum_planlari/TALEP-008.md)

---
### [TALEP-007] Tüm operatörler açılır menüsü (dropdown) açıldığında menü taşması ve istenmeyen scroll çubuğu oluşması (🔨 Geliştiriliyor)
- **Bildirim Tarihi:** 2026-09-17 19:19
- **Tür / Öncelik:** Hata / Bug / Yüksek (P2)
- **İlgili Ekran / Sayfa:** `/`
- **Görevli Rol:** `web_engineer`
- 🐙 **GitHub Issue:** [#7](https://github.com/cihan53/elektriklioto/issues/7)

**Müşteri Açıklaması / Hata Adımları:**
> Harita arayüzündeki 'Tüm Operatörler' dropdown açılır listesine tıklandığında menü içeriği ekranda düzgün görünmüyor, container taşması (overflow/z-index/max-height) nedeniyle menü kesiliyor ve istenmeyen çirkin bir scroll çubuğu çıkıyor.

**Studio Yetkilisi Notu:**
> Sprint S10 panosuna eklendi (S10-T1 ve S10-T2). Geliştirme başladı.

- 📄 **Çözüm Planı:** [workspace/docs/cozum_planlari/TALEP-007.md](workspace/docs/cozum_planlari/TALEP-007.md)

---
### [TALEP-006] Konum izni verildiğinde kullanıcının anlık konumunu gösteren mavi nokta/baloncuk eksik (🔨 Geliştiriliyor)
- **Bildirim Tarihi:** 2026-09-17 19:15
- **Tür / Öncelik:** Hata / Bug / Kritik (P1)
- **İlgili Ekran / Sayfa:** `/harita`
- **Görevli Rol:** `web_engineer`
- 🐙 **GitHub Issue:** [#6](https://github.com/cihan53/elektriklioto/issues/6)

**Müşteri Açıklaması / Hata Adımları:**
> Ziyaretçi harita üzerinde 'Konumumu Bul' butonuna tıklayıp tarayıcıda GPS/konum izni verdiğinde harita o bölgeye yaklaşıyor ancak kullanıcının tam olarak nerede durduğunu gösteren nabız atan mavi konum baloncuğu (user location marker / pulsing blue dot) haritada çizilmiyor.

**Studio Yetkilisi Notu:**
> Sprint S9 panosuna eklendi (S9-T5 ve S9-T6). Geliştirme başladı.

- 📄 **Çözüm Planı:** [workspace/docs/cozum_planlari/TALEP-006.md](workspace/docs/cozum_planlari/TALEP-006.md)

---
### [TALEP-005] GADM 4.1 Türkiye resmi il, ilçe ve mahalle koordinatlarının entegrasyonu (🔨 Geliştiriliyor)
- **Bildirim Tarihi:** 2026-09-17 19:13
- **Tür / Öncelik:** Yeni İstek / Özellik / Yüksek (P2)
- **İlgili Ekran / Sayfa:** `/harita`
- **Görevli Rol:** `backend_engineer`
- 🐙 **GitHub Issue:** [#5](https://github.com/cihan53/elektriklioto/issues/5)

**Müşteri Açıklaması / Hata Adımları:**
> gadm41_TUR veri kaynağından Türkiye'nin 81 il, 973 ilçe ve mahallelerinin resmi coğrafi sınır ve merkez koordinatları sisteme aktarılmalı; harita arama, ilçe/mahalle sorgulama ve geocoding mekanizması bu resmi CBS (GIS) veritabanı üzerinden çalışmalıdır.

**Studio Yetkilisi Notu:**
> Sprint S9 panosuna eklendi (S9-T3 ve S9-T4). Geliştirme başladı.

- 📄 **Çözüm Planı:** [workspace/docs/cozum_planlari/TALEP-005.md](workspace/docs/cozum_planlari/TALEP-005.md)

---
### [TALEP-004] Arama kutusunda ilçe, il ve istasyon araması ve harita odaklanması (🔨 Geliştiriliyor)
- **Bildirim Tarihi:** 2026-09-17 19:11
- **Tür / Öncelik:** Yeni İstek / Özellik / Yüksek (P2)
- **İlgili Ekran / Sayfa:** `/`
- **Görevli Rol:** `web_engineer`
- 🐙 **GitHub Issue:** [#4](https://github.com/cihan53/elektriklioto/issues/4)

**Müşteri Açıklaması / Hata Adımları:**
> Harita arama kutusuna ilçe (Kadıköy, Çankaya, Bodrum vb.), 81 il ve istasyon adı yazıldığında otomatik tamamlama önerileri gelmeli ve seçildiğinde harita ilgili konuma animasyonla (flyTo) odaklanmalıdır.

**Studio Yetkilisi Notu:**
> Sprint S9 panosuna eklendi (S9-T1 ve S9-T2). Geliştirme başladı.

- 📄 **Çözüm Planı:** [workspace/docs/cozum_planlari/TALEP-004.md](workspace/docs/cozum_planlari/TALEP-004.md)

---
### [TALEP-003] Haritada Voltrun istasyonlarının soket tipi yanlış görünüyor (🔨 Geliştiriliyor)
- **Bildirim Tarihi:** 2026-09-17 13:50
- **Tür / Öncelik:** Hata / Bug / Normal (P3)
- **İlgili Ekran / Sayfa:** `/`
- **Görevli Rol:** `web_engineer`
- 🐙 **GitHub Issue:** [#3](https://github.com/cihan53/elektriklioto/issues/3)

**Müşteri Açıklaması / Hata Adımları:**
> İstasyon detayında AC Tip 2 yerine CCS yazıyor.

**Studio Yetkilisi Notu:**
> Sprint S8 panosuna eklendi (S8-T3 ve S8-T4). Geliştirme başladı.

- 📄 **Çözüm Planı:** [workspace/docs/cozum_planlari/TALEP-003.md](workspace/docs/cozum_planlari/TALEP-003.md)

---
### [TALEP-002] google analytics hesabım var kodu G-BKMTW8EH4K trafiği izleye bilmem için bunun siteye eklenmesi gerekiyor (✅ Çözüldü)
- **Bildirim Tarihi:** 2026-09-17 13:47
- **Tür / Öncelik:** Hata / Bug / Normal (P3)
- **İlgili Ekran / Sayfa:** `/`
- **Görevli Rol:** `web_engineer`
- 🐙 **GitHub Issue:** [#2](https://github.com/cihan53/elektriklioto/issues/2)

**Müşteri Açıklaması / Hata Adımları:**
> google analytics hesabım var kodu G-BKMTW8EH4K trafiği izleye bilmem için bunun siteye eklenmesi gerekiyor

**Studio Yetkilisi Notu:**
> Görev S8-T2 başarıyla tamamlandı ve UAT testinden geçti.

- 📄 **Çözüm Planı:** [workspace/docs/cozum_planlari/TALEP-002.md](workspace/docs/cozum_planlari/TALEP-002.md)

---
### [TALEP-001] Haritada filtre butonuna basınca liste senkronize olmuyor (✅ Çözüldü)
- **Bildirim Tarihi:** 2026-09-17 13:45
- **Tür / Öncelik:** Hata / Bug / Normal (P3)
- **İlgili Ekran / Sayfa:** `/`
- **Görevli Rol:** `web_engineer`
- 🐙 **GitHub Issue:** [#1](https://github.com/cihan53/elektriklioto/issues/1)

**Müşteri Açıklaması / Hata Adımları:**
> Filtrelerde AC seçildiğinde haritadaki pinler güncelleniyor ancak alt liste görünümü eski istasyonları göstermeye devam ediyor.

**Studio Yetkilisi Notu:**
> 2026-09-17 13:45 itibarıyla ekip tarafından çözüldü ve müşteri onayına sunuldu.

- 📄 **Çözüm Planı:** [workspace/docs/cozum_planlari/TALEP-001.md](workspace/docs/cozum_planlari/TALEP-001.md)

---