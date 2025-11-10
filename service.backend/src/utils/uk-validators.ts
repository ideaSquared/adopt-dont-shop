/**
 * UK Data Validation Utilities for Backend
 * Validates UK postcodes and phone numbers
 */

/**
 * Validate UK postcode format
 * Supports formats: AA9A 9AA, A9A 9AA, A9 9AA, A99 9AA, AA9 9AA, AA99 9AA
 *
 * @param postcode - The postcode string to validate
 * @returns true if valid UK postcode format
 *
 * @example
 * validateUKPostcode('SW1A 1AA') // true
 * validateUKPostcode('M1 1AA') // true
 * validateUKPostcode('12345') // false
 */
export function validateUKPostcode(postcode: string): boolean {
  if (!postcode || typeof postcode !== 'string') {
    return false;
  }

  // UK postcode regex
  // Supports: SW1A 1AA, M1 1AA, B33 8TH, CR2 6XH, DN55 1PT, etc.
  const postcodeRegex = /^([A-Z]{1,2}\d{1,2}[A-Z]?)\s*(\d[A-Z]{2})$/i;

  const cleaned = postcode.trim().toUpperCase();
  return postcodeRegex.test(cleaned);
}

/**
 * Format UK postcode to standard format (uppercase with space)
 *
 * @param postcode - The postcode string to format
 * @returns Formatted postcode or original if invalid
 *
 * @example
 * formatUKPostcode('sw1a1aa') // 'SW1A 1AA'
 * formatUKPostcode('m11aa') // 'M1 1AA'
 */
export function formatUKPostcode(postcode: string): string {
  if (!postcode || typeof postcode !== 'string') {
    return postcode;
  }

  const cleaned = postcode.trim().toUpperCase().replace(/\s+/g, '');

  // Extract outward code (first part) and inward code (last 3 chars)
  if (cleaned.length >= 5 && cleaned.length <= 7) {
    const inward = cleaned.slice(-3);
    const outward = cleaned.slice(0, -3);
    return `${outward} ${inward}`;
  }

  return postcode;
}

/**
 * Validate UK phone number
 * Accepts both national (0xxx) and international (+44) formats
 *
 * @param phone - The phone number string to validate
 * @returns true if valid UK phone number
 *
 * @example
 * validateUKPhoneNumber('02012345678') // true
 * validateUKPhoneNumber('07123456789') // true
 * validateUKPhoneNumber('+442012345678') // true
 * validateUKPhoneNumber('(555) 123-4567') // false
 */
export function validateUKPhoneNumber(phone: string): boolean {
  if (!phone || typeof phone !== 'string') {
    return false;
  }

  // Remove all non-digit characters except +
  const cleaned = phone.replace(/[^\d+]/g, '');

  // UK phone numbers (national format): 0 followed by 9-10 digits
  if (cleaned.startsWith('0') && cleaned.length >= 10 && cleaned.length <= 11) {
    return true;
  }

  // UK phone numbers (international format): +44 followed by 10-11 digits
  if (cleaned.startsWith('+44') && cleaned.length >= 12 && cleaned.length <= 14) {
    return true;
  }

  // Also accept without + sign: 44 followed by 10-11 digits
  if (cleaned.startsWith('44') && !cleaned.startsWith('440') && cleaned.length >= 12 && cleaned.length <= 13) {
    return true;
  }

  return false;
}

/**
 * Format UK phone number for storage (removes spaces, keeps + if present)
 *
 * @param phone - The phone number to format
 * @returns Cleaned phone number
 *
 * @example
 * formatUKPhoneNumber('020 1234 5678') // '02012345678'
 * formatUKPhoneNumber('+44 20 1234 5678') // '+442012345678'
 */
export function formatUKPhoneNumber(phone: string): string {
  if (!phone || typeof phone !== 'string') {
    return phone;
  }

  // Remove all spaces, hyphens, parentheses
  return phone.replace(/[\s\-()]/g, '');
}

/**
 * Validation error messages
 */
export const UK_VALIDATION_ERRORS = {
  POSTCODE_INVALID: 'Please enter a valid UK postcode (e.g., SW1A 1AA)',
  POSTCODE_REQUIRED: 'Postcode is required',
  PHONE_INVALID: 'Please enter a valid UK phone number',
  PHONE_REQUIRED: 'Phone number is required',
} as const;
