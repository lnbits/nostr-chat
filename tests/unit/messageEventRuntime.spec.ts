import NDK, { NDKKind } from '@nostr-dev-kit/ndk';
import { MESSAGE_BACKREF_LIMIT, MESSAGE_BACKREF_TAG_NAME } from 'src/stores/nostr/constants';
import { createMessageEventRuntime } from 'src/stores/nostr/messageEventRuntime';
import { describe, expect, it, vi } from 'vitest';

function createRuntime() {
  return createMessageEventRuntime({
    decryptPrivateStringContent: vi.fn(),
    derivePublicKeyFromPrivateKey: vi.fn(() => null),
    findGroupChatEpochContextByRecipientPubkey: vi.fn().mockResolvedValue(null),
    getOrCreateSigner: vi.fn(),
    ndk: new NDK(),
    readEpochNumberTag: vi.fn(() => null),
    readFirstTagValue: vi.fn(() => null),
  });
}

describe('messageEventRuntime', () => {
  it('keeps message backrefs inside the private direct-message rumor tags', () => {
    const runtime = createRuntime();
    const event = runtime.createDirectMessageRumorEvent(
      'a'.repeat(64),
      'b'.repeat(64),
      'hello',
      1760000000,
      ` ${'c'.repeat(64)} `,
      [
        ` ${'d'.repeat(64)} `,
        'D'.repeat(64),
        ...Array.from({ length: MESSAGE_BACKREF_LIMIT + 2 }, (_, index) =>
          (index + 1).toString(16).repeat(64).slice(0, 64)
        ),
      ]
    );

    expect(event.kind).toBe(NDKKind.PrivateDirectMessage);
    expect(event.tags[0]).toEqual(['p', 'b'.repeat(64)]);
    expect(event.tags).toContainEqual(['e', 'c'.repeat(64), '', 'reply']);
    expect(event.getMatchingTags(MESSAGE_BACKREF_TAG_NAME)).toEqual(
      [
        'd'.repeat(64),
        ...Array.from({ length: MESSAGE_BACKREF_LIMIT - 1 }, (_, index) =>
          (index + 1).toString(16).repeat(64).slice(0, 64)
        ),
      ].map((eventId) => [MESSAGE_BACKREF_TAG_NAME, eventId])
    );
  });
});
