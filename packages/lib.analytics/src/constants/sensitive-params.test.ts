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

  it('strips a token from a RELATIVE path and returns relative form', () => {
    // trackPageView receives route paths from AnalyticsContext callers, so the
    // strip must not fail open on a relative input (Copilot review, #1265).
    expect(stripSensitiveParams('/verify-email?token=SECRET&ref=abc')).toBe(
      '/verify-email?ref=abc'
    );
  });

  it('leaves a relative path with no sensitive params unchanged', () => {
    expect(stripSensitiveParams('/pets/123?page=2')).toBe('/pets/123?page=2');
  });

  // ADS-1118: single-use tokens also arrive in the URL fragment — OAuth-implicit
  // callbacks (#access_token=…) and hash-routed app paths (#/verify-email?token=…).
  // url.searchParams never sees the fragment, so it must be scrubbed too.
  it('removes an OAuth-implicit token from the fragment', () => {
    expect(stripSensitiveParams('https://app.example/dashboard#access_token=SECRET')).toBe(
      'https://app.example/dashboard'
    );
  });

  it('preserves non-sensitive fragment params while removing the sensitive one', () => {
    expect(stripSensitiveParams('https://app.example/cb#access_token=SECRET&state=xyz')).toBe(
      'https://app.example/cb#state=xyz'
    );
  });

  it('removes a token from a hash-routed path and keeps the route + safe params', () => {
    expect(stripSensitiveParams('https://app.example/#/verify-email?token=SECRET&ref=abc')).toBe(
      'https://app.example/#/verify-email?ref=abc'
    );
  });

  it('strips a token from a fragment on a RELATIVE input and returns relative form', () => {
    expect(stripSensitiveParams('/#/reset?token=SECRET&x=1')).toBe('/#/reset?x=1');
  });

  it('strips sensitive params from BOTH the query string and the fragment', () => {
    expect(stripSensitiveParams('https://app.example/x?token=A#/y?code=B')).toBe(
      'https://app.example/x#/y'
    );
  });

  it('leaves a plain anchor fragment byte-for-byte unchanged', () => {
    const url = 'https://app.example/pets#section-2';
    expect(stripSensitiveParams(url)).toBe(url);
  });
});
