<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import type { Device } from '@/stores/device.store';
import { useDeviceStore } from '@/stores/device.store';
import { useAuthStore } from '@/stores/auth.store';
import { useApi } from '@/composables/useApi';

defineProps<{ devices: Device[] }>();
const emit = defineEmits<{ refresh: [] }>();

const router = useRouter();
const deviceStore = useDeviceStore();
const authStore = useAuthStore();
const { del } = useApi();
const copiedId = ref('');
const regenerating = ref('');
const deleteConfirmId = ref('');
const tooltipDeviceId = ref('');

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString();
}

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return 'just now';
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function shortId(id: string): string {
  return id.length > 8 ? id.slice(0, 4) + '...' + id.slice(-4) : id;
}

function copyKey(deviceId: string) {
  const key = deviceStore.apiKeys[deviceId];
  if (key) {
    navigator.clipboard.writeText(key);
    copiedId.value = deviceId;
    setTimeout(() => (copiedId.value = ''), 2000);
  }
}

function copyDeviceId(deviceId: string) {
  navigator.clipboard.writeText(deviceId);
  tooltipDeviceId.value = deviceId;
  setTimeout(() => (tooltipDeviceId.value = ''), 1500);
}

async function regenerate(deviceId: string) {
  regenerating.value = deviceId;
  try {
    await deviceStore.regenerateKey(deviceId);
  } finally {
    regenerating.value = '';
  }
}

async function deleteDevice(deviceId: string) {
  try {
    await del(`/device/${deviceId}`);
    deleteConfirmId.value = '';
    emit('refresh');
  } catch (e) {
    console.error('Failed to delete device', e);
  }
}

function viewSms(device: Device) {
  router.push({ name: 'sms', query: { deviceId: device.deviceId, ownerName: device.ownerName } });
}
</script>

<template>
  <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
    <div class="overflow-x-auto">
      <table class="min-w-full">
        <thead>
          <tr class="border-b border-gray-100 bg-gray-50/50">
            <th class="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Name</th>
            <th class="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">IBAN</th>
            <th class="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Model</th>
            <th class="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Device ID</th>
            <th class="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Status</th>
            <th class="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">API Key</th>
            <th class="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Last Seen</th>
            <th class="px-4 py-3 text-right text-[11px] font-semibold text-gray-500 uppercase tracking-wider w-32">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="device in devices" :key="device.id" class="border-b border-gray-50 hover:bg-gray-50/50 transition-colors group">
            <td class="px-4 py-3 text-sm font-medium text-gray-900">{{ device.ownerName || '—' }}</td>
            <td class="px-4 py-3 text-xs font-mono text-gray-600">{{ device.iban || '—' }}</td>
            <td class="px-4 py-3">
              <div v-if="device.model" class="text-xs text-gray-700">{{ device.model }}</div>
              <div v-if="device.androidVersion" class="text-[10px] text-gray-400">Android {{ device.androidVersion }}</div>
              <span v-if="!device.model && !device.androidVersion" class="text-xs text-gray-300">—</span>
            </td>
            <td class="px-4 py-3 relative">
              <button
                @click="copyDeviceId(device.deviceId)"
                class="text-xs font-mono text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded hover:bg-gray-200 transition-colors cursor-pointer"
                :title="device.deviceId"
              >
                {{ shortId(device.deviceId) }}
              </button>
              <span
                v-if="tooltipDeviceId === device.deviceId"
                class="absolute left-0 -top-7 bg-gray-900 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap z-10"
              >
                Copied!
              </span>
            </td>
            <td class="px-4 py-3">
              <span
                class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium"
                :class="device.status === 'online'
                  ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                  : 'bg-red-50 text-red-600 ring-1 ring-red-200'"
              >
                <span class="w-1.5 h-1.5 rounded-full" :class="device.status === 'online' ? 'bg-emerald-500' : 'bg-red-400'"></span>
                {{ device.status }}
              </span>
            </td>
            <td class="px-4 py-3">
              <div v-if="deviceStore.apiKeys[device.deviceId]" class="flex items-center gap-1.5">
                <code class="text-[11px] font-mono bg-gray-100 px-1.5 py-0.5 rounded text-gray-700 max-w-[140px] truncate">
                  {{ deviceStore.apiKeys[device.deviceId] }}
                </code>
                <button
                  @click="copyKey(device.deviceId)"
                  class="text-[11px] px-1.5 py-0.5 rounded bg-primary-50 text-primary-600 hover:bg-primary-100 transition-colors"
                >
                  {{ copiedId === device.deviceId ? 'Copied!' : 'Copy' }}
                </button>
              </div>
              <button
                v-else
                @click="regenerate(device.deviceId)"
                :disabled="regenerating === device.deviceId"
                class="text-[11px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-600 hover:bg-amber-100 transition-colors disabled:opacity-50"
              >
                {{ regenerating === device.deviceId ? 'Generating...' : 'Regenerate' }}
              </button>
            </td>
            <td class="px-4 py-3">
              <div class="text-xs text-gray-900 tabular-nums">{{ formatDate(device.lastSeen) }}</div>
              <div class="text-[10px] text-gray-400">{{ formatRelative(device.lastSeen) }}</div>
            </td>
            <td class="px-4 py-3 text-right">
              <div class="flex items-center justify-end gap-1">
                <!-- View SMS -->
                <button
                  @click="viewSms(device)"
                  class="opacity-0 group-hover:opacity-100 transition-all p-1 rounded hover:bg-blue-50 text-gray-300 hover:text-blue-600"
                  title="View SMS"
                >
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
                </button>
                <!-- Delete -->
                <template v-if="authStore.isAdmin">
                  <template v-if="deleteConfirmId === device.deviceId">
                    <span class="text-[11px] text-gray-500 mr-1">Delete?</span>
                    <button @click="deleteDevice(device.deviceId)" class="text-red-600 hover:text-red-800 text-[11px] font-medium mr-1">Yes</button>
                    <button @click="deleteConfirmId = ''" class="text-gray-500 hover:text-gray-700 text-[11px] font-medium">No</button>
                  </template>
                  <button
                    v-else
                    @click="deleteConfirmId = device.deviceId"
                    class="opacity-0 group-hover:opacity-100 transition-all p-1 rounded hover:bg-red-50 text-gray-300 hover:text-red-500"
                    title="Delete device"
                  >
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </template>
              </div>
            </td>
          </tr>
          <tr v-if="devices.length === 0">
            <td colspan="8" class="px-6 py-12 text-center">
              <svg class="w-8 h-8 text-gray-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
              <p class="text-sm text-gray-400">No devices found</p>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
