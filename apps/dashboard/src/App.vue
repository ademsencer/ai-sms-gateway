<script setup lang="ts">
import { ref, provide } from 'vue';
import AppSidebar from '@/components/layout/AppSidebar.vue';
import AppHeader from '@/components/layout/AppHeader.vue';
import { useAuthStore } from '@/stores/auth.store';

const authStore = useAuthStore();
const sidebarOpen = ref(false);

provide('sidebarOpen', sidebarOpen);
</script>

<template>
  <div class="flex h-screen bg-gray-50">
    <template v-if="authStore.isAuthenticated">
      <!-- Mobile overlay -->
      <div
        v-if="sidebarOpen"
        class="fixed inset-0 bg-black/50 z-40 lg:hidden"
        @click="sidebarOpen = false"
      ></div>

      <!-- Sidebar -->
      <AppSidebar
        :class="sidebarOpen ? 'translate-x-0' : '-translate-x-full'"
        class="fixed inset-y-0 left-0 z-50 transition-transform duration-200 lg:relative lg:translate-x-0"
        @navigate="sidebarOpen = false"
      />

      <div class="flex-1 flex flex-col overflow-hidden min-w-0">
        <AppHeader @toggle-sidebar="sidebarOpen = !sidebarOpen" />
        <main class="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6">
          <RouterView />
        </main>
      </div>
    </template>
    <template v-else>
      <RouterView />
    </template>
  </div>
</template>
