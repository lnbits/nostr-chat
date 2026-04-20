import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import { loginWithMockNostrAuth } from '../services/mockAuthService';
import type { MockAuthSession } from '../types/auth';
import {
  STORAGE_KEYS,
  readStorageItem,
  removeStorageItem,
  writeStorageItem,
} from '../utils/storage';

const defaultSession: MockAuthSession = {
  isAuthenticated: false,
  method: 'nostr-auth',
  currentPubkey: null,
};

export const useAuthStore = defineStore('auth', () => {
  const session = ref<MockAuthSession>(readStorageItem(STORAGE_KEYS.auth, defaultSession));
  const loading = ref(false);

  const isAuthenticated = computed(
    () => session.value.isAuthenticated && Boolean(session.value.currentPubkey),
  );
  const currentPubkey = computed(() => session.value.currentPubkey);

  function persistSession(): void {
    if (!session.value.isAuthenticated || !session.value.currentPubkey) {
      removeStorageItem(STORAGE_KEYS.auth);
      return;
    }

    writeStorageItem(STORAGE_KEYS.auth, session.value);
  }

  function restoreSession(): void {
    session.value = readStorageItem(STORAGE_KEYS.auth, defaultSession);
  }

  async function loginWithNostrAuth(): Promise<void> {
    loading.value = true;

    try {
      session.value = await loginWithMockNostrAuth();
      persistSession();
    } finally {
      loading.value = false;
    }
  }

  function logout(): void {
    session.value = { ...defaultSession };
    removeStorageItem(STORAGE_KEYS.auth);
  }

  return {
    session,
    loading,
    isAuthenticated,
    currentPubkey,
    loginWithNostrAuth,
    logout,
    restoreSession,
  };
});
