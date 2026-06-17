import { describe, it, expect } from 'vitest';
import {
  formatDate,
  formatDateTime,
  formatTime,
  formatRelativeDate,
  formatCustomDate,
} from './date';

describe('formatDate', () => {
  it('formats an ISO string to DD/MM/YYYY', () => {
    expect(formatDate('2026-05-24T10:30:00.000Z')).toBe('24/05/2026');
  });

  it('formats a Date object', () => {
    expect(formatDate(new Date(2025, 0, 1))).toBe('01/01/2025');
  });

  it('returns "Invalid date" for an unparseable string', () => {
    expect(formatDate('not-a-date')).toBe('Invalid date');
  });

  it('returns "Invalid date" for NaN', () => {
    expect(formatDate(NaN)).toBe('Invalid date');
  });
});

describe('formatDateTime', () => {
  it('formats date and time in UK format', () => {
    expect(formatDateTime(new Date(2026, 4, 24, 14, 30))).toBe('24/05/2026 14:30');
  });

  it('returns "Invalid date" for an unparseable string', () => {
    expect(formatDateTime('nope')).toBe('Invalid date');
  });
});

describe('formatTime', () => {
  it('formats time in 24-hour format', () => {
    expect(formatTime(new Date(2026, 4, 24, 9, 5))).toBe('09:05');
  });

  it('returns "Invalid time" for an unparseable string', () => {
    expect(formatTime('nope')).toBe('Invalid time');
  });
});

describe('formatRelativeDate', () => {
  it('produces a relative string with a suffix', () => {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    expect(formatRelativeDate(fiveMinutesAgo)).toContain('ago');
  });

  it('returns "Invalid date" for an unparseable string', () => {
    expect(formatRelativeDate('nope')).toBe('Invalid date');
  });
});

describe('formatCustomDate', () => {
  it('formats with a custom date-fns pattern', () => {
    expect(formatCustomDate('2026-05-24T00:00:00.000Z', 'yyyy/MM/dd')).toBe('2026/05/24');
  });

  it('returns "Invalid date" for an unparseable string', () => {
    expect(formatCustomDate('nope', 'yyyy')).toBe('Invalid date');
  });

  it('returns "Invalid date" when the format string is invalid', () => {
    // date-fns throws a RangeError for the protected `YYYY` token (callers
    // must use lowercase `yyyy`); formatCustomDate catches it and returns the
    // fallback string rather than propagating.
    expect(formatCustomDate(new Date(2026, 0, 1), 'YYYY')).toBe('Invalid date');
  });
});
