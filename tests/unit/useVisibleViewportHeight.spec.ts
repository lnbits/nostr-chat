import { readVisibleViewportMetrics } from 'src/composables/useVisibleViewportHeight';
import { afterEach, describe, expect, it, vi } from 'vitest';

describe('visible viewport metrics', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns fallback dimensions outside the browser', () => {
    vi.stubGlobal('window', undefined);

    expect(readVisibleViewportMetrics(720)).toEqual({
      height: 720,
      offsetTop: 0,
      layoutHeight: 720,
      keyboardInset: 0,
      isKeyboardVisible: false,
    });
  });

  it('calculates keyboard inset from visual viewport shrinkage', () => {
    vi.stubGlobal('window', {
      innerHeight: 800,
      visualViewport: {
        height: 500,
        offsetTop: 0,
      },
    });

    expect(readVisibleViewportMetrics(800)).toMatchObject({
      height: 500,
      offsetTop: 0,
      layoutHeight: 800,
      keyboardInset: 300,
      isKeyboardVisible: true,
    });
  });

  it('accounts for visual viewport top offset when calculating the keyboard inset', () => {
    vi.stubGlobal('window', {
      innerHeight: 800,
      visualViewport: {
        height: 500,
        offsetTop: 120,
      },
    });

    expect(readVisibleViewportMetrics(800)).toMatchObject({
      height: 500,
      offsetTop: 120,
      layoutHeight: 800,
      keyboardInset: 180,
      isKeyboardVisible: true,
    });
  });

  it('uses the resized layout viewport when no visual keyboard inset is exposed', () => {
    vi.stubGlobal('window', {
      innerHeight: 520,
      visualViewport: {
        height: 520,
        offsetTop: 0,
      },
    });

    expect(readVisibleViewportMetrics(800)).toMatchObject({
      height: 520,
      layoutHeight: 520,
      keyboardInset: 0,
      isKeyboardVisible: false,
    });
  });
});
