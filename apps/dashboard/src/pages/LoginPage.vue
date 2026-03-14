<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth.store';

const authStore = useAuthStore();
const router = useRouter();

const username = ref('');
const password = ref('');
const totpCode = ref('');
const tempToken = ref('');
const error = ref('');
const loading = ref(false);
const showTotpInput = ref(false);

async function handleLogin() {
  error.value = '';
  loading.value = true;
  try {
    const result = await authStore.login(username.value, password.value);
    if (result.requiresTwoFactor) {
      tempToken.value = result.tempToken || '';
      showTotpInput.value = true;
    } else {
      await authStore.fetchMe();
      router.push('/');
    }
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Invalid credentials';
  } finally {
    loading.value = false;
  }
}

async function handleTotp() {
  error.value = '';
  loading.value = true;
  try {
    await authStore.verifyTotp(totpCode.value, tempToken.value);
    router.push('/');
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Invalid verification code';
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="min-h-screen bg-gray-50 flex items-center justify-center px-4">
    <div class="w-full max-w-md">
      <div class="text-center mb-8">
        <h1 class="text-3xl font-bold text-gray-900">SMS Gateway</h1>
        <p class="text-sm text-gray-500 mt-1">Sign in to your dashboard</p>
      </div>

      <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <div v-if="error" class="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
          {{ error }}
        </div>

        <!-- Login Form -->
        <form v-if="!showTotpInput" @submit.prevent="handleLogin" class="space-y-5">
          <div>
            <label for="username" class="block text-sm font-medium text-gray-700 mb-1">Username</label>
            <input
              id="username"
              v-model="username"
              type="text"
              required
              autocomplete="username"
              class="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-600 focus:border-primary-600 outline-none transition-colors"
              placeholder="Enter your username"
            />
          </div>
          <div>
            <label for="password" class="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              id="password"
              v-model="password"
              type="password"
              required
              autocomplete="current-password"
              class="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-600 focus:border-primary-600 outline-none transition-colors"
              placeholder="Enter your password"
            />
          </div>
          <button
            type="submit"
            :disabled="loading"
            class="w-full bg-primary-600 text-white py-2.5 px-4 rounded-lg text-sm font-medium hover:bg-primary-700 focus:ring-2 focus:ring-primary-600 focus:ring-offset-2 outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {{ loading ? 'Signing in...' : 'Sign In' }}
          </button>
        </form>

        <!-- TOTP Form -->
        <form v-else @submit.prevent="handleTotp" class="space-y-5">
          <p class="text-sm text-gray-600">Enter the 6-digit code from your authenticator app.</p>
          <div>
            <label for="totp" class="block text-sm font-medium text-gray-700 mb-1">Verification Code</label>
            <input
              id="totp"
              v-model="totpCode"
              type="text"
              inputmode="numeric"
              maxlength="6"
              required
              autocomplete="one-time-code"
              class="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm text-center tracking-widest font-mono focus:ring-2 focus:ring-primary-600 focus:border-primary-600 outline-none transition-colors"
              placeholder="000000"
            />
          </div>
          <button
            type="submit"
            :disabled="loading"
            class="w-full bg-primary-600 text-white py-2.5 px-4 rounded-lg text-sm font-medium hover:bg-primary-700 focus:ring-2 focus:ring-primary-600 focus:ring-offset-2 outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {{ loading ? 'Verifying...' : 'Verify' }}
          </button>
          <button
            type="button"
            @click="showTotpInput = false; totpCode = ''; error = ''"
            class="w-full text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            Back to login
          </button>
        </form>
      </div>
    </div>
  </div>
</template>
