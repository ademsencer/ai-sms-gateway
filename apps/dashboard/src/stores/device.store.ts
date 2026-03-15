import { defineStore } from 'pinia';
import { ref, reactive } from 'vue';
import { useApi } from '@/composables/useApi';

export interface Device {
  id: string;
  deviceId: string;
  model?: string;
  androidVersion?: string;
  serialNumber?: string;
  status: string;
  lastSeen: string;
  createdAt: string;
}

export interface RegisterDeviceResult {
  deviceId: string;
  apiKey: string;
}

export const useDeviceStore = defineStore('device', () => {
  const devices = ref<Device[]>([]);
  const loading = ref(false);
  const apiKeys = reactive<Record<string, string>>({});
  const { get, post } = useApi();

  async function fetchDevices() {
    loading.value = true;
    try {
      devices.value = await get<Device[]>('/device');
    } finally {
      loading.value = false;
    }
  }

  async function regenerateKey(deviceId: string): Promise<string> {
    const result = await post<{ deviceId: string; apiKey: string }>(`/device/${deviceId}/regenerate-key`, {});
    apiKeys[deviceId] = result.apiKey;
    return result.apiKey;
  }

  function updateDeviceStatus(deviceId: string, status: string, lastSeen: string) {
    const device = devices.value.find((d) => d.deviceId === deviceId);
    if (device) {
      device.status = status;
      device.lastSeen = lastSeen;
    }
  }

  return { devices, loading, apiKeys, fetchDevices, regenerateKey, updateDeviceStatus };
});
