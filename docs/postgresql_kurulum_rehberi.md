# PostgreSQL & PostGIS Veritabanı Kurulum ve Yapılandırma Rehberi

Bu rehber, sunucunuzdaki yerel **PostgreSQL** servisini **elektriklioto.com** platformuna bağlamak, PostGIS/UUID eklentilerini açmak, tabloları oluşturmak ve 3600+ şarj istasyonunu veritabanına aktarmak için hazırlanmıştır.

İki yöntemden dilediğinizi seçebilirsiniz:
- **Yöntem 1 (Önerilen):** SSH üzerinden tek tıkla otomatik kurulum scripti.
- **Yöntem 2:** pgAdmin grafik arayüzü ile kurulum.

---

## 🚀 Yöntem 1: Tek Komutla Otomatik Kurulum (SSH / Terminal - Önerilen)

Sunucunuza SSH ile root (veya sudo yetkili) kullanıcı olarak bağlandıktan sonra proje ana dizininde (`/home/elektriklioto/app`) şu komutu çalıştırmanız yeterlidir:

```bash
sudo ./server-scripts/setup_postgresql.sh
```

### Script Neler Yapar?
1. PostgreSQL servisinin ayakta olduğunu doğrular.
2. `elektriklioto_user` kullanıcısını ve `elektriklioto_istasyon` veritabanını oluşturur (varsayılan olarak tanımlı şifrenizi `i=J?Rflmij$45Fe3` kullanır).
3. `uuid-ossp` ve `postgis` eklentilerini aktif eder.
4. [`server-scripts/schema.sql`](file:///Users/cihan/PROJECT/elektriklioto-gemini/server-scripts/schema.sql) dosyasını çalıştırarak tüm tabloları (`station`, `operator`, `connector` vb.) ve koordinat indekslerini kurar.
5. [`server-scripts/seed_data.sql`](file:///Users/cihan/PROJECT/elektriklioto-gemini/server-scripts/seed_data.sql) dosyasını çalıştırarak 3643 istasyonu saniyeler içinde PostgreSQL'e aktarır.
6. Şifredeki özel karakterleri (`?`, `=`, `$`) URL-encode ederek (`i%3DJ%3FRflmij%2445Fe3`) projenin `.env` dosyasına doğru `DATABASE_URL` satırını otomatik yazar.
7. İstasyon ve operatör sayılarını ekrana basarak kurulumu doğrular.

---

## 🖥️ Yöntem 2: pgAdmin Arayüzü ile Adım Adım Kurulum

Eğer pgAdmin ekranından görsel olarak yapmak isterseniz:

### 1. Veritabanı ve Kullanıcı Oluşturma
1. pgAdmin'e giriş yapın ve sol paneldeki sunucunuza (**Servers**) bağlanın.
2. **Login/Group Roles** üzerine sağ tıklayın -> **Create** -> **Login/Group Role**:
   - **Name:** `elektriklioto_user`
   - **Definition:** Şifre: `i=J?Rflmij$45Fe3`
   - **Privileges:** `Can login?` = Yes olarak işaretleyin ve **Save** deyin.
3. **Databases** üzerine sağ tıklayın -> **Create** -> **Database**:
   - **Database:** `elektriklioto_istasyon`
   - **Owner:** `elektriklioto_user`
   - **Save** deyin.

---

### 2. Tabloları Oluşturma (DDL Şeması)
1. Sol menüde yeni oluşturduğunuz `elektriklioto_istasyon` veritabanına tıklayın.
2. Üst menüden **Tools** -> **Query Tool** seçeneğine tıklayın.
3. Projedeki [`server-scripts/schema.sql`](file:///Users/cihan/PROJECT/elektriklioto-gemini/server-scripts/schema.sql) dosyasının tüm içeriğini kopyalayıp Query Tool ekranına yapıştırın.
4. **F5** tuşuna (veya üstteki **▶ Execute** simgesine) basın.
   - *Tablolar (`station`, `operator`, `connector`, `station_report` vb.) ve indeksler saniyeler içinde oluşacaktır.*

---

### 3. İstasyonları Tohumlama (Seed Data)
1. Yine pgAdmin **Query Tool** ekranında:
2. Projedeki [`server-scripts/seed_data.sql`](file:///Users/cihan/PROJECT/elektriklioto-gemini/server-scripts/seed_data.sql) dosyasının içeriğini yapıştırın (veya üstteki **Open File** simgesiyle bu dosyayı seçin).
3. **F5** tuşuna basarak çalıştırın.
   - *3643 istasyon ve tüm soket verileri veritabanına aktarılır.*

---

### 4. Proje `.env` Dosyasına Bağlantıyı Tanımlama

Kurulum tamamlandıktan sonra projenin kök dizinindeki `.env` dosyasını açıp veritabanı bağlantı adresinizi güncelleyin:

> [!IMPORTANT]
> Şifredeki `?`, `=`, `$` karakterleri URL ayrıştırıcıları tarafından bozulmaması için URL-encode edilmelidir:
> `i=J?Rflmij$45Fe3` ➔ `i%3DJ%3FRflmij%2445Fe3`

```env
DATABASE_URL=postgres://elektriklioto_user:i%3DJ%3FRflmij%2445Fe3@127.0.0.1:5432/elektriklioto_istasyon
```

---

## 🔍 Doğrulama ve Test Sorgusu

Kurulumun başarılı olduğunu pgAdmin Query Tool'da şu SQL sorgusunu çalıştırarak hemen teyit edebilirsiniz:

```sql
SELECT 
    (SELECT count(*) FROM "operator") AS "Operatör Sayısı",
    (SELECT count(*) FROM "station") AS "İstasyon Sayısı",
    (SELECT count(*) FROM "connector") AS "Soket Sayısı";
```

**Beklenen Çıktı:**
- Operatör Sayısı: `5`
- İstasyon Sayısı: `3643`
- Soket Sayısı: `3643+`

Son olarak uygulamayı yeniden başlatmak için terminalden:
```bash
touch tmp/restart.txt
```
komutunu çalıştırmanız yeterlidir!
