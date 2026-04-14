export interface SearchableMessageRecord {
  id: number;
  created_at: string;
  message: string;
  meta: Record<string, unknown>;
}

function toComparableTimestamp(value: string | null | undefined): number {
  if (typeof value !== 'string' || !value.trim()) {
    return 0;
  }

  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}

export function sortSearchableMessagesByCreated(
  first: Pick<SearchableMessageRecord, 'created_at' | 'id'>,
  second: Pick<SearchableMessageRecord, 'created_at' | 'id'>
): number {
  const byTime = toComparableTimestamp(first.created_at) - toComparableTimestamp(second.created_at);
  if (byTime !== 0) {
    return byTime;
  }

  return first.id - second.id;
}

export function normalizeMessageSearchText(value: unknown): string {
  if (typeof value !== 'string') {
    return '';
  }

  return value.toLowerCase().replace(/\s+/g, ' ').trim();
}

export function isDeletedMessageMeta(meta: Record<string, unknown>): boolean {
  const deletedMeta = meta.deleted;
  return typeof deletedMeta === 'object' && deletedMeta !== null && !Array.isArray(deletedMeta);
}

export function messageRecordMatchesSearchQuery<T extends SearchableMessageRecord>(
  record: T,
  normalizedQuery: string,
  normalizeMeta: (meta: Record<string, unknown>) => Record<string, unknown> = (meta) => meta
): boolean {
  if (!normalizedQuery) {
    return false;
  }

  const normalizedMeta = normalizeMeta(record.meta);
  if (isDeletedMessageMeta(normalizedMeta)) {
    return false;
  }

  return normalizeMessageSearchText(record.message).includes(normalizedQuery);
}

export function searchMessageRecords<T extends SearchableMessageRecord>(
  records: T[],
  query: string,
  normalizeMeta: (meta: Record<string, unknown>) => Record<string, unknown> = (meta) => meta
): T[] {
  const normalizedQuery = normalizeMessageSearchText(query);
  if (!normalizedQuery) {
    return [];
  }

  return records
    .filter((record) => messageRecordMatchesSearchQuery(record, normalizedQuery, normalizeMeta))
    .sort((first, second) => sortSearchableMessagesByCreated(second, first));
}
