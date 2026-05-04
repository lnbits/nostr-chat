import NDK from '@nostr-dev-kit/ndk';
import { createPrivateMessagesSubscriptionRuntime } from 'src/stores/nostr/privateMessagesSubscriptionRuntime';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';

const serviceMocks = vi.hoisted(() => ({
  chatDataService: {
    init: vi.fn(),
  },
  contactsService: {
    init: vi.fn(),
  },
}));

vi.mock('src/services/chatDataService', () => ({
  chatDataService: serviceMocks.chatDataService,
}));

vi.mock('src/services/contactsService', () => ({
  contactsService: serviceMocks.contactsService,
}));

const LOGGED_IN_PUBLIC_KEY = 'a'.repeat(64);

function createRuntime() {
  const subscriptionHandlers = new Map<string, (...args: unknown[]) => void>();
  const subscription = {
    on: vi.fn(),
    stop: vi.fn(),
  };
  subscription.on.mockImplementation((eventName: string, handler: (...args: unknown[]) => void) => {
    subscriptionHandlers.set(eventName, handler);
    return subscription;
  });
  const logSubscription = vi.fn();

  const runtime = createPrivateMessagesSubscriptionRuntime({
    beginStartupStep: vi.fn(),
    buildFilterSinceDetails: (since) => ({ since }),
    buildPrivateMessageSubscriptionTargetDetails: vi.fn(async () => ({})),
    buildSubscriptionEventDetails: vi.fn(() => ({})),
    buildSubscriptionRelayDetails: (relayUrls) => ({ relayUrls }),
    bumpDeveloperDiagnosticsVersion: vi.fn(),
    clearPrivateMessagesUiRefreshState: vi.fn(),
    completeStartupStep: vi.fn(),
    ensureRelayConnections: vi.fn(async () => {}),
    extractRelayUrlsFromEvent: vi.fn(() => []),
    failStartupStep: vi.fn(),
    flushPrivateMessagesUiRefreshNow: vi.fn(),
    formatSubscriptionLogValue: (value) => value ?? null,
    getFilterSince: () => 1000,
    getLoggedInPublicKeyHex: () => LOGGED_IN_PUBLIC_KEY,
    getOrCreateSigner: vi.fn(async () => ({})),
    getPrivateMessagesRestoreThrottleMs: () => 0,
    getPrivateMessagesStartupLiveSince: () => 1000,
    getRelaySnapshots: vi.fn(() => []),
    getStartupStepSnapshot: vi.fn(() => ({ status: 'idle' })),
    getStoredAuthMethod: () => 'private-key',
    isAppForeground: ref(true),
    isRestoringStartupState: ref(false),
    listPrivateMessageRecipientPubkeys: vi.fn(async () => [LOGGED_IN_PUBLIC_KEY]),
    logSubscription,
    ndk: new NDK(),
    normalizeEventId: (value) => (typeof value === 'string' ? value : null),
    normalizeRelayStatusUrls: (relayUrls) =>
      relayUrls.map((relayUrl) => (relayUrl.endsWith('/') ? relayUrl : `${relayUrl}/`)),
    normalizeThrottleMs: (value) => value ?? 0,
    privateMessagesSubscriptionLastEoseAt: ref(null),
    privateMessagesSubscriptionLastEventCreatedAt: ref(null),
    privateMessagesSubscriptionLastEventId: ref(null),
    privateMessagesSubscriptionLastEventSeenAt: ref(null),
    privateMessagesSubscriptionRelayUrls: ref([]),
    privateMessagesSubscriptionSince: ref(null),
    privateMessagesSubscriptionStartedAt: ref(null),
    queuePrivateMessageIngestion: vi.fn(),
    refreshAllStoredContacts: vi.fn(async () => ({})),
    relaySignature: (relayUrls) => relayUrls.join(','),
    resolvePrivateMessageReadRelayUrls: vi.fn(async () => ['wss://relay.example/']),
    runPrivateMessagesLiveCatchup: vi.fn(async (reason: 'watchdog') => ({
      didRun: false,
      eventCount: 0,
      reachedEose: false,
      reason,
      recipientCount: 0,
      relayUrls: [],
      since: null,
      skippedReason: 'test',
      timedOut: false,
      until: null,
    })),
    schedulePostPrivateMessagesEoseChecks: vi.fn(),
    setPrivateMessagesRestoreThrottleMs: vi.fn(),
    startPrivateMessagesStartupBackfill: vi.fn(),
    subscribeWithReqLogging: vi.fn(() => subscription as never),
    updateStoredEventSinceFromCreatedAt: vi.fn(),
    updateStoredPrivateMessagesLastReceivedFromCreatedAt: vi.fn(),
  });

  return {
    logSubscription,
    runtime,
    subscriptionHandlers,
  };
}

describe('privateMessagesSubscriptionRuntime', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    serviceMocks.chatDataService.init.mockResolvedValue(undefined);
    serviceMocks.contactsService.init.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it('logs relay-side subscription closures so the watchdog can recover live messages', async () => {
    const { logSubscription, runtime, subscriptionHandlers } = createRuntime();

    await runtime.subscribePrivateMessagesForLoggedInUser(true);

    subscriptionHandlers.get('closed')?.({ url: 'wss://relay.example/' } as never, 'closed');

    expect(logSubscription).toHaveBeenCalledWith(
      'private-messages',
      'relay-closed',
      expect.objectContaining({
        reason: 'closed',
        relayUrl: 'wss://relay.example/',
      })
    );
  });
});
