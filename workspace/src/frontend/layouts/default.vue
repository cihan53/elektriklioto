<script setup lang="ts">
import { onMounted } from 'vue';
import HeaderNav from '~/components/common/HeaderNav.vue';
import ToastContainer from '~/components/common/ToastContainer.vue';
import UpdateNotificationModal from '~/components/modals/UpdateNotificationModal.vue';
import { useTheme } from '~/composables/useTheme';

const { initTheme } = useTheme();

onMounted(() => {
  initTheme();
});
</script>

<template>
  <div class="min-h-screen flex flex-col bg-bg-base text-text-primary">
    <!-- 64px Sabit Üst Bar -->
    <HeaderNav />

    <!-- Ana Sayfa İçeriği -->
    <main class="flex-1 relative flex flex-col">
      <slot />
    </main>

    <!-- Global Toast Bildirimleri -->
    <ToastContainer />

    <!-- Yeni Deploy / Sürüm Bildirim Modalı (TALEP-012) -->
    <UpdateNotificationModal />
  </div>
</template>
