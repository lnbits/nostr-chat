import { beforeEach, describe, expect, it, vi } from 'vitest';

const moduleMocks = vi.hoisted(() => {
  const nostrStore = {
    encodeNpub: vi.fn((value: string) => `npub-${value}`),
    getLoggedInPublicKeyHex: vi.fn(() => 'pubkey-123'),
    logout: vi.fn().mockResolvedValue(undefined),
    publishMyRelayList: vi.fn().mockResolvedValue(undefined),
    restoreStartupState: vi.fn().mockResolvedValue(undefined),
    rotateGroupEpochAndSendTickets: vi.fn().mockResolvedValue(undefined),
    savePrivateKey: vi.fn(() => ({ isValid: true })),
    setDeveloperDiagnosticsEnabled: vi.fn(),
    subscribePrivateMessagesForLoggedInUser: vi.fn().mockResolvedValue(undefined),
    updateLoggedInUserRelayList: vi.fn().mockResolvedValue(undefined),
  };
  const relayStore = {
    init: vi.fn(),
    relays: ['ws://relay.one'],
    replaceRelayEntries: vi.fn(),
  };
  const nip65RelayStore = {
    init: vi.fn(),
    replaceRelayEntries: vi.fn(),
  };
  const chatStore = {
    acceptChat: vi.fn().mockResolvedValue(undefined),
    init: vi.fn().mockResolvedValue(undefined),
    reload: vi.fn().mockResolvedValue(undefined),
    updateChatPreview: vi.fn().mockResolvedValue(undefined),
  };
  const messageStore = {
    init: vi.fn().mockResolvedValue(undefined),
    loadMessages: vi.fn().mockResolvedValue(undefined),
    reloadLoadedMessages: vi.fn().mockResolvedValue(undefined),
    sendMessage: vi.fn(),
  };

  return {
    chatStore,
    messageStore,
    nip65RelayStore,
    nostrStore,
    relayStore,
    saveBrowserNotificationsPreference: vi.fn(),
  };
});

vi.mock('src/services/inputSanitizerService', () => ({
  inputSanitizerService: {
    normalizeRelayEntriesFromUrls: vi.fn((relayUrls: string[]) =>
      relayUrls
        .map((url) => String(url ?? '').trim())
        .filter((url) => url.length > 0)
        .map((url) => ({
          url,
        }))
    ),
  },
}));

vi.mock('src/utils/browserNotificationPreference', () => ({
  saveBrowserNotificationsPreference: moduleMocks.saveBrowserNotificationsPreference,
}));

vi.mock('src/stores/nostrStore', () => ({
  useNostrStore: () => moduleMocks.nostrStore,
}));

vi.mock('src/stores/relayStore', () => ({
  useRelayStore: () => moduleMocks.relayStore,
}));

vi.mock('src/stores/nip65RelayStore', () => ({
  useNip65RelayStore: () => moduleMocks.nip65RelayStore,
}));

vi.mock('src/stores/chatStore', () => ({
  useChatStore: () => moduleMocks.chatStore,
}));

vi.mock('src/stores/messageStore', () => ({
  useMessageStore: () => moduleMocks.messageStore,
}));

describe('e2eBridge', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();

    moduleMocks.nostrStore.getLoggedInPublicKeyHex.mockReturnValue('pubkey-123');
    moduleMocks.nostrStore.savePrivateKey.mockReturnValue({ isValid: true });
    moduleMocks.relayStore.relays = ['ws://relay.one'];
    moduleMocks.messageStore.sendMessage.mockImplementation(
      async (
        chatId: string,
        text: string,
        _replyTo: null,
        options: { createdAt?: string } = {}
      ) => ({
        id: '1',
        chatId,
        text,
        sender: 'me',
        sentAt: options.createdAt ?? '2026-01-01T00:00:00.000Z',
        authorPublicKey: 'pubkey-123',
        eventId: null,
        nostrEvent: null,
        meta: {},
      })
    );

    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: {
        location: {
          hash: '',
        },
      },
    });
  });

  it('installs the bridge and bootstraps a session through the mocked stores', async () => {
    const { installAppE2EBridge } = await import('src/testing/e2eBridge');
    installAppE2EBridge();

    const bridge = (globalThis.window as typeof window & { __appE2E__: any }).__appE2E__;
    const session = await bridge.bootstrapSession({
      privateKey: '  private-key  ',
      relayUrls: [' ws://relay.one ', 'ws://relay.two'],
      developerDiagnosticsEnabled: true,
    });

    expect(session).toEqual({
      publicKey: 'pubkey-123',
      npub: 'npub-pubkey-123',
      relayUrls: ['ws://relay.one', 'ws://relay.two'],
    });
    expect(moduleMocks.relayStore.init).toHaveBeenCalledTimes(1);
    expect(moduleMocks.relayStore.replaceRelayEntries).toHaveBeenCalledWith([
      { url: 'ws://relay.one' },
      { url: 'ws://relay.two' },
    ]);
    expect(moduleMocks.nip65RelayStore.replaceRelayEntries).toHaveBeenCalled();
    expect(moduleMocks.saveBrowserNotificationsPreference).toHaveBeenCalledWith(false);
    expect(moduleMocks.nostrStore.setDeveloperDiagnosticsEnabled).toHaveBeenCalledWith(true);
    expect(moduleMocks.nostrStore.savePrivateKey).toHaveBeenCalledWith('private-key');
    expect(moduleMocks.nostrStore.updateLoggedInUserRelayList).toHaveBeenCalledWith([
      { url: 'ws://relay.one' },
      { url: 'ws://relay.two' },
    ]);
    expect(moduleMocks.chatStore.reload).toHaveBeenCalledTimes(1);
    expect(moduleMocks.messageStore.reloadLoadedMessages).toHaveBeenCalledTimes(1);
  });

  it('returns the current session snapshot from the mocked stores', async () => {
    const { installAppE2EBridge } = await import('src/testing/e2eBridge');
    installAppE2EBridge();

    const bridge = (globalThis.window as typeof window & { __appE2E__: any }).__appE2E__;
    await expect(bridge.getSessionSnapshot()).resolves.toEqual({
      publicKey: 'pubkey-123',
      npub: 'npub-pubkey-123',
      relayUrls: ['ws://relay.one'],
    });
  });

  it('refreshes either one chat or every loaded chat depending on the options', async () => {
    const { installAppE2EBridge } = await import('src/testing/e2eBridge');
    installAppE2EBridge();

    const bridge = (globalThis.window as typeof window & { __appE2E__: any }).__appE2E__;
    await bridge.refreshSession({ chatId: '  Chat-Id  ' });
    expect(moduleMocks.nostrStore.subscribePrivateMessagesForLoggedInUser).toHaveBeenCalledWith(
      true
    );
    expect(moduleMocks.chatStore.reload).toHaveBeenCalledTimes(1);
    expect(moduleMocks.messageStore.loadMessages).toHaveBeenCalledWith('chat-id', true);
    expect(moduleMocks.messageStore.reloadLoadedMessages).not.toHaveBeenCalled();

    await bridge.refreshSession();
    expect(moduleMocks.messageStore.reloadLoadedMessages).toHaveBeenCalledTimes(1);
  });

  it('logs out and redirects to the auth hash', async () => {
    const { installAppE2EBridge } = await import('src/testing/e2eBridge');
    installAppE2EBridge();

    const bridge = (globalThis.window as typeof window & { __appE2E__: any }).__appE2E__;
    await bridge.logout();

    expect(moduleMocks.nostrStore.logout).toHaveBeenCalledTimes(1);
    expect(globalThis.window.location.hash).toBe('/auth');
  });

  it('delegates group epoch rotation to the nostr store with normalized inputs', async () => {
    const { installAppE2EBridge } = await import('src/testing/e2eBridge');
    installAppE2EBridge();

    const bridge = (globalThis.window as typeof window & { __appE2E__: any }).__appE2E__;
    await bridge.rotateGroupEpoch({
      groupPublicKey: '  GROUP  ',
      memberPublicKeys: [' alice ', '', 'bob'],
      relayUrls: [' ws://relay.one '],
    });

    expect(moduleMocks.nostrStore.rotateGroupEpochAndSendTickets).toHaveBeenCalledWith(
      'GROUP',
      ['alice', 'bob'],
      ['ws://relay.one']
    );
  });

  it('sends seeded bridge messages and forwards explicit createdAt values', async () => {
    const { installAppE2EBridge } = await import('src/testing/e2eBridge');
    installAppE2EBridge();

    const bridge = (globalThis.window as typeof window & { __appE2E__: any }).__appE2E__;
    await bridge.sendMessages({
      chatId: '  CHAT-ID  ',
      texts: [' first ', ' ', 'second'],
      createdAts: ['2026-01-01T00:00:00.000Z', '2026-01-02T00:00:00.000Z'],
    });

    expect(moduleMocks.messageStore.sendMessage).toHaveBeenNthCalledWith(
      1,
      'chat-id',
      'first',
      null,
      {
        createdAt: '2026-01-01T00:00:00.000Z',
      }
    );
    expect(moduleMocks.messageStore.sendMessage).toHaveBeenNthCalledWith(
      2,
      'chat-id',
      'second',
      null,
      {
        createdAt: '2026-01-02T00:00:00.000Z',
      }
    );
    expect(moduleMocks.chatStore.updateChatPreview).toHaveBeenCalledTimes(2);
    expect(moduleMocks.chatStore.acceptChat).toHaveBeenCalledTimes(2);
  });

  it('rejects invalid bootstrap and seeded-message inputs', async () => {
    const { installAppE2EBridge } = await import('src/testing/e2eBridge');
    installAppE2EBridge();

    const bridge = (globalThis.window as typeof window & { __appE2E__: any }).__appE2E__;

    await expect(
      bridge.bootstrapSession({
        privateKey: '   ',
        relayUrls: ['ws://relay.one'],
      })
    ).rejects.toThrow('A private key is required for e2e bootstrap.');

    await expect(
      bridge.bootstrapSession({
        privateKey: 'private-key',
        relayUrls: ['   '],
      })
    ).rejects.toThrow('At least one relay URL is required for e2e bootstrap.');

    moduleMocks.nostrStore.savePrivateKey.mockReturnValueOnce({ isValid: false });
    await expect(
      bridge.bootstrapSession({
        privateKey: 'private-key',
        relayUrls: ['ws://relay.one'],
      })
    ).rejects.toThrow('Invalid private key supplied for e2e bootstrap.');

    moduleMocks.nostrStore.getLoggedInPublicKeyHex.mockReturnValueOnce(null);
    await expect(bridge.getSessionSnapshot()).rejects.toThrow(
      'Failed to read the logged-in public key.'
    );

    await expect(
      bridge.sendMessages({
        chatId: 'chat-id',
        texts: ['first'],
        createdAts: ['2026-01-01T00:00:00.000Z', '2026-01-02T00:00:00.000Z'],
      })
    ).rejects.toThrow('Explicit e2e message timestamps must match the number of messages.');
  });
});
