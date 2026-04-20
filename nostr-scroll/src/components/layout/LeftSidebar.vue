<template>
  <div class="left-sidebar">
    <div class="brand-mark">
      <div class="brand-dot" />
      <div>
        <div class="brand-title">nostr-scroll</div>
        <div class="brand-subtitle">mocked social client</div>
      </div>
    </div>

    <nav class="left-sidebar-nav">
      <q-btn
        v-for="item in navItems"
        :key="item.name"
        flat
        no-caps
        align="left"
        class="nav-button"
        :class="{ 'nav-button--active': route.name === item.name }"
        @click="router.push({ name: item.name, params: item.params })"
      >
        <q-icon :name="item.icon" size="24px" />
        <span>{{ item.label }}</span>
      </q-btn>
    </nav>

    <div v-if="currentProfile" class="profile-peek scroll-card">
      <q-avatar size="52px">
        <img :src="currentProfile.picture" :alt="currentProfile.displayName" />
      </q-avatar>
      <div class="profile-peek__copy">
        <div class="profile-peek__name">{{ currentProfile.displayName }}</div>
        <div class="profile-peek__handle text-scroll-muted">@{{ currentProfile.name }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '../../stores/auth';
import { useProfilesStore } from '../../stores/profiles';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const profilesStore = useProfilesStore();

const currentProfile = computed(() =>
  profilesStore.getProfileByPubkey(authStore.currentPubkey),
);

const navItems = computed(() => [
  {
    name: 'home',
    label: 'Home',
    icon: 'home',
  },
  {
    name: 'bookmarks',
    label: 'Bookmarks',
    icon: 'bookmark_border',
  },
  {
    name: 'profile',
    label: 'Profile',
    icon: 'person',
    params: currentProfile.value ? { pubkey: currentProfile.value.pubkey } : undefined,
  },
]);
</script>

<style scoped>
.left-sidebar {
  position: sticky;
  top: 0;
  display: flex;
  flex-direction: column;
  gap: 28px;
  min-height: 100vh;
  padding: 28px 0 24px;
}

.brand-mark {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 6px 8px;
}

.brand-dot {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: linear-gradient(135deg, #1d9bf0 0%, #74c7ff 100%);
  box-shadow: 0 0 22px rgba(29, 155, 240, 0.42);
}

.brand-title {
  font-size: 1.05rem;
  font-weight: 800;
  letter-spacing: 0.02em;
}

.brand-subtitle {
  color: var(--scroll-text-soft);
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.12em;
}

.left-sidebar-nav {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.nav-button {
  justify-content: flex-start;
  gap: 14px;
  min-height: 54px;
  border-radius: 999px;
  color: var(--scroll-text);
  font-size: 1.1rem;
  font-weight: 600;
  padding: 0 18px;
}

.nav-button--active {
  background: var(--scroll-accent-soft);
  color: var(--scroll-accent-strong);
}

.profile-peek {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-top: auto;
  padding: 18px;
}

.profile-peek__copy {
  min-width: 0;
}

.profile-peek__name {
  font-size: 0.98rem;
  font-weight: 700;
}

.profile-peek__handle {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
