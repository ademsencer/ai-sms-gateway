import { defineStore } from 'pinia';
import { ref } from 'vue';
import { useApi } from '@/composables/useApi';

export interface SmsMessage {
  id: string;
  deviceId: string;
  sender: string;
  message: string;
  timestamp: number;
  otpCode: string | null;
  createdAt: string;
}

interface SmsListResponse {
  data: SmsMessage[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface SmsFilters {
  deviceId?: string;
  ownerName?: string;
  iban?: string;
  search?: string;
}

export const useSmsStore = defineStore('sms', () => {
  const messages = ref<SmsMessage[]>([]);
  const total = ref(0);
  const totalPages = ref(1);
  const loading = ref(false);
  const { get } = useApi();

  async function fetchMessages(page = 1, limit = 20, filters?: SmsFilters) {
    loading.value = true;
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (filters?.deviceId) params.set('deviceId', filters.deviceId);
      if (filters?.ownerName) params.set('ownerName', filters.ownerName);
      if (filters?.iban) params.set('iban', filters.iban);
      if (filters?.search) params.set('search', filters.search);
      const result = await get<SmsListResponse>(`/sms?${params}`);
      messages.value = result.data;
      total.value = result.total;
      totalPages.value = result.totalPages;
    } finally {
      loading.value = false;
    }
  }

  function addMessage(msg: SmsMessage) {
    messages.value.unshift(msg);
    total.value++;
  }

  return { messages, total, totalPages, loading, fetchMessages, addMessage };
});
