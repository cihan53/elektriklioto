
<script setup lang="ts">
import VectorMap from '~/components/map/VectorMap.vue';
import type { StationItem } from '~/types/station';

defineProps<{
  selectedOperator: string;
  isPublicOnly: boolean;
}>();

defineEmits<{
  (e: 'selectStation', st: StationItem): void;
}>();
</script>

<template>
  <VectorMap
    :selected-operator="selectedOperator"
    :is-public-only="isPublicOnly"
    @select-station="$emit('selectStation', $event)"
  />
</template>
