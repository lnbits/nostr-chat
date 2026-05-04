import {
  createReconnectHealingRuntime,
  type ReconnectHealingChatTarget,
} from 'src/stores/nostr/reconnectHealingRuntime';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';

const GROUP_PUBLIC_KEY = 'a'.repeat(64);
const GROUP_EPOCH_PUBLIC_KEY = 'b'.repeat(64);
const DIRECT_MESSAGE_A = 'c'.repeat(64);
const DIRECT_MESSAGE_B = 'd'.repeat(64);
const LOGGED_IN_PUBLIC_KEY = 'f'.repeat(64);

describe('reconnectHealingRuntime', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.stubGlobal('window', {});
    vi.stubGlobal('navigator', {
      onLine: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  function createRuntime(
    options: {
      recentChats?: ReconnectHealingChatTarget[];
      visibleChat?: ReconnectHealingChatTarget | null;
      isRestoringStartupState?: boolean;
    } = {}
  ) {
    const healingState = ref(false);
    const statusLabel = ref<string | null>(null);
    const statusLabels: Array<string | null> = [];
    const queueOutboundMessageReplay = vi.fn();
    const queuePrivateMessagesWatchdog = vi.fn();
    const refreshDeveloperPendingQueues = vi.fn(async () => ({
      initialEntryCount: 1,
      remainingEntryCount: 0,
    }));
    const restoreGroupEpochHistory = vi.fn(async () => {});
    const restorePrivateMessagesForRecipient = vi.fn(async () => {});

    const runtime = createReconnectHealingRuntime({
      getLoggedInPublicKeyHex: () => LOGGED_IN_PUBLIC_KEY,
      getVisibleChatTarget: () => options.visibleChat ?? null,
      isRestoringStartupState: ref(options.isRestoringStartupState ?? false),
      listRecentDirectMessageChatTargets: () => options.recentChats ?? [],
      queueOutboundMessageReplay,
      queuePrivateMessagesWatchdog,
      refreshDeveloperPendingQueues,
      restoreGroupEpochHistory,
      restorePrivateMessagesForRecipient,
      setIsReconnectHealing: (value) => {
        healingState.value = value;
      },
      setReconnectHealingStatusLabel: (value) => {
        statusLabel.value = value;
        statusLabels.push(value);
      },
    });

    return {
      healingState,
      statusLabel,
      statusLabels,
      queueOutboundMessageReplay,
      queuePrivateMessagesWatchdog,
      refreshDeveloperPendingQueues,
      restoreGroupEpochHistory,
      restorePrivateMessagesForRecipient,
      runtime,
    };
  }

  it('heals the visible chat plus recent direct messages and logs the recovery pass', async () => {
    const visibleChat: ReconnectHealingChatTarget = {
      id: GROUP_PUBLIC_KEY,
      publicKey: GROUP_PUBLIC_KEY,
      type: 'group',
      epochPublicKey: GROUP_EPOCH_PUBLIC_KEY,
    };
    const recentChats: ReconnectHealingChatTarget[] = [
      {
        id: DIRECT_MESSAGE_A,
        publicKey: DIRECT_MESSAGE_A,
        type: 'user',
        epochPublicKey: null,
      },
      {
        id: DIRECT_MESSAGE_B,
        publicKey: DIRECT_MESSAGE_B,
        type: 'user',
        epochPublicKey: null,
      },
      {
        id: DIRECT_MESSAGE_A,
        publicKey: DIRECT_MESSAGE_A,
        type: 'user',
        epochPublicKey: null,
      },
    ];

    const {
      healingState,
      queueOutboundMessageReplay,
      queuePrivateMessagesWatchdog,
      refreshDeveloperPendingQueues,
      restoreGroupEpochHistory,
      restorePrivateMessagesForRecipient,
      runtime,
      statusLabels,
    } = createRuntime({
      recentChats,
      visibleChat,
    });

    await runtime.runReconnectHealing('relay-connected');
    runtime.resetReconnectHealingRuntimeState();

    expect(healingState.value).toBe(false);
    expect(statusLabels).toEqual([
      'Preparing sync',
      'Checking session and network',
      'Queing message relay check',
      'Queing unsent message retries',
      'Refreshing open chat',
      'Refreshing group history',
      'Refreshing recent DMs',
      'Applying pending message updates',
      'Finishing sync',
      null,
      null,
    ]);
    expect(queuePrivateMessagesWatchdog).toHaveBeenCalledWith(0);
    expect(queueOutboundMessageReplay).toHaveBeenCalledWith('reconnect-healing', 0);
    expect(restorePrivateMessagesForRecipient).toHaveBeenNthCalledWith(1, GROUP_PUBLIC_KEY, {
      force: true,
    });
    expect(restorePrivateMessagesForRecipient).toHaveBeenCalledWith(DIRECT_MESSAGE_A, {
      force: true,
    });
    expect(restorePrivateMessagesForRecipient).toHaveBeenCalledWith(DIRECT_MESSAGE_B, {
      force: true,
    });
    expect(restorePrivateMessagesForRecipient).toHaveBeenCalledTimes(3);
    expect(restoreGroupEpochHistory).toHaveBeenCalledWith(
      GROUP_PUBLIC_KEY,
      GROUP_EPOCH_PUBLIC_KEY,
      { force: true }
    );
    expect(refreshDeveloperPendingQueues).toHaveBeenCalledTimes(1);
    expect(console.log).toHaveBeenCalledWith(
      '[nostr-chat][reconnect-healing]',
      'start',
      expect.objectContaining({
        reason: 'relay-connected',
        visibleChatId: GROUP_PUBLIC_KEY,
        recentDmCount: 2,
      })
    );
    expect(console.log).toHaveBeenCalledWith(
      '[nostr-chat][reconnect-healing]',
      'complete',
      expect.objectContaining({
        reason: 'relay-connected',
        restoredVisibleChat: true,
        restoredVisibleGroupEpoch: true,
        restoredRecentDirectMessages: 2,
      })
    );
  });

  it('runs healing when a window-focus notifier follows a long enough background period', async () => {
    const { refreshDeveloperPendingQueues, runtime, statusLabels } = createRuntime();

    runtime.notifyWindowBlur();
    await vi.advanceTimersByTimeAsync(3000);
    runtime.notifyWindowFocus();
    expect(statusLabels).toEqual(['Queing preparing sync']);
    await vi.advanceTimersByTimeAsync(750);
    await vi.runAllTicks();
    runtime.resetReconnectHealingRuntimeState();

    expect(refreshDeveloperPendingQueues).toHaveBeenCalledTimes(1);
  });
});
