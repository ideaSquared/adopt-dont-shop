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

/**
 * Safely parse a date string to a Date object
 * @param dateString - The date string to parse
 * @returns Valid Date object or null if invalid
 */
export function safeParseDate(dateString: string | null | undefined): Date | null {
  if (!dateString) {
    return null;
  }

  try {
    let date: Date;

    if (typeof dateString === 'string' && dateString.includes('T')) {
      date = parseISO(dateString);
    } else {
      date = new Date(dateString);
    }

    return isValid(date) ? date : null;
  } catch (error) {
    console.warn('Error parsing date:', dateString, error);
    return null;
  }
}

/**
 * Check if a date string is valid
 * @param dateString - The date string to check
 * @returns True if the date is valid
 */
export function isValidDateString(dateString: string | null | undefined): boolean {
  return safeParseDate(dateString) !== null;
}
