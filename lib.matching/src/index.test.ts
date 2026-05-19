import { describe, expect, it } from 'vitest';
import { REASON_CHIP_KINDS, isReasonChipKind } from './index';

describe('REASON_CHIP_KINDS', () => {
  it('matches the backend ReasonChip surface (rule.scorer.ts + match-reason-chips component)', () => {
    expect(REASON_CHIP_KINDS).toEqual([
      'pref_match',
      'lifestyle',
      'distance',
      'similar_to_liked',
      'fresh',
    ]);
  });

  it('has no duplicate kinds', () => {
    expect(new Set(REASON_CHIP_KINDS).size).toBe(REASON_CHIP_KINDS.length);
  });
});

describe('isReasonChipKind', () => {
  it('accepts every declared kind', () => {
    for (const kind of REASON_CHIP_KINDS) {
      expect(isReasonChipKind(kind)).toBe(true);
    }
  });

  it('rejects unknown strings and non-strings', () => {
    expect(isReasonChipKind('unknown_kind')).toBe(false);
    expect(isReasonChipKind('')).toBe(false);
    expect(isReasonChipKind(undefined)).toBe(false);
    expect(isReasonChipKind(null)).toBe(false);
    expect(isReasonChipKind(42)).toBe(false);
    expect(isReasonChipKind({})).toBe(false);
  });
});
