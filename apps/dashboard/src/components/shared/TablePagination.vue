<script setup lang="ts">
defineProps<{
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
}>();

const emit = defineEmits<{
  'update:page': [page: number];
  'update:pageSize': [size: number];
}>();

const pageSizes = [20, 50, 100, 250, 500];
</script>

<template>
  <div class="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
    <div class="flex items-center gap-3 order-2 sm:order-1">
      <button
        :disabled="page <= 1"
        @click="emit('update:page', page - 1)"
        class="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 bg-white border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" /></svg>
        <span class="hidden sm:inline">Previous</span>
      </button>
    </div>

    <div class="flex items-center gap-3 sm:gap-4 order-1 sm:order-2 w-full sm:w-auto justify-between sm:justify-center">
      <div class="flex items-center gap-2">
        <span class="text-xs text-gray-400">Show</span>
        <select
          :value="pageSize"
          @change="emit('update:pageSize', Number(($event.target as HTMLSelectElement).value))"
          class="text-xs border border-gray-300 rounded-md px-2 py-1 text-gray-600 bg-white focus:outline-none focus:ring-1 focus:ring-primary-500"
        >
          <option v-for="size in pageSizes" :key="size" :value="size">{{ size }}</option>
        </select>
      </div>
      <span class="text-xs text-gray-400 tabular-nums">
        <span class="hidden sm:inline">Page </span>{{ page }}<span class="hidden sm:inline"> of {{ totalPages }}</span>
        <span class="text-gray-300 mx-1">|</span>
        {{ total.toLocaleString() }}<span class="hidden sm:inline"> total</span>
      </span>
    </div>

    <div class="flex items-center gap-3 order-3">
      <button
        :disabled="page >= totalPages"
        @click="emit('update:page', page + 1)"
        class="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 bg-white border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors"
      >
        <span class="hidden sm:inline">Next</span>
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>
      </button>
    </div>
  </div>
</template>
