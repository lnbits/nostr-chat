export type ThreadSearchNavigationDirection = 'previous' | 'next';

export function getWrappedThreadSearchIndex(nextIndex: number, matchCount: number): number {
  const normalizedMatchCount = Math.max(0, Math.floor(matchCount));
  if (normalizedMatchCount === 0) {
    return -1;
  }

  return ((nextIndex % normalizedMatchCount) + normalizedMatchCount) % normalizedMatchCount;
}

export function resolveThreadSearchNavigationIndex(
  activeIndex: number,
  matchCount: number,
  direction: ThreadSearchNavigationDirection
): number {
  const normalizedMatchCount = Math.max(0, Math.floor(matchCount));
  if (normalizedMatchCount === 0) {
    return -1;
  }

  const normalizedActiveIndex =
    Number.isInteger(activeIndex) && activeIndex >= 0 ? activeIndex : -1;

  if (normalizedActiveIndex < 0) {
    return direction === 'previous' ? normalizedMatchCount - 1 : 0;
  }

  return direction === 'previous'
    ? getWrappedThreadSearchIndex(normalizedActiveIndex + 1, normalizedMatchCount)
    : getWrappedThreadSearchIndex(normalizedActiveIndex - 1, normalizedMatchCount);
}
