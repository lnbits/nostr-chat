<template>
  <div class="mobile-bottom-nav">
    <q-btn
      v-for="item in navItems"
      :key="item.name"
      flat
      round
      class="mobile-bottom-nav__button"
      :class="{ 'mobile-bottom-nav__button--active': route.name === item.name }"
      :icon="item.icon"
      @click="router.push({ name: item.name, params: item.params })"
    />
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
  { name: 'home', icon: 'home' },
  { name: 'bookmarks', icon: 'bookmark_border' },
  {
    name: 'profile',
    icon: 'person',
    params: currentProfile.value ? { pubkey: currentProfile.value.pubkey } : undefined,
  },
]);
</script>

<style scoped>
.mobile-bottom-nav {
  position: fixed;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 30;
  display: flex;
  justify-content: space-around;
  padding: 6px 14px calc(6px + env(safe-area-inset-bottom));
  background: rgba(0, 0, 0, 0.94);
  border-top: 1px solid var(--scroll-border);
  backdrop-filter: blur(12px);
}

.mobile-bottom-nav__button {
  color: var(--scroll-text-muted);
  min-width: 52px;
}

.mobile-bottom-nav__button--active {
  color: var(--scroll-text);
}
</style>
