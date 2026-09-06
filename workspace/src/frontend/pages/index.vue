
<template>
  <main class="map-page">
    <header class="map-page__header">
      <h1>elektriklioto.com</h1>
      <p>Türkiye genelindeki şarj istasyonlarını tek haritada gör.</p>
    </header>
    <StationMap class="map-page__map" />
  </main>
</template>

<script setup lang="ts">
// Bu görev yalnızca harita dilimini kapsar; filtreleme arayüzü, istasyon detay ekranı
// ve web→mobil köprüsü ayrı sprint görevleridir (bkz. GİRDİ: proje_kapsami.md §3).
useSeoMeta({
  title: "elektriklioto.com — Şarj İstasyonu Haritası",
  description: "Türkiye genelindeki elektrikli araç şarj istasyonlarını tek haritada görün.",
});
</script>

<style scoped>
.map-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

.map-page__header {
  padding: 0.75rem 1rem;
  border-bottom: 1px solid #e5e7eb;
  background: #ffffff;
}

.map-page__header h1 {
  font-size: 1.125rem;
  margin: 0;
}

.map-page__header p {
  margin: 0.25rem 0 0;
  font-size: 0.875rem;
  color: #4b5563;
}

.map-page__map {
  flex: 1;
  min-height: 0;
}
</style>
