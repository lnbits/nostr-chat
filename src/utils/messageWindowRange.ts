export interface MessageWindowRow {
  id: number;
}

export interface LoadedMessageIdentity {
  id: string;
}

export interface MessageWindowMergeResult<Row extends MessageWindowRow> {
  direction: 'older' | 'newer' | 'inside';
  targetIndex: number;
  targetRow: Row;
  rowsToMerge: Row[];
  oldestRow: Row | null;
  newestRow: Row | null;
  hasOlder: boolean | null;
  hasNewer: boolean | null;
}

function parseMessageId(value: string | undefined): number {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : -1;
}

export function resolveMessageWindowMerge<Row extends MessageWindowRow>(
  allRows: Row[],
  currentMessages: LoadedMessageIdentity[],
  targetMessageId: number
): MessageWindowMergeResult<Row> | null {
  const targetIndex = allRows.findIndex((row) => row.id === targetMessageId);
  if (targetIndex < 0) {
    return null;
  }

  const targetRow = allRows[targetIndex];
  if (!targetRow) {
    return null;
  }

  const currentOldestMessageId = parseMessageId(currentMessages[0]?.id);
  const currentNewestMessageId = parseMessageId(currentMessages[currentMessages.length - 1]?.id);
  const currentOldestIndex = allRows.findIndex((row) => row.id === currentOldestMessageId);
  const currentNewestIndex = allRows.findIndex((row) => row.id === currentNewestMessageId);

  if (
    currentMessages.length > 0 &&
    currentOldestIndex >= 0 &&
    currentNewestIndex >= 0 &&
    targetIndex < currentOldestIndex
  ) {
    return {
      direction: 'older',
      targetIndex,
      targetRow,
      rowsToMerge: allRows.slice(targetIndex, currentOldestIndex),
      oldestRow: targetRow,
      newestRow: null,
      hasOlder: targetIndex > 0,
      hasNewer: null,
    };
  }

  if (
    currentMessages.length > 0 &&
    currentOldestIndex >= 0 &&
    currentNewestIndex >= 0 &&
    targetIndex > currentNewestIndex
  ) {
    return {
      direction: 'newer',
      targetIndex,
      targetRow,
      rowsToMerge: allRows.slice(currentNewestIndex + 1, targetIndex + 1),
      oldestRow: null,
      newestRow: targetRow,
      hasOlder: null,
      hasNewer: targetIndex < allRows.length - 1,
    };
  }

  return {
    direction: 'inside',
    targetIndex,
    targetRow,
    rowsToMerge: [targetRow],
    oldestRow: null,
    newestRow: null,
    hasOlder: null,
    hasNewer: null,
  };
}
