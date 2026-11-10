import { formatCustomDate } from '@adopt-dont-shop/lib.utils';

const MINUTE_MS = 60_000;
const HOUR_MS = 3_600_000;
const DAY_MS = 86_400_000;

export const formatChatTimestamp = (timestamp: string): string => {
  const date = new Date(timestamp);
  const diffMs = Date.now() - date.getTime();

  if (diffMs < MINUTE_MS) {
    return 'Just now';
  }
  if (diffMs < HOUR_MS) {
    return `${Math.floor(diffMs / MINUTE_MS)}m ago`;
  }
  if (diffMs < DAY_MS) {
    return `${Math.floor(diffMs / HOUR_MS)}h ago`;
  }
  if (diffMs < 7 * DAY_MS) {
    return `${Math.floor(diffMs / DAY_MS)}d ago`;
  }
  return formatCustomDate(date, 'dd MMM yyyy');
};
