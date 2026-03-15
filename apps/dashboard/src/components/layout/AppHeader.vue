<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useSocket } from '@/composables/useSocket';
import { useAuthStore } from '@/stores/auth.store';

const emit = defineEmits<{ 'toggle-sidebar': [] }>();

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
  <header class="bg-white border-b border-gray-200 px-3 sm:px-6 py-3 flex items-center justify-between gap-2">
    <div class="flex items-center gap-2 sm:gap-3 min-w-0">
      <!-- Hamburger menu (mobile only) -->
      <button
        @click="emit('toggle-sidebar')"
        class="lg:hidden p-1.5 -ml-1 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      <h2 class="text-base sm:text-lg font-semibold text-gray-800 truncate">
        <RouterLink to="/" class="hover:text-primary-600 transition-colors">Dashboard</RouterLink>
      </h2>
      <span v-if="appVersion" class="hidden sm:inline text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded font-mono">v{{ appVersion }}</span>
    </div>
    <div class="flex items-center gap-2 sm:gap-4 shrink-0">
      <span class="flex items-center gap-1.5 sm:gap-2 text-sm">
        <span
          class="w-2 h-2 rounded-full"
          :class="connected ? 'bg-emerald-500 shadow-sm shadow-emerald-200' : 'bg-red-500'"
        ></span>
        <span class="text-xs hidden sm:inline" :class="connected ? 'text-emerald-600' : 'text-red-500'">{{ connected ? 'Live' : 'Disconnected' }}</span>
      </span>
      <span class="text-xs sm:text-sm text-gray-500 hidden sm:inline">{{ authStore.user?.username }}</span>
      <button
        @click="handleLogout"
        class="text-xs text-gray-400 hover:text-gray-700 transition-colors"
      >
        Logout
      </button>
    </div>
  </header>
</template>
