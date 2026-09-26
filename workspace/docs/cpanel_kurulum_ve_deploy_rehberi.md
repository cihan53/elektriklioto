# cPanel Kurulum ve Otomatik GitHub Actions Dağıtım (Deploy) Rehberi

Bu doküman, **elektriklioto.com** web arabirimi ve backend API servisinin cPanel sunucusu üzerine kurulması ve GitHub Actions aracılığıyla otomatik olarak dağıtılması (deploy edilmesi) için gerekli tüm adımları içerir.

---

## 1. GitHub Secrets Yapılandırması

GitHub reponuzun **Settings > Secrets and variables > Actions** sayfasına giderek aşağıdaki gizli değişkenleri (Repository Secrets) tanımlayınız:

| Secret Adı | Açıklama | Örnek Değer |
|---|---|---|
| `CPANEL_SSH_HOST` | cPanel sunucunuzun IP adresi veya hostname'i | `185.xxx.xxx.xxx` veya `cpanel.elektriklioto.com` |
| `CPANEL_SSH_USER` | cPanel SSH kullanıcı adınız | `denemekulubum` |
| `CPANEL_SSH_PRIVATE_KEY` | cPanel'e bağlanacak SSH özel anahtarı (Private Key) | `-----BEGIN OPENSSH PRIVATE KEY----- ...` |
| `CPANEL_SSH_PORT` | SSH bağlantı portu (Genellikle 22 veya hosting özel portu) | `22` |
| `CPANEL_APP_DIR` | Projenin cPanel sunucusundaki tam yolu | `/home/elektriklioto/app` |
| `CPANEL_SSH_PASSPHRASE` | *(İsteğe Bağlı)* SSH anahtarınız şifreli ise parolası | `AnahtarSifreniz123` |

---

## 2. cPanel Sunucusunda İlk Kurulum (Tek Seferlik)

SSH ile cPanel sunucunuza bağlanınız ve aşağıdaki adımları sırayla uygulayınız:

### Adım 2.1: Proje Dizinini Oluşturma ve Git Clone
```bash
# Kullanıcı ev dizininde app klasörüne geçiniz
cd /home/elektriklioto

# Repoyu klonlayınız (veya app klasörü oluşturup içine klonlayınız)
git clone https://github.com/cihan53/elektriklioto.git app
cd app
```

### Adım 2.2: Üretim Ortam Değişkenlerini Tanımlama
```bash
cp .env.cpanel.example .env
nano .env  # Gerekli PORT, DATABASE_URL ve SECRET değerlerini güncelleyiniz
```

### Adım 2.3: İlk Derleme ve Hazırlık
```bash
# Otomatik dağıtım betiğini ilk defa manuel çalıştırarak bağımlılıkları derleyin:
chmod +x .github/scripts/deploy.sh
./.github/scripts/deploy.sh
```

---

## 3. cPanel "Setup Node.js App" Yapılandırması

cPanel paneline girerek **Yazılım (Software) > Setup Node.js App** menüsüne tıklayınız:

### 3.1. Web Frontend (Nuxt 3) Uygulaması:
- **Node.js Version:** 18.x veya 20.x (Önerilen: 20+)
- **Application Mode:** `Production`
- **Application Root:** `app` (veya projenizin bulunduğu dizin: `/home/elektriklioto/app`)
- **Application URL:** `elektriklioto.com` (Ana alan adınız)
- **Application Startup File:** `cpanel_nuxt_entry.cjs`
- **Passenger Log File:** `/home/elektriklioto/logs/nuxt.log`

### 3.2. Backend API (Fastify) Uygulaması (Subdomain Kullanılıyorsa):
- **Node.js Version:** 18.x veya 20.x
- **Application Mode:** `Production`
- **Application Root:** `app`
- **Application URL:** `api.elektriklioto.com`
- **Application Startup File:** `cpanel_api_entry.cjs`
- **Passenger Log File:** `/home/elektriklioto/logs/api.log`

---

## 4. Otomatik Dağıtımın (Deploy) Çalışması

GitHub reponuzun `main` veya `master` dalına her kod gönderdiğinizde (`git push`):

1. **Tag & Release:** GitHub Actions otomatik olarak yeni bir semantik versiyon etiketi (örn: `v1.0.4`) ve GitHub Release oluşturur.
2. **SSH Bağlantısı:** `appleboy/ssh-action` ile sunucunuza bağlanır.
3. **Conflict Koruması:** Sunucudaki yerel izin/geçici dosya çakışmalarını önlemek için `git reset --hard` çalıştırır.
4. **Build & Restart:** `.github/scripts/deploy.sh` tetiklenir:
   - Backend ve Frontend bağımlılıkları kurulur ve derlenir.
   - `tmp/restart.txt` dosyasına dokunularak cPanel Phusion Passenger sunucusu kesintisiz olarak yeniden başlatılır.

---

## 5. Sorun Giderme (Troubleshooting)

- **Uygulama başlamıyor / 503 Service Unavailable:**
  - cPanel dosya yöneticisinden veya SSH'tan `logs/` klasörünü ve `tmp/restart.txt` dosyasını kontrol ediniz.
  - Node sürümünün en az 18+ olduğundan emin olunuz (`node -v`).
- **Veritabanı bağlantı hatası:**
  - `.env` dosyasındaki `DATABASE_URL` parametresini kontrol ediniz.
  - Eğer cPanel'de yerel MySQL kullanılıyorsa kullanıcı izinlerini kontrol ediniz.
