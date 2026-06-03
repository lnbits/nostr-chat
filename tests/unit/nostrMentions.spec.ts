import { nip19 } from '@nostr-dev-kit/ndk';
import {
  buildMentionMetadata,
  buildMentionProfiles,
  buildNostrMentionTextParts,
  formatNostrMentionsForDisplay,
  parseNostrMentions,
  serializeMentionDraft,
} from 'src/utils/nostrMentions';
import { describe, expect, it } from 'vitest';

const ALICE_PUBKEY = 'a'.repeat(64);
const BOB_PUBKEY = 'b'.repeat(64);
const CAROL_PUBKEY = 'c'.repeat(64);

describe('nostr mention utilities', () => {
  it('serializes group member handles to NIP-27 nprofile links', () => {
    const [aliceProfile] = buildMentionProfiles([
      {
        publicKey: ALICE_PUBKEY,
        displayName: 'Alice',
        picture: ' https://example.com/alice.png ',
        avatar: ' AL ',
        relayUrls: [' wss://relay.example ', 'wss://relay.example'],
      },
    ]);

    expect(aliceProfile).toMatchObject({
      publicKey: ALICE_PUBKEY,
      displayName: 'Alice',
      handle: 'Alice',
      picture: 'https://example.com/alice.png',
      avatar: 'AL',
      relayUrls: ['wss://relay.example'],
    });

    const serialized = serializeMentionDraft('hello @Alice', [aliceProfile]);
    expect(serialized).toMatch(/^hello nostr:nprofile/u);

    const [mention] = parseNostrMentions(serialized);
    expect(mention).toMatchObject({
      publicKey: ALICE_PUBKEY,
      relayUrls: ['wss://relay.example'],
    });
  });

  it('dedupes parsed mentions and flags mentions of the logged-in user', () => {
    const nprofile = nip19.nprofileEncode({
      pubkey: BOB_PUBKEY,
      relays: ['wss://group.example'],
    });
    const npub = nip19.npubEncode(BOB_PUBKEY);

    expect(buildMentionMetadata(`hi nostr:${nprofile} and nostr:${npub}`, BOB_PUBKEY)).toEqual({
      mentions: [
        {
          publicKey: BOB_PUBKEY,
          relayUrls: ['wss://group.example'],
          nprofile,
        },
      ],
      mentions_me: true,
    });
  });

  it('builds text parts and display text for rendered mentions', () => {
    const npub = nip19.npubEncode(CAROL_PUBKEY);
    const text = `hi nostr:${npub}!`;
    const profiles = buildMentionProfiles([
      {
        publicKey: CAROL_PUBKEY,
        displayName: 'Carol',
      },
    ]);

    expect(formatNostrMentionsForDisplay(text, profiles)).toBe('hi @Carol!');
    expect(buildNostrMentionTextParts(text, profiles)).toEqual([
      {
        type: 'text',
        key: 'text-0-0',
        text: 'hi ',
      },
      {
        type: 'mention',
        key: `mention-0-${CAROL_PUBKEY}-3`,
        text: '@Carol',
        publicKey: CAROL_PUBKEY,
      },
      {
        type: 'text',
        key: `text-tail-${3 + `nostr:${npub}`.length}`,
        text: '!',
      },
    ]);
  });

  it('ignores nprofile values that do not match the provided public key', () => {
    const mismatchedNprofile = nip19.nprofileEncode({
      pubkey: BOB_PUBKEY,
      relays: ['wss://wrong.example'],
    });
    const [profile] = buildMentionProfiles([
      {
        publicKey: ALICE_PUBKEY,
        displayName: 'Alice',
        nprofile: mismatchedNprofile,
      },
    ]);

    expect(profile).toMatchObject({
      publicKey: ALICE_PUBKEY,
      handle: 'Alice',
    });
    expect(profile.nprofile).toBeUndefined();
    expect(profile.relayUrls).toBeUndefined();
  });
});
