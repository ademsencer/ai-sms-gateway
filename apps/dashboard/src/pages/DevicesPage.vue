<script setup lang="ts">
import { onMounted, ref } from 'vue';
import DeviceTable from '@/components/devices/DeviceTable.vue';
import DeviceRegistrationForm from '@/components/devices/DeviceRegistrationForm.vue';
import { useDeviceStore } from '@/stores/device.store';
import { useSocket } from '@/composables/useSocket';

const deviceStore = useDeviceStore();
const { onDeviceStatus, onDeviceRegistered } = useSocket();
const showForm = ref(false);

onMounted(async () => {
  await deviceStore.fetchDevices();

  onDeviceStatus((data: unknown) => {
    const event = data as { deviceId: string; status: string; lastSeen: string };
    deviceStore.updateDeviceStatus(event.deviceId, event.status, event.lastSeen);
  });

  onDeviceRegistered(() => {
    deviceStore.fetchDevices();
  });
});
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold text-gray-800">Devices</h1>
      <div class="flex items-center gap-2">
        <button
          @click="showForm = !showForm"
          class="px-4 py-2 text-sm rounded-lg transition-colors"
          :class="showForm
            ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            : 'bg-green-600 text-white hover:bg-green-700'"
        >
          {{ showForm ? 'Cancel' : '+ Add Device' }}
        </button>
        <button
          @click="deviceStore.fetchDevices()"
          class="px-4 py-2 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700 transition-colors"
        >
          Refresh
        </button>
      </div>
    </div>

    <DeviceRegistrationForm v-if="showForm" />

    <DeviceTable :devices="deviceStore.devices" />
  </div>
</template>
