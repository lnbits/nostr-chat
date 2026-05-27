import NDK, { NDKEvent, NDKKind } from '@nostr-dev-kit/ndk';
import { describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';

const chatDataServiceMock = vi.hoisted(() => ({
  init: vi.fn(async () => {}),
}));

const contactsServiceMock = vi.hoisted(() => ({
  init: vi.fn(async () => {}),
  listContacts: vi.fn(async () => []),
  getContactByPublicKey: vi.fn(async () => null),
  deleteContact: vi.fn(async () => {}),
}));

vi.mock('src/services/chatDataService', () => ({
  chatDataService: chatDataServiceMock,
}));

vi.mock('src/services/contactsService', () => ({
  contactsService: contactsServiceMock,
}));

import { PRIVATE_CONTACT_LIST_D_TAG } from 'src/stores/nostr/constants';
import { createPrivateContactListRuntime } from 'src/stores/nostr/privateContactListRuntime';

const LOGGED_IN_PUBKEY = 'a'.repeat(64);
const PUBKEY_B = 'b'.repeat(64);
const PUBKEY_C = 'c'.repeat(64);

describe('private contact list runtime', () => {
  it('tracks restored private contact-list entry counts on the startup step', async () => {
    const ndk = new NDK();
    const listEvent = new NDKEvent(ndk, {
      kind: NDKKind.FollowSet,
      pubkey: LOGGED_IN_PUBKEY,
      created_at: 1_700_000_000,
      content: 'encrypted-private-contact-list',
      tags: [['d', PRIVATE_CONTACT_LIST_D_TAG]],
    });
    vi.spyOn(ndk, 'fetchEvent').mockResolvedValue(listEvent);

    const updateStartupStep = vi.fn();
    const completeStartupStep = vi.fn();
    const ensureContactListedInPrivateContactList = vi.fn(async () => ({
      contact: null,
      didChange: true,
    }));

    const runtime = createPrivateContactListRuntime({
      beginStartupStep: vi.fn(),
      bumpContactListVersion: vi.fn(),
      buildPrivateContactListTags: vi.fn(() => []),
      buildSubscriptionEventDetails: vi.fn(() => ({})),
      buildSubscriptionRelayDetails: vi.fn(() => ({})),
      chatStore: { init: vi.fn(async () => {}) },
      completeStartupStep,
      createStartupBatchTracker: vi.fn(() => ({
        beginItem: vi.fn(),
        finishItem: vi.fn(),
        seal: vi.fn(),
      })),
      decryptPrivateContactListContent: vi.fn(async () => [LOGGED_IN_PUBKEY, PUBKEY_B, PUBKEY_C]),
      encryptPrivateContactListTags: vi.fn(async () => ''),
      ensureContactListedInPrivateContactList,
      ensureRelayConnections: vi.fn(async () => {}),
      extractRelayUrlsFromEvent: vi.fn(() => []),
      failStartupStep: vi.fn(),
      formatSubscriptionLogValue: vi.fn((value) => value ?? null),
      getFilterSince: vi.fn(() => 1_600_000_000),
      getLoggedInPublicKeyHex: vi.fn(() => LOGGED_IN_PUBKEY),
      getLoggedInSignerUser: vi.fn(async () => ({ pubkey: LOGGED_IN_PUBKEY }) as never),
      getStartupStepSnapshot: vi.fn(() => ({ status: 'in_progress' })),
      isRestoringStartupState: ref(true),
      logSubscription: vi.fn(),
      markPrivateContactListEventApplied: vi.fn(),
      ndk,
      queueTrackedContactSubscriptionsRefresh: vi.fn(),
      reconcileAcceptedChatFromPrivateContactList: vi.fn(async () => {}),
      refreshContactByPublicKey: vi.fn(async () => {}),
      relaySignature: vi.fn((relays) => relays.join(',')),
      resolvePrivateContactListPublishRelayUrls: vi.fn(async () => ['wss://relay.example/']),
      resolvePrivateContactListReadRelayUrls: vi.fn(async () => ['wss://relay.example/']),
      shouldApplyPrivateContactListEvent: vi.fn(() => true),
      subscribeWithReqLogging: vi.fn(() => ({ stop: vi.fn() }) as never),
      updateStoredEventSinceFromCreatedAt: vi.fn(),
      updateStartupStep,
    });

    await runtime.restorePrivateContactList();

    expect(updateStartupStep).toHaveBeenCalledWith('private-contact-list-restore', {
      eventCount: 0,
    });
    expect(updateStartupStep).toHaveBeenLastCalledWith('private-contact-list-restore', {
      eventCount: 2,
    });
    expect(ensureContactListedInPrivateContactList).toHaveBeenCalledTimes(2);
    expect(ensureContactListedInPrivateContactList).toHaveBeenCalledWith(PUBKEY_B, {
      fallbackName: PUBKEY_B.slice(0, 16),
    });
    expect(ensureContactListedInPrivateContactList).toHaveBeenCalledWith(PUBKEY_C, {
      fallbackName: PUBKEY_C.slice(0, 16),
    });
    expect(completeStartupStep).toHaveBeenCalledWith('private-contact-list');
  });
});
