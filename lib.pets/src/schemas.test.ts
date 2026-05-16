/**
 * Schema-level tests for adoption fee validation (ADS-578).
 *
 * The form layer mirrors this regex, but the schema is the source of
 * truth: any value that survives PetCreateDataSchema.parse must be a
 * non-negative decimal with at most two fractional digits.
 */

import { describe, expect, it } from 'vitest';
import { AdoptionFeeStringSchema, PetCreateDataSchema } from './schemas';

describe('AdoptionFeeStringSchema', () => {
  it.each(['0', '150', '150.0', '150.5', '150.00', '0.99'])('accepts %s', (value) => {
    expect(AdoptionFeeStringSchema.safeParse(value).success).toBe(true);
  });

  it.each(['free', '£150', 'tbd', '-100', '1.234', '1e5', ''])('rejects %s', (value) => {
    expect(AdoptionFeeStringSchema.safeParse(value).success).toBe(false);
  });
});

describe('PetCreateDataSchema adoptionFee field', () => {
  const validBase = {
    name: 'Rex',
    type: 'dog' as const,
    breed: 'Labrador',
    gender: 'male' as const,
    size: 'medium' as const,
    color: 'Brown',
    rescueId: 'rescue-1',
  };

  it('accepts an omitted adoption fee', () => {
    expect(PetCreateDataSchema.safeParse(validBase).success).toBe(true);
  });

  it('accepts a valid numeric adoption fee string', () => {
    expect(
      PetCreateDataSchema.safeParse({ ...validBase, adoptionFee: '150.00' }).success
    ).toBe(true);
  });

  it('rejects a non-numeric adoption fee string', () => {
    expect(
      PetCreateDataSchema.safeParse({ ...validBase, adoptionFee: '£150' }).success
    ).toBe(false);
  });
});
