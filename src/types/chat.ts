export interface ChatMetadata {
  avatar?: string;
  [key: string]: unknown;
}

export interface Chat {
  id: string;
  publicKey: string;
  name: string;
  avatar: string;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
  meta: ChatMetadata;
}

export interface MessageMetadata {
  [key: string]: unknown;
}

export interface Message {
  id: string;
  chatId: string;
  text: string;
  sender: 'me' | 'them';
  sentAt: string;
  authorPublicKey: string;
  meta: MessageMetadata;
}
