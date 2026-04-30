import { NDKRelaySet, type NDKSubscription } from '@nostr-dev-kit/ndk';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';

const serviceMocks = vi.hoisted(() => ({
  chatDataService: {
    init: vi.fn(async () => {}),
  },
  contactsService: {
    init: vi.fn(async () => {}),
  },
}));

vi.mock('src/services/chatDataService', () => ({
  chatDataService: serviceMocks.chatDataService,
}));

vi.mock('src/services/contactsService', () => ({
  contactsService: serviceMocks.contactsService,
}));

import {
  PRIVATE_MESSAGES_WATCHDOG_INTERVAL_MS,
  PRIVATE_MESSAGES_WATCHDOG_STALE_OPEN_MS,
} from 'src/stores/nostr/constants';
import { createPrivateMessagesSubscriptionRuntime } from 'src/stores/nostr/privateMessagesSubscriptionRuntime';

const PUBKEY_A = 'a'.repeat(64);
const RELAY_URL = 'wss://relay.example/';

describe('privateMessagesSubscriptionRuntime', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
    vi.stubGlobal('window', {
      addEventListener: vi.fn(),
      clearTimeout: globalThis.clearTimeout,
      setTimeout: globalThis.setTimeout,
    });
    vi.stubGlobal('navigator', {
      onLine: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  function createRuntime() {
    const privateMessagesSubscriptionLastEoseAt = ref<string | null>(null);
    const privateMessagesSubscriptionLastEventSeenAt = ref<string | null>(null);
    const stopSubscription = vi.fn();
    const logSubscription = vi.fn();
    const subscribeWithReqLogging = vi.fn(
      () =>
        ({
          stop: stopSubscription,
        }) as unknown as NDKSubscription
    );
    vi.spyOn(NDKRelaySet, 'fromRelayUrls').mockReturnValue({} as never);

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
      extractRelayUrlsFromEvent: vi.fn(() => [RELAY_URL]),
      failStartupStep: vi.fn(),
      flushPrivateMessagesUiRefreshNow: vi.fn(),
      formatSubscriptionLogValue: (value) => value ?? null,
      getFilterSince: () => 100,
      getLoggedInPublicKeyHex: () => PUBKEY_A,
      getOrCreateSigner: vi.fn(async () => ({})),
      getPrivateMessagesRestoreThrottleMs: () => 0,
      getPrivateMessagesStartupLiveSince: () => 50,
      getRelaySnapshots: vi.fn(() => []),
      getStartupStepSnapshot: () => ({ status: 'idle' }),
      getStoredAuthMethod: () => 'nsec',
      isRestoringStartupState: ref(false),
      listPrivateMessageRecipientPubkeys: vi.fn(async () => [PUBKEY_A]),
      logSubscription,
      ndk: {
        pool: {
          getRelay: vi.fn(() => ({
            connected: true,
          })),
        },
      } as never,
      normalizeEventId: (value) => (typeof value === 'string' ? value : null),
      normalizeRelayStatusUrls: (relayUrls) => relayUrls,
      normalizeThrottleMs: (value) =>
        typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.floor(value) : 0,
      privateMessagesSubscriptionLastEoseAt,
      privateMessagesSubscriptionLastEventCreatedAt: ref<number | null>(null),
      privateMessagesSubscriptionLastEventId: ref<string | null>(null),
      privateMessagesSubscriptionLastEventSeenAt,
      privateMessagesSubscriptionRelayUrls: ref<string[]>([]),
      privateMessagesSubscriptionSince: ref<number | null>(null),
      privateMessagesSubscriptionStartedAt: ref<string | null>(null),
      queuePrivateMessageIngestion: vi.fn(),
      refreshAllStoredContacts: vi.fn(async () => ({})),
      relaySignature: (relays) => relays.join('|'),
      resolvePrivateMessageReadRelayUrls: vi.fn(async () => [RELAY_URL]),
      schedulePostPrivateMessagesEoseChecks: vi.fn(),
      setPrivateMessagesRestoreThrottleMs: vi.fn(),
      startPrivateMessagesStartupBackfill: vi.fn(),
      subscribeWithReqLogging,
      updateStoredEventSinceFromCreatedAt: vi.fn(),
      updateStoredPrivateMessagesLastReceivedFromCreatedAt: vi.fn(),
    });

    return {
      logSubscription,
      privateMessagesSubscriptionLastEoseAt,
      runtime,
      stopSubscription,
      subscribeWithReqLogging,
    };
  }

  it('recovers a connected private message subscription that never reaches EOSE and goes quiet', async () => {
    const { logSubscription, runtime, stopSubscription, subscribeWithReqLogging } = createRuntime();

    await runtime.subscribePrivateMessagesForLoggedInUser();

    vi.setSystemTime(new Date(Date.now() + PRIVATE_MESSAGES_WATCHDOG_STALE_OPEN_MS - 1));
    runtime.queuePrivateMessagesWatchdog(0);
    await vi.advanceTimersByTimeAsync(1);
    await vi.runAllTicks();
    expect(logSubscription).not.toHaveBeenCalledWith(
      'private-messages',
      'watchdog-recover',
      expect.objectContaining({
        reason: 'subscription-stale-open',
      })
    );

    vi.setSystemTime(new Date(Date.now() + PRIVATE_MESSAGES_WATCHDOG_INTERVAL_MS + 1));
    runtime.queuePrivateMessagesWatchdog(0);
    await vi.advanceTimersByTimeAsync(1);
    await vi.runAllTicks();

    expect(logSubscription).toHaveBeenCalledWith(
      'private-messages',
      'watchdog-recover',
      expect.objectContaining({
        connectedRelayUrls: [RELAY_URL],
        reason: 'subscription-stale-open',
        staleOpenThresholdMs: PRIVATE_MESSAGES_WATCHDOG_STALE_OPEN_MS,
      })
    );
    expect(subscribeWithReqLogging).toHaveBeenCalledTimes(2);
    expect(stopSubscription).toHaveBeenCalledTimes(1);
  });

  it('does not recover an idle private message subscription after EOSE', async () => {
    const { logSubscription, privateMessagesSubscriptionLastEoseAt, runtime } = createRuntime();

    await runtime.subscribePrivateMessagesForLoggedInUser();
    privateMessagesSubscriptionLastEoseAt.value = new Date().toISOString();

    vi.setSystemTime(
      new Date(
        Date.now() + PRIVATE_MESSAGES_WATCHDOG_STALE_OPEN_MS + PRIVATE_MESSAGES_WATCHDOG_INTERVAL_MS
      )
    );
    runtime.queuePrivateMessagesWatchdog(0);
    await vi.advanceTimersByTimeAsync(1);
    await vi.runAllTicks();

    expect(logSubscription).not.toHaveBeenCalledWith(
      'private-messages',
      'watchdog-recover',
      expect.objectContaining({
        reason: 'subscription-stale-open',
      })
    );
  });
});
