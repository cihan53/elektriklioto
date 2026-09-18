
<script setup lang="ts">
import ChangelogModal from '~/components/modals/ChangelogModal.vue';

defineProps<{
  isOpen: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();
</script>

<template>
  <ChangelogModal :is-open="isOpen" @close="emit('close')" />
</template>
