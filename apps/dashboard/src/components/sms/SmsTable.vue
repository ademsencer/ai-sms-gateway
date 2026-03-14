<script setup lang="ts">
import type { SmsMessage } from '@/stores/sms.store';

defineProps<{ messages: SmsMessage[] }>();

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString();
}
</script>

<template>
  <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
    <table class="min-w-full divide-y divide-gray-200">
      <thead class="bg-gray-50">
        <tr>
          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Device</th>
          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sender</th>
          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Message</th>
          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">OTP</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-gray-200">
        <tr v-for="msg in messages" :key="msg.id" class="hover:bg-gray-50">
          <td class="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">{{ formatDate(msg.createdAt) }}</td>
          <td class="px-6 py-4 text-sm font-mono text-gray-900">{{ msg.deviceId }}</td>
          <td class="px-6 py-4 text-sm text-gray-700">{{ msg.sender }}</td>
          <td class="px-6 py-4 text-sm text-gray-700 max-w-md truncate">{{ msg.message }}</td>
          <td class="px-6 py-4">
            <span
              v-if="msg.otpCode"
              class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-yellow-100 text-yellow-800"
            >
              {{ msg.otpCode }}
            </span>
            <span v-else class="text-xs text-gray-400">-</span>
          </td>
        </tr>
        <tr v-if="messages.length === 0">
          <td colspan="5" class="px-6 py-8 text-center text-sm text-gray-400">No SMS messages</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
