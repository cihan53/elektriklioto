# cPanel Cron Jobs (Zamanlanmış Görevler) Yapılandırma Rehberi

Bu rehber, **elektriklioto.com** platformunun Türkiye genelindeki şarj istasyonları verisini (ZES, Trugo, Voltrun, Eşarj ve EPDK) her gün otomatik olarak çekip veritabanı/JSON havuzunu güncellemesi için cPanel panelinde yapılması gereken adımları açıklar.

---

## 1. cPanel Cron Jobs Arayüzüne Giriş

1. cPanel kontrol panelinize giriş yapınız.
2. **Gelişmiş (Advanced)** bölümü altındaki **Cron Jobs (Zamanlanmış Görevler)** simgesine tıklayınız.

---

## 2. Zamanlama Ayarı (Her Gece 03:00)

Sunucu trafiğinin en düşük olduğu gece saatleri önerilir:

| Ayar | Değer | Açıklama |
|---|---|---|
| **Dakika (Minute)** | `0` | Saatin başında |
| **Saat (Hour)** | `3` | Gece 03:00 |
| **Gün (Day)** | `*` | Her gün |
| **Ay (Month)** | `*` | Her ay |
| **Haftanın Günü (Weekday)** | `*` | Haftanın her günü |

*(Standart Cron ifadesi: `0 3 * * *`)*

---

## 3. Çalıştırılacak Komut (Command)

Aşağıdaki komutu cPanel'deki **Komut (Command)** kutusuna yapıştırınız:

```bash
/bin/bash /home/elektriklioto/app/scripts/cron_daily_sync.sh
```

---

## 4. İsteğe Bağlı: Manuel Test Etme (SSH Üzerinden)

Cronjob'ı beklemeden komutun çalıştığını SSH terminalinizden test etmek için:

```bash
cd /home/elektriklioto/app
./scripts/cron_daily_sync.sh
```

### Log Çıktısını İzleme:
Senkronizasyonun durumunu, eklenen istasyon sayısını ve geçmiş logları görmek için:

```bash
cat /home/elektriklioto/app/logs/cron_daily_sync.log
```
veya anlık canlı takip için:
```bash
tail -f /home/elektriklioto/app/logs/cron_daily_sync.log
```

---

## 5. Cronjob Ne Yapar?

1. ZES, Trugo, Voltrun ve EPDK veri kaynaklarını çeker ve normalize eder.
2. `workspace/src/backend/src/data/cpo_stations.json` dosyasını atomik olarak günceller.
3. cPanel Passenger uygulamasını (`tmp/restart.txt`) yeniden başlatarak API servisinin belleğini anında tazeler.
4. Log rotasyonu yaparak disk alanını korur.
