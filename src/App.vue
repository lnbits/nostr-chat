<template>
  <router-view />
  <transition name="foreground-message-banner">
    <div
      v-if="foregroundMessageBanner"
      class="foreground-message-banner"
      role="button"
      tabindex="0"
      @click="openForegroundMessageBannerChat"
      @keydown.enter.prevent="openForegroundMessageBannerChat"
      @keydown.space.prevent="openForegroundMessageBannerChat"
    >
      <q-icon name="chat_bubble" size="20px" class="foreground-message-banner__icon" />
      <span class="foreground-message-banner__content">
        <span class="foreground-message-banner__title">{{ foregroundMessageBanner.title }}</span>
        <span class="foreground-message-banner__caption">New message</span>
      </span>
      <q-btn
        flat
        round
        dense
        icon="close"
        color="white"
        aria-label="Dismiss"
        @click.stop="dismissForegroundMessageBanner"
      />
    </div>
  </transition>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { Notify, useQuasar } from 'quasar';
import {
  FOREGROUND_MESSAGE_ACTIVITY_EVENT,
  readForegroundMessageActivityDetail,
  type ForegroundMessageActivityDetail,
} from 'src/services/foregroundMessageActivityService';
import { installAppE2EBridge } from 'src/testing/e2eBridge';
import { readDarkModePreference } from 'src/utils/themeStorage';
import { useRouter } from 'vue-router';

const $q = useQuasar();
const router = useRouter();
Notify.setDefaults({
  position: 'top',
  actions: [
    {
      icon: 'close',
      round: true,
      dense: true,
      flat: true,
      color: 'white',
      'aria-label': 'Dismiss',
    },
  ],
});
const savedDarkMode = readDarkModePreference();
const foregroundMessageBanner = ref<ForegroundMessageActivityDetail | null>(null);
let foregroundMessageBannerTimeoutId: number | null = null;

if (savedDarkMode !== null) {
  $q.dark.set(savedDarkMode);
}

function clearForegroundMessageBannerTimeout(): void {
  if (foregroundMessageBannerTimeoutId === null) {
    return;
  }

  window.clearTimeout(foregroundMessageBannerTimeoutId);
  foregroundMessageBannerTimeoutId = null;
}

function dismissForegroundMessageBanner(): void {
  clearForegroundMessageBannerTimeout();
  foregroundMessageBanner.value = null;
}

function showForegroundMessageBanner(detail: ForegroundMessageActivityDetail): void {
  if (!detail.showBanner) {
    return;
  }

  clearForegroundMessageBannerTimeout();
  foregroundMessageBanner.value = {
    chatPubkey: detail.chatPubkey,
    title: detail.title || 'Nostr Chat',
    showBanner: true,
  };
  foregroundMessageBannerTimeoutId = window.setTimeout(() => {
    foregroundMessageBanner.value = null;
    foregroundMessageBannerTimeoutId = null;
  }, 5000);
}

function handleForegroundMessageActivity(event: Event): void {
  const detail = readForegroundMessageActivityDetail(event);
  if (!detail) {
    return;
  }

  showForegroundMessageBanner(detail);
}

async function openForegroundMessageBannerChat(): Promise<void> {
  const banner = foregroundMessageBanner.value;
  if (!banner) {
    return;
  }

  dismissForegroundMessageBanner();
  await router.push({ name: 'chats', params: { pubkey: banner.chatPubkey } });
}

onMounted(() => {
  window.addEventListener(FOREGROUND_MESSAGE_ACTIVITY_EVENT, handleForegroundMessageActivity);

  if (process.env.DEV) {
    installAppE2EBridge();
  }
});

onBeforeUnmount(() => {
  window.removeEventListener(FOREGROUND_MESSAGE_ACTIVITY_EVENT, handleForegroundMessageActivity);
  clearForegroundMessageBannerTimeout();
});
</script>

<style scoped>
.foreground-message-banner {
  position: fixed;
  z-index: 6000;
  top: calc(env(safe-area-inset-top, 0px) + 12px);
  left: 50%;
  display: flex;
  align-items: center;
  gap: 12px;
  width: min(calc(100vw - 24px), 420px);
  min-height: 58px;
  padding: 10px 10px 10px 14px;
  color: white;
  background: var(--q-primary);
  border: 1px solid rgb(255 255 255 / 24%);
  border-radius: 8px;
  box-shadow: 0 16px 40px rgb(0 0 0 / 24%);
  transform: translateX(-50%);
  cursor: pointer;
}

.foreground-message-banner:focus-visible {
  outline: 2px solid white;
  outline-offset: 2px;
}

.foreground-message-banner__icon {
  flex: 0 0 auto;
}

.foreground-message-banner__content {
  min-width: 0;
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  line-height: 1.2;
}

.foreground-message-banner__title,
.foreground-message-banner__caption {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.foreground-message-banner__title {
  font-size: 0.95rem;
  font-weight: 700;
}

.foreground-message-banner__caption {
  margin-top: 2px;
  font-size: 0.78rem;
  opacity: 0.88;
}

.foreground-message-banner-enter-active,
.foreground-message-banner-leave-active {
  transition:
    opacity 160ms ease,
    transform 160ms ease;
}

.foreground-message-banner-enter-from,
.foreground-message-banner-leave-to {
  opacity: 0;
  transform: translate(-50%, -10px);
}
</style>
