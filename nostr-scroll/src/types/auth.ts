export interface MockAuthSession {
  isAuthenticated: boolean;
  method: 'nostr-auth';
  currentPubkey: string | null;
}
