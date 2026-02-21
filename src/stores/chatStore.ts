import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { mockChats } from 'src/data/mockData';
import type { Chat } from 'src/types/chat';

function sortByLatest(chats: Chat[]): Chat[] {
  return [...chats].sort(
    (first, second) =>
      new Date(second.lastMessageAt).getTime() - new Date(first.lastMessageAt).getTime()
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

export const useChatStore = defineStore('chatStore', () => {
  const chats = ref<Chat[]>(sortByLatest(mockChats));
  const selectedChatId = ref<string | null>(chats.value[0]?.id ?? null);
  const searchQuery = ref('');

  const selectedChat = computed(
    () => chats.value.find((chat) => chat.id === selectedChatId.value) ?? null
  );

  function selectChat(chatId: string): void {
    selectedChatId.value = chatId;
    markAsRead(chatId);
  }

  function markAsRead(chatId: string): void {
    chats.value = chats.value.map((chat) =>
      chat.id === chatId ? { ...chat, unreadCount: 0 } : chat
    );
  }

  function setSearchQuery(query: string): void {
    searchQuery.value = query;
  }

  function updateChatPreview(chatId: string, text: string, at: string): void {
    chats.value = sortByLatest(
      chats.value.map((chat) =>
        chat.id === chatId
          ? {
              ...chat,
              lastMessage: text,
              lastMessageAt: at,
              unreadCount: selectedChatId.value === chatId ? 0 : chat.unreadCount
            }
          : chat
      )
    );
  }

  function addContact(identifierOrPublicKey: string): Chat | null {
    const cleanValue = identifierOrPublicKey.trim();

    if (!cleanValue) {
      return null;
    }

    const now = new Date().toISOString();
    const newChat: Chat = {
      id: `chat-${Date.now()}`,
      name: cleanValue,
      avatar: buildAvatar(cleanValue),
      lastMessage: '',
      lastMessageAt: now,
      unreadCount: 0
    };

    chats.value = sortByLatest([...chats.value, newChat]);
    return newChat;
  }

  return {
    chats,
    searchQuery,
    selectedChat,
    selectedChatId,
    selectChat,
    setSearchQuery,
    updateChatPreview,
    addContact
  };
});
