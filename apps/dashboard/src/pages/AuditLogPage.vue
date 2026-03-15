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

const { get, del } = useApi();
const logs = ref<AuditEntry[]>([]);
const total = ref(0);
const page = ref(1);
const loading = ref(false);
const showClearConfirm = ref(false);
const deleting = ref<string | null>(null);

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

async function deleteEntry(id: string) {
  if (!confirm('Are you sure you want to delete this audit log entry?')) return;
  deleting.value = id;
  try {
    await del(`/audit/${id}`);
    await loadPage(page.value);
  } finally {
    deleting.value = null;
  }
}

async function clearAll() {
  showClearConfirm.value = false;
  loading.value = true;
  try {
    await del('/audit');
    await loadPage(1);
  } finally {
    loading.value = false;
  }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString();
}

function actionColor(action: string): string {
  if (action.includes('delete') || action.includes('clear')) return 'bg-red-100 text-red-800';
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
      <div class="flex items-center gap-3">
        <span class="text-sm text-gray-500">{{ total }} entries</span>
        <button @click="loadPage(page)" class="px-4 py-2 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700 transition-colors">
          Refresh
        </button>
        <button
          v-if="total > 0"
          @click="showClearConfirm = true"
          class="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors"
        >
          Clear All
        </button>
      </div>
    </div>

    <!-- Clear All Confirmation Modal -->
    <div v-if="showClearConfirm" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div class="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-xl">
        <h3 class="text-lg font-semibold text-gray-900 mb-2">Clear All Audit Logs</h3>
        <p class="text-sm text-gray-600 mb-6">
          Are you sure you want to delete <strong>all {{ total }} audit log entries</strong>? This action cannot be undone.
        </p>
        <div class="flex justify-end gap-3">
          <button @click="showClearConfirm = false" class="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
            Cancel
          </button>
          <button @click="clearAll" class="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700">
            Delete All
          </button>
        </div>
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
            <th class="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase w-20"></th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-200">
          <tr v-for="log in logs" :key="log.id" class="hover:bg-gray-50 group">
            <td class="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">{{ formatDate(log.createdAt) }}</td>
            <td class="px-6 py-4 text-sm font-medium text-gray-900">{{ log.username }}</td>
            <td class="px-6 py-4">
              <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium" :class="actionColor(log.action)">
                {{ log.action }}
              </span>
            </td>
            <td class="px-6 py-4 text-sm text-gray-700 font-mono">{{ log.target }}</td>
            <td class="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">{{ log.details || '—' }}</td>
            <td class="px-6 py-4 text-right">
              <button
                @click="deleteEntry(log.id)"
                :disabled="deleting === log.id"
                class="opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-600 disabled:opacity-50"
                title="Delete entry"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </td>
          </tr>
          <tr v-if="!loading && logs.length === 0">
            <td colspan="6" class="px-6 py-8 text-center text-gray-500 text-sm">No audit logs</td>
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
