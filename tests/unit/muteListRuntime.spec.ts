import NDK, { NDKEvent } from '@nostr-dev-kit/ndk';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const chatDataServiceMock = vi.hoisted(() => ({
  init: vi.fn(async () => {}),
  listChats: vi.fn(async () => []),
  updateChatMeta: vi.fn(async () => {}),
}));

const contactsServiceMock = vi.hoisted(() => ({
  init: vi.fn(async () => {}),
  listContacts: vi.fn(async () => []),
  updateContact: vi.fn(async () => null),
}));

vi.mock('src/services/chatDataService', () => ({
  chatDataService: chatDataServiceMock,
}));

vi.mock('src/services/contactsService', () => ({
  contactsService: contactsServiceMock,
}));

import { MUTE_LIST_KIND } from 'src/stores/nostr/constants';
import { createMuteListRuntime } from 'src/stores/nostr/muteListRuntime';

const LOGGED_IN_PUBKEY = 'a'.repeat(64);
const PUBKEY_B = 'b'.repeat(64);
const PUBKEY_C = 'c'.repeat(64);

function createContact(publicKey: string, meta: Record<string, unknown> = {}) {
  return {
    id: Number.parseInt(publicKey[0] ?? '1', 16),
    public_key: publicKey,
    type: 'user',
    name: publicKey.slice(0, 16),
    given_name: null,
    meta,
    relays: [],
    sendMessagesToAppRelays: false,
  };
}

function createChat(publicKey: string, meta: Record<string, unknown> = {}) {
  return {
    id: publicKey,
    public_key: publicKey,
    type: 'user',
    name: publicKey.slice(0, 16),
    last_message: '',
    last_message_at: null,
    unread_count: 0,
    meta,
  };
}

function createRuntime(overrides: Partial<Parameters<typeof createMuteListRuntime>[0]> = {}) {
  const ndk = new NDK();
  const deps = {
    beginStartupStep: vi.fn(),
    buildMuteListTags: vi.fn((pubkeys: string[]) => pubkeys.map((pubkey) => ['p', pubkey])),
    bumpContactListVersion: vi.fn(),
    chatStore: { reload: vi.fn(async () => {}) },
    completeStartupStep: vi.fn(),
    decryptMuteListContent: vi.fn(async () => []),
    encryptMuteListTags: vi.fn(async () => 'encrypted-mute-list'),
    ensureRelayConnections: vi.fn(async () => {}),
    failStartupStep: vi.fn(),
    getLoggedInPublicKeyHex: vi.fn(() => LOGGED_IN_PUBKEY),
    getLoggedInSignerUser: vi.fn(async () => ({ pubkey: LOGGED_IN_PUBKEY }) as never),
    ndk,
    resolveLoggedInPublishRelayUrls: vi.fn(async () => ['wss://relay.example/']),
    resolveLoggedInReadRelayUrls: vi.fn(async () => ['wss://relay.example/']),
    updateStartupInternalTask: vi.fn(),
    updateStoredEventSinceFromCreatedAt: vi.fn(),
    ...overrides,
  };

  return {
    deps,
    ndk,
    runtime: createMuteListRuntime(deps),
  };
}

describe('mute list runtime', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    chatDataServiceMock.init.mockResolvedValue(undefined);
    chatDataServiceMock.listChats.mockResolvedValue([]);
    chatDataServiceMock.updateChatMeta.mockResolvedValue(undefined);
    contactsServiceMock.init.mockResolvedValue(undefined);
    contactsServiceMock.listContacts.mockResolvedValue([]);
    contactsServiceMock.updateContact.mockResolvedValue(null);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('restores encrypted NIP-51 pubkey mutes into contact and chat metadata', async () => {
    const { deps, ndk, runtime } = createRuntime({
      decryptMuteListContent: vi.fn(async () => [
        LOGGED_IN_PUBKEY,
        PUBKEY_B,
        PUBKEY_B,
        'not-a-pubkey',
      ]),
    });
    const muteListEvent = new NDKEvent(ndk, {
      kind: MUTE_LIST_KIND,
      pubkey: LOGGED_IN_PUBKEY,
      created_at: 1_700_000_000,
      content: 'encrypted-content',
      tags: [],
    });
    vi.spyOn(ndk, 'fetchEvent').mockResolvedValue(muteListEvent);
    contactsServiceMock.listContacts.mockResolvedValue([
      createContact(PUBKEY_B),
      createContact(PUBKEY_C, { muted: true, name: 'Carol' }),
    ]);
    chatDataServiceMock.listChats.mockResolvedValue([
      createChat(PUBKEY_B, { inbox_state: 'accepted' }),
      createChat(PUBKEY_C, { muted: true, inbox_state: 'accepted' }),
    ]);

    await runtime.restoreMuteList();

    expect(ndk.fetchEvent).toHaveBeenCalledWith(
      {
        kinds: [MUTE_LIST_KIND],
        authors: [LOGGED_IN_PUBKEY],
      },
      expect.anything(),
      expect.anything()
    );
    expect(deps.decryptMuteListContent).toHaveBeenCalledWith('encrypted-content');
    expect(deps.updateStartupInternalTask).toHaveBeenCalledWith(
      'contact-cursor-state',
      'mute-list',
      { eventCount: 1 }
    );
    expect(contactsServiceMock.updateContact).toHaveBeenCalledWith(
      Number.parseInt(PUBKEY_B[0] ?? '0', 16),
      { meta: { muted: true } }
    );
    expect(contactsServiceMock.updateContact).toHaveBeenCalledWith(
      Number.parseInt(PUBKEY_C[0] ?? '0', 16),
      { meta: { name: 'Carol' } }
    );
    expect(chatDataServiceMock.updateChatMeta).toHaveBeenCalledWith(PUBKEY_B, {
      inbox_state: 'accepted',
      muted: true,
    });
    expect(chatDataServiceMock.updateChatMeta).toHaveBeenCalledWith(PUBKEY_C, {
      inbox_state: 'accepted',
    });
    expect(deps.bumpContactListVersion).toHaveBeenCalledTimes(1);
    expect(deps.chatStore.reload).toHaveBeenCalledTimes(1);
    expect(deps.completeStartupStep).toHaveBeenCalledWith('mute-list');
  });

  it('publishes only encrypted private p tags for mute and unmute actions', async () => {
    const publishedEvents: NDKEvent[] = [];
    const { deps, ndk, runtime } = createRuntime();
    vi.spyOn(ndk, 'fetchEvent').mockResolvedValue(null);
    vi.spyOn(NDKEvent.prototype, 'publishReplaceable').mockImplementation(function publish() {
      publishedEvents.push(this);
      return Promise.resolve(undefined as never);
    });

    await runtime.setPubkeyMuted(PUBKEY_B, true);
    await runtime.setPubkeyMuted(PUBKEY_C, true);
    await runtime.setPubkeyMuted(PUBKEY_B, false);

    expect(deps.buildMuteListTags).toHaveBeenNthCalledWith(1, [PUBKEY_B]);
    expect(deps.buildMuteListTags).toHaveBeenNthCalledWith(2, [PUBKEY_B, PUBKEY_C]);
    expect(deps.buildMuteListTags).toHaveBeenNthCalledWith(3, [PUBKEY_C]);
    expect(deps.encryptMuteListTags).toHaveBeenNthCalledWith(1, [['p', PUBKEY_B]]);
    expect(publishedEvents).toHaveLength(3);
    expect(publishedEvents[0]).toMatchObject({
      kind: MUTE_LIST_KIND,
      pubkey: LOGGED_IN_PUBKEY,
      content: 'encrypted-mute-list',
      tags: [],
    });
    expect(runtime.isPubkeyMuted(PUBKEY_B)).toBe(false);
    expect(runtime.isPubkeyMuted(PUBKEY_C)).toBe(true);
  });
});
