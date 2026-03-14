<script setup lang="ts">
import { useRouter } from 'vue-router';
import { useSocket } from '@/composables/useSocket';
import { useAuthStore } from '@/stores/auth.store';

const { connected } = useSocket();
const authStore = useAuthStore();
const router = useRouter();

async function handleLogout() {
  await authStore.logout();
  router.push('/login');
}
</script>

<template>
  <header class="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
    <h2 class="text-lg font-semibold text-gray-800">
      <RouterLink to="/" class="hover:text-primary-600">Dashboard</RouterLink>
    </h2>
    <div class="flex items-center gap-4">
      <span class="flex items-center gap-2 text-sm">
        <span
          class="w-2.5 h-2.5 rounded-full"
          :class="connected ? 'bg-green-500' : 'bg-red-500'"
        ></span>
        {{ connected ? 'Live' : 'Disconnected' }}
      </span>
      <span class="text-sm text-gray-500">{{ authStore.user?.username }}</span>
      <button
        @click="handleLogout"
        class="text-sm text-gray-500 hover:text-gray-700 transition-colors"
      >
        Logout
      </button>
    </div>
  </header>
</template>
