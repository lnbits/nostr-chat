interface MessageActivityRowLike {
  author_public_key?: unknown;
  meta?: unknown;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizePublicKey(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

export function isGroupEpochNoticeMessageMeta(meta: unknown): boolean {
  if (!isPlainRecord(meta)) {
    return false;
  }

  if (Number(meta.kind) === 1014) {
    return true;
  }

  const notice = meta.group_epoch_notice;
  if (!isPlainRecord(notice)) {
    return false;
  }

  const epochNumber = Number(notice.epochNumber);
  return Number.isInteger(epochNumber) && epochNumber >= 0;
}

export function isIncomingUnreadMessageActivity(
  row: MessageActivityRowLike,
  loggedInPublicKey: string | null | undefined
): boolean {
  const normalizedLoggedInPublicKey = normalizePublicKey(loggedInPublicKey);
  const authorPublicKey = normalizePublicKey(row.author_public_key);
  if (!normalizedLoggedInPublicKey || !authorPublicKey) {
    return false;
  }

  if (authorPublicKey === normalizedLoggedInPublicKey) {
    return false;
  }

  return !isGroupEpochNoticeMessageMeta(row.meta);
}
