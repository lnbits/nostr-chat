import type { MessageAttachmentMetadata } from 'src/types/chat';

const IMETA_TAG_NAME = 'imeta';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizePositiveInteger(value: unknown): number | null {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return null;
  }

  return Math.floor(numeric);
}

function readImetaField(entry: string, key: string): string {
  const prefix = `${key} `;
  return entry.startsWith(prefix) ? entry.slice(prefix.length).trim() : '';
}

export function normalizeMessageAttachment(input: unknown): MessageAttachmentMetadata | null {
  if (!isRecord(input)) {
    return null;
  }

  const url = normalizeText(input.url);
  const mimeType = normalizeText(input.mimeType);
  const size = normalizePositiveInteger(input.size);
  if (!url || !mimeType || !size) {
    return null;
  }

  const sha256 = normalizeText(input.sha256).toLowerCase();
  const name = normalizeText(input.name);
  const uploadedAt = normalizeText(input.uploadedAt);
  const service = normalizeText(input.service);

  return {
    type: 'media',
    url,
    mimeType,
    size,
    ...(sha256 ? { sha256 } : {}),
    ...(name ? { name } : {}),
    ...(uploadedAt ? { uploadedAt } : {}),
    ...(service ? { service } : {}),
  };
}

export function buildAttachmentMessageText(attachment: MessageAttachmentMetadata): string {
  return normalizeText(attachment.url);
}

export function buildAttachmentMessageMeta(
  attachment: MessageAttachmentMetadata
): { attachments: MessageAttachmentMetadata[] } | Record<string, never> {
  const normalized = normalizeMessageAttachment(attachment);
  return normalized ? { attachments: [normalized] } : {};
}

export function buildNip92ImetaTag(attachment: MessageAttachmentMetadata): string[] {
  const normalized = normalizeMessageAttachment(attachment);
  if (!normalized) {
    return [];
  }

  const tag = [
    IMETA_TAG_NAME,
    `url ${normalized.url}`,
    `m ${normalized.mimeType}`,
    `size ${normalized.size}`,
  ];

  if (normalized.sha256) {
    tag.push(`x ${normalized.sha256}`);
  }

  return tag;
}

export function extractMediaAttachmentsFromTags(tags: string[][]): MessageAttachmentMetadata[] {
  const attachments: MessageAttachmentMetadata[] = [];
  const seenUrls = new Set<string>();

  for (const tag of tags) {
    if (!Array.isArray(tag) || tag[0] !== IMETA_TAG_NAME) {
      continue;
    }

    let url = '';
    let mimeType = '';
    let sha256 = '';
    let size: number | null = null;

    for (const entry of tag.slice(1)) {
      const value = normalizeText(entry);
      if (!value) {
        continue;
      }

      url ||= readImetaField(value, 'url');
      mimeType ||= readImetaField(value, 'm');
      sha256 ||= readImetaField(value, 'x').toLowerCase();
      const sizeValue = readImetaField(value, 'size');
      if (!size && sizeValue) {
        size = normalizePositiveInteger(sizeValue);
      }
    }

    if (!url || !mimeType || !size || seenUrls.has(url)) {
      continue;
    }

    seenUrls.add(url);
    attachments.push({
      type: 'media',
      url,
      mimeType,
      size,
      ...(sha256 ? { sha256 } : {}),
    });
  }

  return attachments;
}

export function isImageAttachment(attachment: MessageAttachmentMetadata): boolean {
  return attachment.type === 'media' && /^image\//iu.test(attachment.mimeType);
}

export function readImageAttachmentsFromMeta(meta: {
  attachments?: unknown;
}): MessageAttachmentMetadata[] {
  if (!Array.isArray(meta.attachments)) {
    return [];
  }

  return meta.attachments
    .map((attachment) => normalizeMessageAttachment(attachment))
    .filter((attachment): attachment is MessageAttachmentMetadata =>
      attachment ? isImageAttachment(attachment) : false
    );
}
