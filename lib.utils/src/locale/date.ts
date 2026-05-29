/**
 * UK Date and Time Formatting Utilities
 * Formats: DD/MM/YYYY, 24-hour time
 */

import { format, formatDistanceToNow, parseISO, isValid } from 'date-fns';
import { enGB } from 'date-fns/locale';
import { LOCALE_CONFIG } from './config';
import { logFormatError } from './log';

/**
 * Format a date to UK format: DD/MM/YYYY
 * @param date - Date object, ISO string, or timestamp
 * @returns Formatted date string
 */
export function formatDate(date: Date | string | number): string {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : new Date(date);
    if (!isValid(dateObj)) {
      return 'Invalid date';
    }
    return format(dateObj, LOCALE_CONFIG.dateFormat, { locale: enGB });
  } catch (error) {
    logFormatError('Error formatting date:', error);
    return 'Invalid date';
  }
}

/**
 * Format a date and time to UK format: DD/MM/YYYY HH:mm
 * @param date - Date object, ISO string, or timestamp
 * @returns Formatted date-time string
 */
export function formatDateTime(date: Date | string | number): string {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : new Date(date);
    if (!isValid(dateObj)) {
      return 'Invalid date';
    }
    return format(dateObj, LOCALE_CONFIG.dateTimeFormat, { locale: enGB });
  } catch (error) {
    logFormatError('Error formatting date-time:', error);
    return 'Invalid date';
  }
}

/**
 * Format time to UK format: HH:mm (24-hour)
 * @param date - Date object, ISO string, or timestamp
 * @returns Formatted time string
 */
export function formatTime(date: Date | string | number): string {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : new Date(date);
    if (!isValid(dateObj)) {
      return 'Invalid time';
    }
    return format(dateObj, LOCALE_CONFIG.timeFormat, { locale: enGB });
  } catch (error) {
    logFormatError('Error formatting time:', error);
    return 'Invalid time';
  }
}

/**
 * Format a relative date (e.g., "2 days ago", "in 3 hours")
 * @param date - Date object, ISO string, or timestamp
 * @returns Relative date string
 */
export function formatRelativeDate(date: Date | string | number): string {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : new Date(date);
    if (!isValid(dateObj)) {
      return 'Invalid date';
    }
    return formatDistanceToNow(dateObj, {
      addSuffix: true,
      locale: enGB,
    });
  } catch (error) {
    logFormatError('Error formatting relative date:', error);
    return 'Invalid date';
  }
}

/**
 * Format a date for user-facing display: "24 May 2026".
 *
 * Use this for absolute dates shown in UI — it produces a consistent
 * human-readable format across all three apps. For relative dates
 * ("2 days ago") use {@link formatRelativeDate} instead.
 *
 * @param date - Date object, ISO string, or timestamp
 * @param options - Optional. Pass `{ includeTime: true }` to append "HH:mm".
 * @returns Formatted date string, e.g. "24 May 2026" or "24 May 2026, 14:30"
 */
export function formatDisplayDate(
  date: Date | string | number,
  options?: { includeTime?: boolean }
): string {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : new Date(date);
    if (!isValid(dateObj)) {
      return 'Invalid date';
    }
    const pattern = options?.includeTime ? 'd MMM yyyy, HH:mm' : 'd MMM yyyy';
    return format(dateObj, pattern, { locale: enGB });
  } catch (error) {
    logFormatError('Error formatting display date:', error);
    return 'Invalid date';
  }
}

/**
 * Format a date with a custom format string
 * @param date - Date object, ISO string, or timestamp
 * @param formatString - Format string (date-fns format)
 * @returns Formatted date string
 */
export function formatCustomDate(date: Date | string | number, formatString: string): string {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : new Date(date);
    if (!isValid(dateObj)) {
      return 'Invalid date';
    }
    return format(dateObj, formatString, { locale: enGB });
  } catch (error) {
    logFormatError('Error formatting custom date:', error);
    return 'Invalid date';
  }
}
