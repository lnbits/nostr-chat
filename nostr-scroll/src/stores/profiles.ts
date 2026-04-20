import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import { CURRENT_USER_PUBKEY } from '../data/mockProfiles';
import { loadMockProfiles } from '../services/mockProfileService';
import type { NostrProfile } from '../types/nostr';

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

  async function ensureHydrated(): Promise<void> {
    if (hydrated.value || hydrating.value) {
      return;
    }

    hydrating.value = true;
    try {
      profiles.value = await loadMockProfiles();
      hydrated.value = true;
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

  const currentUserProfile = computed(() => getProfileByPubkey(CURRENT_USER_PUBKEY));

  return {
    profiles,
    profilesMap,
    hydrated,
    currentUserProfile,
    ensureHydrated,
    getProfileByPubkey,
  };
});
