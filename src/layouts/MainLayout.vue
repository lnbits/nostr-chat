<template>
  <q-layout view="lHh Lpr lFf">
    <q-page-container>
      <router-view />
    </q-page-container>

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
import { computed } from 'vue';
import { useQuasar } from 'quasar';
import { useRoute, useRouter } from 'vue-router';
import { useRelayStore } from 'src/stores/relayStore';
import { useNostrStore } from 'src/stores/nostrStore';
import { readDarkModePreference } from 'src/utils/themeStorage';

const $q = useQuasar();
const route = useRoute();
const router = useRouter();
const relayStore = useRelayStore();
const nostrStore = useNostrStore();
const savedDarkMode = readDarkModePreference();
const isMobile = computed(() => $q.screen.lt.md);

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
void (async () => {
  try {
    await nostrStore.syncLoggedInContactProfile(relayStore.relays);
  } catch (error) {
    console.error('Failed to sync logged-in contact on startup', error);
  }

  try {
    await nostrStore.subscribePrivateMessagesForLoggedInUser();
  } catch (error) {
    console.error('Failed to subscribe to private messages on startup', error);
  }

  try {
    await nostrStore.syncRecentChatContacts(relayStore.relays, 10);
  } catch (error) {
    console.error('Failed to sync recent chat contacts on startup', error);
  }
})();

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
.mobile-nav {
  background:
    linear-gradient(180deg, color-mix(in srgb, var(--tg-sidebar) 78%, transparent), var(--tg-sidebar));
  border-top: 1px solid color-mix(in srgb, var(--tg-border) 84%, #6b7d96 16%);
  padding-bottom: env(safe-area-inset-bottom);
  backdrop-filter: blur(14px);
}

.mobile-nav__inner {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
}

.mobile-nav__btn {
  color: #5d718d;
  border-radius: 14px;
  min-height: 56px;
  border: 1px solid transparent;
  transition: transform 0.2s ease, background-color 0.2s ease, border-color 0.2s ease;
}

.mobile-nav__btn:hover {
  transform: translateY(-1px);
  border-color: color-mix(in srgb, var(--tg-border) 84%, #8ca3bf 16%);
  background: color-mix(in srgb, var(--tg-sidebar) 85%, #dbe9ff 15%);
}

.mobile-nav__btn--active {
  color: #0f5f43;
  background: linear-gradient(135deg, rgba(28, 166, 121, 0.16), rgba(53, 132, 255, 0.16));
  border-color: rgba(57, 141, 255, 0.32);
  box-shadow: 0 8px 18px rgba(36, 110, 214, 0.16);
}

body.body--dark .mobile-nav__btn {
  color: #9aacbf;
}

body.body--dark .mobile-nav__btn--active {
  color: #79e0b2;
  background: linear-gradient(135deg, rgba(18, 122, 91, 0.42), rgba(32, 92, 177, 0.34));
  border-color: rgba(90, 170, 255, 0.34);
  box-shadow: 0 10px 22px rgba(0, 0, 0, 0.35);
}
</style>
