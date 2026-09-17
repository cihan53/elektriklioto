
<script setup lang="ts">
import { ref } from 'vue';
import VectorMap from '~/components/map/VectorMap.vue';
import type { StationItem } from '~/types/station';

defineProps<{
  selectedOperator: string;
  isPublicOnly: boolean;
}>();

defineEmits<{
  (e: 'selectStation', st: StationItem): void;
}>();

const vectorMapRef = ref<any>(null);

const flyToCoords = (lon: number, lat: number, zoom = 12) => {
  vectorMapRef.value?.flyToCoords(lon, lat, zoom);
};

const locateUser = () => {
  vectorMapRef.value?.locateUser();
};

defineExpose({
  flyToCoords,
  locateUser,
});
</script>

<template>
  <VectorMap
    ref="vectorMapRef"
    :selected-operator="selectedOperator"
    :is-public-only="isPublicOnly"
    @select-station="$emit('selectStation', $event)"
  />
</template>
