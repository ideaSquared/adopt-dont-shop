/**
 * UK Phone Number Formatting and Validation Utilities
 * Formats: +44 20 1234 5678 (international), 020 1234 5678 (national)
 */

/**
 * Format a UK phone number for display
 * Handles both landline and mobile numbers
 * @param phone - Raw phone number string
 * @param international - Whether to use international format (+44)
 * @returns Formatted phone number
 */
export function formatPhoneNumber(phone: string, international: boolean = false): string {
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');

  // Handle different UK phone number formats
  if (digits.startsWith('44')) {
    // International format: +44 ...
    const national = digits.substring(2);
    return formatNationalNumber(national, true);
  } else if (digits.startsWith('0')) {
    // National format: 0...
    return formatNationalNumber(digits, international);
  } else if (digits.length >= 10) {
    // Assume it's a national number without leading 0
    return formatNationalNumber('0' + digits, international);
  }

  // Return as-is if we can't parse it
  return phone;
}

/**
 * Format a national UK number
 * @param digits - The phone number digits (starting with 0)
 * @param international - Whether to use international format
 * @returns Formatted phone number
 */
function formatNationalNumber(digits: string, international: boolean): string {
  // Remove leading 0 for international format
  const national = digits.startsWith('0') ? digits.substring(1) : digits;

  // Mobile numbers (07xxx xxxxxx)
  if (national.startsWith('7') && national.length === 10) {
    const formatted = `${national.substring(0, 4)} ${national.substring(4, 7)} ${national.substring(7)}`;
    return international ? `+44 ${formatted}` : `0${formatted}`;
  }

  // London (020 xxxx xxxx)
  if (national.startsWith('20') && national.length === 10) {
    const formatted = `20 ${national.substring(2, 6)} ${national.substring(6)}`;
    return international ? `+44 ${formatted}` : `0${formatted}`;
  }

  // Other 3-digit area codes (01xx xxxx xxxx or 01xxx xxxxx)
  if (national.startsWith('1') && national.length >= 10) {
    // Try 5-digit local number first (for 4-digit area codes like 01xxx)
    if (national.length === 10) {
      const formatted = `${national.substring(0, 4)} ${national.substring(4, 9)} ${national.substring(9)}`;
      return international ? `+44 ${formatted}` : `0${formatted}`;
    }
    // Default to 6-digit local number (for 3-digit area codes like 01xx)
    const formatted = `${national.substring(0, 3)} ${national.substring(3, 7)} ${national.substring(7)}`;
    return international ? `+44 ${formatted}` : `0${formatted}`;
  }

  // Other formats (3-digit area code + 7-digit number)
  if (national.length === 10) {
    const formatted = `${national.substring(0, 3)} ${national.substring(3, 6)} ${national.substring(6)}`;
    return international ? `+44 ${formatted}` : `0${formatted}`;
  }

  // Fallback: return with international prefix if requested
  return international ? `+44 ${national}` : `0${digits}`;
}

/**
 * Validate a UK phone number
 * @param phone - Phone number string to validate
 * @returns true if valid UK phone number
 */
export function validatePhoneNumber(phone: string): boolean {
  const digits = phone.replace(/\D/g, '');

  // UK phone numbers (national format)
  if (digits.startsWith('0') && digits.length >= 10 && digits.length <= 11) {
    return true;
  }

  // UK phone numbers (international format)
  if (digits.startsWith('44') && digits.length >= 12 && digits.length <= 13) {
    return true;
  }

  return false;
}

/**
 * Get a placeholder for UK phone input based on type
 * @param type - 'mobile' | 'landline' | 'any'
 * @returns Placeholder string
 */
export function getPhonePlaceholder(type: 'mobile' | 'landline' | 'any' = 'any'): string {
  switch (type) {
    case 'mobile':
      return '07123 456 789';
    case 'landline':
      return '020 1234 5678';
    case 'any':
    default:
      return '020 1234 5678';
  }
}
