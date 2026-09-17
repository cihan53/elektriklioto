
# elektriklioto.com — Nuxt 3 Web Frontend

Bu modül `elektriklioto.com` platformunun web arayüzüdür (SSR & Client-Only Harita).

## Zorunlu Standartlar
- **Tasarım Sistemi:** `tasarim_sistemi.md` token'ları tek kaynaktır; keyfi renk/stil kodu bulunamaz.
- **Erişilebilirlik:** WCAG 2.1 AA (kontrast ≥ 4.5:1, tıklanabilir öğeler ≥ 44x44 CSS px).
- **Konum Gizliliği (KVKK):** Kullanıcı GPS koordinatları yalnızca istemci tarafında in-memory tutulur; sunucuya iletilmez.
- **Eksik Veri Modeli (Faz 1):** Soket, güç, tarife ve anlık doluluk EPDK veri setinde yer almaz; "Operatör Verisi Bekleniyor" rozetiyle render edilir; mock/uydurma veri girilemez.
- **Yasal EMP Statüsü:** elektriklioto.com lisanslı şarj operatörü değildir, elektrik satışı yapmaz; CPO uygulamalarına derin bağlantı (deep-link) ve pano kopyalama köprüsü kurar.
