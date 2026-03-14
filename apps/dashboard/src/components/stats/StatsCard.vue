<script setup lang="ts">
defineProps<{
  title: string;
  value: string | number;
  subtitle?: string;
  color?: string;
}>();
</script>

<template>
  <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
    <p class="text-sm font-medium text-gray-500">{{ title }}</p>
    <p class="text-3xl font-bold mt-2" :class="color || 'text-gray-900'">{{ value }}</p>
    <p v-if="subtitle" class="text-xs text-gray-400 mt-1">{{ subtitle }}</p>
  </div>
</template>
