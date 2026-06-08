import type { MessageAttachmentMetadata } from 'src/types/chat';

export const NOSTR_BUILD_BLOSSOM_SERVER = 'blossom.nostr.build';
export const NOSTR_BUILD_BLOSSOM_UPLOAD_URL = `https://${NOSTR_BUILD_BLOSSOM_SERVER}/upload`;
export const NOSTR_BUILD_FREE_MEDIA_MAX_BYTES = 20 * 1024 * 1024;

export interface NostrBuildUploadResult {
  attachment: MessageAttachmentMetadata;
  descriptor: NostrBuildBlobDescriptor;
}

interface NostrBuildBlobDescriptor {
  url: string;
  sha256: string;
  size: number;
  type: string;
  uploaded?: number;
}

interface UploadNostrBuildMediaOptions {
  signal?: AbortSignal;
  signUploadAuthHeader: (input: { sha256: string }) => Promise<string>;
}

function normalizeString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizePositiveInteger(value: unknown): number | null {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return null;
  }

  return Math.floor(numeric);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeBlobDescriptor(value: unknown): NostrBuildBlobDescriptor | null {
  if (!isRecord(value)) {
    return null;
  }

  const url = normalizeString(value.url);
  const sha256 = normalizeString(value.sha256).toLowerCase();
  const type = normalizeString(value.type);
  const size = normalizePositiveInteger(value.size);
  const uploaded = normalizePositiveInteger(value.uploaded);
  if (!url || !sha256 || !type || !size) {
    return null;
  }

  return {
    url,
    sha256,
    size,
    type,
    ...(uploaded ? { uploaded } : {}),
  };
}

export function isCommonNostrBuildMediaFile(file: File): boolean {
  return /^(image|video|audio)\//u.test(file.type);
}

export function validateNostrBuildMediaFile(file: File): string | null {
  if (!isCommonNostrBuildMediaFile(file)) {
    return 'Only image, video, and audio files are supported.';
  }

  if (file.size <= 0) {
    return 'The selected file is empty.';
  }

  if (file.size > NOSTR_BUILD_FREE_MEDIA_MAX_BYTES) {
    return 'nostr.build free uploads are limited to 20 MiB.';
  }

  return null;
}

export async function sha256HexFromBlob(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  const digest = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function readUploadError(response: Response): Promise<string> {
  const reason = response.headers.get('X-Reason')?.trim();
  if (reason) {
    return reason;
  }

  const body = (await response.text().catch(() => '')).trim();
  if (body) {
    return body;
  }

  return `nostr.build upload failed with HTTP ${response.status}.`;
}

export async function uploadNostrBuildMedia(
  file: File,
  options: UploadNostrBuildMediaOptions
): Promise<NostrBuildUploadResult> {
  const validationError = validateNostrBuildMediaFile(file);
  if (validationError) {
    throw new Error(validationError);
  }

  const sha256 = await sha256HexFromBlob(file);
  const authorization = await options.signUploadAuthHeader({ sha256 });
  const response = await fetch(NOSTR_BUILD_BLOSSOM_UPLOAD_URL, {
    method: 'PUT',
    headers: {
      Authorization: authorization,
      'Content-Type': file.type,
      'X-SHA-256': sha256,
    },
    body: file,
    signal: options.signal,
  });

  if (response.status !== 200 && response.status !== 201) {
    throw new Error(await readUploadError(response));
  }

  const descriptor = normalizeBlobDescriptor(await response.json().catch(() => null));
  if (!descriptor) {
    throw new Error('nostr.build returned an invalid upload response.');
  }

  const uploadedAt = descriptor.uploaded ? new Date(descriptor.uploaded * 1000).toISOString() : '';

  return {
    descriptor,
    attachment: {
      type: 'media',
      url: descriptor.url,
      mimeType: descriptor.type,
      size: descriptor.size,
      sha256: descriptor.sha256,
      name: file.name,
      service: 'nostr.build',
      ...(uploadedAt ? { uploadedAt } : {}),
    },
  };
}
