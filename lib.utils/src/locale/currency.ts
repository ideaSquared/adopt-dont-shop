/**
 * UK Currency Formatting Utilities
 * Format: £1,234.56 (GBP)
 */

import { LOCALE_CONFIG } from './config';

/**
 * Format a number as UK currency (GBP)
 * @param amount - The amount to format
 * @param options - Intl.NumberFormatOptions for customization
 * @returns Formatted currency string (e.g., "£1,234.56")
 */
export function formatCurrency(amount: number, options?: Intl.NumberFormatOptions): string {
  try {
    const formatter = new Intl.NumberFormat(LOCALE_CONFIG.locale, {
      style: 'currency',
      currency: LOCALE_CONFIG.currency,
      ...options,
    });
    return formatter.format(amount);
  } catch (error) {
    console.error('Error formatting currency:', error);
    return `${LOCALE_CONFIG.currencySymbol}${amount.toFixed(2)}`;
  }
}

/**
 * Format a number as currency without decimals
 * @param amount - The amount to format
 * @returns Formatted currency string (e.g., "£1,235")
 */
export function formatCurrencyWhole(amount: number): string {
  return formatCurrency(amount, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

/**
 * Format a number with thousand separators (no currency symbol)
 * @param amount - The number to format
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted number string (e.g., "1,234.56")
 */
export function formatNumber(amount: number, decimals: number = 2): string {
  try {
    const formatter = new Intl.NumberFormat(LOCALE_CONFIG.locale, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
    return formatter.format(amount);
  } catch (error) {
    console.error('Error formatting number:', error);
    return amount.toFixed(decimals);
  }
}

/**
 * Parse a currency string to a number
 * Handles £1,234.56, 1234.56, etc.
 * @param currencyString - The currency string to parse
 * @returns Parsed number or NaN if invalid
 */
export function parseCurrency(currencyString: string): number {
  // Remove currency symbols, commas, and whitespace
  const cleaned = currencyString.replace(/[£$,\s]/g, '');
  return parseFloat(cleaned);
}
