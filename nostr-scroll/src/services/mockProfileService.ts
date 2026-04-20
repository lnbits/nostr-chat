import { useMockDelay } from '../composables/useMockDelay';
import { mockProfiles } from '../data/mockProfiles';
import type { NostrProfile } from '../types/nostr';

export async function loadMockProfiles(): Promise<NostrProfile[]> {
  await useMockDelay(40, 120);
  return JSON.parse(JSON.stringify(mockProfiles)) as NostrProfile[];
}
