import { describe, expect, it } from 'vitest';

import { constantTimeEquals } from './constant-time.js';

describe('constantTimeEquals (ADS-1377)', () => {
  it('accepts identical secrets', () => {
    expect(constantTimeEquals('shhh-scrape-me', 'shhh-scrape-me')).toBe(true);
  });

  it('rejects a same-length secret that differs in the last byte', () => {
    expect(constantTimeEquals('shhh-scrape-me', 'shhh-scrape-mf')).toBe(false);
  });

  it('rejects a shorter input without throwing', () => {
    expect(constantTimeEquals('shhh', 'shhh-scrape-me')).toBe(false);
  });

  it('rejects a longer input without throwing', () => {
    expect(constantTimeEquals('shhh-scrape-me-and-more', 'shhh-scrape-me')).toBe(false);
  });

  it('rejects an empty input against a non-empty secret', () => {
    expect(constantTimeEquals('', 'shhh-scrape-me')).toBe(false);
  });

  it('rejects inputs with equal character counts but different byte lengths without throwing', () => {
    // "é" is 2 bytes in UTF-8, so these strings are both 3 chars but 3 vs 4 bytes.
    expect(constantTimeEquals('abc', 'abé')).toBe(false);
  });
});
