# Hata Raporları (Bug Reports): elektriklioto.com (Faz 1)

> **Belge Sürümü:** 1.0.0-faz1  
> **Denetçi Rolü:** Ziyaretçi Deneyimi & Ekran Gezinim Testçisi (`screen_visitor_tester`)  
> **Denetim Tarihi:** 2026-09-16  
> **Test Ortamı:** Nuxt 3 Web (localhost:3000) & Fastify API (localhost:3001)  
> **Doğruluk Kaynakları:** `proje_kapsami.md`, `kabul_kriterleri.md`, `ekran_envanteri.md`, `ux_akislari.md`

---

## 1. Hata Özeti

| Hata Kodu | Şiddet | Ekran / Bileşen | Durum | Kısa Tanım |
|---|---|---|---|---|
| **BUG-VIS-01** | Kritik (P1) | SCR-05 (`/r/[payload].vue`) | Açık | Backend decode uç noktası 404 uyuşmazlığı ve potansiyel `toFixed` TypeError riski |

---

## 2. Detaylı Hata Kayıtları

### BUG-VIS-01: Rota Aktarım Köprüsü Uç Noktası Uyuşmazlığı ve `toFixed` Tür Riski
- **İlgili Ekran:** SCR-05 Web-Mobil Rota Aktarım Köprüsü (`pages/r/[payload].vue`)
- **İlgili Backend Modülü:** `src/modules/route-bridge/route-bridge.routes.ts`
- **Hata Türü:** 404 Not Found & Potansiyel TypeError (Uncaught Exception)
- **Tekrarlama Adımları:**
  1. `http://localhost:3000/r/{payload}` sayfasına geçerli veya örnek bir Base64 URL ile gidilir.
  2. Nuxt SSR motoru `${config.public.apiBase}/routes/bridge/decode/${payload}` adresine GET isteği atar.
  3. Fastify backend bu rotayı tanımadığı için `404 Not Found (Route GET:/api/v1/routes/bridge/decode/... not found)` yanıtı döner.
  4. Backend aslında `GET /r/:payload` rotasını dinlemektedir.
  5. Ayrıca `route-bridge.service.ts` çıktısındaki `stops` dizisi `string[]` (istasyon UUID listesi) döndüğünde, şablondaki `stop.lat.toFixed(4)` ifadesi `TypeError: Cannot read properties of undefined (reading 'toFixed')` hatası üretme potansiyeli taşır.
- **Beklenen Davranış:** Frontend ve Backend rota çözümleme uç noktasının (`/api/v1/routes/bridge/decode/:payload` veya `/r/:payload`) tam uyumlu çalışması; durak listesindeki koordinatların güvenli zincirleme (`stop?.lat?.toFixed?.(4) ?? '—'`) ile işlenmesi.
- **Düzeltme Önerisi:**
  1. `workspace/src/backend/src/modules/route-bridge/route-bridge.routes.ts` dosyasına `/api/v1/routes/bridge/decode/:payload` rotası eklenmeli.
  2. `workspace/src/frontend/pages/r/[payload].vue` içinde `stop.lat` ve `stop.lon` kontrolleri `v-if="stop.lat != null"` ile güvenceye alınmalıdır.
