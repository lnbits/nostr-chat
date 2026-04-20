import { useMockDelay } from '../composables/useMockDelay';
import { CURRENT_USER_PUBKEY } from '../data/mockProfiles';
import type { MockAuthSession } from '../types/auth';

export async function loginWithMockNostrAuth(): Promise<MockAuthSession> {
  await useMockDelay(300, 900);

  return {
    isAuthenticated: true,
    method: 'nostr-auth',
    currentPubkey: CURRENT_USER_PUBKEY,
  };
}
