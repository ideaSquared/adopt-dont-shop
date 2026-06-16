import { formatDistanceToNow, isValid, parseISO } from 'date-fns';

/**
 * Safely format a date string to relative time (e.g., "2 hours ago")
 * @param dateString - The date string to format
 * @param fallback - The fallback text if the date is invalid
 * @returns Formatted relative time string or fallback
 */
export function safeFormatDistanceToNow(
  dateString: string | null | undefined,
  fallback: string = 'Unknown'
): string {
  if (!dateString) {
    return fallback;
  }

  try {
    // Try to parse the date string
    let date: Date;

    // Handle ISO string format
    if (typeof dateString === 'string' && dateString.includes('T')) {
      date = parseISO(dateString);
    } else {
      date = new Date(dateString);
    }

    // Check if the date is valid
    if (!isValid(date)) {
      console.warn('Invalid date string:', dateString);
      return fallback;
    }

    return formatDistanceToNow(date, { addSuffix: true });
  } catch (error) {
    console.warn('Error formatting date:', dateString, error);
    return fallback;
  }
}
