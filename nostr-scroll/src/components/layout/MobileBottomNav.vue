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
  right: 12px;
  bottom: 12px;
  left: 12px;
  z-index: 30;
  display: flex;
  justify-content: space-around;
  padding: 10px 14px;
  background: rgba(8, 12, 18, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 999px;
  backdrop-filter: blur(18px);
  box-shadow: 0 14px 40px rgba(0, 0, 0, 0.36);
}

.mobile-bottom-nav__button {
  color: var(--scroll-text-muted);
}

.mobile-bottom-nav__button--active {
  color: var(--scroll-text);
  background: var(--scroll-accent-soft);
}
</style>
