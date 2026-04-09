import { NDKKind } from '@nostr-dev-kit/ndk';
import { createUserActions } from 'src/stores/nostr/userActions';
import type { MessageRelayStatus } from 'src/types/chat';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const ndkMocks = vi.hoisted(() => {
  const giftWrap = vi.fn();
  const fromNip05 = vi.fn();

  class MockNDKUser {
    pubkey: string;
    relayUrls?: string[];
    profile?: { name?: string };

    constructor(options: { pubkey: string }) {
      this.pubkey = options.pubkey;
    }

    static fromNip05 = fromNip05;
  }

  return {
    MockNDKUser,
    fromNip05,
    giftWrap,
  };
});

const serviceMocks = vi.hoisted(() => ({
  chatDataService: {
    getMessageById: vi.fn(),
    init: vi.fn(),
  },
  contactsService: {
    getContactByPublicKey: vi.fn(),
    init: vi.fn(),
  },
  nostrEventDataService: {
    getEventById: vi.fn(),
    init: vi.fn(),
    upsertEvent: vi.fn(),
  },
}));

vi.mock('@nostr-dev-kit/ndk', async () => {
  const actual = await vi.importActual<typeof import('@nostr-dev-kit/ndk')>('@nostr-dev-kit/ndk');

  return {
    ...actual,
    NDKUser: ndkMocks.MockNDKUser,
    giftWrap: ndkMocks.giftWrap,
  };
});

vi.mock('src/services/chatDataService', () => ({
  chatDataService: serviceMocks.chatDataService,
}));

vi.mock('src/services/contactsService', () => ({
  contactsService: serviceMocks.contactsService,
}));

vi.mock('src/services/nostrEventDataService', () => ({
  nostrEventDataService: serviceMocks.nostrEventDataService,
}));

function makeRelayStatus(overrides: Partial<MessageRelayStatus> = {}): MessageRelayStatus {
  return {
    relay_url: 'wss://relay.example',
    direction: 'outbound',
    scope: 'recipient',
    status: 'published',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function createDeps() {
  const deps = {
    appendRelayStatusesToGroupMemberTicketEvent: vi.fn().mockResolvedValue(undefined),
    appendRelayStatusesToMessageEvent: vi.fn().mockResolvedValue(undefined),
    buildFailedOutboundRelayStatuses: vi.fn((relayUrls, scope, detail) => {
      return relayUrls.map((relayUrl) =>
        makeRelayStatus({
          relay_url: relayUrl,
          scope,
          status: 'failed',
          detail,
        })
      );
    }),
    buildPendingOutboundRelayStatuses: vi.fn((relayUrls, scope) => {
      return relayUrls.map((relayUrl) =>
        makeRelayStatus({
          relay_url: relayUrl,
          scope,
          status: 'pending',
        })
      );
    }),
    createDirectMessageRumorEvent: vi.fn(
      (senderPubkey, recipientPubkey, message, createdAt, replyToEventId) => ({
        id: 'direct-rumor',
        kind: NDKKind.PrivateDirectMessage,
        pubkey: senderPubkey,
        recipientPubkey,
        message,
        created_at: createdAt,
        replyToEventId,
        tags: [],
      })
    ),
    createEventDeletionRumorEvent: vi.fn(
      (senderPubkey, recipientPubkey, targetEventId, targetKind, createdAt) => ({
        id: 'deletion-rumor',
        kind: NDKKind.EventDeletion,
        pubkey: senderPubkey,
        recipientPubkey,
        targetEventId,
        targetKind,
        created_at: createdAt,
        tags: [],
      })
    ),
    createReactionRumorEvent: vi.fn(
      (
        senderPubkey,
        recipientPubkey,
        emoji,
        targetEventId,
        targetAuthorPublicKey,
        targetKind,
        createdAt
      ) => ({
        id: 'reaction-rumor',
        kind: NDKKind.Reaction,
        pubkey: senderPubkey,
        recipientPubkey,
        emoji,
        targetEventId,
        targetAuthorPublicKey,
        targetKind,
        created_at: createdAt,
        tags: [],
      })
    ),
    createStoredDirectMessageRumorEvent: vi.fn(() => ({
      id: 'stored-direct-rumor',
      kind: NDKKind.PrivateDirectMessage,
      tags: [],
    })),
    createStoredSignedEvent: vi.fn(() => ({
      id: 'stored-signed-event',
      kind: 1014,
      tags: [],
    })),
    ensureGroupIdentitySecretEpochState: vi.fn().mockResolvedValue({
      secret: { group_privkey: 'group-private-key' },
    }),
    ensureRelayConnections: vi.fn().mockResolvedValue(undefined),
    getLoggedInPublicKeyHex: vi.fn(() => 'f'.repeat(64)),
    getOrCreateSigner: vi.fn().mockResolvedValue({
      pubkey: 's'.repeat(64),
    }),
    giftWrapSignedEvent: vi.fn().mockResolvedValue({
      kind: NDKKind.GiftWrap,
    }),
    ndk: {} as never,
    normalizeEventId: vi.fn((value: unknown) =>
      typeof value === 'string' && value.trim() ? value.trim().toLowerCase() : null
    ),
    normalizeRelayStatusUrl: vi.fn((value: string) =>
      typeof value === 'string' && value.trim() ? value.trim() : null
    ),
    publishEventWithRelayStatuses: vi.fn().mockResolvedValue({
      relayStatuses: [makeRelayStatus()],
      error: null,
    }),
    readDirectMessageRecipientPubkey: vi.fn(() => 'r'.repeat(64)),
    readEpochNumberTag: vi.fn(() => 2),
    readFirstTagValue: vi.fn(() => 'm'.repeat(64)),
    savePrivateKeyHex: vi.fn(() => true),
    sendGiftWrappedRumor: vi
      .fn()
      .mockImplementation(async (recipientPublicKey, relays, rumorKind, rumorFactory, options) => {
        return {
          giftWrapEvent: {
            id: 'gift-wrap-event',
            recipientPublicKey,
            relays,
            rumorKind,
            options,
          },
          rumorEvent: rumorFactory('s'.repeat(64), recipientPublicKey, 123456),
          rumorEventId: 'gift-wrap-event',
          relayStatuses: [makeRelayStatus()],
        };
      }),
    toIsoTimestampFromUnix: vi.fn((value: number | undefined) =>
      typeof value === 'number' ? new Date(value * 1000).toISOString() : ''
    ),
  };

  return deps as Parameters<typeof createUserActions>[0] & typeof deps;
}

describe('userActions runtime', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    serviceMocks.chatDataService.init.mockResolvedValue(undefined);
    serviceMocks.chatDataService.getMessageById.mockResolvedValue(null);
    serviceMocks.contactsService.init.mockResolvedValue(undefined);
    serviceMocks.contactsService.getContactByPublicKey.mockResolvedValue(null);
    serviceMocks.nostrEventDataService.init.mockResolvedValue(undefined);
    serviceMocks.nostrEventDataService.getEventById.mockResolvedValue(null);
    serviceMocks.nostrEventDataService.upsertEvent.mockResolvedValue(undefined);
    ndkMocks.fromNip05.mockReset();
    ndkMocks.giftWrap.mockReset();
  });

  it('resolves nip05 identifiers into normalized pubkeys and relay hints', async () => {
    ndkMocks.fromNip05.mockResolvedValue({
      pubkey: 'A'.repeat(64),
      profile: {
        name: 'Alice',
      },
      relayUrls: [' wss://relay.example ', ''],
    });

    const actions = createUserActions(createDeps());

    await expect(actions.resolveIdentifier('alice@example.com')).resolves.toEqual({
      isValid: true,
      normalizedPubkey: 'a'.repeat(64),
      resolvedName: 'Alice',
      relays: ['wss://relay.example'],
      identifierType: 'nip05',
      error: null,
    });
  });

  it('builds direct-message rumor events with trimmed message text and normalized reply ids', async () => {
    const deps = createDeps();
    const actions = createUserActions(deps);

    const giftWrapEvent = await actions.sendDirectMessage(
      'r'.repeat(64),
      '  hello there  ',
      ['wss://relay.example'],
      {
        createdAt: '2026-01-02T00:00:00.000Z',
        replyToEventId: '  REPLY-ID  ',
        publishSelfCopy: true,
      }
    );

    expect(deps.createDirectMessageRumorEvent).toHaveBeenCalledWith(
      's'.repeat(64),
      'r'.repeat(64),
      'hello there',
      123456,
      'reply-id'
    );
    expect(deps.sendGiftWrappedRumor).toHaveBeenCalledWith(
      'r'.repeat(64),
      ['wss://relay.example'],
      NDKKind.PrivateDirectMessage,
      expect.any(Function),
      {
        createdAt: '2026-01-02T00:00:00.000Z',
        replyToEventId: '  REPLY-ID  ',
        publishSelfCopy: true,
      }
    );
    expect(giftWrapEvent).toMatchObject({
      id: 'gift-wrap-event',
    });
  });

  it('stores reaction rumor events with relay statuses after successful publish', async () => {
    const deps = createDeps();
    const actions = createUserActions(deps);

    const rumorEvent = await actions.sendDirectMessageReaction(
      'r'.repeat(64),
      '🔥',
      ' TARGET-ID ',
      'B'.repeat(64),
      ['wss://relay.example']
    );

    expect(deps.createReactionRumorEvent).toHaveBeenCalledWith(
      's'.repeat(64),
      'r'.repeat(64),
      '🔥',
      'target-id',
      'b'.repeat(64),
      NDKKind.PrivateDirectMessage,
      123456
    );
    expect(serviceMocks.nostrEventDataService.upsertEvent).toHaveBeenCalledWith({
      event: rumorEvent,
      direction: 'out',
      relay_statuses: [makeRelayStatus()],
    });
  });

  it('marks relay retries as pending first and failed when republish errors', async () => {
    const deps = createDeps();
    const actions = createUserActions(deps);
    const failureStatuses = [
      makeRelayStatus({
        relay_url: 'wss://relay.example',
        status: 'failed',
        detail: 'relay down',
      }),
    ];

    serviceMocks.chatDataService.getMessageById.mockResolvedValue({
      id: 7,
      event_id: 'event-1',
    });
    serviceMocks.nostrEventDataService.getEventById.mockResolvedValue({
      direction: 'out',
      event: {
        id: 'event-1',
        kind: NDKKind.PrivateDirectMessage,
        created_at: 1700000000,
        pubkey: 's'.repeat(64),
        tags: [['p', 'r'.repeat(64)]],
      },
    });
    ndkMocks.giftWrap.mockResolvedValue({
      kind: NDKKind.GiftWrap,
    });
    deps.publishEventWithRelayStatuses.mockResolvedValue({
      relayStatuses: failureStatuses,
      error: new Error('publish failed'),
    });

    await expect(
      actions.retryDirectMessageRelay(7, ' wss://relay.example ', 'recipient')
    ).rejects.toThrow('relay down');

    expect(deps.appendRelayStatusesToMessageEvent).toHaveBeenNthCalledWith(
      1,
      7,
      [
        makeRelayStatus({
          relay_url: 'wss://relay.example',
          scope: 'recipient',
          status: 'pending',
        }),
      ],
      expect.objectContaining({
        direction: 'out',
        eventId: 'event-1',
      })
    );
    expect(deps.appendRelayStatusesToMessageEvent).toHaveBeenNthCalledWith(
      2,
      7,
      [
        makeRelayStatus({
          relay_url: 'wss://relay.example',
          scope: 'recipient',
          status: 'failed',
          detail: 'relay down',
        }),
      ],
      expect.objectContaining({
        direction: 'out',
        eventId: 'event-1',
      })
    );
  });
});
