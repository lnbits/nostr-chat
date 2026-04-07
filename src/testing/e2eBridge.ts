import { inputSanitizerService } from 'src/services/inputSanitizerService';
import { saveBrowserNotificationsPreference } from 'src/utils/browserNotificationPreference';

export interface AppE2EBootstrapOptions {
  privateKey: string;
  relayUrls: string[];
  developerDiagnosticsEnabled?: boolean;
}

export interface AppE2ERefreshOptions {
  chatId?: string | null;
}

export interface AppE2ESessionSnapshot {
  publicKey: string;
  npub: string | null;
  relayUrls: string[];
}

export interface AppE2EBridge {
  bootstrapSession(options: AppE2EBootstrapOptions): Promise<AppE2ESessionSnapshot>;
  refreshSession(options?: AppE2ERefreshOptions): Promise<void>;
}

const WINDOW_BRIDGE_KEY = '__appE2E__';

function normalizeRelayUrls(relayUrls: string[]): string[] {
  return inputSanitizerService
    .normalizeRelayEntriesFromUrls(relayUrls)
    .map((entry) => entry.url);
}

async function bootstrapSession(
  options: AppE2EBootstrapOptions
): Promise<AppE2ESessionSnapshot> {
  const privateKey = options.privateKey.trim();
  const relayUrls = normalizeRelayUrls(options.relayUrls);

  if (!privateKey) {
    throw new Error('A private key is required for e2e bootstrap.');
  }

  if (relayUrls.length === 0) {
    throw new Error('At least one relay URL is required for e2e bootstrap.');
  }

  const relayEntries = inputSanitizerService.normalizeRelayEntriesFromUrls(relayUrls);
  const [
    { useNostrStore },
    { useRelayStore },
    { useNip65RelayStore },
    { useChatStore },
    { useMessageStore }
  ] = await Promise.all([
    import('src/stores/nostrStore'),
    import('src/stores/relayStore'),
    import('src/stores/nip65RelayStore'),
    import('src/stores/chatStore'),
    import('src/stores/messageStore')
  ]);

  const nostrStore = useNostrStore();
  const relayStore = useRelayStore();
  const nip65RelayStore = useNip65RelayStore();
  const chatStore = useChatStore();
  const messageStore = useMessageStore();

  relayStore.init();
  relayStore.replaceRelayEntries(relayEntries);

  nip65RelayStore.init();
  nip65RelayStore.replaceRelayEntries(relayEntries);

  saveBrowserNotificationsPreference(false);

  if (typeof options.developerDiagnosticsEnabled === 'boolean') {
    nostrStore.setDeveloperDiagnosticsEnabled(options.developerDiagnosticsEnabled);
  }

  const validation = nostrStore.savePrivateKey(privateKey);
  if (!validation.isValid) {
    throw new Error('Invalid private key supplied for e2e bootstrap.');
  }

  await nostrStore.updateLoggedInUserRelayList(relayEntries);
  await nostrStore.publishMyRelayList(relayEntries, relayUrls);
  await nostrStore.restoreStartupState(relayUrls);
  await Promise.all([chatStore.init(), messageStore.init()]);
  await Promise.all([chatStore.reload(), messageStore.reloadLoadedMessages()]);

  const publicKey = nostrStore.getLoggedInPublicKeyHex();
  if (!publicKey) {
    throw new Error('Failed to restore the logged-in public key.');
  }

  return {
    publicKey,
    npub: nostrStore.encodeNpub(publicKey),
    relayUrls
  };
}

async function refreshSession(options: AppE2ERefreshOptions = {}): Promise<void> {
  const [
    { useNostrStore },
    { useRelayStore },
    { useChatStore },
    { useMessageStore }
  ] = await Promise.all([
    import('src/stores/nostrStore'),
    import('src/stores/relayStore'),
    import('src/stores/chatStore'),
    import('src/stores/messageStore')
  ]);

  const nostrStore = useNostrStore();
  const relayStore = useRelayStore();
  const chatStore = useChatStore();
  const messageStore = useMessageStore();

  relayStore.init();

  await Promise.all([chatStore.init(), messageStore.init()]);
  await nostrStore.subscribePrivateMessagesForLoggedInUser(true);
  await chatStore.reload();

  const normalizedChatId =
    typeof options.chatId === 'string' ? options.chatId.trim().toLowerCase() : '';

  if (normalizedChatId) {
    await messageStore.loadMessages(normalizedChatId, true);
    return;
  }

  await messageStore.reloadLoadedMessages();
}

export function installAppE2EBridge(): void {
  if (typeof window === 'undefined') {
    return;
  }

  const bridge: AppE2EBridge = {
    bootstrapSession,
    refreshSession
  };

  Object.defineProperty(window, WINDOW_BRIDGE_KEY, {
    configurable: true,
    value: bridge
  });
}
