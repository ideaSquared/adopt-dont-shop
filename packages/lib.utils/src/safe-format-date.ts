import { formatDate } from './locale/date';

/**
 * Safely format a date value, returning a fallback string for
 * null, undefined, or invalid date values instead of crashing.
 */
export function safeFormatDate(value: string | Date | null | undefined, fallback = '—'): string {
  if (value === null || value === undefined) {
    return fallback;
  }

  const result = formatDate(value instanceof Date ? value : value);
  return result === 'Invalid date' ? fallback : result;
}
