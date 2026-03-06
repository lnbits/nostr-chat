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
  relay_statuses?: MessageRelayStatus[];
  [key: string]: unknown;
}

export type MessageRelayStatusDirection = 'outbound' | 'inbound';
export type MessageRelayStatusState = 'pending' | 'published' | 'failed' | 'received';
export type MessageRelayStatusScope = 'recipient' | 'self' | 'subscription';

export interface MessageRelayStatus {
  relay_url: string;
  direction: MessageRelayStatusDirection;
  status: MessageRelayStatusState;
  scope: MessageRelayStatusScope;
  updated_at: string;
  detail?: string;
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
