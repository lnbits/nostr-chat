import { describe, expect, it } from 'vitest';
import { __nostrStoreTestUtils } from 'src/stores/nostrStore';

const {
  findConflictingKnownGroupEpochNumber,
  findHigherKnownGroupEpochConflict,
  normalizeChatGroupEpochKeys,
  resolveCurrentGroupChatEpochEntry,
  resolveGroupChatEpochEntries,
  resolveIncomingChatInboxState
} = __nostrStoreTestUtils;

const EPOCH_KEY_A = 'a'.repeat(64);
const EPOCH_KEY_B = 'b'.repeat(64);
const EPOCH_KEY_C = 'c'.repeat(64);

describe('nostrStore logic', () => {
  it('normalizes group epoch entries, filters invalid rows, and sorts descending', () => {
    expect(
      normalizeChatGroupEpochKeys([
        {
          epoch_number: 1,
          epoch_public_key: EPOCH_KEY_A.toUpperCase(),
          epoch_private_key_encrypted: 'enc-1'
        },
        {
          epoch_number: 0,
          epoch_public_key: EPOCH_KEY_B,
          epoch_private_key_encrypted: 'enc-0'
        },
        {
          epoch_number: 1,
          epoch_public_key: EPOCH_KEY_C,
          epoch_private_key_encrypted: 'enc-1b',
          invitation_created_at: '2026-01-03T00:00:00.000Z'
        },
        {
          epoch_number: -1,
          epoch_public_key: EPOCH_KEY_A,
          epoch_private_key_encrypted: 'bad'
        }
      ])
    ).toEqual([
      {
        epoch_number: 1,
        epoch_public_key: EPOCH_KEY_C,
        epoch_private_key_encrypted: 'enc-1b',
        invitation_created_at: '2026-01-03T00:00:00.000Z'
      },
      {
        epoch_number: 0,
        epoch_public_key: EPOCH_KEY_B,
        epoch_private_key_encrypted: 'enc-0'
      }
    ]);
  });

  it('resolves epoch history and prefers the explicitly current epoch key', () => {
    const groupChat = {
      type: 'group',
      meta: {
        group_epoch_keys: [
          {
            epoch_number: 2,
            epoch_public_key: EPOCH_KEY_C,
            epoch_private_key_encrypted: 'enc-2'
          },
          {
            epoch_number: 1,
            epoch_public_key: EPOCH_KEY_B,
            epoch_private_key_encrypted: 'enc-1'
          }
        ],
        current_epoch_public_key: EPOCH_KEY_B
      }
    };

    expect(resolveGroupChatEpochEntries(groupChat as never).map((entry) => entry.epoch_number)).toEqual([
      2,
      1
    ]);
    expect(resolveCurrentGroupChatEpochEntry(groupChat as never)).toMatchObject({
      epoch_number: 1,
      epoch_public_key: EPOCH_KEY_B
    });
  });

  it('detects a higher known epoch conflict and reports the older applicable higher epoch', () => {
    const conflict = findHigherKnownGroupEpochConflict(
      {
        type: 'group',
        meta: {
          group_epoch_keys: [
            {
              epoch_number: 2,
              epoch_public_key: EPOCH_KEY_C,
              epoch_private_key_encrypted: 'enc-2',
              invitation_created_at: '2026-01-04T00:00:00.000Z'
            },
            {
              epoch_number: 1,
              epoch_public_key: EPOCH_KEY_B,
              epoch_private_key_encrypted: 'enc-1',
              invitation_created_at: '2026-01-02T00:00:00.000Z'
            }
          ]
        }
      } as never,
      0,
      '2026-01-03T00:00:00.000Z'
    );

    expect(conflict).toMatchObject({
      higherEpochEntry: {
        epoch_number: 2,
        epoch_public_key: EPOCH_KEY_C
      },
      olderHigherEpochEntry: {
        epoch_number: 1,
        epoch_public_key: EPOCH_KEY_B
      }
    });
  });

  it('detects conflicting epoch public keys for the same epoch number', () => {
    expect(
      findConflictingKnownGroupEpochNumber(
        {
          type: 'group',
          meta: {
            group_epoch_keys: [
              {
                epoch_number: 3,
                epoch_public_key: EPOCH_KEY_A,
                epoch_private_key_encrypted: 'enc-3'
              }
            ]
          }
        } as never,
        3,
        EPOCH_KEY_B
      )
    ).toMatchObject({
      epoch_number: 3,
      epoch_public_key: EPOCH_KEY_A
    });
  });

  it('keeps blocked first-contact chats blocked forever unless the chat is explicitly accepted', () => {
    expect(
      resolveIncomingChatInboxState({
        chat: {
          meta: {
            inbox_state: 'blocked'
          }
        } as never,
        isAcceptedContact: false
      })
    ).toBe('blocked');

    expect(
      resolveIncomingChatInboxState({
        chat: {
          meta: {
            accepted_at: '2026-01-02T00:00:00.000Z'
          }
        } as never,
        isAcceptedContact: false
      })
    ).toBe('accepted');

    expect(
      resolveIncomingChatInboxState({
        chat: {
          meta: {}
        } as never,
        isAcceptedContact: false
      })
    ).toBe('request');
  });
});
