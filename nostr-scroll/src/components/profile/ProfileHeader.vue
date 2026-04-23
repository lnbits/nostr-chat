<template>
  <section class="profile-header scroll-divider">
    <div class="profile-header__banner" :style="{ backgroundImage: `url(${profile.banner})` }" />

    <div class="profile-header__main">
      <q-avatar size="126px" class="profile-header__avatar">
        <img :src="profile.picture" :alt="profile.displayName" />
      </q-avatar>

      <div class="profile-header__actions">
        <q-btn
          v-if="isCurrentUser"
          outline
          no-caps
          class="scroll-button profile-header__button"
          label="Edit profile"
          @click="$emit('edit-profile')"
        />
        <q-btn
          v-else
          :outline="isFollowing"
          :unelevated="!isFollowing"
          no-caps
          class="scroll-button profile-header__button profile-header__button--follow"
          :label="isFollowing ? 'Following' : 'Follow'"
          :loading="followPending"
          :disable="followPending || isFollowing"
          @click="$emit('follow')"
        />
      </div>

      <div class="profile-header__identity">
        <div class="profile-header__display-name">
          {{ profile.displayName }}
          <q-icon v-if="profile.verified" name="verified" size="20px" class="profile-header__verified" />
        </div>
        <div class="text-scroll-muted">@{{ profile.name }}</div>
      </div>

      <p class="profile-header__bio">{{ profile.about }}</p>

      <div class="profile-header__meta text-scroll-muted">
        <span v-if="profile.location"><q-icon name="location_on" size="16px" />{{ profile.location }}</span>
        <span v-if="profile.website"><q-icon name="link" size="16px" />{{ profile.website }}</span>
        <span v-if="profile.joinedAt"><q-icon name="calendar_today" size="16px" />Joined {{ formatJoinedDate(profile.joinedAt) }}</span>
      </div>

      <div class="profile-header__stats">
        <button
          v-if="typeof profile.followingCount === 'number'"
          type="button"
          class="profile-header__stat-button"
          @click="$emit('open-following')"
        >
          <strong>{{ formatCompactCount(profile.followingCount) }}</strong> Following
        </button>
        <span v-if="typeof profile.followersCount === 'number'"><strong>{{ formatCompactCount(profile.followersCount) }}</strong> Followers</span>
        <span><strong>{{ formatCompactCount(postCount) }}</strong> Posts</span>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { useFormatters } from '../../composables/useFormatters';
import type { NostrProfile } from '../../types/nostr';

interface Props {
  profile: NostrProfile;
  postCount: number;
  isCurrentUser: boolean;
  isFollowing?: boolean;
  followPending?: boolean;
}

defineEmits<{
  'edit-profile': [];
  follow: [];
  'open-following': [];
}>();

withDefaults(defineProps<Props>(), {
  isFollowing: false,
  followPending: false,
});

const { formatCompactCount, formatJoinedDate } = useFormatters();
</script>

<style scoped>
.profile-header__banner {
  height: 200px;
  background-size: cover;
  background-position: center;
}

.profile-header__main {
  padding: 0 16px 20px;
}

.profile-header__avatar {
  margin-top: -68px;
  border: 4px solid var(--scroll-bg);
  background: var(--scroll-bg);
}

.profile-header__actions {
  display: flex;
  justify-content: flex-end;
  margin-top: -42px;
  margin-bottom: 18px;
}

.profile-header__button {
  min-height: 36px;
  padding: 0 18px;
  border-color: var(--scroll-border);
  border-radius: 999px;
  font-weight: 700;
}

.profile-header__button--follow {
  background: #eff3f4;
  color: #0f1419;
}

.profile-header__button--follow.q-btn--outline {
  background: transparent;
  color: var(--scroll-text);
}

.profile-header__identity {
  margin-bottom: 14px;
}

.profile-header__display-name {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 1.45rem;
  font-weight: 800;
}

.profile-header__verified {
  color: var(--scroll-accent);
}

.profile-header__bio {
  margin: 0 0 14px;
  line-height: 1.5;
}

.profile-header__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  margin-bottom: 14px;
}

.profile-header__meta span {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.profile-header__stats {
  display: flex;
  gap: 18px;
  flex-wrap: wrap;
}

.profile-header__stat-button {
  padding: 0;
  border: none;
  background: transparent;
  color: var(--scroll-text-soft);
  cursor: pointer;
}

.profile-header__stat-button:hover {
  text-decoration: underline;
}

.profile-header__stats strong {
  color: var(--scroll-text);
}
</style>
