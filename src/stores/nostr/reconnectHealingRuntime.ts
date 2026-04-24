import { inputSanitizerService } from 'src/services/inputSanitizerService';
import {
  RECONNECT_HEALING_FOCUS_DELAY_MS,
  RECONNECT_HEALING_MIN_BACKGROUND_MS,
  RECONNECT_HEALING_MIN_INTERVAL_MS,
  RECONNECT_HEALING_ONLINE_DELAY_MS,
  RECONNECT_HEALING_RECENT_DM_CONCURRENCY,
  RECONNECT_HEALING_RECENT_DM_LIMIT,
  RECONNECT_HEALING_RELAY_LIST_CHANGE_DELAY_MS,
  RECONNECT_HEALING_RELAY_RECONNECT_DELAY_MS,
  RECONNECT_HEALING_VISIBILITY_DELAY_MS,
} from 'src/stores/nostr/constants';
import type { ChatType } from 'src/types/chat';
import type { Ref } from 'vue';

export type ReconnectHealingReason =
  | 'browser-online'
  | 'window-focus'
  | 'visibility-regain'
  | 'relay-connected'
  | 'relay-list-changed';

interface RestoreOptions {
  force?: boolean;
}

export interface ReconnectHealingChatTarget {
  id: string;
  publicKey: string;
  type: ChatType;
  epochPublicKey: string | null;
}

interface ReconnectHealingRuntimeDeps {
  getLoggedInPublicKeyHex: () => string | null;
  getVisibleChatTarget: () => ReconnectHealingChatTarget | null;
  isRestoringStartupState: Ref<boolean>;
  listRecentDirectMessageChatTargets: (
    limit: number,
    excludeChatIds?: string[]
  ) => ReconnectHealingChatTarget[];
  queueOutboundMessageReplay: (reason: 'reconnect-healing', delayMs?: number) => void;
  queuePrivateMessagesWatchdog: (delayMs?: number) => void;
  refreshDeveloperPendingQueues: () => Promise<unknown>;
  restoreGroupEpochHistory: (
    groupPublicKey: string,
    epochPublicKey: string,
    options?: RestoreOptions
  ) => Promise<void>;
  restorePrivateMessagesForRecipient: (
    recipientPubkey: string,
    options?: RestoreOptions
  ) => Promise<void>;
  setIsReconnectHealing: (value: boolean) => void;
}

function hasWindow(): boolean {
  return typeof window !== 'undefined';
}

function isBrowserOffline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine === false;
}

function logReconnectHealing(phase: string, details: Record<string, unknown> = {}): void {
  console.log('[nostr-chat][reconnect-healing]', phase, details);
}

function normalizeChatTarget(
  target: ReconnectHealingChatTarget | null | undefined
): ReconnectHealingChatTarget | null {
  if (!target) {
    return null;
  }

  const normalizedId = inputSanitizerService.normalizeHexKey(target.id);
  const normalizedPublicKey = inputSanitizerService.normalizeHexKey(target.publicKey);
  const normalizedEpochPublicKey =
    typeof target.epochPublicKey === 'string'
      ? inputSanitizerService.normalizeHexKey(target.epochPublicKey)
      : null;
  if (!normalizedId || !normalizedPublicKey) {
    return null;
  }

  return {
    id: normalizedId,
    publicKey: normalizedPublicKey,
    type: target.type,
    epochPublicKey: normalizedEpochPublicKey,
  };
}

function getReconnectHealingDelayMs(reason: ReconnectHealingReason): number {
  switch (reason) {
    case 'window-focus':
      return RECONNECT_HEALING_FOCUS_DELAY_MS;
    case 'visibility-regain':
      return RECONNECT_HEALING_VISIBILITY_DELAY_MS;
    case 'relay-connected':
      return RECONNECT_HEALING_RELAY_RECONNECT_DELAY_MS;
    case 'relay-list-changed':
      return RECONNECT_HEALING_RELAY_LIST_CHANGE_DELAY_MS;
    default:
      return RECONNECT_HEALING_ONLINE_DELAY_MS;
  }
}

async function runWithConcurrency<T>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<void>
): Promise<void> {
  const normalizedConcurrency = Math.max(1, Math.floor(concurrency));
  let nextIndex = 0;

  const workers = Array.from(
    { length: Math.min(normalizedConcurrency, items.length) },
    async () => {
      while (nextIndex < items.length) {
        const currentIndex = nextIndex;
        nextIndex += 1;
        await worker(items[currentIndex] as T);
      }
    }
  );

  await Promise.all(workers);
}

export function createReconnectHealingRuntime({
  getLoggedInPublicKeyHex,
  getVisibleChatTarget,
  isRestoringStartupState,
  listRecentDirectMessageChatTargets,
  queueOutboundMessageReplay,
  queuePrivateMessagesWatchdog,
  refreshDeveloperPendingQueues,
  restoreGroupEpochHistory,
  restorePrivateMessagesForRecipient,
  setIsReconnectHealing,
}: ReconnectHealingRuntimeDeps) {
  let reconnectHealingTimeoutId: ReturnType<typeof globalThis.setTimeout> | null = null;
  let reconnectHealingScheduledAt = 0;
  let reconnectHealingRunPromise: Promise<void> | null = null;
  let reconnectHealingQueuedReason: ReconnectHealingReason | null = null;
  let reconnectHealingQueuedDelayMs: number | null = null;
  let reconnectHealingLastStartedAt = 0;
  let reconnectHealingLastBlurAt = 0;
  let reconnectHealingLastHiddenAt = 0;

  function clearReconnectHealingTimer(): void {
    if (reconnectHealingTimeoutId !== null) {
      globalThis.clearTimeout(reconnectHealingTimeoutId);
      reconnectHealingTimeoutId = null;
    }

    reconnectHealingScheduledAt = 0;
  }

  function queueReconnectHealingWhileRunning(
    reason: ReconnectHealingReason,
    delayMs: number
  ): void {
    if (
      reconnectHealingQueuedReason === null ||
      reconnectHealingQueuedDelayMs === null ||
      delayMs < reconnectHealingQueuedDelayMs
    ) {
      reconnectHealingQueuedReason = reason;
      reconnectHealingQueuedDelayMs = delayMs;
    }
  }

  function notifyBrowserOnline(): void {
    if (!getLoggedInPublicKeyHex()) {
      return;
    }

    queueReconnectHealing('browser-online');
  }

  function notifyWindowBlur(): void {
    reconnectHealingLastBlurAt = Date.now();
  }

  function shouldRunAfterBackground(lastBackgroundAt: number): boolean {
    return (
      lastBackgroundAt > 0 && Date.now() - lastBackgroundAt >= RECONNECT_HEALING_MIN_BACKGROUND_MS
    );
  }

  function notifyWindowFocus(): void {
    if (!getLoggedInPublicKeyHex()) {
      return;
    }

    const lastBackgroundAt = Math.max(reconnectHealingLastBlurAt, reconnectHealingLastHiddenAt);
    if (!shouldRunAfterBackground(lastBackgroundAt)) {
      return;
    }

    queueReconnectHealing('window-focus');
  }

  function notifyVisibilityHidden(): void {
    reconnectHealingLastHiddenAt = Date.now();
  }

  function notifyVisibilityRegain(): void {
    if (!getLoggedInPublicKeyHex()) {
      return;
    }

    if (!shouldRunAfterBackground(reconnectHealingLastHiddenAt)) {
      return;
    }

    queueReconnectHealing('visibility-regain');
  }

  function queueReconnectHealing(
    reason: ReconnectHealingReason,
    delayMs = getReconnectHealingDelayMs(reason)
  ): void {
    if (!hasWindow() || !getLoggedInPublicKeyHex()) {
      return;
    }

    const cooldownRemainingMs = Math.max(
      0,
      reconnectHealingLastStartedAt + RECONNECT_HEALING_MIN_INTERVAL_MS - Date.now()
    );
    const normalizedDelayMs = Math.max(0, Math.floor(delayMs), cooldownRemainingMs);

    if (reconnectHealingRunPromise) {
      queueReconnectHealingWhileRunning(reason, normalizedDelayMs);
      return;
    }

    const nextScheduledAt = Date.now() + normalizedDelayMs;
    if (
      reconnectHealingTimeoutId !== null &&
      reconnectHealingScheduledAt > 0 &&
      reconnectHealingScheduledAt <= nextScheduledAt
    ) {
      return;
    }

    clearReconnectHealingTimer();
    reconnectHealingScheduledAt = nextScheduledAt;
    logReconnectHealing('queued', {
      reason,
      delayMs: normalizedDelayMs,
    });
    reconnectHealingTimeoutId = globalThis.setTimeout(() => {
      clearReconnectHealingTimer();
      void runReconnectHealing(reason);
    }, normalizedDelayMs);
  }

  async function runReconnectHealing(reason: ReconnectHealingReason): Promise<void> {
    if (reconnectHealingRunPromise) {
      return reconnectHealingRunPromise;
    }

    reconnectHealingRunPromise = (async () => {
      if (!getLoggedInPublicKeyHex()) {
        return;
      }

      if (isRestoringStartupState.value) {
        logReconnectHealing('skip', {
          reason,
          skipReason: 'startup-restore-in-progress',
        });
        queueReconnectHealingWhileRunning(reason, RECONNECT_HEALING_ONLINE_DELAY_MS);
        return;
      }

      if (isBrowserOffline()) {
        logReconnectHealing('skip', {
          reason,
          skipReason: 'browser-offline',
        });
        return;
      }

      reconnectHealingLastStartedAt = Date.now();
      setIsReconnectHealing(true);
      queuePrivateMessagesWatchdog(0);
      queueOutboundMessageReplay('reconnect-healing', 0);

      const visibleChatTarget = normalizeChatTarget(getVisibleChatTarget());
      const recentDirectMessages = listRecentDirectMessageChatTargets(
        RECONNECT_HEALING_RECENT_DM_LIMIT,
        visibleChatTarget ? [visibleChatTarget.id] : []
      )
        .map((target) => normalizeChatTarget(target))
        .filter((target): target is ReconnectHealingChatTarget =>
          Boolean(target && target.type === 'user')
        );

      const recentDirectMessagesByPubkey = new Set<string>();
      const filteredRecentDirectMessages = recentDirectMessages.filter((target) => {
        if (
          visibleChatTarget?.type === 'user' &&
          visibleChatTarget.publicKey === target.publicKey
        ) {
          return false;
        }

        if (recentDirectMessagesByPubkey.has(target.publicKey)) {
          return false;
        }

        recentDirectMessagesByPubkey.add(target.publicKey);
        return true;
      });

      logReconnectHealing('start', {
        reason,
        visibleChatId: visibleChatTarget?.id ?? null,
        visibleChatType: visibleChatTarget?.type ?? null,
        recentDmChatIds: filteredRecentDirectMessages.map((target) => target.id),
        recentDmCount: filteredRecentDirectMessages.length,
      });

      let restoredVisibleChat = false;
      let restoredVisibleGroupEpoch = false;
      let restoredRecentDirectMessages = 0;

      if (visibleChatTarget?.type === 'user') {
        await restorePrivateMessagesForRecipient(visibleChatTarget.publicKey, {
          force: true,
        });
        restoredVisibleChat = true;
      } else if (visibleChatTarget?.type === 'group') {
        await restorePrivateMessagesForRecipient(visibleChatTarget.publicKey, {
          force: true,
        });
        restoredVisibleChat = true;
        if (visibleChatTarget.epochPublicKey) {
          await restoreGroupEpochHistory(
            visibleChatTarget.publicKey,
            visibleChatTarget.epochPublicKey,
            {
              force: true,
            }
          );
          restoredVisibleGroupEpoch = true;
        }
      }

      await runWithConcurrency(
        filteredRecentDirectMessages,
        RECONNECT_HEALING_RECENT_DM_CONCURRENCY,
        async (target) => {
          await restorePrivateMessagesForRecipient(target.publicKey, {
            force: true,
          });
          restoredRecentDirectMessages += 1;
        }
      );

      const pendingQueueSummary = await refreshDeveloperPendingQueues();
      logReconnectHealing('complete', {
        reason,
        restoredVisibleChat,
        restoredVisibleGroupEpoch,
        restoredRecentDirectMessages,
        pendingQueueSummary,
      });
    })()
      .catch((error) => {
        console.warn('[nostr-chat][reconnect-healing] failed', {
          reason,
          error: error instanceof Error ? error.message : String(error ?? ''),
        });
      })
      .finally(() => {
        setIsReconnectHealing(false);
        reconnectHealingRunPromise = null;

        if (
          reconnectHealingQueuedReason !== null &&
          reconnectHealingQueuedDelayMs !== null &&
          getLoggedInPublicKeyHex()
        ) {
          const nextReason = reconnectHealingQueuedReason;
          const nextDelayMs = reconnectHealingQueuedDelayMs;
          reconnectHealingQueuedReason = null;
          reconnectHealingQueuedDelayMs = null;
          queueReconnectHealing(nextReason, nextDelayMs);
          return;
        }

        reconnectHealingQueuedReason = null;
        reconnectHealingQueuedDelayMs = null;
      });

    return reconnectHealingRunPromise;
  }

  function notifyRelayConnected(): void {
    queueReconnectHealing('relay-connected');
  }

  function notifyRelayListChanged(): void {
    queueReconnectHealing('relay-list-changed');
  }

  function resetReconnectHealingRuntimeState(): void {
    clearReconnectHealingTimer();
    reconnectHealingQueuedReason = null;
    reconnectHealingQueuedDelayMs = null;
    reconnectHealingRunPromise = null;
    reconnectHealingLastStartedAt = 0;
    reconnectHealingLastBlurAt = 0;
    reconnectHealingLastHiddenAt = 0;
    setIsReconnectHealing(false);
  }

  return {
    notifyBrowserOnline,
    notifyRelayConnected,
    notifyRelayListChanged,
    notifyVisibilityHidden,
    notifyVisibilityRegain,
    notifyWindowBlur,
    notifyWindowFocus,
    queueReconnectHealing,
    resetReconnectHealingRuntimeState,
    runReconnectHealing,
  };
}
