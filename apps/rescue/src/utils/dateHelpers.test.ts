/**
 * Behavioural tests for the date helper utilities used across the rescue app.
 *
 * These verify the observable behaviour staff rely on: relative timestamps
 * shown next to activity, applications and notifications, and graceful
 * fallbacks when the backend sends an empty or malformed date.
 */

import { safeFormatDistanceToNow } from './dateHelpers';

describe('safeFormatDistanceToNow', () => {
  it('returns the default fallback when no date is supplied', () => {
    expect(safeFormatDistanceToNow(undefined)).toBe('Unknown');
    expect(safeFormatDistanceToNow(null)).toBe('Unknown');
    expect(safeFormatDistanceToNow('')).toBe('Unknown');
  });

  it('honours a custom fallback string', () => {
    expect(safeFormatDistanceToNow(null, 'Never')).toBe('Never');
  });

  it('formats an ISO timestamp as a suffixed relative time', () => {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    const result = safeFormatDistanceToNow(oneHourAgo);

    expect(result).toMatch(/ago$/);
    expect(result).toMatch(/hour/);
  });

  it('formats a plain date string (no T separator) as relative time', () => {
    const result = safeFormatDistanceToNow('2020-01-01');

    expect(result).toMatch(/ago$/);
  });

  it('returns the fallback for an unparseable date string', () => {
    expect(safeFormatDistanceToNow('not-a-date', 'n/a')).toBe('n/a');
  });
});
