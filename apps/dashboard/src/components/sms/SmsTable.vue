<script setup lang="ts">
import type { SmsMessage } from '@/stores/sms.store';
import { useAuthStore } from '@/stores/auth.store';

const props = defineProps<{ messages: SmsMessage[] }>();
const emit = defineEmits<{ delete: [id: string] }>();
const authStore = useAuthStore();

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString();
}

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}
</script>

<template>
  <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
    <div class="overflow-x-auto">
      <table class="min-w-full">
        <thead>
          <tr class="border-b border-gray-100 bg-gray-50/50">
            <th class="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider w-40">Time</th>
            <th class="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider w-32">Device</th>
            <th class="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider w-32">Sender</th>
            <th class="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Message</th>
            <th class="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider w-20">OTP</th>
            <th v-if="authStore.isAdmin" class="w-10"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="msg in messages" :key="msg.id" class="border-b border-gray-50 hover:bg-gray-50/50 transition-colors group">
            <td class="px-4 py-3">
              <div class="text-xs text-gray-900 tabular-nums">{{ formatDate(msg.createdAt) }}</div>
              <div class="text-[10px] text-gray-400">{{ formatRelative(msg.createdAt) }}</div>
            </td>
            <td class="px-4 py-3">
              <span class="text-xs font-mono text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded">{{ msg.deviceId }}</span>
            </td>
            <td class="px-4 py-3 text-sm text-gray-700">{{ msg.sender }}</td>
            <td class="px-4 py-3">
              <p class="text-sm text-gray-800 max-w-md break-words line-clamp-2">{{ msg.message }}</p>
            </td>
            <td class="px-4 py-3">
              <span
                v-if="msg.otpCode"
                class="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-amber-50 text-amber-700 ring-1 ring-amber-200 tabular-nums tracking-wider"
              >
                {{ msg.otpCode }}
              </span>
              <span v-else class="text-xs text-gray-300">—</span>
            </td>
            <td v-if="authStore.isAdmin" class="px-4 py-3 text-right">
              <button
                @click="emit('delete', msg.id)"
                class="opacity-0 group-hover:opacity-100 transition-all p-1 rounded hover:bg-red-50 text-gray-300 hover:text-red-500"
                title="Delete message"
              >
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </td>
          </tr>
          <tr v-if="messages.length === 0">
            <td :colspan="authStore.isAdmin ? 6 : 5" class="px-6 py-12 text-center">
              <svg class="w-8 h-8 text-gray-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
              <p class="text-sm text-gray-400">No SMS messages yet</p>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
