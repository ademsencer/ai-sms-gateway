<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useApi } from '@/composables/useApi';

interface UserRecord {
  id: string;
  username: string;
  role: 'admin' | 'viewer';
  enabled: boolean;
  totpEnabled: boolean;
  createdAt: string;
}

const { get, post, patch, del } = useApi();

const users = ref<UserRecord[]>([]);
const loading = ref(false);
const showCreateForm = ref(false);
const deleteConfirmId = ref<string | null>(null);
const error = ref('');
const successMsg = ref('');

// Create form
const newUsername = ref('');
const newPassword = ref('');
const newRole = ref<'admin' | 'viewer'>('viewer');
const creating = ref(false);

// 2FA modal
const show2faModal = ref(false);
const qrCodeUrl = ref('');
const qrSecret = ref('');
const setup2faUserId = ref('');
const setup2faLoading = ref(false);

async function fetchUsers() {
  loading.value = true;
  try {
    users.value = await get<UserRecord[]>('/users');
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Failed to load users';
  } finally {
    loading.value = false;
  }
}

async function createUser() {
  error.value = '';
  creating.value = true;
  try {
    await post('/users', { username: newUsername.value, password: newPassword.value, role: newRole.value });
    newUsername.value = '';
    newPassword.value = '';
    newRole.value = 'viewer';
    showCreateForm.value = false;
    successMsg.value = 'User created successfully';
    setTimeout(() => (successMsg.value = ''), 3000);
    await fetchUsers();
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Failed to create user';
  } finally {
    creating.value = false;
  }
}

async function toggleRole(user: UserRecord) {
  error.value = '';
  try {
    const newRole = user.role === 'admin' ? 'viewer' : 'admin';
    await patch(`/users/${user.id}`, { role: newRole });
    user.role = newRole;
    successMsg.value = `Role changed to ${newRole}`;
    setTimeout(() => (successMsg.value = ''), 2000);
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Failed to update role';
  }
}

async function toggleEnabled(user: UserRecord) {
  error.value = '';
  try {
    await patch(`/users/${user.id}`, { enabled: !user.enabled });
    user.enabled = !user.enabled;
    successMsg.value = user.enabled ? 'User enabled' : 'User disabled';
    setTimeout(() => (successMsg.value = ''), 2000);
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Failed to update user';
  }
}

async function setup2fa(userId: string) {
  error.value = '';
  setup2faLoading.value = true;
  setup2faUserId.value = userId;
  try {
    const result = await post<{ qrCodeDataUrl: string; secret: string; otpauthUrl: string }>(`/users/${userId}/2fa/setup`, {});
    qrCodeUrl.value = result.qrCodeDataUrl;
    qrSecret.value = result.secret;
    show2faModal.value = true;
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Failed to setup 2FA';
  } finally {
    setup2faLoading.value = false;
  }
}

async function disable2fa(userId: string) {
  error.value = '';
  try {
    await post(`/users/${userId}/2fa/disable`, {});
    const user = users.value.find(u => u.id === userId);
    if (user) user.totpEnabled = false;
    successMsg.value = '2FA disabled';
    setTimeout(() => (successMsg.value = ''), 2000);
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Failed to disable 2FA';
  }
}

async function deleteUser(id: string) {
  error.value = '';
  try {
    await del(`/users/${id}`);
    deleteConfirmId.value = null;
    successMsg.value = 'User deleted';
    setTimeout(() => (successMsg.value = ''), 3000);
    await fetchUsers();
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Failed to delete user';
  }
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

onMounted(fetchUsers);
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold text-gray-800">Users</h1>
      <button
        @click="showCreateForm = !showCreateForm"
        class="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
      >
        {{ showCreateForm ? 'Cancel' : 'Create User' }}
      </button>
    </div>

    <div v-if="error" class="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
      {{ error }}
    </div>

    <div v-if="successMsg" class="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg">
      {{ successMsg }}
    </div>

    <!-- Create User Form -->
    <div v-if="showCreateForm" class="bg-white rounded-xl border border-gray-200 p-6 mb-6">
      <h2 class="text-lg font-semibold text-gray-800 mb-4">Create New User</h2>
      <form @submit.prevent="createUser" class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Username</label>
          <input
            v-model="newUsername"
            type="text"
            required
            minlength="3"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-600 focus:border-primary-600 outline-none"
            placeholder="username"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Password</label>
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
          <label class="block text-sm font-medium text-gray-700 mb-1">Role</label>
          <div class="flex items-end gap-2">
            <select
              v-model="newRole"
              class="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-600 focus:border-primary-600 outline-none"
            >
              <option value="viewer">Viewer</option>
              <option value="admin">Admin</option>
            </select>
            <button
              type="submit"
              :disabled="creating"
              class="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors disabled:opacity-50"
            >
              {{ creating ? 'Creating...' : 'Create' }}
            </button>
          </div>
        </div>
      </form>
    </div>

    <!-- Users Table -->
    <div class="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div v-if="loading" class="p-8 text-center text-gray-500 text-sm">Loading users...</div>
      <table v-else class="w-full">
        <thead>
          <tr class="border-b border-gray-200 bg-gray-50">
            <th class="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Username</th>
            <th class="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
            <th class="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">2FA</th>
            <th class="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Enabled</th>
            <th class="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
            <th class="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-200">
          <tr v-for="u in users" :key="u.id" class="hover:bg-gray-50">
            <td class="px-6 py-4 text-sm font-medium text-gray-900">{{ u.username }}</td>
            <td class="px-6 py-4">
              <button
                @click="toggleRole(u)"
                class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium cursor-pointer transition-colors"
                :class="u.role === 'admin' ? 'bg-purple-100 text-purple-800 hover:bg-purple-200' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'"
              >
                {{ u.role }}
              </button>
            </td>
            <td class="px-6 py-4">
              <button
                v-if="u.totpEnabled"
                @click="disable2fa(u.id)"
                class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 hover:bg-green-200 cursor-pointer transition-colors"
              >
                Enabled
              </button>
              <button
                v-else
                @click="setup2fa(u.id)"
                :disabled="setup2faLoading"
                class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 hover:bg-yellow-200 cursor-pointer transition-colors disabled:opacity-50"
              >
                Setup
              </button>
            </td>
            <td class="px-6 py-4">
              <button
                @click="toggleEnabled(u)"
                class="relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none"
                :class="u.enabled ? 'bg-green-500' : 'bg-gray-300'"
              >
                <span
                  class="pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
                  :class="u.enabled ? 'translate-x-4' : 'translate-x-0'"
                />
              </button>
            </td>
            <td class="px-6 py-4 text-sm text-gray-500">{{ formatDate(u.createdAt) }}</td>
            <td class="px-6 py-4 text-right">
              <template v-if="deleteConfirmId === u.id">
                <span class="text-sm text-gray-500 mr-2">Confirm?</span>
                <button @click="deleteUser(u.id)" class="text-red-600 hover:text-red-800 text-sm font-medium mr-2">Yes</button>
                <button @click="deleteConfirmId = null" class="text-gray-500 hover:text-gray-700 text-sm font-medium">No</button>
              </template>
              <button
                v-else
                @click="deleteConfirmId = u.id"
                class="text-red-600 hover:text-red-800 text-sm font-medium"
              >
                Delete
              </button>
            </td>
          </tr>
          <tr v-if="!loading && users.length === 0">
            <td colspan="6" class="px-6 py-8 text-center text-gray-500 text-sm">No users found</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 2FA QR Modal -->
    <div v-if="show2faModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50" @click.self="show2faModal = false">
      <div class="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full mx-4">
        <h3 class="text-lg font-semibold text-gray-800 mb-4">Setup Two-Factor Authentication</h3>
        <p class="text-sm text-gray-600 mb-4">Scan this QR code with Google Authenticator or a compatible app.</p>
        <div class="flex justify-center mb-4">
          <img :src="qrCodeUrl" alt="QR Code" class="w-48 h-48" />
        </div>
        <div class="mb-4">
          <label class="block text-xs font-medium text-gray-500 mb-1">Manual Entry Secret</label>
          <code class="block w-full px-3 py-2 bg-gray-100 rounded text-xs font-mono text-gray-800 break-all select-all">{{ qrSecret }}</code>
        </div>
        <button
          @click="show2faModal = false; fetchUsers()"
          class="w-full bg-primary-600 text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
        >
          Done
        </button>
      </div>
    </div>
  </div>
</template>
