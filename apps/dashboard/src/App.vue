<script setup lang="ts">
import AppSidebar from '@/components/layout/AppSidebar.vue';
import AppHeader from '@/components/layout/AppHeader.vue';
import { useAuthStore } from '@/stores/auth.store';

const authStore = useAuthStore();
</script>

<template>
  <div class="flex h-screen bg-gray-50">
    <template v-if="authStore.isAuthenticated">
      <AppSidebar />
      <div class="flex-1 flex flex-col overflow-hidden">
        <AppHeader />
        <main class="flex-1 overflow-y-auto p-6">
          <RouterView />
        </main>
      </div>
    </template>
    <template v-else>
      <RouterView />
    </template>
  </div>
</template>
