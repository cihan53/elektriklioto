
<script setup lang="ts">
import { onMounted } from 'vue';

// Google Analytics Entegrasyonu (TALEP-002: G-BKMTW8EH4K)
if (typeof useHead === 'function') {
  useHead({
    script: [
      {
        src: 'https://www.googletagmanager.com/gtag/js?id=G-BKMTW8EH4K',
        async: true,
      },
      {
        innerHTML: `window.dataLayer = window.dataLayer || []; function gtag(){dataLayer.push(arguments);} gtag('js', new Date()); gtag('config', 'G-BKMTW8EH4K');`,
        type: 'text/javascript',
      },
    ],
  });
}

onMounted(() => {
  if (typeof window !== 'undefined') {
    (window as any).dataLayer = (window as any).dataLayer || [];
    function gtag(...args: any[]) {
      (window as any).dataLayer.push(arguments);
    }
    gtag('js', new Date());
    gtag('config', 'G-BKMTW8EH4K');
  }
});
</script>

<template>
  <!-- Google Analytics Tracking Component (TALEP-002: G-BKMTW8EH4K) -->
  <div class="hidden" aria-hidden="true" data-testid="google-analytics"></div>
</template>
