import { describe, expect, it, vi } from 'vitest';
import { FcmPushProvider } from '../src/fcmProvider.js';
import type { GatewayConfig } from '../src/types.js';

const firebaseMocks = vi.hoisted(() => ({
  cert: vi.fn((credential: unknown) => credential),
  getApps: vi.fn(() => []),
  getMessaging: vi.fn(() => ({
    send: firebaseMocks.send,
  })),
  initializeApp: vi.fn(() => ({ name: 'test-app' })),
  send: vi.fn(async () => 'message-id'),
}));

vi.mock('firebase-admin/app', () => ({
  cert: firebaseMocks.cert,
  getApps: firebaseMocks.getApps,
  initializeApp: firebaseMocks.initializeApp,
}));

vi.mock('firebase-admin/messaging', () => ({
  getMessaging: firebaseMocks.getMessaging,
}));

const config: GatewayConfig = {
  port: 8787,
  databasePath: ':memory:',
  publicGatewayBaseUrl: 'http://localhost:8787',
  firebaseProjectId: 'project-id',
  firebaseClientEmail: 'client@example.test',
  firebasePrivateKey: 'private-key',
  nip98MaxClockSkewSeconds: 60,
  relayConnectTimeoutMs: 1000,
  relayIdleRestartMs: 1000,
};

describe('FcmPushProvider', () => {
  it('sends Android notifications with the app channel, default device sound, replacement tag, and count', async () => {
    const provider = new FcmPushProvider(config);

    await expect(
      provider.sendNewMessageNotification({
        token: 'token-1',
        recipientPubkey: 'a'.repeat(64),
        eventId: 'b'.repeat(64),
        notificationBody: '2 new messages',
        notificationCount: 2,
        notificationTag: 'nostr-chat:new-messages',
      })
    ).resolves.toEqual({ ok: true });

    expect(firebaseMocks.send).toHaveBeenCalledWith({
      token: 'token-1',
      notification: {
        title: 'Nostr Chat',
        body: '2 new messages',
      },
      data: {
        recipientPubkey: 'a'.repeat(64),
        eventId: 'b'.repeat(64),
      },
      android: {
        priority: 'high',
        notification: {
          channelId: 'nostr_chat_messages',
          color: '#ff1fe1',
          icon: 'nostr_chat_notification',
          sound: 'default',
          notificationCount: 2,
          tag: 'nostr-chat:new-messages',
        },
      },
    });
  });
});
