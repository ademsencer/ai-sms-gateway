import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '@/stores/auth.store';
import OverviewPage from '@/pages/OverviewPage.vue';
import DevicesPage from '@/pages/DevicesPage.vue';
import SmsLogsPage from '@/pages/SmsLogsPage.vue';
import LoginPage from '@/pages/LoginPage.vue';
import UsersPage from '@/pages/UsersPage.vue';
import SettingsPage from '@/pages/SettingsPage.vue';
import AuditLogPage from '@/pages/AuditLogPage.vue';

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'overview', component: OverviewPage },
    { path: '/devices', name: 'devices', component: DevicesPage },
    { path: '/sms', name: 'sms', component: SmsLogsPage },
    { path: '/login', name: 'login', component: LoginPage },
    { path: '/users', name: 'users', component: UsersPage, meta: { requiresAdmin: true } },
    { path: '/audit', name: 'audit', component: AuditLogPage, meta: { requiresAdmin: true } },
    { path: '/settings', name: 'settings', component: SettingsPage },
  ],
});

let initialFetchDone = false;

router.beforeEach(async (to) => {
  const authStore = useAuthStore();

  if (!initialFetchDone) {
    await authStore.fetchMe();
    initialFetchDone = true;
  }

  if (!authStore.isAuthenticated && to.name !== 'login') {
    return { name: 'login' };
  }

  if (authStore.isAuthenticated && to.name === 'login') {
    return { name: 'overview' };
  }

  if (to.meta.requiresAdmin && !authStore.isAdmin) {
    return { name: 'overview' };
  }
});
