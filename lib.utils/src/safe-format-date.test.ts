import { describe, it, expect } from 'vitest';
import { safeFormatDate } from './safe-format-date';

describe('safeFormatDate', () => {
  it('returns the fallback for null', () => {
    expect(safeFormatDate(null)).toBe('—');
  });

  it('returns the fallback for undefined', () => {
    expect(safeFormatDate(undefined)).toBe('—');
  });

  it('returns the fallback for an invalid date string', () => {
    expect(safeFormatDate('not-a-date')).toBe('—');
  });

  it('returns a formatted date for a valid ISO string', () => {
    const result = safeFormatDate('2024-06-15T12:00:00Z');
    expect(result).toBe('15/06/2024');
  });

  it('returns a formatted date for a Date object', () => {
    const result = safeFormatDate(new Date('2024-06-15T12:00:00Z'));
    expect(result).toBe('15/06/2024');
  });

  it('uses a custom fallback when provided', () => {
    expect(safeFormatDate(null, 'N/A')).toBe('N/A');
  });

  it('returns the fallback for an empty string', () => {
    expect(safeFormatDate('')).toBe('—');
  });
});
