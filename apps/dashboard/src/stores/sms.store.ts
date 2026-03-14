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

export const useSmsStore = defineStore('sms', () => {
  const messages = ref<SmsMessage[]>([]);
  const total = ref(0);
  const loading = ref(false);
  const { get } = useApi();

  async function fetchMessages(page = 1, limit = 50, deviceId?: string) {
    loading.value = true;
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (deviceId) params.set('deviceId', deviceId);
      const result = await get<SmsListResponse>(`/sms?${params}`);
      messages.value = result.data;
      total.value = result.total;
    } finally {
      loading.value = false;
    }
  }

  function addMessage(msg: SmsMessage) {
    messages.value.unshift(msg);
    total.value++;
  }

  return { messages, total, loading, fetchMessages, addMessage };
});
