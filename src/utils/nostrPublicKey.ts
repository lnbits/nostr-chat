export interface NostrPublicKeyValidationResult {
  isValid: boolean;
  normalizedPubkey: string | null;
}

export interface NostrIdentifierResolutionResult {
  isValid: boolean;
  normalizedPubkey: string | null;
  resolvedName: string | null;
  identifierType: 'pubkey' | 'nip05' | null;
  error: 'invalid' | 'nip05_unresolved' | null;
}

function extractNip05Name(nip05Identifier: string): string | null {
  const [namePart] = nip05Identifier.split('@');
  const normalized = namePart?.trim().toLowerCase() ?? '';
  return normalized || null;
}

export async function resolveNostrIdentifier(
  input: string
): Promise<NostrIdentifierResolutionResult> {
  const { default: NDK, NDKUser, isValidNip05, isValidPubkey, nip19 } =
    await import('@nostr-dev-kit/ndk');
  const value = input.trim();

  if (!value) {
    return {
      isValid: false,
      normalizedPubkey: null,
      resolvedName: null,
      identifierType: null,
      error: 'invalid'
    };
  }

  const isEmailLike = value.includes('@');
  if (isEmailLike) {
    if (!isValidNip05(value)) {
      return {
        isValid: false,
        normalizedPubkey: null,
        resolvedName: null,
        identifierType: 'nip05',
        error: 'invalid'
      };
    }

    try {
      const ndk = new NDK();
      const user = await NDKUser.fromNip05(value, ndk, true);
      const normalizedPubkey = user?.pubkey?.toLowerCase() ?? null;

      if (!normalizedPubkey || !isValidPubkey(normalizedPubkey)) {
        return {
          isValid: false,
          normalizedPubkey: null,
          resolvedName: null,
          identifierType: 'nip05',
          error: 'nip05_unresolved'
        };
      }

      return {
        isValid: true,
        normalizedPubkey,
        resolvedName: extractNip05Name(value),
        identifierType: 'nip05',
        error: null
      };
    } catch {
      return {
        isValid: false,
        normalizedPubkey: null,
        resolvedName: null,
        identifierType: 'nip05',
        error: 'nip05_unresolved'
      };
    }
  }

  if (isValidPubkey(value)) {
    return {
      isValid: true,
      normalizedPubkey: value.toLowerCase(),
      resolvedName: null,
      identifierType: 'pubkey',
      error: null
    };
  }

  try {
    const decoded = nip19.decode(value);
    if (decoded.type !== 'npub' || typeof decoded.data !== 'string') {
      return {
        isValid: false,
        normalizedPubkey: null,
        resolvedName: null,
        identifierType: 'pubkey',
        error: 'invalid'
      };
    }

    if (!isValidPubkey(decoded.data)) {
      return {
        isValid: false,
        normalizedPubkey: null,
        resolvedName: null,
        identifierType: 'pubkey',
        error: 'invalid'
      };
    }

    return {
      isValid: true,
      normalizedPubkey: decoded.data.toLowerCase(),
      resolvedName: null,
      identifierType: 'pubkey',
      error: null
    };
  } catch {
    return {
      isValid: false,
      normalizedPubkey: null,
      resolvedName: null,
      identifierType: 'pubkey',
      error: 'invalid'
    };
  }
}

export async function validateNostrPublicKey(input: string): Promise<NostrPublicKeyValidationResult> {
  const resolution = await resolveNostrIdentifier(input);
  const isPubkey = resolution.identifierType === 'pubkey';

  return {
    isValid: resolution.isValid && isPubkey,
    normalizedPubkey: resolution.isValid && isPubkey ? resolution.normalizedPubkey : null
  };
}
