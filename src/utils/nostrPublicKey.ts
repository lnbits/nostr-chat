export interface NostrPublicKeyValidationResult {
  isValid: boolean;
  normalizedPubkey: string | null;
}

export async function validateNostrPublicKey(input: string): Promise<NostrPublicKeyValidationResult> {
  const { isValidPubkey, nip19 } = await import('@nostr-dev-kit/ndk');
  const value = input.trim();

  if (!value) {
    return {
      isValid: false,
      normalizedPubkey: null
    };
  }

  if (isValidPubkey(value)) {
    return {
      isValid: true,
      normalizedPubkey: value.toLowerCase()
    };
  }

  try {
    const decoded = nip19.decode(value);
    if (decoded.type !== 'npub' || typeof decoded.data !== 'string') {
      return {
        isValid: false,
        normalizedPubkey: null
      };
    }

    if (!isValidPubkey(decoded.data)) {
      return {
        isValid: false,
        normalizedPubkey: null
      };
    }

    return {
      isValid: true,
      normalizedPubkey: decoded.data.toLowerCase()
    };
  } catch {
    return {
      isValid: false,
      normalizedPubkey: null
    };
  }
}
