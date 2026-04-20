import { formatCompactCount, formatJoinedDate, formatRelativeTime } from '../utils/dates';

export function useFormatters() {
  return {
    formatCompactCount,
    formatJoinedDate,
    formatRelativeTime,
  };
}
