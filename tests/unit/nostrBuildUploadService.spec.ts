import {
  NOSTR_BUILD_BLOSSOM_UPLOAD_URL,
  sha256HexFromBlob,
  uploadNostrBuildMedia,
  validateNostrBuildMediaFile,
} from 'src/services/nostrBuildUploadService';
import { afterEach, describe, expect, it, vi } from 'vitest';

describe('nostrBuildUploadService', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('validates common media files for the free upload flow', () => {
    expect(
      validateNostrBuildMediaFile(new File(['image'], 'image.png', { type: 'image/png' }))
    ).toBe(null);
    expect(
      validateNostrBuildMediaFile(new File(['text'], 'note.txt', { type: 'text/plain' }))
    ).toBe('Only image, video, and audio files are supported.');
    expect(validateNostrBuildMediaFile(new File([], 'empty.png', { type: 'image/png' }))).toBe(
      'The selected file is empty.'
    );
  });

  it('hashes blobs with SHA-256', async () => {
    await expect(sha256HexFromBlob(new Blob(['hello']))).resolves.toBe(
      '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824'
    );
  });

  it('uploads media with a signed Blossom auth header', async () => {
    const file = new File(['hello'], 'hello.png', { type: 'image/png' });
    const signUploadAuthHeader = vi.fn(async () => 'Nostr signed-auth');
    const fetchMock = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          url: 'https://nostr.build/i/hello.png',
          sha256: '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824',
          size: 5,
          type: 'image/png',
          uploaded: 1780912800,
        }),
        { status: 201 }
      );
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await uploadNostrBuildMedia(file, { signUploadAuthHeader });

    expect(signUploadAuthHeader).toHaveBeenCalledWith({
      sha256: '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824',
    });
    expect(fetchMock).toHaveBeenCalledWith(
      NOSTR_BUILD_BLOSSOM_UPLOAD_URL,
      expect.objectContaining({
        method: 'PUT',
        headers: {
          Authorization: 'Nostr signed-auth',
          'Content-Type': 'image/png',
          'X-SHA-256': '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824',
        },
        body: file,
      })
    );
    expect(result.attachment).toEqual({
      type: 'media',
      url: 'https://nostr.build/i/hello.png',
      mimeType: 'image/png',
      size: 5,
      sha256: '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824',
      name: 'hello.png',
      service: 'nostr.build',
      uploadedAt: '2026-06-08T10:00:00.000Z',
    });
  });
});
