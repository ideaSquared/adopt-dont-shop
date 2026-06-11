import { describe, it, expect } from 'vitest';
import { formatDisplayDate } from './date';

describe('formatDisplayDate', () => {
  it('formats an ISO string to "d MMM yyyy"', () => {
    expect(formatDisplayDate('2026-05-24T10:30:00.000Z')).toBe('24 May 2026');
  });

  it('formats a Date object', () => {
    expect(formatDisplayDate(new Date(2025, 0, 1))).toBe('1 Jan 2025');
  });

  it('formats a timestamp number', () => {
    // 1 Jan 2024 00:00:00 UTC
    expect(formatDisplayDate(1704067200000)).toBe('1 Jan 2024');
  });

  it('includes time when includeTime option is true', () => {
    expect(formatDisplayDate('2026-05-24T14:30:00.000Z', { includeTime: true })).toMatch(
      /24 May 2026, \d{2}:\d{2}/
    );
  });

  it('returns "Invalid date" for an invalid string', () => {
    expect(formatDisplayDate('not-a-date')).toBe('Invalid date');
  });

  it('returns "Invalid date" for NaN', () => {
    expect(formatDisplayDate(NaN)).toBe('Invalid date');
  });
});
