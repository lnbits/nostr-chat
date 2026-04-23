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
      :is-following="isFollowing"
      :follow-pending="isFollowPending"
      @edit-profile="isEditDialogOpen = true"
      @follow="void handleFollow()"
      @open-following="openFollowingPage"
    />

    <div v-if="profileError" class="profile-page__status scroll-divider">
      {{ profileError }}
    </div>

    <div v-if="followError" class="profile-page__status scroll-divider">
      {{ followError }}
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
import { useRoute, useRouter } from 'vue-router';
import { useFormatters } from '../composables/useFormatters';
import EditProfileDialog from '../components/profile/EditProfileDialog.vue';
import FeedList from '../components/feed/FeedList.vue';
import StickyTopBar from '../components/layout/StickyTopBar.vue';
import ProfileHeader from '../components/profile/ProfileHeader.vue';
import ProfileTabs from '../components/profile/ProfileTabs.vue';
import { encodeProfileReference, normalizeProfileReference } from '../services/nostrEntityService';
import { fetchUserRelayEntries } from '../services/nostrRelayService';
import { normalizeReadableRelayUrls } from '../utils/relayList';
import { useAppRelaysStore } from '../stores/appRelays';
import { useAuthStore } from '../stores/auth';
import { useFeedStore } from '../stores/feed';
import { useFollowsStore } from '../stores/follows';
import { useMyRelaysStore } from '../stores/myRelays';
import { useProfilesStore } from '../stores/profiles';
import { useUiStore } from '../stores/ui';
import type { ProfileTab } from '../types/nostr';

const route = useRoute();
const router = useRouter();
const appRelaysStore = useAppRelaysStore();
const authStore = useAuthStore();
const profilesStore = useProfilesStore();
const feedStore = useFeedStore();
const followsStore = useFollowsStore();
const myRelaysStore = useMyRelaysStore();
const uiStore = useUiStore();
const { formatCompactCount } = useFormatters();
const isEditDialogOpen = ref(false);
const followError = ref('');
const profileRelayUrls = ref<string[]>([]);

appRelaysStore.init();
myRelaysStore.init();

const routeProfileReference = computed(() => {
  const routePubkey = route.params.pubkey as string | undefined;
  return normalizeProfileReference(routePubkey);
});
const resolvedPubkey = computed(() => {
  return routeProfileReference.value?.pubkey ?? authStore.currentPubkey ?? '';
});
const profile = computed(() => profilesStore.getProfileByPubkey(resolvedPubkey.value));
const profileError = computed(() =>
  resolvedPubkey.value ? profilesStore.getProfileError(resolvedPubkey.value) : '',
);
const isCurrentUserProfile = computed(() => resolvedPubkey.value === authStore.currentPubkey);
const isFollowing = computed(() =>
  !isCurrentUserProfile.value && followsStore.isCurrentUserFollowing(resolvedPubkey.value),
);
const isFollowPending = computed(() => followsStore.isFollowActionPending(resolvedPubkey.value));
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

async function resolveProfileRelayUrls(pubkey: string): Promise<string[]> {
  try {
    const relayEntries = await fetchUserRelayEntries(
      authStore.session,
      appRelaysStore.relayEntries,
      myRelaysStore.relayEntries,
      pubkey,
      routeProfileReference.value?.relayHints ?? [],
    );
    const resolvedRelayUrls = normalizeReadableRelayUrls(relayEntries);
    return resolvedRelayUrls.length > 0
      ? resolvedRelayUrls
      : (routeProfileReference.value?.relayHints ?? []);
  } catch (error) {
    console.warn('Failed to resolve profile relay list for viewed profile.', error);
    return routeProfileReference.value?.relayHints ?? [];
  }
}

async function loadProfileContext(pubkey: string): Promise<void> {
  if (!pubkey) {
    return;
  }

  const targetPubkey = pubkey;
  const relayUrls = await resolveProfileRelayUrls(pubkey);
  if (resolvedPubkey.value !== targetPubkey) {
    return;
  }

  profileRelayUrls.value = relayUrls;
  const ensureCurrentUserFollowList =
    authStore.currentPubkey && authStore.currentPubkey !== pubkey
      ? followsStore.ensureFollowList(authStore.currentPubkey)
      : Promise.resolve();
  try {
    await Promise.all([
      ensureCurrentUserFollowList,
      profilesStore.ensureProfile(pubkey, true, false, relayUrls),
      followsStore.ensureFollowList(pubkey, {
        force: true,
        extraReadRelayUrls: relayUrls,
      }),
      feedStore.ensureProfileTabLoaded(pubkey, activeTab.value, true, relayUrls),
    ]);
  } catch (error) {
    if (resolvedPubkey.value === targetPubkey) {
      followError.value =
        error instanceof Error ? error.message : 'Failed to load follow data for this profile.';
    }
  }
}

watch(
  resolvedPubkey,
  (pubkey) => {
    followError.value = '';
    if (!pubkey) {
      return;
    }

    profileRelayUrls.value = routeProfileReference.value?.relayHints ?? [];
    void loadProfileContext(pubkey);
  },
  { immediate: true },
);

watch(activeTab, (tab) => {
  if (!resolvedPubkey.value) {
    return;
  }

  void feedStore.ensureProfileTabLoaded(
    resolvedPubkey.value,
    tab,
    false,
    profileRelayUrls.value,
  );
});

function openFollowingPage(): void {
  if (!resolvedPubkey.value) {
    return;
  }

  void router.push({
    name: 'profile-following',
    params: {
      pubkey:
        profileRelayUrls.value.length > 0
          ? encodeProfileReference(resolvedPubkey.value, profileRelayUrls.value)
          : profile.value?.nprofile?.trim() || resolvedPubkey.value,
    },
  });
}

async function handleFollow(): Promise<void> {
  if (!resolvedPubkey.value || isCurrentUserProfile.value || isFollowing.value) {
    return;
  }

  followError.value = '';

  try {
    await followsStore.followPubkey(resolvedPubkey.value);
    feedStore.invalidateFollowingTimeline();
  } catch (error) {
    followError.value = error instanceof Error ? error.message : 'Failed to follow this profile.';
  }
}
</script>

<style scoped>
.profile-page__status {
  padding: 12px 16px;
  color: var(--scroll-danger);
  font-size: 0.95rem;
}
</style>
