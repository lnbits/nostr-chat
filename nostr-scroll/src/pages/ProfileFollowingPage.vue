<template>
  <q-page class="following-page">
    <StickyTopBar
      :title="profile?.displayName ?? 'Following'"
      :subtitle="profile ? `@${profile.name}` : ''"
      show-back
      :back-fallback="backFallback"
    />

    <div class="following-page__tabs scroll-divider">
      <span class="following-page__tab following-page__tab--active">Following</span>
    </div>

    <div v-if="pageError" class="following-page__status scroll-divider">
      {{ pageError }}
    </div>

    <div v-if="followActionError" class="following-page__status scroll-divider">
      {{ followActionError }}
    </div>

    <div v-if="isLoading && followingProfiles.length === 0" class="following-page__loading">
      <q-spinner color="primary" size="28px" />
    </div>

    <template v-else-if="followingProfiles.length > 0">
      <button
        v-for="followedProfile in followingProfiles"
        :key="followedProfile.pubkey"
        type="button"
        class="following-item scroll-divider"
        @click="openProfile(followedProfile.pubkey)"
      >
        <q-avatar size="52px" class="following-item__avatar">
          <img :src="followedProfile.picture" :alt="followedProfile.displayName" />
        </q-avatar>

        <div class="following-item__body">
          <div class="following-item__header">
            <div class="following-item__identity">
              <span class="following-item__display-name">{{ followedProfile.displayName }}</span>
              <q-icon
                v-if="followedProfile.verified"
                name="verified"
                size="18px"
                class="following-item__verified"
              />
              <span class="text-scroll-muted">@{{ followedProfile.name }}</span>
            </div>

            <q-btn
              v-if="showFollowButtonForProfile(followedProfile.pubkey)"
              no-caps
              :outline="isCurrentUserFollowing(followedProfile.pubkey)"
              :unelevated="!isCurrentUserFollowing(followedProfile.pubkey)"
              class="scroll-button following-item__button"
              :label="isCurrentUserFollowing(followedProfile.pubkey) ? 'Following' : 'Follow'"
              :loading="isFollowPending(followedProfile.pubkey)"
              :disable="isCurrentUserFollowing(followedProfile.pubkey) || isFollowPending(followedProfile.pubkey)"
              @click.stop="void handleFollow(followedProfile.pubkey)"
            />
          </div>

          <div class="following-item__about">
            {{ followedProfile.about || 'No profile bio yet.' }}
          </div>
        </div>
      </button>
    </template>

    <EmptyState
      v-else
      title="No followed accounts yet"
      subtitle="This profile is not following anyone that we could load from the relays queried."
    />
  </q-page>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import EmptyState from '../components/feed/EmptyState.vue';
import StickyTopBar from '../components/layout/StickyTopBar.vue';
import { normalizeProfileReference } from '../services/nostrEntityService';
import { fetchUserRelayEntries } from '../services/nostrRelayService';
import { normalizeReadableRelayUrls } from '../utils/relayList';
import { useAppRelaysStore } from '../stores/appRelays';
import { useAuthStore } from '../stores/auth';
import { useFeedStore } from '../stores/feed';
import { useFollowsStore } from '../stores/follows';
import { useMyRelaysStore } from '../stores/myRelays';
import { useProfilesStore } from '../stores/profiles';
import type { NostrProfile } from '../types/nostr';

const route = useRoute();
const router = useRouter();
const appRelaysStore = useAppRelaysStore();
const authStore = useAuthStore();
const feedStore = useFeedStore();
const followsStore = useFollowsStore();
const myRelaysStore = useMyRelaysStore();
const profilesStore = useProfilesStore();

const pageError = ref('');
const followActionError = ref('');

appRelaysStore.init();
myRelaysStore.init();

const routeProfileReference = computed(() => {
  const routePubkey = route.params.pubkey as string | undefined;
  return normalizeProfileReference(routePubkey);
});
const resolvedPubkey = computed(() => routeProfileReference.value?.pubkey ?? authStore.currentPubkey ?? '');
const profile = computed(() => profilesStore.getProfileByPubkey(resolvedPubkey.value));
const followingPubkeys = computed(() => followsStore.getFollowedPubkeys(resolvedPubkey.value));
const followingProfiles = computed(() =>
  followingPubkeys.value
    .map((pubkey) => profilesStore.getProfileByPubkey(pubkey))
    .filter((entry): entry is NostrProfile => Boolean(entry)),
);
const isLoading = computed(() => followsStore.isFollowListLoading(resolvedPubkey.value));
const backFallback = computed(() => ({
  name: 'profile',
  params: {
    pubkey: profile.value?.nprofile?.trim() || resolvedPubkey.value,
  },
}));

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
    console.warn('Failed to resolve relay list for following page.', error);
    return routeProfileReference.value?.relayHints ?? [];
  }
}

async function loadFollowingPage(pubkey: string): Promise<void> {
  if (!pubkey) {
    return;
  }

  const targetPubkey = pubkey;
  pageError.value = '';
  const relayUrls = await resolveProfileRelayUrls(pubkey);
  if (resolvedPubkey.value !== targetPubkey) {
    return;
  }

  try {
    const ensureCurrentUserFollowList =
      authStore.currentPubkey && authStore.currentPubkey !== pubkey
        ? followsStore.ensureFollowList(authStore.currentPubkey)
        : Promise.resolve();
    await Promise.all([
      ensureCurrentUserFollowList,
      profilesStore.ensureProfile(pubkey, true, false, relayUrls),
      followsStore.ensureFollowList(pubkey, {
        force: true,
        extraReadRelayUrls: relayUrls,
      }),
    ]);
    if (resolvedPubkey.value !== targetPubkey) {
      return;
    }

    await profilesStore.ensureProfiles(followsStore.getFollowedPubkeys(pubkey));
  } catch (error) {
    pageError.value =
      error instanceof Error ? error.message : 'Failed to load the following list from relays.';
  }
}

watch(
  resolvedPubkey,
  (pubkey) => {
    followActionError.value = '';
    if (!pubkey) {
      return;
    }

    void loadFollowingPage(pubkey);
  },
  { immediate: true },
);

function showFollowButtonForProfile(pubkey: string): boolean {
  return pubkey !== authStore.currentPubkey;
}

function isCurrentUserFollowing(pubkey: string): boolean {
  return followsStore.isCurrentUserFollowing(pubkey);
}

function isFollowPending(pubkey: string): boolean {
  return followsStore.isFollowActionPending(pubkey);
}

function openProfile(pubkey: string): void {
  const targetProfile = profilesStore.getProfileByPubkey(pubkey);
  void router.push({
    name: 'profile',
    params: {
      pubkey: targetProfile?.nprofile?.trim() || pubkey,
    },
  });
}

async function handleFollow(pubkey: string): Promise<void> {
  followActionError.value = '';

  try {
    await followsStore.followPubkey(pubkey);
    feedStore.invalidateFollowingTimeline();
  } catch (error) {
    followActionError.value =
      error instanceof Error ? error.message : 'Failed to follow this profile.';
  }
}
</script>

<style scoped>
.following-page__tabs {
  display: flex;
  align-items: center;
  min-height: 52px;
  padding: 0 18px;
}

.following-page__tab {
  position: relative;
  display: inline-flex;
  align-items: center;
  min-height: 52px;
  font-weight: 700;
  color: var(--scroll-text-soft);
}

.following-page__tab--active {
  color: var(--scroll-text);
}

.following-page__tab--active::after {
  content: '';
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  height: 4px;
  border-radius: 999px;
  background: var(--scroll-accent);
}

.following-page__status {
  padding: 12px 16px;
  color: var(--scroll-danger);
  font-size: 0.95rem;
}

.following-page__loading {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 160px;
}

.following-item {
  display: flex;
  gap: 14px;
  width: 100%;
  padding: 14px 16px;
  border: none;
  background: transparent;
  color: var(--scroll-text);
  text-align: left;
  cursor: pointer;
  transition: background 160ms ease;
}

.following-item:hover {
  background: var(--scroll-hover);
}

.following-item__avatar {
  flex-shrink: 0;
}

.following-item__body {
  flex: 1;
  min-width: 0;
}

.following-item__header {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.following-item__identity {
  min-width: 0;
}

.following-item__display-name {
  margin-right: 6px;
  font-weight: 800;
}

.following-item__verified {
  margin-right: 6px;
  color: var(--scroll-accent);
}

.following-item__button {
  min-height: 34px;
  padding: 0 16px;
  border-radius: 999px;
  background: #eff3f4;
  color: #0f1419;
  border-color: var(--scroll-border);
  font-weight: 700;
}

.following-item__button.q-btn--outline {
  background: transparent;
  color: var(--scroll-text);
}

.following-item__about {
  margin-top: 6px;
  line-height: 1.45;
  color: var(--scroll-text-soft);
}
</style>
