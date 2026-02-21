import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { chatDataService } from 'src/services/chatDataService';
import type { Chat } from 'src/types/chat';

function sortByLatest(chats: Chat[]): Chat[] {
  const toTimestamp = (value: string): number => {
    const parsed = new Date(value).getTime();
    return Number.isNaN(parsed) ? 0 : parsed;
  };

  return [...chats].sort(
    (first, second) => toTimestamp(second.lastMessageAt) - toTimestamp(first.lastMessageAt)
  );
}

function buildAvatar(identifier: string): string {
  const parts = identifier
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }

  const compact = identifier.replace(/\s+/g, '').toUpperCase();
  return compact.slice(0, 2) || 'NA';
}

function parseChatId(value: string): number | null {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

function mapChatRowToChat(row: Awaited<ReturnType<typeof chatDataService.listChats>>[number]): Chat {
  const rowMeta = row.meta;
  const avatarFromMeta = typeof rowMeta.avatar === 'string' ? rowMeta.avatar.trim() : '';
  const avatar = avatarFromMeta || buildAvatar(row.name || row.public_key);

  return {
    id: String(row.id),
    publicKey: row.public_key,
    name: row.name,
    avatar,
    lastMessage: row.last_message || '',
    lastMessageAt: row.last_message_at || new Date(0).toISOString(),
    unreadCount: row.unread_count,
    meta: row.meta
  };
}

export const useChatStore = defineStore('chatStore', () => {
  const chats = ref<Chat[]>([]);
  const selectedChatId = ref<string | null>(null);
  const searchQuery = ref('');
  const isLoaded = ref(false);
  let initPromise: Promise<void> | null = null;

  const selectedChat = computed(
    () => chats.value.find((chat) => chat.id === selectedChatId.value) ?? null
  );

  async function init(): Promise<void> {
    if (!initPromise) {
      initPromise = (async () => {
        try {
          await chatDataService.init();
          const rows = await chatDataService.listChats();
          chats.value = sortByLatest(rows.map((row) => mapChatRowToChat(row)));

          if (selectedChatId.value && chats.value.some((chat) => chat.id === selectedChatId.value)) {
            return;
          }

          selectedChatId.value = chats.value[0]?.id ?? null;
        } catch (error) {
          console.error('Failed to initialize chats', error);
          chats.value = [];
          selectedChatId.value = null;
        }
      })();
    }

    await initPromise;
    isLoaded.value = true;
  }

  function selectChat(chatId: string): void {
    selectedChatId.value = chatId;
    void markAsRead(chatId);
  }

  async function markAsRead(chatId: string): Promise<void> {
    chats.value = chats.value.map((chat) =>
      chat.id === chatId ? { ...chat, unreadCount: 0 } : chat
    );

    const parsedId = parseChatId(chatId);
    if (!parsedId) {
      return;
    }

    try {
      await chatDataService.markChatAsRead(parsedId);
    } catch (error) {
      console.error('Failed to mark chat as read', error);
    }
  }

  function setSearchQuery(query: string): void {
    searchQuery.value = query;
  }

  async function updateChatPreview(chatId: string, text: string, at: string): Promise<void> {
    let nextUnreadCount = 0;
    chats.value = sortByLatest(
      chats.value.map((chat) => {
        if (chat.id !== chatId) {
          return chat;
        }

        nextUnreadCount = selectedChatId.value === chatId ? 0 : chat.unreadCount;
        return {
          ...chat,
          lastMessage: text,
          lastMessageAt: at,
          unreadCount: nextUnreadCount
        };
      })
    );

    const parsedId = parseChatId(chatId);
    if (!parsedId) {
      return;
    }

    try {
      await chatDataService.updateChatPreview(parsedId, text, at, nextUnreadCount);
    } catch (error) {
      console.error('Failed to update chat preview', error);
    }
  }

  async function addContact(
    nameOrIdentifier: string,
    publicKey = nameOrIdentifier
  ): Promise<Chat | null> {
    const cleanName = nameOrIdentifier.trim();
    const cleanPublicKey = publicKey.trim() || cleanName;

    if (!cleanName || !cleanPublicKey) {
      return null;
    }

    const existingInStore = chats.value.find(
      (chat) => chat.publicKey.toLowerCase() === cleanPublicKey.toLowerCase()
    );
    if (existingInStore) {
      return existingInStore;
    }

    const existingInDb = await chatDataService.getChatByPublicKey(cleanPublicKey);
    if (existingInDb) {
      const mapped = mapChatRowToChat(existingInDb);
      if (!chats.value.some((chat) => chat.id === mapped.id)) {
        chats.value = sortByLatest([...chats.value, mapped]);
      }

      return mapped;
    }

    const now = new Date().toISOString();
    const created = await chatDataService.createChat({
      public_key: cleanPublicKey,
      name: cleanName,
      last_message: '',
      last_message_at: now,
      unread_count: 0,
      meta: { avatar: buildAvatar(cleanName) }
    });
    if (!created) {
      return null;
    }

    const newChat = mapChatRowToChat(created);
    chats.value = sortByLatest([...chats.value, newChat]);
    return newChat;
  }

  void init().catch((error) => {
    console.error('Failed to preload chats', error);
  });

  return {
    chats,
    isLoaded,
    searchQuery,
    selectedChat,
    selectedChatId,
    init,
    selectChat,
    setSearchQuery,
    updateChatPreview,
    addContact
  };
});
