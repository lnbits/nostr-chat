<template>
  <q-layout view="lHh Lpr lFf" class="main-layout">
    <q-page-container>
      <router-view />
    </q-page-container>

    <AppConsolePanel
      v-if="consoleStore.isOpen"
      :entries="consoleStore.entries"
      @close="consoleStore.close"
      @clear="consoleStore.clear"
    />

    <q-footer v-if="isMobile" bordered class="mobile-nav">
      <div class="mobile-nav__inner">
        <q-btn
          flat
          stack
          no-caps
          icon="chat"
          label="Chats"
          class="mobile-nav__btn"
          :class="{ 'mobile-nav__btn--active': activeSection === 'chats' }"
          @click="goToSection('chats')"
        />
        <q-btn
          flat
          stack
          no-caps
          icon="contacts"
          label="Contacts"
          class="mobile-nav__btn"
          :class="{ 'mobile-nav__btn--active': activeSection === 'contacts' }"
          @click="goToSection('contacts')"
        />
        <q-btn
          flat
          stack
          no-caps
          icon="settings"
          label="Settings"
          class="mobile-nav__btn"
          :class="{ 'mobile-nav__btn--active': activeSection === 'settings' }"
          @click="goToSection('settings')"
        />
      </div>
    </q-footer>
  </q-layout>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, watchEffect } from 'vue';
import { useQuasar } from 'quasar';
import { useRoute, useRouter } from 'vue-router';
import AppConsolePanel from 'src/components/AppConsolePanel.vue';
import { useConsoleStore } from 'src/stores/consoleStore';
import { useRelayStore } from 'src/stores/relayStore';
import { readDarkModePreference } from 'src/utils/themeStorage';

const $q = useQuasar();
const route = useRoute();
const router = useRouter();
const consoleStore = useConsoleStore();
const relayStore = useRelayStore();
const savedDarkMode = readDarkModePreference();
const isMobile = computed(() => $q.screen.lt.md);
const CONSOLE_PANEL_HEIGHT = 260;

type NavigationSection = 'chats' | 'contacts' | 'settings';

const activeSection = computed<NavigationSection>(() => {
  const routeName = String(route.name ?? '');

  if (routeName === 'contacts') {
    return 'contacts';
  }

  if (routeName === 'settings' || routeName.startsWith('settings-')) {
    return 'settings';
  }

  return 'chats';
});

if (savedDarkMode !== null) {
  $q.dark.set(savedDarkMode);
}
relayStore.init();
consoleStore.initCapture();
watchEffect(() => {
  if (typeof document === 'undefined') {
    return;
  }

  document.documentElement.style.setProperty(
    '--app-console-height',
    consoleStore.isOpen ? `${CONSOLE_PANEL_HEIGHT}px` : '0px'
  );
});

onBeforeUnmount(() => {
  if (typeof document === 'undefined') {
    return;
  }

  document.documentElement.style.setProperty('--app-console-height', '0px');
});

function goToSection(section: NavigationSection): void {
  if (section === 'chats') {
    if (route.name !== 'home') {
      void router.push({ name: 'home' });
    }
    return;
  }

  if (section === 'contacts') {
    if (route.name !== 'contacts') {
      void router.push({ name: 'contacts' });
    }
    return;
  }

  if (route.name !== 'settings' && !String(route.name ?? '').startsWith('settings-')) {
    void router.push({ name: 'settings' });
  }
}
</script>

<style scoped>
.main-layout {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.main-layout :deep(.q-page-container) {
  flex: 1;
  min-height: 0;
}

.mobile-nav {
  background: var(--tg-sidebar);
  border-top: 1px solid var(--tg-border);
  padding-bottom: env(safe-area-inset-bottom);
}

.mobile-nav__inner {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
}

.mobile-nav__btn {
  color: #64748b;
  border-radius: 12px;
  min-height: 56px;
}

.mobile-nav__btn--active {
  color: #1f7a48;
  background: rgba(34, 197, 94, 0.14);
}

body.body--dark .mobile-nav__btn {
  color: #9ca3af;
}

body.body--dark .mobile-nav__btn--active {
  color: #73e2a7;
  background: rgba(22, 163, 74, 0.22);
}
</style>
