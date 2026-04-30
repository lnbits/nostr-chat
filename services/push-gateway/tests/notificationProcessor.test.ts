import { DatabaseSync } from 'node:sqlite';
import { describe, expect, it, vi } from 'vitest';
import { migrateDatabase } from '../src/database.js';
import { processRelayEvent } from '../src/notificationProcessor.js';
import { PushGatewayRepository } from '../src/repository.js';
import type { PushProvider } from '../src/types.js';
import { VALID_EVENT_ID, VALID_PUBKEY_A, VALID_PUBKEY_B } from './helpers.js';

function createRepository(): PushGatewayRepository {
  const database = new DatabaseSync(':memory:');
  migrateDatabase(database);
  const repository = new PushGatewayRepository(database);
  repository.registerDevice({
    ownerPubkey: VALID_PUBKEY_A,
    deviceId: 'device-1',
    platform: 'android',
    appVersion: '0.1.0',
    fcmToken: 'token-1',
    relays: [{ url: 'wss://relay.example/', read: true }],
    watchedPubkeys: [VALID_PUBKEY_A, VALID_PUBKEY_B],
    notificationsEnabled: true,
  });
  return repository;
}

describe('processRelayEvent', () => {
  it('sends one generic notification for duplicate NIP-17 wrapper sightings', async () => {
    const repository = createRepository();
    const pushProvider: PushProvider = {
      sendNewMessageNotification: vi.fn(async () => ({ ok: true as const })),
    };
    const event = {
      id: VALID_EVENT_ID,
      kind: 1059,
      tags: [['p', VALID_PUBKEY_B]],
    };

    await processRelayEvent({
      event,
      relayUrl: 'wss://relay.example/',
      repository,
      pushProvider,
    });
    await processRelayEvent({
      event,
      relayUrl: 'wss://relay.two/',
      repository,
      pushProvider,
    });

    expect(pushProvider.sendNewMessageNotification).toHaveBeenCalledTimes(1);
    expect(pushProvider.sendNewMessageNotification).toHaveBeenCalledWith({
      token: 'token-1',
      recipientPubkey: VALID_PUBKEY_B,
      eventId: VALID_EVENT_ID,
      notificationBody: 'New message',
      notificationCount: 1,
      notificationTag: 'nostr-chat:new-messages',
    });
  });

  it('reuses one notification tag and increments the device notification count', async () => {
    const repository = createRepository();
    const pushProvider: PushProvider = {
      sendNewMessageNotification: vi.fn(async () => ({ ok: true as const })),
    };

    await processRelayEvent({
      event: {
        id: 'd'.repeat(64),
        kind: 1059,
        tags: [['p', VALID_PUBKEY_B]],
      },
      relayUrl: 'wss://relay.example/',
      repository,
      pushProvider,
    });
    await processRelayEvent({
      event: {
        id: 'e'.repeat(64),
        kind: 1059,
        tags: [['p', VALID_PUBKEY_B]],
      },
      relayUrl: 'wss://relay.example/',
      repository,
      pushProvider,
    });

    expect(pushProvider.sendNewMessageNotification).toHaveBeenCalledTimes(2);
    expect(pushProvider.sendNewMessageNotification).toHaveBeenLastCalledWith({
      token: 'token-1',
      recipientPubkey: VALID_PUBKEY_B,
      eventId: 'e'.repeat(64),
      notificationBody: '2 new messages',
      notificationCount: 2,
      notificationTag: 'nostr-chat:new-messages',
    });
  });
});
