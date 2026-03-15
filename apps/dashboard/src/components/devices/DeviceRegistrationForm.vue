<script setup lang="ts">
import { ref } from 'vue';
import { useApi } from '@/composables/useApi';
import { useDeviceStore } from '@/stores/device.store';

const emit = defineEmits<{ registered: [] }>();

const deviceStore = useDeviceStore();
const { post } = useApi();
const deviceId = ref('');
const loading = ref(false);
const error = ref('');
const apiKey = ref('');
const copied = ref(false);

async function onSubmit() {
  error.value = '';
  apiKey.value = '';
  loading.value = true;
  try {
    const result = await post<{ deviceId: string; apiKey: string }>('/device/register', { deviceId: deviceId.value });
    apiKey.value = result.apiKey;
    deviceStore.apiKeys[deviceId.value] = result.apiKey;
    await deviceStore.fetchDevices();
    emit('registered');
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Registration failed';
  } finally {
    loading.value = false;
  }
}

function copyKey() {
  navigator.clipboard.writeText(apiKey.value);
  copied.value = true;
  setTimeout(() => (copied.value = false), 2000);
}

function reset() {
  deviceId.value = '';
  error.value = '';
  apiKey.value = '';
}
</script>

<template>
  <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
    <h2 class="text-lg font-semibold text-gray-800 mb-4">Register New Device</h2>

    <!-- Success: Show API Key -->
    <div v-if="apiKey" class="space-y-3">
      <div class="bg-green-50 border border-green-200 rounded-lg p-4">
        <p class="text-sm font-medium text-green-800 mb-2">Device registered successfully!</p>
        <p class="text-xs text-green-700 mb-3">Store this API key securely — it won't be shown again.</p>
        <div class="flex items-center gap-2">
          <code class="flex-1 bg-white border border-green-300 rounded px-3 py-2 text-sm font-mono text-gray-900 select-all">{{ apiKey }}</code>
          <button
            @click="copyKey"
            class="px-3 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors whitespace-nowrap"
          >
            {{ copied ? 'Copied!' : 'Copy' }}
          </button>
        </div>
      </div>
      <button @click="reset" class="text-sm text-primary-600 hover:underline">Register another device</button>
    </div>

    <!-- Form -->
    <form v-else @submit.prevent="onSubmit" class="space-y-4">
      <div v-if="error" class="bg-red-50 border border-red-200 rounded-lg p-3">
        <p class="text-sm text-red-700">{{ error }}</p>
      </div>

      <div>
        <label for="deviceId" class="block text-sm font-medium text-gray-700 mb-1">Device ID</label>
        <input
          id="deviceId"
          v-model="deviceId"
          type="text"
          required
          minlength="3"
          maxlength="64"
          placeholder="e.g. my_phone_001"
          class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
        />
      </div>

      <button
        type="submit"
        :disabled="loading || !deviceId"
        class="px-4 py-2 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {{ loading ? 'Registering...' : 'Register Device' }}
      </button>
    </form>
  </div>
</template>
