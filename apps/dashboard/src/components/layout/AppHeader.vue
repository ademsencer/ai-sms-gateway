<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useSocket } from '@/composables/useSocket';
import { useAuthStore } from '@/stores/auth.store';

const { connected } = useSocket();
const authStore = useAuthStore();
const router = useRouter();
const appVersion = ref('');

async function handleLogout() {
  await authStore.logout();
  router.push('/login');
}

onMounted(async () => {
  try {
    const res = await fetch('/api/health');
    const data = await res.json();
    if (data.version) appVersion.value = data.version;
  } catch {
    // ignore
  }
});
</script>

<template>
  <header class="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
    <div class="flex items-center gap-3">
      <h2 class="text-lg font-semibold text-gray-800">
        <RouterLink to="/" class="hover:text-primary-600 transition-colors">Dashboard</RouterLink>
      </h2>
      <span v-if="appVersion" class="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded font-mono">v{{ appVersion }}</span>
    </div>
    <div class="flex items-center gap-4">
      <span class="flex items-center gap-2 text-sm">
        <span
          class="w-2 h-2 rounded-full"
          :class="connected ? 'bg-emerald-500 shadow-sm shadow-emerald-200' : 'bg-red-500'"
        ></span>
        <span class="text-xs" :class="connected ? 'text-emerald-600' : 'text-red-500'">{{ connected ? 'Live' : 'Disconnected' }}</span>
      </span>
      <span class="text-sm text-gray-500">{{ authStore.user?.username }}</span>
      <button
        @click="handleLogout"
        class="text-xs text-gray-400 hover:text-gray-700 transition-colors"
      >
        Logout
      </button>
    </div>
  </header>
</template>
