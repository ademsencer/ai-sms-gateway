<script setup lang="ts">
import { ref } from 'vue';
import { useAuthStore } from '@/stores/auth.store';
import { useApi } from '@/composables/useApi';

const authStore = useAuthStore();
const { post } = useApi();

const qrCodeDataUrl = ref('');
const setupSecret = ref('');
const verifyCode = ref('');
const showSetup = ref(false);
const error = ref('');
const successMsg = ref('');
const loading = ref(false);

// Password change
const currentPassword = ref('');
const newPassword = ref('');
const confirmPassword = ref('');
const changingPassword = ref(false);

async function handleChangePassword() {
  error.value = '';
  if (newPassword.value !== confirmPassword.value) {
    error.value = 'New passwords do not match';
    return;
  }
  changingPassword.value = true;
  try {
    await post('/auth/change-password', {
      currentPassword: currentPassword.value,
      newPassword: newPassword.value,
    });
    currentPassword.value = '';
    newPassword.value = '';
    confirmPassword.value = '';
    successMsg.value = 'Password changed successfully';
    setTimeout(() => (successMsg.value = ''), 3000);
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Failed to change password';
  } finally {
    changingPassword.value = false;
  }
}

async function handleDisable2fa() {
  error.value = '';
  loading.value = true;
  try {
    await post('/auth/2fa/disable', {});
    if (authStore.user) {
      authStore.user.totpEnabled = false;
    }
    successMsg.value = 'Two-factor authentication disabled successfully';
    setTimeout(() => (successMsg.value = ''), 3000);
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Failed to disable 2FA';
  } finally {
    loading.value = false;
  }
}

async function handleSetup2fa() {
  error.value = '';
  loading.value = true;
  try {
    const result = await authStore.setup2fa();
    qrCodeDataUrl.value = result.qrCodeDataUrl;
    setupSecret.value = result.secret;
    showSetup.value = true;
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Failed to setup 2FA';
  } finally {
    loading.value = false;
  }
}

async function handleEnable2fa() {
  error.value = '';
  loading.value = true;
  try {
    await authStore.enable2fa(verifyCode.value);
    if (authStore.user) {
      authStore.user.totpEnabled = true;
    }
    showSetup.value = false;
    qrCodeDataUrl.value = '';
    setupSecret.value = '';
    verifyCode.value = '';
    successMsg.value = 'Two-factor authentication enabled successfully';
    setTimeout(() => (successMsg.value = ''), 3000);
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Invalid verification code';
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div>
    <h1 class="text-xl sm:text-2xl font-bold text-gray-800 mb-6">Settings</h1>

    <div v-if="error" class="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
      {{ error }}
    </div>

    <div v-if="successMsg" class="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg">
      {{ successMsg }}
    </div>

    <!-- 2FA Section -->
    <div class="bg-white rounded-xl border border-gray-200 p-6">
      <h2 class="text-lg font-semibold text-gray-800 mb-1">Two-Factor Authentication</h2>
      <p class="text-sm text-gray-500 mb-4">Add an extra layer of security to your account.</p>

      <div class="flex items-center gap-3 mb-6">
        <span class="text-sm font-medium text-gray-700">Status:</span>
        <span
          class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
          :class="authStore.user?.totpEnabled ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'"
        >
          {{ authStore.user?.totpEnabled ? 'Enabled' : 'Disabled' }}
        </span>
      </div>

      <!-- Setup button -->
      <div v-if="!authStore.user?.totpEnabled && !showSetup">
        <button
          @click="handleSetup2fa"
          :disabled="loading"
          class="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors disabled:opacity-50"
        >
          {{ loading ? 'Setting up...' : 'Setup Two-Factor Authentication' }}
        </button>
      </div>

      <!-- QR Code and verification -->
      <div v-if="showSetup" class="space-y-4">
        <div class="p-4 bg-gray-50 rounded-lg">
          <p class="text-sm text-gray-600 mb-3">Scan this QR code with your authenticator app:</p>
          <div class="flex justify-center mb-3">
            <img :src="qrCodeDataUrl" alt="2FA QR Code" class="w-36 h-36 sm:w-48 sm:h-48" />
          </div>
          <p class="text-xs text-gray-500 text-center">
            Or enter this secret manually: <code class="bg-gray-200 px-1.5 py-0.5 rounded text-xs font-mono">{{ setupSecret }}</code>
          </p>
        </div>

        <form @submit.prevent="handleEnable2fa" class="flex flex-col sm:flex-row sm:items-end gap-3">
          <div class="flex-1">
            <label class="block text-sm font-medium text-gray-700 mb-1">Verification Code</label>
            <input
              v-model="verifyCode"
              type="text"
              inputmode="numeric"
              maxlength="6"
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono tracking-widest text-center focus:ring-2 focus:ring-primary-600 focus:border-primary-600 outline-none"
              placeholder="000000"
            />
          </div>
          <button
            type="submit"
            :disabled="loading"
            class="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors disabled:opacity-50"
          >
            {{ loading ? 'Verifying...' : 'Enable 2FA' }}
          </button>
          <button
            type="button"
            @click="showSetup = false; verifyCode = ''; error = ''"
            class="text-gray-500 hover:text-gray-700 px-4 py-2 text-sm font-medium transition-colors"
          >
            Cancel
          </button>
        </form>
      </div>

      <div v-if="authStore.user?.totpEnabled && !showSetup" class="space-y-3">
        <p class="text-sm text-gray-600">Two-factor authentication is currently active on your account.</p>
        <button
          @click="handleDisable2fa"
          :disabled="loading"
          class="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
        >
          {{ loading ? 'Disabling...' : 'Disable 2FA' }}
        </button>
      </div>
    </div>

    <!-- Change Password Section -->
    <div class="bg-white rounded-xl border border-gray-200 p-6 mt-6">
      <h2 class="text-lg font-semibold text-gray-800 mb-1">Change Password</h2>
      <p class="text-sm text-gray-500 mb-4">Update your account password.</p>

      <form @submit.prevent="handleChangePassword" class="space-y-4 max-w-md">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
          <input
            v-model="currentPassword"
            type="password"
            required
            class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-600 focus:border-primary-600 outline-none"
            placeholder="Enter current password"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">New Password</label>
          <input
            v-model="newPassword"
            type="password"
            required
            minlength="6"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-600 focus:border-primary-600 outline-none"
            placeholder="Min 6 characters"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
          <input
            v-model="confirmPassword"
            type="password"
            required
            minlength="6"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-600 focus:border-primary-600 outline-none"
            placeholder="Repeat new password"
          />
        </div>
        <button
          type="submit"
          :disabled="changingPassword"
          class="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors disabled:opacity-50"
        >
          {{ changingPassword ? 'Changing...' : 'Change Password' }}
        </button>
      </form>
    </div>
  </div>
</template>
