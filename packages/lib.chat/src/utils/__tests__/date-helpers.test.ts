import { safeFormatDistanceToNow } from '../date-helpers';

describe('safeFormatDistanceToNow', () => {
  it('returns the default fallback for a missing date', () => {
    expect(safeFormatDistanceToNow(null)).toBe('Unknown');
    expect(safeFormatDistanceToNow(undefined)).toBe('Unknown');
    expect(safeFormatDistanceToNow('')).toBe('Unknown');
  });

  it('returns a custom fallback when provided', () => {
    expect(safeFormatDistanceToNow(null, 'just now')).toBe('just now');
  });

  it('returns the fallback for an unparseable date string', () => {
    expect(safeFormatDistanceToNow('not-a-date')).toBe('Unknown');
  });

  it('formats an ISO timestamp as a relative suffix', () => {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const result = safeFormatDistanceToNow(oneHourAgo);
    expect(result).toMatch(/ago$/);
    expect(result).not.toBe('Unknown');
  });

  it('formats a non-ISO date string via the Date constructor path', () => {
    const result = safeFormatDistanceToNow('2020-01-01');
    expect(result).toMatch(/ago$/);
  });
});
