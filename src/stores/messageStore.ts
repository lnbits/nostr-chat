import { defineStore } from 'pinia';
import { ref } from 'vue';
import { LOCAL_AUTHOR_PUBLIC_KEY, chatDataService } from 'src/services/chatDataService';
import type { Message } from 'src/types/chat';

function parseChatId(value: string): number | null {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

function mapMessageRowToMessage(
  row: Awaited<ReturnType<typeof chatDataService.listMessages>>[number]
): Message {
  const authorKey = row.author_public_key.trim();
  const isMine = authorKey.toLowerCase() === LOCAL_AUTHOR_PUBLIC_KEY.toLowerCase();

  return {
    id: String(row.id),
    chatId: String(row.chat_it),
    text: row.message,
    sender: isMine ? 'me' : 'them',
    sentAt: row.created_at,
    authorPublicKey: authorKey,
    meta: row.meta
  };
}

export const useMessageStore = defineStore('messageStore', () => {
  const messagesByChat = ref<Record<string, Message[]>>({});
  const loadedChatIds = new Set<string>();
  const loadingChatPromises = new Map<string, Promise<void>>();

  function getMessages(chatId: string | null): Message[] {
    if (!chatId) {
      return [];
    }

    if (!loadedChatIds.has(chatId) && !loadingChatPromises.has(chatId)) {
      void loadMessages(chatId);
    }

    return messagesByChat.value[chatId] ?? [];
  }

  async function init(): Promise<void> {
    await chatDataService.init();
  }

  async function loadMessages(chatId: string, force = false): Promise<void> {
    const chatNumericId = parseChatId(chatId);
    if (!chatNumericId) {
      return;
    }

    if (!force && loadedChatIds.has(chatId)) {
      return;
    }

    const existingLoad = loadingChatPromises.get(chatId);
    if (existingLoad) {
      await existingLoad;
      return;
    }

    const loadPromise = (async () => {
      try {
        const rows = await chatDataService.listMessages(chatNumericId);
        messagesByChat.value[chatId] = rows.map((row) => mapMessageRowToMessage(row));
        loadedChatIds.add(chatId);
      } catch (error) {
        console.error('Failed to load messages for chat', chatId, error);
      }
    })();

    loadingChatPromises.set(chatId, loadPromise);
    try {
      await loadPromise;
    } finally {
      loadingChatPromises.delete(chatId);
    }
  }

  async function sendMessage(chatId: string, text: string): Promise<Message | null> {
    const cleanText = text.trim();

    if (!cleanText) {
      return null;
    }

    const chatNumericId = parseChatId(chatId);
    if (!chatNumericId) {
      return null;
    }

    await chatDataService.init();
    const created = await chatDataService.createMessage({
      chat_it: chatNumericId,
      author_public_key: LOCAL_AUTHOR_PUBLIC_KEY,
      message: cleanText,
      created_at: new Date().toISOString(),
      meta: {}
    });
    if (!created) {
      return null;
    }

    const newMessage = mapMessageRowToMessage(created);

    if (!messagesByChat.value[chatId]) {
      messagesByChat.value[chatId] = [];
    }

    loadedChatIds.add(chatId);
    messagesByChat.value[chatId] = [...messagesByChat.value[chatId], newMessage];
    return newMessage;
  }

  void init().catch((error) => {
    console.error('Failed to preload message store', error);
  });

  return {
    messagesByChat,
    init,
    loadMessages,
    getMessages,
    sendMessage
  };
});
