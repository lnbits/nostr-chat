<template>
  <q-page class="settings-page">
    <div class="settings-shell" :class="{ 'settings-shell--mobile': isMobile }">
      <aside v-if="!isMobile" class="rail-panel">
        <AppNavRail active="settings" @select="handleRailSelect" />
      </aside>

      <aside v-if="!isMobile || isSettingsListView" class="settings-sidebar">
        <div class="settings-sidebar__top">
          <div class="settings-sidebar__title">Settings</div>
        </div>

        <q-list class="settings-menu q-pa-sm">
          <q-item
            v-for="item in settingsItems"
            :key="item.key"
            clickable
            class="settings-menu__item"
            :active="activeSettingKey === item.key"
            active-class="settings-menu__item--active"
            @click="goToSetting(item.routeName)"
          >
            <q-item-section avatar>
              <q-icon :name="item.icon" />
            </q-item-section>

            <q-item-section>
              <q-item-label>{{ item.label }}</q-item-label>
            </q-item-section>
          </q-item>
        </q-list>
      </aside>

      <section v-if="!isMobile || !isSettingsListView" class="settings-content-panel">
        <router-view />
      </section>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useQuasar } from 'quasar';
import AppNavRail from 'src/components/AppNavRail.vue';

const $q = useQuasar();
const route = useRoute();
const router = useRouter();

const isMobile = computed(() => $q.screen.lt.md);
const isSettingsListView = computed(() => route.name === 'settings');

const settingsItems = [
  { key: 'profile', label: 'Profile', icon: 'face', routeName: 'settings-profile' },
  { key: 'relays', label: 'Relays', icon: 'satellite_alt', routeName: 'settings-relays' },
  { key: 'theme', label: 'Theme', icon: 'wallpaper', routeName: 'settings-theme' },
  { key: 'language', label: 'Language', icon: 'language', routeName: 'settings-language' },
  {
    key: 'notifications',
    label: 'Notifications',
    icon: 'notifications',
    routeName: 'settings-notifications'
  }
] as const;

const activeSettingKey = computed(() => {
  const match = settingsItems.find((item) => item.routeName === route.name);
  return match?.key ?? null;
});

watch(
  [isMobile, () => route.name],
  ([mobile, routeName]) => {
    if (!mobile && routeName === 'settings') {
      void router.replace({ name: 'settings-profile' });
    }
  },
  { immediate: true }
);

function handleRailSelect(section: 'chats' | 'contacts' | 'settings'): void {
  if (section === 'chats') {
    void router.push({ name: 'home' });
    return;
  }

  if (section === 'contacts') {
    void router.push({ name: 'contacts' });
  }
}

function goToSetting(
  routeName:
    | 'settings-profile'
    | 'settings-theme'
    | 'settings-relays'
    | 'settings-language'
    | 'settings-notifications'
): void {
  void router.push({ name: routeName });
}
</script>

<style scoped>
.settings-page {
  height: calc(100vh - env(safe-area-inset-top));
  padding: 12px;
}

.settings-shell {
  display: grid;
  grid-template-columns: 76px 320px minmax(0, 1fr);
  gap: 12px;
  height: 100%;
}

.settings-shell--mobile {
  grid-template-columns: 1fr;
}

.rail-panel,
.settings-sidebar,
.settings-content-panel {
  border: 1px solid color-mix(in srgb, var(--tg-border) 88%, #8ea4c0 12%);
  border-radius: 18px;
  overflow: hidden;
  background: var(--tg-sidebar);
  box-shadow: var(--tg-shadow-sm);
}

.rail-panel {
  background:
    linear-gradient(
      180deg,
      color-mix(in srgb, var(--tg-rail) 92%, #dceaff 8%),
      color-mix(in srgb, var(--tg-rail) 96%, #dceaff 4%)
    );
}

.settings-sidebar {
  display: flex;
  flex-direction: column;
}

.settings-sidebar__top {
  padding: 13px;
  border-bottom: 1px solid color-mix(in srgb, var(--tg-border) 90%, #8fa5c1 10%);
  background:
    linear-gradient(
      180deg,
      color-mix(in srgb, var(--tg-sidebar) 88%, #dbe9ff 12%),
      color-mix(in srgb, var(--tg-sidebar) 96%, #dbe9ff 4%)
    );
  backdrop-filter: blur(10px);
}

.settings-sidebar__title {
  font-size: 22px;
  font-weight: 700;
  line-height: 1.1;
}

.settings-menu {
  flex: 1;
}

.settings-menu__item {
  border-radius: 14px;
  margin-bottom: 8px;
  border: 1px solid transparent;
  transition:
    transform 0.2s ease,
    background-color 0.2s ease,
    border-color 0.2s ease,
    box-shadow 0.2s ease;
}

.settings-menu__item:hover {
  transform: translateX(3px);
  background: linear-gradient(130deg, rgba(52, 137, 255, 0.1), rgba(28, 186, 137, 0.08));
  border-color: color-mix(in srgb, var(--tg-border) 78%, #8aa5c5 22%);
  box-shadow: 0 8px 16px rgba(53, 110, 186, 0.1);
}

.settings-menu__item--active {
  background: linear-gradient(130deg, rgba(52, 137, 255, 0.18), rgba(28, 186, 137, 0.14));
  border-color: rgba(56, 136, 255, 0.34);
  box-shadow: 0 10px 20px rgba(53, 110, 186, 0.14);
}

.settings-content-panel {
  background: var(--tg-thread-bg);
}

@media (max-width: 1023px) {
  .settings-page {
    padding: 0;
  }

  .settings-sidebar,
  .settings-content-panel {
    border-radius: 0;
    border-left: 0;
    border-right: 0;
  }
}
</style>
