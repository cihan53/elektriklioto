
// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: false },
  devServer: {
    host: '127.0.0.1',
    port: 3000,
  },
  vite: {
    server: {
      hmr: {
        protocol: 'ws',
        host: '127.0.0.1',
      },
    },
  },
  modules: ['@nuxtjs/tailwindcss'],
  css: [
    '~/assets/css/tokens.css',
    '~/assets/css/main.css',
    'maplibre-gl/dist/maplibre-gl.css'
  ],
  app: {
    head: {
      title: 'elektriklioto.com — Elektrikli Araç Şarj İstasyonları Haritası ve Rehberi',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1, maximum-scale=5' },
        {
          name: 'description',
          content: 'Türkiye genelindeki tüm şarj ağlarını (ZES, Trugo, Eşarj ve 170+ operatör) tek haritada görün. Güncel konumlar ve EPDK sicil bilgileri.'
        },
        { name: 'theme-color', content: '#0066CC' },
        { property: 'og:site_name', content: 'elektriklioto.com' },
        { property: 'og:title', content: 'elektriklioto.com — Elektrikli Araç Şarj İstasyonları Haritası' },
        {
          property: 'og:description',
          content: '16.788 şarj istasyonu ve 179 lisanslı operatör tek haritada. Bağımsız e-Mobilite Asistanı.'
        },
        { property: 'og:type', content: 'website' }
      ],
      link: [
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' }
      ],
      script: [
        {
          innerHTML: `(function(){try{var m=localStorage.getItem("theme");var d=window.matchMedia("(prefers-color-scheme: dark)").matches;if(m==="dark"||(!m&&d)){document.documentElement.classList.add("dark");}else{document.documentElement.classList.remove("dark");}}catch(e){}})();`,
          type: 'text/javascript'
        },
        {
          src: 'https://www.googletagmanager.com/gtag/js?id=G-BKMTW8EH4K',
          async: true
        },
        {
          innerHTML: `window.dataLayer = window.dataLayer || []; function gtag(){dataLayer.push(arguments);} gtag('js', new Date()); gtag('config', 'G-BKMTW8EH4K');`,
          type: 'text/javascript'
        }
      ]
    }
  },
  runtimeConfig: {
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE || '/api/v1',
      mapTileUrl: process.env.NUXT_PUBLIC_MAP_TILE_URL || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
    }
  },
  typescript: {
    strict: true
  }
});
