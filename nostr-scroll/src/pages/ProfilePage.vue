<template>
  <q-page v-if="profile" class="profile-page">
    <StickyTopBar
      :title="profile.displayName"
      :subtitle="`${formatCompactCount(postCount)} posts`"
      show-back
    />

    <ProfileHeader
      :profile="profile"
      :post-count="postCount"
      :is-current-user="profile.pubkey === authStore.currentPubkey"
      @edit-profile="isEditDialogOpen = true"
    />

    <div v-if="profileError" class="profile-page__status scroll-divider">
      {{ profileError }}
    </div>

    <ProfileTabs :model-value="activeTab" @update:model-value="setActiveTab" />

    <FeedList
      :posts="activePosts"
      empty-title="Nothing here yet"
      empty-subtitle="No matching posts were found on the relays queried for this tab."
      :loading="isActiveTabLoading"
      :error-message="activeTabError"
    />

    <EditProfileDialog
      :model-value="isEditDialogOpen"
      :profile="profile"
      @update:model-value="isEditDialogOpen = $event"
    />
  </q-page>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useFormatters } from '../composables/useFormatters';
import EditProfileDialog from '../components/profile/EditProfileDialog.vue';
import FeedList from '../components/feed/FeedList.vue';
import StickyTopBar from '../components/layout/StickyTopBar.vue';
import ProfileHeader from '../components/profile/ProfileHeader.vue';
import ProfileTabs from '../components/profile/ProfileTabs.vue';
import { normalizeProfileReference } from '../services/nostrEntityService';
import { useAuthStore } from '../stores/auth';
import { useFeedStore } from '../stores/feed';
import { useProfilesStore } from '../stores/profiles';
import { useUiStore } from '../stores/ui';
import type { ProfileTab } from '../types/nostr';

const route = useRoute();
const authStore = useAuthStore();
const profilesStore = useProfilesStore();
const feedStore = useFeedStore();
const uiStore = useUiStore();
const { formatCompactCount } = useFormatters();
const isEditDialogOpen = ref(false);

const resolvedPubkey = computed(() => {
  const routePubkey = route.params.pubkey as string | undefined;
  const normalizedReference = normalizeProfileReference(routePubkey);
  return normalizedReference?.pubkey ?? authStore.currentPubkey ?? '';
});
const profile = computed(() => profilesStore.getProfileByPubkey(resolvedPubkey.value));
const profileError = computed(() =>
  resolvedPubkey.value ? profilesStore.getProfileError(resolvedPubkey.value) : '',
);
const postCount = computed(() => feedStore.getPostCountForProfile(resolvedPubkey.value));
const activeTab = computed<ProfileTab>(() => uiStore.getProfileTab(resolvedPubkey.value));
const isActiveTabLoading = computed(() =>
  resolvedPubkey.value ? feedStore.isProfileTabLoading(resolvedPubkey.value, activeTab.value) : false,
);
const activeTabError = computed(() =>
  resolvedPubkey.value ? feedStore.getProfileTabError(resolvedPubkey.value, activeTab.value) : '',
);

const activePosts = computed(() => {
  switch (activeTab.value) {
    case 'replies':
      return feedStore.getProfileReplies(resolvedPubkey.value);
    case 'likes':
      return feedStore.getProfileLikes(resolvedPubkey.value);
    case 'reposts':
      return feedStore.getProfileReposts(resolvedPubkey.value);
    case 'posts':
    default:
      return feedStore.getProfilePosts(resolvedPubkey.value);
  }
});

function setActiveTab(tab: ProfileTab): void {
  uiStore.setProfileTab(resolvedPubkey.value, tab);
}

async function loadProfileView(pubkey: string, tab: ProfileTab): Promise<void> {
  if (!pubkey) {
    return;
  }

  await Promise.all([
    profilesStore.ensureProfile(pubkey, false, true),
    feedStore.ensureProfileTabLoaded(pubkey, tab),
  ]);
}

watch(
  [resolvedPubkey, activeTab],
  ([pubkey, tab]) => {
    if (!pubkey) {
      return;
    }

    void loadProfileView(pubkey, tab);
  },
  { immediate: true },
);
</script>

<style scoped>
.profile-page__status {
  padding: 12px 16px;
  color: var(--scroll-danger);
  font-size: 0.95rem;
}
</style>
