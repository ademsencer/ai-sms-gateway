<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import DeviceTable from '@/components/devices/DeviceTable.vue';
import DeviceRegistrationForm from '@/components/devices/DeviceRegistrationForm.vue';
import TablePagination from '@/components/shared/TablePagination.vue';
import { useDeviceStore } from '@/stores/device.store';
import { useSocket } from '@/composables/useSocket';

const deviceStore = useDeviceStore();
const { onDeviceStatus, onDeviceRegistered } = useSocket();
const showForm = ref(false);

const page = ref(1);
const pageSize = ref(20);
const filterSearch = ref('');
const filterStatus = ref('all');

let searchTimer: ReturnType<typeof setTimeout> | null = null;

function getFilters() {
  return {
    search: filterSearch.value || undefined,
    status: filterStatus.value !== 'all' ? filterStatus.value : undefined,
  };
}

async function loadPage(p: number) {
  page.value = p;
  await deviceStore.fetchDevices(p, pageSize.value, getFilters());
}

function onFilterChange() {
  if (searchTimer) clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    page.value = 1;
    loadPage(1);
  }, 400);
}

function onPageSizeChange(size: number) {
  pageSize.value = size;
  page.value = 1;
  loadPage(1);
}

onMounted(async () => {
  await loadPage(1);

  onDeviceStatus((data: unknown) => {
    const event = data as { deviceId: string; status: string; lastSeen: string };
    deviceStore.updateDeviceStatus(event.deviceId, event.status, event.lastSeen);
  });

  onDeviceRegistered(() => {
    loadPage(page.value);
  });
});

watch(filterSearch, () => onFilterChange());
watch(filterStatus, () => {
  page.value = 1;
  loadPage(1);
});
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold text-gray-800">Devices</h1>
      <div class="flex items-center gap-2">
        <button
          @click="showForm = !showForm"
          class="px-4 py-2 text-sm rounded-lg transition-colors"
          :class="showForm
            ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            : 'bg-green-600 text-white hover:bg-green-700'"
        >
          {{ showForm ? 'Cancel' : '+ Add Device' }}
        </button>
        <button
          @click="loadPage(page)"
          class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white text-gray-700 text-sm rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
          Refresh
        </button>
      </div>
    </div>

    <DeviceRegistrationForm v-if="showForm" />

    <!-- Filters -->
    <div class="bg-white rounded-xl border border-gray-200 p-4 mb-4">
      <div class="flex items-center gap-3 flex-wrap">
        <div class="flex-1 min-w-[200px]">
          <input
            v-model="filterSearch"
            type="text"
            placeholder="Search name, IBAN, device ID, model..."
            class="w-full text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>
        <select
          v-model="filterStatus"
          class="text-sm border border-gray-300 rounded-lg px-3 py-1.5 text-gray-600 bg-white focus:outline-none focus:ring-1 focus:ring-primary-500"
        >
          <option value="all">All Status</option>
          <option value="online">Online</option>
          <option value="offline">Offline</option>
          <option value="error">Error</option>
        </select>
      </div>
    </div>

    <DeviceTable :devices="deviceStore.devices" @refresh="loadPage(page)" />

    <TablePagination
      :page="page"
      :total-pages="deviceStore.totalPages"
      :total="deviceStore.total"
      :page-size="pageSize"
      @update:page="loadPage"
      @update:page-size="onPageSizeChange"
    />
  </div>
</template>
