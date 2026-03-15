<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import SmsTable from '@/components/sms/SmsTable.vue';
import TablePagination from '@/components/shared/TablePagination.vue';
import DeleteConfirmModal from '@/components/shared/DeleteConfirmModal.vue';
import { useSmsStore } from '@/stores/sms.store';
import type { SmsFilters } from '@/stores/sms.store';
import { useAuthStore } from '@/stores/auth.store';
import { useSocket } from '@/composables/useSocket';
import { useApi } from '@/composables/useApi';

const route = useRoute();
const smsStore = useSmsStore();
const authStore = useAuthStore();
const { onSmsReceived } = useSocket();
const { del } = useApi();

const page = ref(1);
const pageSize = ref(20);
const showClearConfirm = ref(false);

// Filters
const filterDeviceId = ref('');
const filterOwnerName = ref('');
const filterIban = ref('');
const filterSearch = ref('');

// Debounce timer
let searchTimer: ReturnType<typeof setTimeout> | null = null;

function getFilters(): SmsFilters {
  const filters: SmsFilters = {};
  if (filterDeviceId.value) filters.deviceId = filterDeviceId.value;
  if (filterOwnerName.value) filters.ownerName = filterOwnerName.value;
  if (filterIban.value) filters.iban = filterIban.value;
  if (filterSearch.value) filters.search = filterSearch.value;
  return filters;
}

async function loadPage(p: number) {
  page.value = p;
  await smsStore.fetchMessages(p, pageSize.value, getFilters());
}

function onFilterChange() {
  if (searchTimer) clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    page.value = 1;
    loadPage(1);
  }, 400);
}

function clearFilters() {
  filterDeviceId.value = '';
  filterOwnerName.value = '';
  filterIban.value = '';
  filterSearch.value = '';
  page.value = 1;
  loadPage(1);
}

function hasFilters(): boolean {
  return !!(filterDeviceId.value || filterOwnerName.value || filterIban.value || filterSearch.value);
}

async function deleteSms(id: string) {
  await del(`/sms/${id}`);
  await loadPage(page.value);
}

async function clearAll() {
  showClearConfirm.value = false;
  await del('/sms');
  await loadPage(1);
}

function onPageSizeChange(size: number) {
  pageSize.value = size;
  page.value = 1;
  loadPage(1);
}

onMounted(async () => {
  // Check for query params from Devices page "View SMS" button
  if (route.query.deviceId) {
    filterDeviceId.value = route.query.deviceId as string;
  }
  if (route.query.ownerName) {
    filterOwnerName.value = route.query.ownerName as string;
  }

  await loadPage(1);

  onSmsReceived((data: unknown) => {
    if (page.value === 1 && !hasFilters()) {
      smsStore.addMessage(data as Parameters<typeof smsStore.addMessage>[0]);
    }
  });
});

watch([filterDeviceId, filterOwnerName, filterIban, filterSearch], () => {
  onFilterChange();
});
</script>

<template>
  <div>
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
      <div>
        <h1 class="text-xl sm:text-2xl font-bold text-gray-800">SMS Logs</h1>
        <p class="text-xs sm:text-sm text-gray-500 mt-1">All received and forwarded SMS messages</p>
      </div>
      <div class="flex items-center gap-2 sm:gap-3">
        <button
          @click="loadPage(1)"
          class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white text-gray-700 text-sm rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
          Refresh
        </button>
        <button
          v-if="authStore.isAdmin && smsStore.total > 0"
          @click="showClearConfirm = true"
          class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 text-sm rounded-lg border border-red-200 hover:bg-red-100 transition-colors"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
          Clear All
        </button>
      </div>
    </div>

    <!-- Filters -->
    <div class="bg-white rounded-xl border border-gray-200 p-3 sm:p-4 mb-4">
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:items-center gap-2 sm:gap-3">
        <div class="sm:col-span-2 lg:flex-1 lg:min-w-[180px]">
          <input
            v-model="filterSearch"
            type="text"
            placeholder="Search sender or message..."
            class="w-full text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>
        <div>
          <input
            v-model="filterDeviceId"
            type="text"
            placeholder="Device ID"
            class="w-full text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 font-mono text-xs"
          />
        </div>
        <div>
          <input
            v-model="filterOwnerName"
            type="text"
            placeholder="Owner name"
            class="w-full text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>
        <div>
          <input
            v-model="filterIban"
            type="text"
            placeholder="IBAN"
            class="w-full text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 font-mono text-xs"
          />
        </div>
        <button
          v-if="hasFilters()"
          @click="clearFilters"
          class="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
        >
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
          Clear
        </button>
      </div>
    </div>

    <DeleteConfirmModal
      :show="showClearConfirm"
      title="Clear All SMS Logs"
      :message="`You are about to permanently delete <strong>${smsStore.total.toLocaleString()} SMS messages</strong>.`"
      @confirm="clearAll"
      @cancel="showClearConfirm = false"
    />

    <SmsTable :messages="smsStore.messages" @delete="deleteSms" />

    <TablePagination
      :page="page"
      :total-pages="smsStore.totalPages"
      :total="smsStore.total"
      :page-size="pageSize"
      @update:page="loadPage"
      @update:page-size="onPageSizeChange"
    />
  </div>
</template>
