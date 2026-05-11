import { describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';

const chatDataServiceMock = vi.hoisted(() => ({
  init: vi.fn(async () => {}),
  listChats: vi.fn(async () => []),
}));

const contactsServiceMock = vi.hoisted(() => ({
  init: vi.fn(async () => {}),
  listContacts: vi.fn(async () => []),
  getContactByPublicKey: vi.fn(async () => null),
}));

vi.mock('src/services/chatDataService', () => ({
  chatDataService: chatDataServiceMock,
}));

vi.mock('src/services/contactsService', () => ({
  contactsService: contactsServiceMock,
}));

import { PRIVATE_MESSAGES_STARTUP_RESTORE_THROTTLE_MS } from 'src/stores/nostr/constants';
import { createStartupContactSyncRuntime } from 'src/stores/nostr/startupContactSyncRuntime';

const PUBKEY = 'a'.repeat(64);

describe('startup contact sync runtime', () => {
  it('runs startup restore tasks in dependency order', async () => {
    const taskOrder: string[] = [];
    let restoreStartupStatePromise: Promise<void> | null = null;
    let syncLoggedInContactProfilePromise: Promise<void> | null = null;
    let syncRecentChatContactsPromise: Promise<void> | null = null;

    const task = (label: string) =>
      vi.fn(async () => {
        taskOrder.push(label);
      });
    const subscribePrivateMessagesForLoggedInUser = task('private-messages-subscribe');
    const refreshContactByPublicKey = vi.fn(async () => {
      taskOrder.push('logged-in-contact-profile');
    });

    chatDataServiceMock.listChats.mockImplementationOnce(async () => {
      taskOrder.push('recent-chat-contacts-sync');
      return [];
    });

    const runtime = createStartupContactSyncRuntime({
      applyContactCursorStateToContact: vi.fn(async () => false),
      bumpContactListVersion: vi.fn(),
      createStartupBatchTracker: vi.fn(() => ({
        beginItem: vi.fn(),
        finishItem: vi.fn(),
        seal: vi.fn(),
      })),
      deriveContactCursorDTag: vi.fn(async () => null),
      ensureRelayConnections: vi.fn(async () => {}),
      ensureStoredEventSince: vi.fn(),
      fetchContactCursorEvents: vi.fn(async () => new Map()),
      flushPendingEventSinceUpdate: vi.fn(),
      getLoggedInPublicKeyHex: vi.fn(() => PUBKEY),
      getRestoreStartupStatePromise: () => restoreStartupStatePromise,
      getSyncLoggedInContactProfilePromise: () => syncLoggedInContactProfilePromise,
      getSyncRecentChatContactsPromise: () => syncRecentChatContactsPromise,
      isRestoringStartupState: ref(false),
      readPrivatePreferencesFromStorage: vi.fn(() => null),
      reloadChats: vi.fn(async () => {}),
      refreshContactByPublicKey,
      refreshGroupRelayListsOnStartup: task('group-relay-lists-refresh'),
      resetStartupStepTracking: vi.fn(),
      restoreContactCursorState: task('contact-cursor-state'),
      restoreGroupIdentitySecrets: task('group-identity-secrets'),
      restoreMyRelayList: task('my-relays-restore'),
      restorePrivateContactList: task('private-contact-list-restore'),
      restorePrivatePreferences: task('private-preferences'),
      startOutboundMessageReplay: task('outbound-message-replay'),
      setRestoreStartupStatePromise: (promise) => {
        restoreStartupStatePromise = promise;
      },
      setSyncLoggedInContactProfilePromise: (promise) => {
        syncLoggedInContactProfilePromise = promise;
      },
      setSyncRecentChatContactsPromise: (promise) => {
        syncRecentChatContactsPromise = promise;
      },
      subscribeContactProfileUpdates: task('contact-profile-subscribe'),
      subscribeContactRelayListUpdates: task('contact-relay-list-subscribe'),
      subscribeGroupMembershipRosterUpdates: task('group-rosters-subscribe'),
      subscribeMyRelayListUpdates: task('my-relays-subscribe'),
      subscribePrivateContactListUpdates: task('private-contact-list-subscribe'),
      subscribePrivateMessagesForLoggedInUser,
    });

    await runtime.restoreStartupState();

    expect(taskOrder).toEqual([
      'my-relays-restore',
      'my-relays-subscribe',
      'outbound-message-replay',
      'private-preferences',
      'private-contact-list-restore',
      'group-identity-secrets',
      'group-relay-lists-refresh',
      'contact-cursor-state',
      'logged-in-contact-profile',
      'recent-chat-contacts-sync',
      'private-contact-list-subscribe',
      'private-messages-subscribe',
      'group-rosters-subscribe',
      'contact-profile-subscribe',
      'contact-relay-list-subscribe',
    ]);
    expect(subscribePrivateMessagesForLoggedInUser).toHaveBeenCalledWith(true, {
      restoreThrottleMs: PRIVATE_MESSAGES_STARTUP_RESTORE_THROTTLE_MS,
      startupTrackStep: true,
    });
  });
});
