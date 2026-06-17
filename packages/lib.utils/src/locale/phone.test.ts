import { describe, it, expect } from 'vitest';
import { formatPhoneNumber, validatePhoneNumber, getPhonePlaceholder } from './phone';

describe('formatPhoneNumber', () => {
  it('formats a national mobile number', () => {
    expect(formatPhoneNumber('07123456789')).toBe('07123 456 789');
  });

  it('formats a national mobile number in international form', () => {
    expect(formatPhoneNumber('07123456789', true)).toBe('+44 7123 456 789');
  });

  it('formats a London (020) landline', () => {
    expect(formatPhoneNumber('02012345678')).toBe('020 1234 5678');
  });

  it('formats a London number in international form', () => {
    expect(formatPhoneNumber('02012345678', true)).toBe('+44 20 1234 5678');
  });

  it('formats an international-prefixed number (starting 44)', () => {
    expect(formatPhoneNumber('447123456789')).toBe('+44 7123 456 789');
  });

  it('formats a 10-digit 01xx landline', () => {
    expect(formatPhoneNumber('01234567890')).toBe('01234 56789 0');
  });

  it('formats an over-length 01xx landline using the 3-digit area code branch', () => {
    // national part is 11 digits (>10 and not exactly 10), so the default
    // 3-digit area-code grouping applies: 0+123 / 4567 / 8901.
    expect(formatPhoneNumber('012345678901')).toBe('0123 4567 8901');
  });

  it('formats a bare 10-digit number without a leading zero', () => {
    expect(formatPhoneNumber('2012345678')).toBe('020 1234 5678');
  });

  it('returns the original string when it cannot be parsed', () => {
    expect(formatPhoneNumber('12345')).toBe('12345');
  });
});

describe('validatePhoneNumber', () => {
  it('accepts national format numbers (10-11 digits starting 0)', () => {
    expect(validatePhoneNumber('02012345678')).toBe(true);
    expect(validatePhoneNumber('0712345678')).toBe(true);
  });

  it('accepts international format numbers (12-13 digits starting 44)', () => {
    expect(validatePhoneNumber('447123456789')).toBe(true);
    expect(validatePhoneNumber('+44 7123 456789')).toBe(true);
  });

  it('rejects numbers that are too short or otherwise invalid', () => {
    expect(validatePhoneNumber('12345')).toBe(false);
    expect(validatePhoneNumber('')).toBe(false);
  });
});

describe('getPhonePlaceholder', () => {
  it('returns a mobile example for mobile', () => {
    expect(getPhonePlaceholder('mobile')).toBe('07123 456 789');
  });

  it('returns a landline example for landline', () => {
    expect(getPhonePlaceholder('landline')).toBe('020 1234 5678');
  });

  it('returns a landline example for any (the default)', () => {
    expect(getPhonePlaceholder('any')).toBe('020 1234 5678');
    expect(getPhonePlaceholder()).toBe('020 1234 5678');
  });
});
