// Behaviour tests for the shared query-string pagination parser
// (ADS-783). List routes must never forward NaN or an unbounded limit
// to the gRPC clients.

import { describe, expect, it } from 'vitest';

import { buildPaginationEnvelope, MAX_PAGE_LIMIT, parsePagination } from './pagination.js';

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

describe('buildPaginationEnvelope', () => {
  describe('offset mode (datatable surfaces with a real count)', () => {
    it('derives totalPages and next/prev from a real backend total', () => {
      expect(buildPaginationEnvelope({ mode: 'offset', page: 1, limit: 25, total: 100 })).toEqual({
        page: 1,
        limit: 25,
        total: 100,
        totalPages: 4,
        hasNext: true,
        hasPrev: false,
      });
    });

    it('reports hasPrev and no hasNext on the last page', () => {
      expect(buildPaginationEnvelope({ mode: 'offset', page: 4, limit: 25, total: 100 })).toEqual({
        page: 4,
        limit: 25,
        total: 100,
        totalPages: 4,
        hasNext: false,
        hasPrev: true,
      });
    });

    it('rounds a partial final page up', () => {
      const meta = buildPaginationEnvelope({ mode: 'offset', page: 1, limit: 25, total: 26 });
      expect(meta.totalPages).toBe(2);
      expect(meta.hasNext).toBe(true);
    });

    it('returns a single empty page for a zero total', () => {
      expect(buildPaginationEnvelope({ mode: 'offset', page: 1, limit: 25, total: 0 })).toEqual({
        page: 1,
        limit: 25,
        total: 0,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      });
    });

    it('treats a zero limit (fetch-all) as a single page', () => {
      expect(buildPaginationEnvelope({ mode: 'offset', page: 1, limit: 0, total: 40 })).toEqual({
        page: 1,
        limit: 0,
        total: 40,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      });
    });
  });

  describe('keyset mode (feeds with no cheap count)', () => {
    it('carries the cursor and omits the count it cannot produce', () => {
      expect(
        buildPaginationEnvelope({ mode: 'keyset', limit: 20, hasNext: true, nextCursor: 'c1' })
      ).toEqual({
        page: 1,
        limit: 20,
        hasNext: true,
        hasPrev: false,
        nextCursor: 'c1',
      });
    });

    it('omits nextCursor and any count on the final page', () => {
      const meta = buildPaginationEnvelope({ mode: 'keyset', limit: 20, hasNext: false });
      expect(meta).toEqual({ page: 1, limit: 20, hasNext: false, hasPrev: false });
      expect(meta).not.toHaveProperty('nextCursor');
      expect(meta).not.toHaveProperty('total');
      expect(meta).not.toHaveProperty('totalPages');
    });
  });
});
