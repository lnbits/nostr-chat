<template>
  <q-page class="home-page">
    <div class="home-shell" :class="{ 'home-shell--mobile': isMobile }">
      <aside v-if="!isMobile" class="rail-panel">
        <AppNavRail active="chats" @select="handleRailSelect" />
      </aside>

      <aside class="sidebar">
        <div class="sidebar-top">
          <div class="sidebar-top__row">
            <div class="sidebar-top__title">Chats</div>
          </div>

          <q-input
            v-model="searchQuery"
            class="tg-input"
            dense
            outlined
            rounded
            placeholder="Search"
          />
        </div>

        <ChatList
          class="sidebar-list"
          :chats="chatStore.chats"
          :selected-chat-id="chatStore.selectedChatId"
          @select="handleSelectChat"
          @view-profile="handleViewChatProfile"
          @refresh-profile="handleRefreshChatProfile"
          @refresh-chat="handleRefreshChat"
          @mute="handleMuteChat"
          @mark-as-read="handleMarkChatAsRead"
          @delete-chat="handleDeleteChat"
        />
      </aside>

      <section v-if="!isMobile" class="thread-panel">
        <ChatThread
          :chat="chatStore.selectedChat"
          :messages="currentMessages"
          @send="handleSend"
          @open-profile="handleOpenProfile"
          @refresh-chat="handleRefreshChat"
        />
      </section>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useQuasar } from 'quasar';
import AppNavRail from 'src/components/AppNavRail.vue';
import ChatList from 'src/components/ChatList.vue';
import ChatThread from 'src/components/ChatThread.vue';
import { useChatStore } from 'src/stores/chatStore';
import { useMessageStore } from 'src/stores/messageStore';
import { useNostrStore } from 'src/stores/nostrStore';
import { reportUiError } from 'src/utils/uiErrorHandler';

const $q = useQuasar();
const router = useRouter();
const chatStore = useChatStore();
const messageStore = useMessageStore();
const nostrStore = useNostrStore();

const isMobile = computed(() => $q.screen.lt.md);

onMounted(() => {
  void chatStore.init();
  void messageStore.init();
});

const currentMessages = computed(() => {
  return messageStore.getMessages(chatStore.selectedChatId);
});

const searchQuery = computed({
  get: () => chatStore.searchQuery,
  set: (value: string) => chatStore.setSearchQuery(value)
});

function handleRailSelect(section: 'chats' | 'contacts' | 'settings'): void {
  try {
    if (section === 'contacts') {
      void router.push({ name: 'contacts' });
      return;
    }

    if (section === 'settings') {
      void router.push({ name: 'settings' });
    }
  } catch (error) {
    reportUiError('Failed to navigate from chats rail', error);
  }
}

function handleSelectChat(chatId: string): void {
  try {
    chatStore.selectChat(chatId);

    if (isMobile.value) {
      void router.push({ name: 'chat', params: { chatId } });
    }
  } catch (error) {
    reportUiError('Failed to select chat', error);
  }
}

async function handleSend(text: string): Promise<void> {
  try {
    if (!chatStore.selectedChatId) {
      return;
    }

    const created = await messageStore.sendMessage(chatStore.selectedChatId, text);

    if (created) {
      await chatStore.updateChatPreview(chatStore.selectedChatId, created.text, created.sentAt);
    }
  } catch (error) {
    reportUiError('Failed to send chat message', error, 'Failed to send message.');
  }
}

function handleOpenProfile(publicKey: string): void {
  try {
    const normalized = publicKey.trim();
    if (!normalized) {
      return;
    }

    void router.push({ name: 'contacts', query: { pubkey: normalized } });
  } catch (error) {
    reportUiError('Failed to open contact profile from chat', error);
  }
}

function findChatById(chatId: string) {
  return chatStore.chats.find((chat) => chat.id === chatId) ?? null;
}

function handleViewChatProfile(chatId: string): void {
  try {
    const chat = findChatById(chatId);
    if (!chat) {
      return;
    }

    void router.push({ name: 'contacts', query: { pubkey: chat.publicKey } });
  } catch (error) {
    reportUiError('Failed to open profile from chat actions', error);
  }
}

async function handleRefreshChatProfile(chatId: string): Promise<void> {
  try {
    const chat = findChatById(chatId);
    if (!chat) {
      return;
    }

    await nostrStore.refreshContactByPublicKey(chat.publicKey, chat.name);
  } catch (error) {
    reportUiError('Failed to refresh chat contact profile', error, 'Failed to refresh profile.');
  }
}

async function handleRefreshChat(chatId: string): Promise<void> {
  try {
    const chat = findChatById(chatId);
    if (!chat) {
      return;
    }

    await nostrStore.subscribePrivateMessagesForLoggedInUser(true);
    await chatStore.reload();
    await messageStore.loadMessages(chatId, true);
  } catch (error) {
    reportUiError('Failed to refresh chat', error, 'Failed to refresh chat.');
  }
}

async function handleMuteChat(chatId: string): Promise<void> {
  try {
    await chatStore.muteChat(chatId);
  } catch (error) {
    reportUiError('Failed to mute chat', error);
  }
}

async function handleMarkChatAsRead(chatId: string): Promise<void> {
  try {
    await chatStore.markAsRead(chatId);
  } catch (error) {
    reportUiError('Failed to mark chat as read', error);
  }
}

async function handleDeleteChat(chatId: string): Promise<void> {
  try {
    const deleted = await chatStore.deleteChat(chatId);
    if (deleted) {
      messageStore.removeChatMessages(chatId);
    }
  } catch (error) {
    reportUiError('Failed to delete chat', error);
  }
}
</script>

<style scoped>
.home-page {
  height: calc(100vh - env(safe-area-inset-top));
  padding: 12px;
}

.home-shell {
  display: grid;
  grid-template-columns: 76px 340px minmax(0, 1fr);
  gap: 12px;
  height: 100%;
}

.home-shell--mobile {
  grid-template-columns: 1fr;
}

.rail-panel,
.sidebar,
.thread-panel {
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

.sidebar {
  display: flex;
  flex-direction: column;
}

.sidebar-list {
  flex: 1;
  min-height: 0;
}

.sidebar-top {
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

.sidebar-top__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.sidebar-top__title {
  font-size: 22px;
  font-weight: 700;
  line-height: 1.1;
}

.thread-panel {
  background: var(--tg-thread-bg);
}

@media (max-width: 1023px) {
  .home-page {
    padding: 0;
  }

  .sidebar {
    border-radius: 0;
    border-left: 0;
    border-right: 0;
  }
}
</style>
