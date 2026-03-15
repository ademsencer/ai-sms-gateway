<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useApi } from '@/composables/useApi';

interface AuditEntry {
  id: string;
  userId: string | null;
  username: string;
  action: string;
  target: string;
  details: string | null;
  ipAddress: string | null;
  createdAt: string;
}

const { get } = useApi();
const logs = ref<AuditEntry[]>([]);
const total = ref(0);
const page = ref(1);
const loading = ref(false);

async function loadPage(p: number) {
  page.value = p;
  loading.value = true;
  try {
    const result = await get<{ data: AuditEntry[]; total: number; page: number; limit: number; totalPages: number }>(`/audit?page=${p}&limit=50`);
    logs.value = result.data;
    total.value = result.total;
  } finally {
    loading.value = false;
  }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString();
}

function actionColor(action: string): string {
  if (action.includes('delete')) return 'bg-red-100 text-red-800';
  if (action.includes('create') || action.includes('register')) return 'bg-green-100 text-green-800';
  if (action.includes('login')) return 'bg-blue-100 text-blue-800';
  if (action.includes('update') || action.includes('change')) return 'bg-amber-100 text-amber-800';
  return 'bg-gray-100 text-gray-800';
}

onMounted(() => loadPage(1));
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold text-gray-800">Audit Log</h1>
      <div class="flex items-center gap-2">
        <span class="text-sm text-gray-500">{{ total }} entries</span>
        <button @click="loadPage(1)" class="px-4 py-2 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700 transition-colors">
          Refresh
        </button>
      </div>
    </div>

    <div class="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div v-if="loading" class="p-8 text-center text-gray-500 text-sm">Loading...</div>
      <table v-else class="w-full">
        <thead>
          <tr class="border-b border-gray-200 bg-gray-50">
            <th class="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Time</th>
            <th class="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">User</th>
            <th class="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Action</th>
            <th class="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Target</th>
            <th class="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Details</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-200">
          <tr v-for="log in logs" :key="log.id" class="hover:bg-gray-50">
            <td class="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">{{ formatDate(log.createdAt) }}</td>
            <td class="px-6 py-4 text-sm font-medium text-gray-900">{{ log.username }}</td>
            <td class="px-6 py-4">
              <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium" :class="actionColor(log.action)">
                {{ log.action }}
              </span>
            </td>
            <td class="px-6 py-4 text-sm text-gray-700 font-mono">{{ log.target }}</td>
            <td class="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">{{ log.details || '—' }}</td>
          </tr>
          <tr v-if="!loading && logs.length === 0">
            <td colspan="5" class="px-6 py-8 text-center text-gray-500 text-sm">No audit logs</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="mt-4 flex items-center justify-between">
      <button :disabled="page <= 1" @click="loadPage(page - 1)" class="px-4 py-2 text-sm border border-gray-300 rounded-lg disabled:opacity-50 hover:bg-gray-50">Previous</button>
      <span class="text-sm text-gray-500">Page {{ page }}</span>
      <button @click="loadPage(page + 1)" class="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Next</button>
    </div>
  </div>
</template>
