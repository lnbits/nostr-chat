import { inputSanitizerService } from 'src/services/inputSanitizerService';

export const FOREGROUND_MESSAGE_ACTIVITY_EVENT = 'nostr-chat:foreground-message-activity';

export interface ForegroundMessageActivityDetail {
  chatPubkey: string;
  title: string;
  showBanner: boolean;
}

function normalizeTitle(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

export function emitForegroundMessageActivity(input: {
  chatPubkey: string;
  title: string;
  showBanner: boolean;
}): void {
  if (
    typeof window === 'undefined' ||
    typeof window.dispatchEvent !== 'function' ||
    typeof CustomEvent !== 'function'
  ) {
    return;
  }

  const chatPubkey = inputSanitizerService.normalizeHexKey(input.chatPubkey);
  if (!chatPubkey) {
    return;
  }

  window.dispatchEvent(
    new CustomEvent<ForegroundMessageActivityDetail>(FOREGROUND_MESSAGE_ACTIVITY_EVENT, {
      detail: {
        chatPubkey,
        title: normalizeTitle(input.title),
        showBanner: Boolean(input.showBanner),
      },
    })
  );
}

export function readForegroundMessageActivityDetail(
  event: Event
): ForegroundMessageActivityDetail | null {
  if (
    typeof CustomEvent === 'undefined' ||
    !(event instanceof CustomEvent) ||
    event.type !== FOREGROUND_MESSAGE_ACTIVITY_EVENT
  ) {
    return null;
  }

  const value = event.detail;
  if (typeof value !== 'object' || value === null) {
    return null;
  }

  const chatPubkey = inputSanitizerService.normalizeHexKey(
    'chatPubkey' in value ? String(value.chatPubkey) : ''
  );
  if (!chatPubkey) {
    return null;
  }

  return {
    chatPubkey,
    title: normalizeTitle('title' in value ? String(value.title) : ''),
    showBanner: 'showBanner' in value ? Boolean(value.showBanner) : false,
  };
}
