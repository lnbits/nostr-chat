import { useMessageBubbleStatus } from 'src/composables/useMessageBubbleStatus';
import type { Message } from 'src/types/chat';
import { describe, expect, it } from 'vitest';
import { computed, ref } from 'vue';

describe('useMessageBubbleStatus', () => {
  it('builds outbound relay status tabs with published success counts', () => {
    const message = ref<Message>({
      id: '1',
      chatId: 'self-chat',
      text: 'hello',
      sender: 'me' as const,
      sentAt: '2026-01-01T00:00:00.000Z',
      authorPublicKey: 'self-chat',
      eventId: 'event-1',
      nostrEvent: {
        direction: 'out' as const,
        event: {
          id: 'event-1',
          kind: 14,
          content: 'hello',
          tags: [],
          pubkey: 'self-chat',
          created_at: 1700000000,
          sig: '',
        },
        relay_statuses: [
          {
            relay_url: 'wss://self.example',
            direction: 'outbound' as const,
            scope: 'recipient' as const,
            status: 'published' as const,
            updated_at: '2026-01-01T00:00:00.000Z',
          },
          {
            relay_url: 'wss://backup.example',
            direction: 'outbound' as const,
            scope: 'recipient' as const,
            status: 'failed' as const,
            detail: 'publish failed',
            updated_at: '2026-01-01T00:00:00.000Z',
          },
          {
            relay_url: 'wss://my.example',
            direction: 'outbound' as const,
            scope: 'self' as const,
            status: 'pending' as const,
            updated_at: '2026-01-01T00:00:00.000Z',
          },
        ],
      },
      meta: {},
    });

    const { statusSections } = useMessageBubbleStatus({
      contactName: computed(() => 'My Self'),
      contactRelayUrls: computed(() => ['wss://self.example']),
      isMine: computed(() => true),
      message,
    });

    expect(statusSections.value).toEqual([
      expect.objectContaining({
        key: 'recipient',
        title: 'Contact Relays',
        tabLabel: 'Contact Relays (1/2)',
        successCount: 1,
        totalCount: 2,
        retryableCount: 1,
      }),
      expect.objectContaining({
        key: 'self',
        title: 'My Relays',
        tabLabel: 'My Relays (0/1)',
        successCount: 0,
        totalCount: 1,
        retryableCount: 0,
      }),
    ]);
  });
});
