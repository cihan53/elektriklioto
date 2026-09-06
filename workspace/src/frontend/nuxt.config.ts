
// Nuxt 3 iskeleti — Sprint S1: harita sayfası + üretilmiş API istemcisi.
// SEO modülleri (sitemap, schema-org), Tailwind ve i18n bu görevin kapsamı dışıdır;
// ayrı bir sprint görevinde eklenecektir (bkz. teknik_mimari_dokumani.md §8).
export default defineNuxtConfig({
  compatibilityDate: "2026-09-06",
  devtools: { enabled: true },
  css: ["~/assets/css/main.css"],
  typescript: {
    strict: true,
    typeCheck: false,
  },
  runtimeConfig: {
    public: {
      // Tarayıcı yalnızca api. alt alan adıyla konuşur (bkz. teknik_mimari_dokumani.md §2).
      apiBase: process.env.NUXT_PUBLIC_API_BASE || "https://api.elektriklioto.com",
      // > **Varsayım:** Harita karo (tile) sağlayıcı API anahtarı henüz kurulmadı
      // (bkz. paket_secim_raporu.md §6: "KURULUM GEREKİYOR: harita karo sağlayıcı API anahtarı").
      // Anahtar gerektirmeyen açık kaynaklı bir stil varsayılan olarak tanımlanmıştır;
      // gerçek sağlayıcı belirlendiğinde NUXT_PUBLIC_MAP_STYLE_URL ile değiştirilir.
      mapStyleUrl:
        process.env.NUXT_PUBLIC_MAP_STYLE_URL || "https://tiles.openfreemap.org/styles/liberty",
    },
  },
});
