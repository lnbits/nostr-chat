import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import { CURRENT_USER_PUBKEY } from '../data/mockProfiles';
import { loadMockProfiles } from '../services/mockProfileService';
import type { NostrProfile } from '../types/nostr';
import { STORAGE_KEYS, readStorageItem, writeStorageItem } from '../utils/storage';

export const useProfilesStore = defineStore('profiles', () => {
  const profiles = ref<NostrProfile[]>([]);
  const hydrating = ref(false);
  const hydrated = ref(false);

  const profilesMap = computed(() =>
    profiles.value.reduce<Record<string, NostrProfile>>((accumulator, profile) => {
      accumulator[profile.pubkey] = profile;
      return accumulator;
    }, {}),
  );

  function persistProfiles(): void {
    writeStorageItem(STORAGE_KEYS.profiles, profiles.value);
  }

  async function ensureHydrated(): Promise<void> {
    if (hydrated.value || hydrating.value) {
      return;
    }

    hydrating.value = true;
    try {
      const storedProfiles = readStorageItem<NostrProfile[] | null>(STORAGE_KEYS.profiles, null);
      profiles.value = storedProfiles ?? (await loadMockProfiles());
      hydrated.value = true;
      persistProfiles();
    } finally {
      hydrating.value = false;
    }
  }

  function getProfileByPubkey(pubkey?: string | null): NostrProfile | null {
    if (!pubkey) {
      return null;
    }

    return profilesMap.value[pubkey] ?? null;
  }

  function updateProfile(pubkey: string, updates: Partial<NostrProfile>): void {
    profiles.value = profiles.value.map((profile) =>
      profile.pubkey === pubkey ? { ...profile, ...updates } : profile,
    );
    persistProfiles();
  }

  const currentUserProfile = computed(() => getProfileByPubkey(CURRENT_USER_PUBKEY));

  return {
    profiles,
    profilesMap,
    hydrated,
    currentUserProfile,
    ensureHydrated,
    getProfileByPubkey,
    updateProfile,
  };
});
