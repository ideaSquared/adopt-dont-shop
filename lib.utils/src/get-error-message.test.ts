import { describe, it, expect } from 'vitest';
import { getErrorMessage } from './get-error-message';

describe('getErrorMessage', () => {
  it('returns session-expired for 401', () => {
    expect(getErrorMessage({ status: 401 })).toBe('Session expired. Please log in again.');
  });

  it('returns rate-limit for 429', () => {
    expect(getErrorMessage({ status: 429 })).toBe('Too many requests. Please wait a moment.');
  });

  it('returns server-error for 5xx', () => {
    expect(getErrorMessage({ status: 500 })).toContain('wrong on our end');
    expect(getErrorMessage({ status: 503 })).toContain('wrong on our end');
  });

  it('returns network error for Failed to fetch', () => {
    expect(getErrorMessage(new TypeError('Failed to fetch'))).toContain('internet connection');
  });

  it('returns generic fallback for unknown errors', () => {
    expect(getErrorMessage(new Error('weird'))).toBe('Something went wrong. Please try again.');
    expect(getErrorMessage(null)).toBe('Something went wrong. Please try again.');
  });
});
