import NDK, {
  NDKEvent,
  NDKRelaySet,
  NDKSubscriptionCacheUsage,
  type NDKUser,
  type NostrEvent,
} from '@nostr-dev-kit/ndk';
import { type ChatRow, chatDataService } from 'src/services/chatDataService';
import { contactsService } from 'src/services/contactsService';
import { inputSanitizerService } from 'src/services/inputSanitizerService';
import { MUTE_LIST_KIND } from 'src/stores/nostr/constants';
import type { ContactMetadata, ContactRecord } from 'src/types/contact';

interface MuteListRuntimeDeps {
  beginStartupStep: (stepId: 'mute-list') => void;
  buildMuteListTags: (pubkeys: string[]) => string[][];
  bumpContactListVersion: () => void;
  chatStore: { reload: () => Promise<void> };
  completeStartupStep: (stepId: 'mute-list') => void;
  decryptMuteListContent: (content: string) => Promise<string[]>;
  encryptMuteListTags: (tags: string[][]) => Promise<string>;
  ensureRelayConnections: (relayUrls: string[]) => Promise<void>;
  failStartupStep: (stepId: 'mute-list', error: unknown) => void;
  getLoggedInPublicKeyHex: () => string | null;
  getLoggedInSignerUser: () => Promise<NDKUser>;
  ndk: NDK;
  resolveLoggedInPublishRelayUrls: (seedRelayUrls?: string[]) => Promise<string[]>;
  resolveLoggedInReadRelayUrls: (seedRelayUrls?: string[]) => Promise<string[]>;
  updateStartupInternalTask: (
    parentStepId: 'contact-cursor-state',
    taskId: 'mute-list',
    updates: { eventCount?: number | null }
  ) => void;
  updateStoredEventSinceFromCreatedAt: (value: unknown) => void;
}

function normalizeMutedPubkeys(pubkeys: string[], loggedInPubkeyHex: string | null): string[] {
  const normalizedPubkeys = pubkeys
    .map((pubkey) => inputSanitizerService.normalizeHexKey(pubkey))
    .filter((pubkey): pubkey is string => Boolean(pubkey) && pubkey !== loggedInPubkeyHex);

  return normalizedPubkeys
    .filter((pubkey, index, list) => list.indexOf(pubkey) === index)
    .sort((first, second) => first.localeCompare(second));
}

function normalizeMuteTargetPubkey(
  pubkey: string,
  loggedInPubkeyHex: string | null
): string | null {
  const normalizedPubkey = inputSanitizerService.normalizeHexKey(pubkey);
  if (!normalizedPubkey || normalizedPubkey === loggedInPubkeyHex) {
    return null;
  }

  return normalizedPubkey;
}

function isMutedMeta(meta: { muted?: unknown } | null | undefined): boolean {
  return meta?.muted === true;
}

function buildMutedMeta<TMeta extends { muted?: unknown }>(meta: TMeta, muted: boolean): TMeta {
  const nextMeta = { ...meta };
  if (muted) {
    nextMeta.muted = true;
    return nextMeta;
  }

  delete nextMeta.muted;
  return nextMeta;
}

function normalizeContactMeta(meta: ContactRecord['meta'] | undefined): ContactMetadata {
  return meta && typeof meta === 'object' && !Array.isArray(meta) ? { ...meta } : {};
}

function normalizeChatMeta(meta: ChatRow['meta'] | undefined): Record<string, unknown> {
  return meta && typeof meta === 'object' && !Array.isArray(meta) ? { ...meta } : {};
}

function eventToNdkEvent(ndk: NDK, event: NDKEvent | NostrEvent): NDKEvent {
  return event instanceof NDKEvent ? event : new NDKEvent(ndk, event);
}

export function createMuteListRuntime({
  beginStartupStep,
  buildMuteListTags,
  bumpContactListVersion,
  chatStore,
  completeStartupStep,
  decryptMuteListContent,
  encryptMuteListTags,
  ensureRelayConnections,
  failStartupStep,
  getLoggedInPublicKeyHex,
  getLoggedInSignerUser,
  ndk,
  resolveLoggedInPublishRelayUrls,
  resolveLoggedInReadRelayUrls,
  updateStartupInternalTask,
  updateStoredEventSinceFromCreatedAt,
}: MuteListRuntimeDeps) {
  let restoreMuteListPromise: Promise<void> | null = null;
  let muteListMutationQueue = Promise.resolve();
  let mutedPubkeySet = new Set<string>();
  let hasRestoredMuteList = false;

  function isPubkeyMuted(pubkey: string): boolean {
    const normalizedPubkey = inputSanitizerService.normalizeHexKey(pubkey);
    return normalizedPubkey ? mutedPubkeySet.has(normalizedPubkey) : false;
  }

  function updateMuteListStartupEntryCount(entryCount: number): void {
    updateStartupInternalTask('contact-cursor-state', 'mute-list', {
      eventCount: Math.max(0, Math.floor(entryCount)),
    });
  }

  async function applyMuteListPubkeys(pubkeys: string[]): Promise<void> {
    const loggedInPubkeyHex = getLoggedInPublicKeyHex();
    const mutedPubkeys = normalizeMutedPubkeys(pubkeys, loggedInPubkeyHex);
    const nextMutedPubkeySet = new Set(mutedPubkeys);
    let didChangeContacts = false;
    let didChangeChats = false;

    await Promise.all([contactsService.init(), chatDataService.init()]);
    const [contacts, chats] = await Promise.all([
      contactsService.listContacts(),
      chatDataService.listChats(),
    ]);

    for (const contact of contacts) {
      const normalizedPubkey = normalizeMuteTargetPubkey(contact.public_key, loggedInPubkeyHex);
      if (!normalizedPubkey) {
        continue;
      }

      const shouldMute = nextMutedPubkeySet.has(normalizedPubkey);
      const contactMeta = normalizeContactMeta(contact.meta);
      if (isMutedMeta(contactMeta) === shouldMute) {
        continue;
      }

      await contactsService.updateContact(contact.id, {
        meta: buildMutedMeta(contactMeta, shouldMute),
      });
      didChangeContacts = true;
    }

    for (const chat of chats) {
      const normalizedPubkey = normalizeMuteTargetPubkey(chat.public_key, loggedInPubkeyHex);
      if (!normalizedPubkey) {
        continue;
      }

      const shouldMute = nextMutedPubkeySet.has(normalizedPubkey);
      const chatMeta = normalizeChatMeta(chat.meta);
      if (isMutedMeta(chatMeta) === shouldMute) {
        continue;
      }

      await chatDataService.updateChatMeta(chat.public_key, buildMutedMeta(chatMeta, shouldMute));
      didChangeChats = true;
    }

    mutedPubkeySet = nextMutedPubkeySet;

    if (didChangeContacts) {
      bumpContactListVersion();
    }

    if (didChangeChats) {
      await chatStore.reload();
    }
  }

  async function fetchMuteListPubkeys(seedRelayUrls: string[] = []): Promise<string[] | null> {
    const loggedInPubkeyHex = getLoggedInPublicKeyHex();
    if (!loggedInPubkeyHex) {
      return null;
    }

    const relayUrls = await resolveLoggedInReadRelayUrls(seedRelayUrls);
    if (relayUrls.length === 0) {
      return null;
    }

    await ensureRelayConnections(relayUrls);
    await getLoggedInSignerUser();

    const relaySet = NDKRelaySet.fromRelayUrls(relayUrls, ndk, false);
    const fetchedEvent = await ndk.fetchEvent(
      {
        kinds: [MUTE_LIST_KIND],
        authors: [loggedInPubkeyHex],
      },
      {
        cacheUsage: NDKSubscriptionCacheUsage.ONLY_RELAY,
      },
      relaySet
    );
    if (!fetchedEvent) {
      return [];
    }

    const muteListEvent = eventToNdkEvent(ndk, fetchedEvent);
    updateStoredEventSinceFromCreatedAt(muteListEvent.created_at);
    return decryptMuteListContent(muteListEvent.content);
  }

  async function restoreMuteList(seedRelayUrls: string[] = []): Promise<void> {
    if (restoreMuteListPromise) {
      return restoreMuteListPromise;
    }

    beginStartupStep('mute-list');
    restoreMuteListPromise = (async () => {
      try {
        const pubkeys = await fetchMuteListPubkeys(seedRelayUrls);
        if (pubkeys !== null) {
          updateMuteListStartupEntryCount(
            normalizeMutedPubkeys(pubkeys, getLoggedInPublicKeyHex()).length
          );
          await applyMuteListPubkeys(pubkeys);
          hasRestoredMuteList = true;
        }

        completeStartupStep('mute-list');
      } catch (error) {
        failStartupStep('mute-list', error);
        throw error;
      }
    })().finally(() => {
      restoreMuteListPromise = null;
    });

    return restoreMuteListPromise;
  }

  async function publishMuteList(seedRelayUrls: string[] = []): Promise<void> {
    const loggedInPubkeyHex = getLoggedInPublicKeyHex();
    if (!loggedInPubkeyHex) {
      throw new Error('Missing public key in localStorage. Login is required.');
    }

    const relayUrls = await resolveLoggedInPublishRelayUrls(seedRelayUrls);
    if (relayUrls.length === 0) {
      throw new Error('Cannot publish mute list without at least one relay.');
    }

    await ensureRelayConnections(relayUrls);
    const user = await getLoggedInSignerUser();
    const pubkeys = normalizeMutedPubkeys(Array.from(mutedPubkeySet), loggedInPubkeyHex);
    const muteListEvent = new NDKEvent(ndk, {
      kind: MUTE_LIST_KIND,
      created_at: Math.floor(Date.now() / 1000),
      pubkey: user.pubkey,
      content: await encryptMuteListTags(buildMuteListTags(pubkeys)),
      tags: [],
    });

    const relaySet = NDKRelaySet.fromRelayUrls(relayUrls, ndk, false);
    await muteListEvent.publishReplaceable(relaySet);
    updateStoredEventSinceFromCreatedAt(muteListEvent.created_at);
    hasRestoredMuteList = true;
  }

  async function setPubkeyMuted(
    pubkey: string,
    muted: boolean,
    seedRelayUrls: string[] = []
  ): Promise<void> {
    const mutation = muteListMutationQueue.then(async () => {
      if (!hasRestoredMuteList) {
        await restoreMuteList(seedRelayUrls);
      }

      const loggedInPubkeyHex = getLoggedInPublicKeyHex();
      const normalizedPubkey = normalizeMuteTargetPubkey(pubkey, loggedInPubkeyHex);
      if (!normalizedPubkey) {
        return;
      }

      const nextPubkeys = new Set(mutedPubkeySet);
      if (muted) {
        nextPubkeys.add(normalizedPubkey);
      } else {
        nextPubkeys.delete(normalizedPubkey);
      }

      if (nextPubkeys.size === mutedPubkeySet.size && nextPubkeys.has(normalizedPubkey) === muted) {
        return;
      }

      await applyMuteListPubkeys(Array.from(nextPubkeys));
      await publishMuteList(seedRelayUrls);
    });

    muteListMutationQueue = mutation.catch(() => undefined);
    return mutation;
  }

  function resetMuteListRuntimeState(): void {
    restoreMuteListPromise = null;
    muteListMutationQueue = Promise.resolve();
    mutedPubkeySet = new Set<string>();
    hasRestoredMuteList = false;
  }

  return {
    applyMuteListPubkeys,
    isPubkeyMuted,
    publishMuteList,
    resetMuteListRuntimeState,
    restoreMuteList,
    setPubkeyMuted,
  };
}
