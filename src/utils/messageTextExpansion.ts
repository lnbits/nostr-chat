export const COLLAPSED_MESSAGE_CHARACTER_LIMIT = 4096;

export function shouldCollapseMessageText(rawText: string): boolean {
  return rawText.length > COLLAPSED_MESSAGE_CHARACTER_LIMIT;
}

export function truncateCollapsedMessageText(rawText: string): string {
  const normalizedText = rawText.replace(/\r\n/g, '\n');

  if (normalizedText.length <= COLLAPSED_MESSAGE_CHARACTER_LIMIT) {
    return normalizedText;
  }

  return `${normalizedText.slice(0, COLLAPSED_MESSAGE_CHARACTER_LIMIT).trimEnd()}...`;
}
