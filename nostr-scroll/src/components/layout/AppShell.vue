<template>
  <q-layout view="hHh Lpr lFf" class="app-shell-layout">
    <q-page-container class="scroll-page-shell">
      <div class="app-shell-grid">
        <aside class="app-shell-left gt-sm">
          <LeftSidebar />
        </aside>

        <main class="app-shell-center scroll-main-column">
          <slot />
        </main>

        <aside class="app-shell-right gt-md">
          <RightNewsPanel />
        </aside>
      </div>
    </q-page-container>

    <MobileBottomNav class="lt-md" />
  </q-layout>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useAuthStore } from '../../stores/auth';
import { useFeedStore } from '../../stores/feed';
import { useProfilesStore } from '../../stores/profiles';
import LeftSidebar from './LeftSidebar.vue';
import MobileBottomNav from './MobileBottomNav.vue';
import RightNewsPanel from './RightNewsPanel.vue';

const authStore = useAuthStore();
const profilesStore = useProfilesStore();
const feedStore = useFeedStore();

onMounted(() => {
  authStore.restoreSession();
  void profilesStore.ensureHydrated();
  void feedStore.ensureHydrated();
});
</script>

<style scoped>
.app-shell-layout {
  background: transparent;
}

.app-shell-grid {
  display: grid;
  grid-template-columns: minmax(220px, 280px) minmax(0, 640px) minmax(280px, 340px);
  gap: 0;
  justify-content: center;
  max-width: 1280px;
  min-height: 100vh;
  margin: 0 auto;
}

.app-shell-left,
.app-shell-right {
  padding: 0 24px;
}

.app-shell-center {
  min-width: 0;
}

@media (max-width: 1439px) {
  .app-shell-grid {
    grid-template-columns: minmax(220px, 250px) minmax(0, 640px);
    max-width: 980px;
  }
}

@media (max-width: 1023px) {
  .app-shell-grid {
    grid-template-columns: minmax(0, 1fr);
    max-width: none;
  }

  .app-shell-center {
    border-left: none;
    border-right: none;
    padding-bottom: 84px;
  }
}
</style>
