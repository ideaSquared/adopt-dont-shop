import { formatDistanceToNow, isValid, parseISO } from 'date-fns';

/**
 * Safely format a date string to relative time (e.g. "2 hours ago").
 * Returns the fallback when the input is missing or unparseable.
 */
export function safeFormatDistanceToNow(
  dateString: string | null | undefined,
  fallback: string = 'Unknown'
): string {
  if (!dateString) {
    return fallback;
  }

  try {
    const date =
      typeof dateString === 'string' && dateString.includes('T')
        ? parseISO(dateString)
        : new Date(dateString);

    if (!isValid(date)) {
      return fallback;
    }

    return formatDistanceToNow(date, { addSuffix: true });
  } catch {
    return fallback;
  }
}
