<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { useApi } from '@/composables/useApi';
import TablePagination from '@/components/shared/TablePagination.vue';
import DeleteConfirmModal from '@/components/shared/DeleteConfirmModal.vue';

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
const totalPages = ref(1);
const page = ref(1);
const pageSize = ref(20);
const loading = ref(false);
const showClearConfirm = ref(false);
const deleting = ref<string | null>(null);
const expandedRow = ref<string | null>(null);

// Filters
const filterAction = ref('all');
const filterSearch = ref('');
let searchTimer: ReturnType<typeof setTimeout> | null = null;

async function loadPage(p: number) {
  page.value = p;
  loading.value = true;
  try {
    const params = new URLSearchParams({ page: String(p), limit: String(pageSize.value) });
    if (filterAction.value !== 'all') params.set('action', filterAction.value);
    if (filterSearch.value) params.set('search', filterSearch.value);
    const result = await get<{ data: AuditEntry[]; total: number; page: number; limit: number; totalPages: number }>(`/audit?${params}`);
    logs.value = result.data;
    total.value = result.total;
    totalPages.value = result.totalPages;
  } finally {
    loading.value = false;
  }
}

function onSearchChange() {
  if (searchTimer) clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    page.value = 1;
    loadPage(1);
  }, 400);
}

async function deleteEntry(id: string) {
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

function onPageSizeChange(size: number) {
  pageSize.value = size;
  page.value = 1;
  loadPage(1);
}

function toggleRow(id: string) {
  expandedRow.value = expandedRow.value === id ? null : id;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString();
}

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function actionColor(action: string): string {
  if (action.includes('delete') || action.includes('clear')) return 'bg-red-50 text-red-700 ring-1 ring-red-200';
  if (action.includes('create') || action.includes('register')) return 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200';
  if (action.includes('login')) return 'bg-blue-50 text-blue-700 ring-1 ring-blue-200';
  if (action.includes('logout')) return 'bg-slate-50 text-slate-600 ring-1 ring-slate-200';
  if (action.includes('update') || action.includes('change') || action.includes('enable') || action.includes('disable')) return 'bg-amber-50 text-amber-700 ring-1 ring-amber-200';
  return 'bg-gray-50 text-gray-600 ring-1 ring-gray-200';
}

function actionIcon(action: string): string {
  if (action.includes('delete') || action.includes('clear')) return 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16';
  if (action.includes('create') || action.includes('register')) return 'M12 4v16m8-8H4';
  if (action.includes('login')) return 'M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1';
  if (action.includes('logout')) return 'M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1';
  if (action.includes('update') || action.includes('change')) return 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z';
  return 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z';
}

function parseDetails(details: string | null): { type: 'json'; data: Record<string, unknown> } | { type: 'text'; data: string } | null {
  if (!details) return null;
  try {
    const parsed = JSON.parse(details);
    if (typeof parsed === 'object' && parsed !== null) {
      return { type: 'json', data: parsed };
    }
    return { type: 'text', data: details };
  } catch {
    return { type: 'text', data: details };
  }
}

function getJsonData(details: string | null): Record<string, unknown> {
  const parsed = parseDetails(details);
  if (parsed && parsed.type === 'json') return parsed.data;
  return {};
}

function isJsonDetails(details: string | null): boolean {
  const parsed = parseDetails(details);
  return parsed?.type === 'json' || false;
}

function formatValue(val: unknown): string {
  if (val === null || val === undefined) return '—';
  if (typeof val === 'boolean') return val ? 'Yes' : 'No';
  if (typeof val === 'object') return JSON.stringify(val);
  return String(val);
}

function formatKey(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/[_-]/g, ' ')
    .replace(/^\w/, (c) => c.toUpperCase())
    .trim();
}

onMounted(() => loadPage(1));

watch(filterSearch, () => onSearchChange());
watch(filterAction, () => {
  page.value = 1;
  loadPage(1);
});
</script>

<template>
  <div>
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-800">Audit Log</h1>
        <p class="text-sm text-gray-500 mt-1">Track all user actions and system events</p>
      </div>
      <div class="flex items-center gap-3">
        <button @click="loadPage(page)" class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white text-gray-700 text-sm rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
          Refresh
        </button>
        <button
          v-if="total > 0"
          @click="showClearConfirm = true"
          class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 text-sm rounded-lg border border-red-200 hover:bg-red-100 transition-colors"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
          Clear All
        </button>
      </div>
    </div>

    <!-- Filters -->
    <div class="bg-white rounded-xl border border-gray-200 p-4 mb-4">
      <div class="flex items-center gap-3 flex-wrap">
        <div class="flex-1 min-w-[200px]">
          <input
            v-model="filterSearch"
            type="text"
            placeholder="Search user, target, or details..."
            class="w-full text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>
        <select
          v-model="filterAction"
          class="text-sm border border-gray-300 rounded-lg px-3 py-1.5 text-gray-600 bg-white focus:outline-none focus:ring-1 focus:ring-primary-500"
        >
          <option value="all">All Actions</option>
          <option value="login">Login</option>
          <option value="logout">Logout</option>
          <option value="register_device">Register Device</option>
          <option value="delete_device">Delete Device</option>
          <option value="delete_sms">Delete SMS</option>
          <option value="clear_all_sms">Clear All SMS</option>
          <option value="delete_audit_log">Delete Audit Log</option>
          <option value="clear_all_audit_logs">Clear All Audit Logs</option>
        </select>
      </div>
    </div>

    <DeleteConfirmModal
      :show="showClearConfirm"
      title="Clear All Audit Logs"
      :message="`You are about to permanently delete <strong>${total.toLocaleString()} audit log entries</strong>.`"
      @confirm="clearAll"
      @cancel="showClearConfirm = false"
    />

    <!-- Table -->
    <div class="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div v-if="loading" class="p-12 text-center">
        <div class="inline-flex items-center gap-2 text-gray-400 text-sm">
          <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
          Loading...
        </div>
      </div>
      <div v-else class="overflow-x-auto">
        <table class="w-full">
          <thead>
            <tr class="border-b border-gray-100 bg-gray-50/50">
              <th class="text-left px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider w-36">Time</th>
              <th class="text-left px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider w-28">User</th>
              <th class="text-left px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider w-40">Action</th>
              <th class="text-left px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Target</th>
              <th class="text-left px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Details</th>
              <th class="w-10"></th>
            </tr>
          </thead>
          <tbody>
            <template v-for="log in logs" :key="log.id">
              <tr
                class="border-b border-gray-50 hover:bg-gray-50/50 transition-colors group cursor-pointer"
                :class="expandedRow === log.id ? 'bg-blue-50/30' : ''"
                @click="log.details ? toggleRow(log.id) : null"
              >
                <td class="px-4 py-3">
                  <div class="text-xs text-gray-900 tabular-nums">{{ formatDate(log.createdAt) }}</div>
                  <div class="text-[10px] text-gray-400">{{ formatRelative(log.createdAt) }}</div>
                </td>
                <td class="px-4 py-3">
                  <span class="text-sm font-medium text-gray-900">{{ log.username }}</span>
                </td>
                <td class="px-4 py-3">
                  <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium" :class="actionColor(log.action)">
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="actionIcon(log.action)" /></svg>
                    {{ log.action }}
                  </span>
                </td>
                <td class="px-4 py-3">
                  <span class="text-xs font-mono text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded">{{ log.target }}</span>
                </td>
                <td class="px-4 py-3">
                  <template v-if="log.details">
                    <button
                      @click.stop="toggleRow(log.id)"
                      class="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
                    >
                      <svg class="w-3 h-3 transition-transform" :class="expandedRow === log.id ? 'rotate-90' : ''" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>
                      {{ parseDetails(log.details)?.type === 'json' ? 'View data' : (log.details.length > 50 ? log.details.slice(0, 50) + '...' : log.details) }}
                    </button>
                  </template>
                  <span v-else class="text-xs text-gray-300">—</span>
                </td>
                <td class="px-4 py-3 text-right">
                  <button
                    @click.stop="deleteEntry(log.id)"
                    :disabled="deleting === log.id"
                    class="opacity-0 group-hover:opacity-100 transition-all p-1 rounded hover:bg-red-50 text-gray-300 hover:text-red-500 disabled:opacity-50"
                    title="Delete"
                  >
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </td>
              </tr>
              <!-- Expanded Details Row -->
              <tr v-if="expandedRow === log.id && log.details">
                <td colspan="6" class="px-4 py-0">
                  <div class="py-3 pl-4 border-l-2 border-blue-200 ml-2 mb-2">
                    <template v-if="isJsonDetails(log.details)">
                      <div class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 max-h-48 overflow-y-auto pr-2">
                        <template v-for="(val, key) in getJsonData(log.details)" :key="key">
                          <span class="text-[11px] font-medium text-gray-500 whitespace-nowrap">{{ formatKey(String(key)) }}</span>
                          <span class="text-[11px] text-gray-800 font-mono break-all">{{ formatValue(val) }}</span>
                        </template>
                      </div>
                    </template>
                    <template v-else>
                      <p class="text-xs text-gray-700 whitespace-pre-wrap max-h-48 overflow-y-auto">{{ log.details }}</p>
                    </template>
                  </div>
                </td>
              </tr>
            </template>
            <tr v-if="!loading && logs.length === 0">
              <td colspan="6" class="px-6 py-12 text-center">
                <svg class="w-8 h-8 text-gray-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                <p class="text-sm text-gray-400">No audit logs found</p>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <TablePagination
      :page="page"
      :total-pages="totalPages"
      :total="total"
      :page-size="pageSize"
      @update:page="loadPage"
      @update:page-size="onPageSizeChange"
    />
  </div>
</template>
