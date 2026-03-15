import { defineStore } from 'pinia';
import { ref, reactive } from 'vue';
import { useApi } from '@/composables/useApi';

export interface Device {
  id: string;
  deviceId: string;
  ownerName: string;
  iban: string;
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

interface DeviceListResponse {
  data: Device[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface DeviceFilters {
  search?: string;
  status?: string;
}

export const useDeviceStore = defineStore('device', () => {
  const devices = ref<Device[]>([]);
  const total = ref(0);
  const totalPages = ref(1);
  const loading = ref(false);
  const apiKeys = reactive<Record<string, string>>({});
  const { get, post } = useApi();

  async function fetchDevices(page = 1, limit = 20, filters?: DeviceFilters) {
    loading.value = true;
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (filters?.search) params.set('search', filters.search);
      if (filters?.status) params.set('status', filters.status);
      const result = await get<DeviceListResponse>(`/device?${params}`);
      devices.value = result.data;
      total.value = result.total;
      totalPages.value = result.totalPages;
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

  function handleDeviceRegistered() {
    fetchDevices();
  }

  return { devices, total, totalPages, loading, apiKeys, fetchDevices, regenerateKey, updateDeviceStatus, handleDeviceRegistered };
});
