<script setup lang="ts">
import { ref } from 'vue';
import type { Device } from '@/stores/device.store';
import { useDeviceStore } from '@/stores/device.store';
import { useApi } from '@/composables/useApi';

defineProps<{ devices: Device[] }>();

const deviceStore = useDeviceStore();
const { patch, del } = useApi();
const copiedId = ref('');
const regenerating = ref('');
const editingId = ref('');
const editName = ref('');
const deleteConfirmId = ref('');

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString();
}

function copyKey(deviceId: string) {
  const key = deviceStore.apiKeys[deviceId];
  if (key) {
    navigator.clipboard.writeText(key);
    copiedId.value = deviceId;
    setTimeout(() => (copiedId.value = ''), 2000);
  }
}

async function regenerate(deviceId: string) {
  regenerating.value = deviceId;
  try {
    await deviceStore.regenerateKey(deviceId);
  } finally {
    regenerating.value = '';
  }
}

function startEdit(device: Device) {
  editingId.value = device.deviceId;
  editName.value = device.name;
}

async function saveEdit(deviceId: string) {
  try {
    await patch(`/device/${deviceId}`, { name: editName.value });
    const device = deviceStore.devices.find(d => d.deviceId === deviceId);
    if (device) device.name = editName.value;
    editingId.value = '';
  } catch (e) {
    console.error('Failed to update device', e);
  }
}

function cancelEdit() {
  editingId.value = '';
}

async function deleteDevice(deviceId: string) {
  try {
    await del(`/device/${deviceId}`);
    deleteConfirmId.value = '';
    await deviceStore.fetchDevices();
  } catch (e) {
    console.error('Failed to delete device', e);
  }
}
</script>

<template>
  <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
    <table class="min-w-full divide-y divide-gray-200">
      <thead class="bg-gray-50">
        <tr>
          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Device ID</th>
          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">API Key</th>
          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Seen</th>
          <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-gray-200">
        <tr v-for="device in devices" :key="device.id" class="hover:bg-gray-50">
          <td class="px-6 py-4 text-sm font-mono text-gray-900">{{ device.deviceId }}</td>
          <td class="px-6 py-4 text-sm text-gray-700">
            <template v-if="editingId === device.deviceId">
              <div class="flex items-center gap-1">
                <input
                  v-model="editName"
                  @keyup.enter="saveEdit(device.deviceId)"
                  @keyup.escape="cancelEdit()"
                  class="px-2 py-1 border border-gray-300 rounded text-sm w-32 focus:ring-1 focus:ring-primary-600 outline-none"
                />
                <button @click="saveEdit(device.deviceId)" class="text-green-600 hover:text-green-800 text-xs">Save</button>
                <button @click="cancelEdit()" class="text-gray-500 hover:text-gray-700 text-xs">Cancel</button>
              </div>
            </template>
            <template v-else>
              <span class="cursor-pointer hover:text-primary-600" @click="startEdit(device)">{{ device.name }}</span>
            </template>
          </td>
          <td class="px-6 py-4">
            <span
              class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
              :class="device.status === 'online' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'"
            >
              {{ device.status }}
            </span>
          </td>
          <td class="px-6 py-4">
            <div v-if="deviceStore.apiKeys[device.deviceId]" class="flex items-center gap-1.5">
              <code class="text-xs font-mono bg-gray-100 px-2 py-1 rounded text-gray-800 max-w-[180px] truncate">
                {{ deviceStore.apiKeys[device.deviceId] }}
              </code>
              <button
                @click="copyKey(device.deviceId)"
                class="text-xs px-2 py-1 rounded bg-primary-100 text-primary-700 hover:bg-primary-200 transition-colors whitespace-nowrap"
              >
                {{ copiedId === device.deviceId ? 'Copied!' : 'Copy' }}
              </button>
            </div>
            <button
              v-else
              @click="regenerate(device.deviceId)"
              :disabled="regenerating === device.deviceId"
              class="text-xs px-2 py-1 rounded bg-amber-100 text-amber-700 hover:bg-amber-200 transition-colors disabled:opacity-50"
            >
              {{ regenerating === device.deviceId ? 'Generating...' : 'Regenerate' }}
            </button>
          </td>
          <td class="px-6 py-4 text-sm text-gray-500">{{ formatDate(device.lastSeen) }}</td>
          <td class="px-6 py-4 text-right">
            <template v-if="deleteConfirmId === device.deviceId">
              <span class="text-sm text-gray-500 mr-2">Delete?</span>
              <button @click="deleteDevice(device.deviceId)" class="text-red-600 hover:text-red-800 text-sm font-medium mr-2">Yes</button>
              <button @click="deleteConfirmId = ''" class="text-gray-500 hover:text-gray-700 text-sm font-medium">No</button>
            </template>
            <button
              v-else
              @click="deleteConfirmId = device.deviceId"
              class="text-red-600 hover:text-red-800 text-sm font-medium"
            >
              Delete
            </button>
          </td>
        </tr>
        <tr v-if="devices.length === 0">
          <td colspan="6" class="px-6 py-8 text-center text-sm text-gray-400">No devices registered</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
