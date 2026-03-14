import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { useApi } from '@/composables/useApi';

export interface User {
  id: string;
  username: string;
  role: 'admin' | 'viewer';
  enabled: boolean;
  totpEnabled: boolean;
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null);
  const isAuthenticated = computed(() => !!user.value);
  const isAdmin = computed(() => user.value?.role === 'admin');
  const { get, post } = useApi();

  async function login(username: string, password: string) {
    return await post<{ requiresTwoFactor: boolean; tempToken?: string; user?: User }>('/auth/login', { username, password });
  }

  async function verifyTotp(code: string, tempToken: string) {
    await post<{ accessToken: string }>('/auth/verify-2fa', { code, tempToken });
    await fetchMe();
  }

  async function fetchMe() {
    try {
      const result = await get<User>('/auth/me');
      user.value = result;
    } catch {
      user.value = null;
    }
  }

  async function logout() {
    try {
      await post('/auth/logout', {});
    } finally {
      user.value = null;
    }
  }

  async function setup2fa() {
    return await post<{ secret: string; qrCodeDataUrl: string; otpauthUrl: string }>('/auth/2fa/setup', {});
  }

  async function enable2fa(code: string) {
    return await post('/auth/2fa/enable', { code });
  }

  return { user, isAuthenticated, isAdmin, login, verifyTotp, fetchMe, logout, setup2fa, enable2fa };
});
