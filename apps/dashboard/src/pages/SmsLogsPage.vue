<script setup lang="ts">
import { ref, onMounted } from 'vue';
import SmsTable from '@/components/sms/SmsTable.vue';
import { useSmsStore } from '@/stores/sms.store';
import { useSocket } from '@/composables/useSocket';

const smsStore = useSmsStore();
const { onSmsReceived } = useSocket();
const page = ref(1);

async function loadPage(p: number) {
  page.value = p;
  await smsStore.fetchMessages(p, 50);
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
      <h1 class="text-2xl font-bold text-gray-800">SMS Logs</h1>
      <div class="flex items-center gap-2">
        <span class="text-sm text-gray-500">{{ smsStore.total }} messages</span>
        <button
          @click="loadPage(1)"
          class="px-4 py-2 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700 transition-colors"
        >
          Refresh
        </button>
      </div>
    </div>

    <SmsTable :messages="smsStore.messages" />

    <div class="mt-4 flex items-center justify-between">
      <button
        :disabled="page <= 1"
        @click="loadPage(page - 1)"
        class="px-4 py-2 text-sm border border-gray-300 rounded-lg disabled:opacity-50 hover:bg-gray-50"
      >
        Previous
      </button>
      <span class="text-sm text-gray-500">Page {{ page }}</span>
      <button
        @click="loadPage(page + 1)"
        class="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
      >
        Next
      </button>
    </div>
  </div>
</template>
