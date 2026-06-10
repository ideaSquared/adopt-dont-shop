// Behaviour tests for the shared query-string pagination parser
// (ADS-783). List routes must never forward NaN or an unbounded limit
// to the gRPC clients.

import { describe, expect, it } from 'vitest';

import { MAX_PAGE_LIMIT, parsePagination } from './pagination.js';

describe('parsePagination', () => {
  it('returns page 1 / limit 20 when both params are missing', () => {
    expect(parsePagination({})).toEqual({ ok: true, page: 1, limit: 20 });
  });

  it('respects per-route defaults when params are missing', () => {
    expect(parsePagination({}, { limit: 0 })).toEqual({ ok: true, page: 1, limit: 0 });
    expect(parsePagination({}, { limit: 8 })).toEqual({ ok: true, page: 1, limit: 8 });
    expect(parsePagination({}, { page: 2, limit: 5 })).toEqual({ ok: true, page: 2, limit: 5 });
  });

  it('passes valid values through as numbers', () => {
    expect(parsePagination({ page: '3', limit: '50' })).toEqual({ ok: true, page: 3, limit: 50 });
  });

  it('accepts limit exactly at the maximum', () => {
    expect(parsePagination({ limit: String(MAX_PAGE_LIMIT) })).toEqual({
      ok: true,
      page: 1,
      limit: MAX_PAGE_LIMIT,
    });
  });

  it('rejects a non-numeric page', () => {
    const result = parsePagination({ page: 'abc' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('page');
    }
  });

  it('rejects a non-numeric limit', () => {
    const result = parsePagination({ limit: 'abc' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('limit');
    }
  });

  it('rejects non-integer values', () => {
    expect(parsePagination({ limit: '2.5' }).ok).toBe(false);
    expect(parsePagination({ page: '1e3' }).ok).toBe(false);
    expect(parsePagination({ limit: '12abc' }).ok).toBe(false);
  });

  it('rejects limit above the maximum instead of clamping', () => {
    const result = parsePagination({ limit: '101' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('100');
    }
  });

  it('treats zero and negative values as missing (falls back to defaults)', () => {
    expect(parsePagination({ page: '0', limit: '-5' })).toEqual({ ok: true, page: 1, limit: 20 });
    expect(parsePagination({ limit: '0' }, { limit: 8 })).toEqual({ ok: true, page: 1, limit: 8 });
  });

  it('treats empty strings as missing', () => {
    expect(parsePagination({ page: '', limit: '' }, { limit: 0 })).toEqual({
      ok: true,
      page: 1,
      limit: 0,
    });
  });
});
