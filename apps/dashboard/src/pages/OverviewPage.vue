<script setup lang="ts">
import { ref, onMounted } from 'vue';
import StatsCard from '@/components/stats/StatsCard.vue';
import SmsTable from '@/components/sms/SmsTable.vue';
import { useSmsStore } from '@/stores/sms.store';
import { useSocket } from '@/composables/useSocket';
import { useApi } from '@/composables/useApi';

const smsStore = useSmsStore();
const { onSmsReceived } = useSocket();
const { get } = useApi();

const stats = ref({ totalSms: 0, totalDevices: 0, onlineDevices: 0, smsLastMinute: 0 });

async function loadStats() {
  try {
    stats.value = await get<typeof stats.value>('/stats');
  } catch {
    // ignore
  }
}

onMounted(async () => {
  await Promise.all([loadStats(), smsStore.fetchMessages(1, 10)]);

  onSmsReceived((data: unknown) => {
    smsStore.addMessage(data as Parameters<typeof smsStore.addMessage>[0]);
    stats.value.totalSms++;
    stats.value.smsLastMinute++;
  });
});
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold text-gray-800 mb-6">Overview</h1>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <StatsCard title="Total SMS" :value="stats.totalSms" color="text-primary-600" />
      <StatsCard title="Online Devices" :value="stats.onlineDevices" :subtitle="`of ${stats.totalDevices} total`" color="text-green-600" />
      <StatsCard title="SMS / Minute" :value="stats.smsLastMinute" color="text-orange-600" />
      <StatsCard title="Total Devices" :value="stats.totalDevices" color="text-gray-700" />
    </div>

    <h2 class="text-lg font-semibold text-gray-700 mb-4">Recent Messages</h2>
    <SmsTable :messages="smsStore.messages" />
  </div>
</template>
