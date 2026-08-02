import { describe, expect, it } from 'vitest';

import { SENSITIVE_QUERY_PARAMS, stripSensitiveParams } from './sensitive-params';

describe('stripSensitiveParams (ADS-1012)', () => {
  it('removes a reset/verify/invite token from the query string', () => {
    expect(stripSensitiveParams('https://app.example/reset-password?token=SECRET')).toBe(
      'https://app.example/reset-password'
    );
  });

  it('removes every sensitive param while preserving the rest', () => {
    const out = stripSensitiveParams(
      'https://app.example/x?token=a&code=b&access_token=c&page=2&utm_source=news'
    );
    const params = new URL(out).searchParams;
    for (const p of SENSITIVE_QUERY_PARAMS) {
      expect(params.has(p)).toBe(false);
    }
    // Non-sensitive params survive untouched.
    expect(params.get('page')).toBe('2');
    expect(params.get('utm_source')).toBe('news');
  });

  it('leaves a URL with no sensitive params byte-for-byte unchanged', () => {
    const url = 'https://app.example/pets?page=2&utm_source=news';
    expect(stripSensitiveParams(url)).toBe(url);
  });

  it('returns a non-URL string unchanged rather than throwing', () => {
    expect(stripSensitiveParams('/relative/path?token=SECRET')).toBe('/relative/path?token=SECRET');
  });
});
