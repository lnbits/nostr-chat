import { createAppNdkOptions } from 'src/stores/nostr/ndkOptions';
import { describe, expect, it } from 'vitest';

describe('NDK options', () => {
  it('keeps the outbox model enabled by default', () => {
    expect(createAppNdkOptions({})).toEqual({
      enableOutboxModel: true,
    });
  });

  it('disables the outbox model when local e2e requests it', () => {
    expect(createAppNdkOptions({ APP_E2E_DISABLE_NDK_OUTBOX: 'true' })).toEqual({
      enableOutboxModel: false,
    });
    expect(createAppNdkOptions({ APP_E2E_DISABLE_NDK_OUTBOX: true })).toEqual({
      enableOutboxModel: false,
    });
  });

  it('does not disable the outbox model for other env values', () => {
    expect(createAppNdkOptions({ APP_E2E_DISABLE_NDK_OUTBOX: 'false' })).toEqual({
      enableOutboxModel: true,
    });
  });
});
