import { describe, expect, it } from 'vitest';

import { PhoneNumberSchema } from './user';

describe('PhoneNumberSchema', () => {
  it('accepts a plain UK number after stripping separators', () => {
    const result = PhoneNumberSchema.safeParse('020 7946 0958');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe('02079460958');
    }
  });

  it('accepts an international number with a leading +', () => {
    const result = PhoneNumberSchema.safeParse('+44 7911 123456');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe('+447911123456');
    }
  });

  it('rejects non-digit input even when the length is in range', () => {
    // Regression: the schema previously only checked length, so a 10–20
    // character non-numeric string passed despite the "digits" message.
    expect(PhoneNumberSchema.safeParse('abcdefghij').success).toBe(false);
    expect(PhoneNumberSchema.safeParse('not-a-number!').success).toBe(false);
  });

  it('rejects too-short and too-long numbers', () => {
    expect(PhoneNumberSchema.safeParse('12345').success).toBe(false);
    expect(PhoneNumberSchema.safeParse('1'.repeat(21)).success).toBe(false);
  });
});
