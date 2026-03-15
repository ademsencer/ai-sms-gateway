<script setup lang="ts">
import { ref, onMounted } from 'vue';
import SmsTable from '@/components/sms/SmsTable.vue';
import { useSmsStore } from '@/stores/sms.store';
import { useAuthStore } from '@/stores/auth.store';
import { useSocket } from '@/composables/useSocket';
import { useApi } from '@/composables/useApi';

const smsStore = useSmsStore();
const authStore = useAuthStore();
const { onSmsReceived } = useSocket();
const { del } = useApi();
const page = ref(1);
const showClearConfirm = ref(false);

async function loadPage(p: number) {
  page.value = p;
  await smsStore.fetchMessages(p, 50);
}

async function deleteSms(id: string) {
  if (!confirm('Delete this SMS message?')) return;
  await del(`/sms/${id}`);
  await loadPage(page.value);
}

async function clearAll() {
  showClearConfirm.value = false;
  await del('/sms');
  await loadPage(1);
}

onMounted(async () => {
  await loadPage(1);

  onSmsReceived((data: unknown) => {
    if (page.value === 1) {
      smsStore.addMessage(data as Parameters<typeof smsStore.addMessage>[0]);
    }
  });
});
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-800">SMS Logs</h1>
        <p class="text-sm text-gray-500 mt-1">All received and forwarded SMS messages</p>
      </div>
      <div class="flex items-center gap-3">
        <span class="text-sm text-gray-400 tabular-nums">{{ smsStore.total.toLocaleString() }} messages</span>
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

    <!-- Clear All Confirmation Modal -->
    <Teleport to="body">
      <div v-if="showClearConfirm" class="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
        <div class="bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl">
          <div class="flex items-center gap-3 mb-4">
            <div class="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
              <svg class="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
            </div>
            <div>
              <h3 class="text-lg font-semibold text-gray-900">Clear All SMS Logs</h3>
              <p class="text-sm text-gray-500">This action cannot be undone</p>
            </div>
          </div>
          <p class="text-sm text-gray-600 mb-6">
            You are about to permanently delete <strong class="text-gray-900">{{ smsStore.total.toLocaleString() }} SMS messages</strong>.
          </p>
          <div class="flex justify-end gap-3">
            <button @click="showClearConfirm = false" class="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
            <button @click="clearAll" class="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700">Delete All</button>
          </div>
        </div>
      </div>
    </Teleport>

    <SmsTable :messages="smsStore.messages" @delete="deleteSms" />

    <!-- Pagination -->
    <div class="mt-4 flex items-center justify-between">
      <button
        :disabled="page <= 1"
        @click="loadPage(page - 1)"
        class="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 bg-white border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" /></svg>
        Previous
      </button>
      <span class="text-xs text-gray-400">Page {{ page }}</span>
      <button
        @click="loadPage(page + 1)"
        class="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
      >
        Next
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>
      </button>
    </div>
  </div>
</template>
