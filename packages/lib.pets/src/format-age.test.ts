import { describe, it, expect } from 'vitest';
import { formatAge } from './format-age';

describe('formatAge', () => {
  it.each([
    [2, 3, '2 years, 3 months'],
    [1, 1, '1 year, 1 month'],
    [1, 0, '1 year'],
    [4, 0, '4 years'],
    [4, undefined, '4 years'],
    [0, 1, '1 month'],
    [0, 6, '6 months'],
    [undefined, 6, '6 months'],
  ])('formats %s years and %s months as "%s"', (years, months, expected) => {
    expect(formatAge(years, months)).toBe(expected);
  });

  it('returns "Unknown" when no age is recorded', () => {
    expect(formatAge(undefined, undefined)).toBe('Unknown');
    expect(formatAge(0, 0)).toBe('Unknown');
  });

  it('returns the supplied fallback when no age is recorded', () => {
    expect(formatAge(undefined, undefined, 'Adult')).toBe('Adult');
  });
});
