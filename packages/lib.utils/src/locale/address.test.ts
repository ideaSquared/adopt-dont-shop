import { describe, it, expect } from 'vitest';
import {
  validatePostcode,
  formatPostcode,
  getPostcodePlaceholder,
  UK_ADDRESS_CONFIG,
  UK_COUNTIES,
} from './address';

describe('validatePostcode', () => {
  it('accepts valid UK postcodes in various formats', () => {
    expect(validatePostcode('SW1A 1AA')).toBe(true);
    expect(validatePostcode('M1 1AA')).toBe(true);
    expect(validatePostcode('B33 8TH')).toBe(true);
    expect(validatePostcode('CR2 6XH')).toBe(true);
    expect(validatePostcode('DN55 1PT')).toBe(true);
  });

  it('accepts postcodes without a space', () => {
    expect(validatePostcode('SW1A1AA')).toBe(true);
  });

  it('accepts lowercase postcodes', () => {
    expect(validatePostcode('sw1a 1aa')).toBe(true);
  });

  it('trims surrounding whitespace before validating', () => {
    expect(validatePostcode('  SW1A 1AA  ')).toBe(true);
  });

  it('rejects malformed postcodes', () => {
    expect(validatePostcode('NOT A POSTCODE')).toBe(false);
    expect(validatePostcode('12345')).toBe(false);
    expect(validatePostcode('')).toBe(false);
  });
});

describe('formatPostcode', () => {
  it('uppercases and inserts the standard single space', () => {
    expect(formatPostcode('sw1a1aa')).toBe('SW1A 1AA');
  });

  it('normalises extra whitespace', () => {
    expect(formatPostcode('  m1   1aa ')).toBe('M1 1AA');
  });

  it('returns the original string when it cannot be parsed (too short)', () => {
    expect(formatPostcode('AB1')).toBe('AB1');
  });

  it('returns the original string when it cannot be parsed (too long)', () => {
    expect(formatPostcode('ABCDEFGH')).toBe('ABCDEFGH');
  });
});

describe('getPostcodePlaceholder', () => {
  it('returns the canonical example postcode', () => {
    expect(getPostcodePlaceholder()).toBe('SW1A 1AA');
  });
});

describe('UK_ADDRESS_CONFIG', () => {
  it('declares United Kingdom as the default country', () => {
    expect(UK_ADDRESS_CONFIG.defaultCountry).toBe('United Kingdom');
  });

  it('marks street, city, postcode and country as required but county optional', () => {
    expect(UK_ADDRESS_CONFIG.fields.street.required).toBe(true);
    expect(UK_ADDRESS_CONFIG.fields.city.required).toBe(true);
    expect(UK_ADDRESS_CONFIG.fields.postcode.required).toBe(true);
    expect(UK_ADDRESS_CONFIG.fields.country.required).toBe(true);
    expect(UK_ADDRESS_CONFIG.fields.county.required).toBe(false);
  });
});

describe('UK_COUNTIES', () => {
  it('contains well-known counties', () => {
    expect(UK_COUNTIES).toContain('Greater London');
    expect(UK_COUNTIES).toContain('Kent');
  });
});
