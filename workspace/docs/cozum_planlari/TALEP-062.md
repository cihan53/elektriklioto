# Studio Yetkilisi Çözüm Planı: TALEP-062

> **Talep:** [TALEP-062] Sunucuda PostgreSQL senkronizasyonu (seed_postgres.py) başarısız oluyor  
> **Müşteri / Bildiren:** Proje Sahibi  
> **Bildirim Tarihi:** 2026-10-02 08:47  
> **Öncelik:** YUKSEK | **Tür:** HATA  
> **Koordinatör:** Studio Yetkilisi & Teknik Liderlik  
> **Görevlendirilen Rol:** `data_engineer` (Veri & ETL Mühendisi (Python Pipeline & Scraper))  
> **Kategori Tespiti:** Otomatik (keyword analizi + AI destekli)  

---

## 1. Müşteri Talebi ve Problem Tanımı

Müşteri (proje sahibi) denetimi sırasında aşağıdaki durumu tespit etti:

> **Açıklama:**  
> Sunucuda otomatik çalışan PostgreSQL senkronizasyonu (seed_postgres.py) işlemi başarısız olmakta ve loglarda 'PostgreSQL senkronizasyonu başarısız. /home/elektriklioto/app/server-scripts/seed_data.sql elle uygulanabilir.' uyarısı verilmektedir. Veritabanı senkronizasyonunun hatasız ve otomatik olarak tamamlanabilmesi için ilgili betiğin ve veritabanı bağlantı/çalışma süreçlerinin incelenerek düzeltilmesi gerekmektedir.

- **Etkilenen Ekran / URL:** `Sunucu / Dağıtım`
- **Hedef Bileşen Grubu:** Veri Kazıma & ETL Pipeline (Python)

---

## 2. Kök Neden & Mimari Analiz

**Statik Analiz:**

Sunucu tarafındaki PostgreSQL senkronizasyonunun (`seed_postgres.py`) başarısız olması ve manuel SQL uyarısı vermesi aşağıdaki kök nedenlerden kaynaklanmaktaydı:

1. **Python 3.6 - 3.8 Sürüm Uyumluluğu:** cPanel paylaşımlı barındırma sunucusunda `/usr/bin/python3` sürümü Python 3.6.8 olarak çalışmaktadır. `seed_postgres.py` betiğinde yer alan PEP 604 union tipleri (`str | None`), PEP 585 generikleri (`list[str]`) ve `subprocess.run` içindeki `capture_output=True, text=True` parametreleri Python 3.6'da `TypeError` ve `SyntaxError` ile betiğin anında kırılmasına yol açmaktaydı.
2. **Kimlik Doğrulama ve Parola Ortam Değişkenleri:** `psql` çağrılırken `PGPASSWORD` ortam değişkeni açıkça set edilmediğinde, cron altında TTY bulunmadığı için libpq parola sorma adımında veya URL encode karakterlerde (`?`, `=`, `$`) `fe_sendauth: no password supplied` hatası vermekteydi.
3. **Sürücü İşlem (Transaction) ve SSL Hatası:** Python `psycopg2` sürücüsünde `conn.autocommit = True` durumunda `conn.commit()` çağrılması `ProgrammingError: cannot commit() in autocommit mode` istisnası fırlatmaktaydı. `pg8000` sürücüsünde ise `ssl_context = True` parametresi `TypeError: ssl_context must be an ssl.SSLContext object` hatasına sebep oluyordu.
4. **Sürücü Yedekleme Eksikliği:** Sunucuda hem `psql` hem de Python DB sürücülerinin (psycopg/psycopg2/pg8000) bulunmadığı durumlarda senkronizasyon doğrudan başarısız oluyordu; backend'in kurulu Node.js `postgres.js` paketi fallback olarak kullanılmıyordu.

**İlgili Dosyalar & Modüller:**
   - `workspace/server-scripts/seed_postgres.py`
   - `workspace/infra/server-scripts/seed_postgres.py`
   - `workspace/server-scripts/cron_daily_sync.sh`

---

## 3. Ekip İçin Adım Adım Aksiyon Planı

### Aşama A: Kaynak & Ortam Analizi (`data_engineer`)
- Sunucudaki Python sürüm kısıtları (CentOS / cPanel Python 3.6+) ve PATH hiyerarşisi incelendi.
- `seed_postgres.py` betiğindeki sözdizimi, subprocess parametreleri ve DB-API sürücü çağrıları denetlendi.

### Aşama B: Kodlama & Entegrasyon (`data_engineer`)
- `seed_postgres.py` Python 3.6+ ile tam geriye dönük uyumlu hale getirildi (PEP 604/585 tipleri kaldırıldı, `subprocess.run` `stdout=PIPE, stderr=PIPE, universal_newlines=True` yapıldı).
- `PGPASSWORD`, `PGUSER`, `PGHOST`, `PGPORT`, `PGDATABASE` ortam değişkenleri otomatik ayrıştırılıp psql işlemine aktarıldı.
- `_apply_sql_with_python_driver` içindeki autocommit/commit çakışması ve `pg8000` SSLContext yapılandırması düzeltildi.
- Çok katmanlı aktarım mimarisi kuruldu: (1) `psql` -> (2) Python sürücüleri (`psycopg3`/`psycopg2`/`pg8000`) -> (3) Node.js (`postgres.js` fallback).
- `.env` otomatik keşif modülü (`_load_env_database_url`) eklendi.

### Aşama C: Test & Doğrulama (`data_engineer` + `qa_lead`)
- `python3 -m py_compile` ile Python sözdizimi doğrulandı.
- `seed_postgres.py` hem yerel hem de parametreli ortamda test edildi; `seed_data.sql` dosyasının hatasız üretildiği ve bağlantı katmanlarının doğru çalıştığı onaylandı.
- Vitest backend ve frontend test paketleri çalıştırıldı.

---

## 4. Kabul Kriterleri (Definition of Done)

- [x] `seed_postgres.py` Python 3.6+ ve cPanel ortamında sözdizimi hatası vermeden derleniyor ve çalışıyor.
- [x] `DATABASE_URL` tanımlı olduğunda `psql`, Python DB sürücüsü ve Node.js sürücüsü ile çok katmanlı otomatik aktarım deneniyor.
- [x] `psql` çalışırken parola `PGPASSWORD` ortam değişkeniyle güvenli ve tty bağımsız olarak iletiliyor.
- [x] `seed_data.sql` eksiksiz üretiliyor ve otomatik aktarım başarısız olsa bile dosya yolu açıkça raporlanıyor.
- [x] Tüm birim ve entegrasyon testleri başarıyla tamamlandı.
- [x] Değişiklik tamamlandıktan sonra talep durumu `COZULDU` olarak güncellendi.
