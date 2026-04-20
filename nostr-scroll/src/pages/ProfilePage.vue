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
    />

    <ProfileTabs :model-value="activeTab" @update:model-value="setActiveTab" />

    <FeedList
      :posts="activePosts"
      empty-title="Nothing here yet"
      empty-subtitle="This tab does not have any posts in the mock dataset yet."
    />
  </q-page>

  <q-page v-else class="timeline-page">
    <StickyTopBar title="Profile" show-back />
    <EmptyState
      title="Profile not found"
      subtitle="That mocked profile does not exist in this prototype."
    />
  </q-page>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useFormatters } from '../composables/useFormatters';
import FeedList from '../components/feed/FeedList.vue';
import EmptyState from '../components/feed/EmptyState.vue';
import StickyTopBar from '../components/layout/StickyTopBar.vue';
import ProfileHeader from '../components/profile/ProfileHeader.vue';
import ProfileTabs from '../components/profile/ProfileTabs.vue';
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

const resolvedPubkey = computed(
  () => (route.params.pubkey as string | undefined) ?? authStore.currentPubkey ?? '',
);
const profile = computed(() => profilesStore.getProfileByPubkey(resolvedPubkey.value));
const postCount = computed(() => feedStore.getPostCountForProfile(resolvedPubkey.value));
const activeTab = computed<ProfileTab>(() => uiStore.getProfileTab(resolvedPubkey.value));

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

onMounted(() => {
  void Promise.all([profilesStore.ensureHydrated(), feedStore.ensureHydrated()]);
});
</script>
