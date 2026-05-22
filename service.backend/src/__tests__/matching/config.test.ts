import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  MATCH_CACHE_TTL_MAX_SECONDS,
  MATCH_CACHE_TTL_MIN_SECONDS,
  loadMatchConfig,
} from '../../matching/config';

describe('loadMatchConfig — MATCH_CACHE_TTL_SECONDS bounds', () => {
  const original = process.env.MATCH_CACHE_TTL_SECONDS;

  beforeEach(() => {
    delete process.env.MATCH_CACHE_TTL_SECONDS;
  });

  afterEach(() => {
    if (original === undefined) {
      delete process.env.MATCH_CACHE_TTL_SECONDS;
    } else {
      process.env.MATCH_CACHE_TTL_SECONDS = original;
    }
  });

  it('uses the default TTL when env var is unset', () => {
    expect(loadMatchConfig().cacheTtlSeconds).toBe(3600);
  });

  it('accepts a sensible override unchanged', () => {
    process.env.MATCH_CACHE_TTL_SECONDS = '3600';
    expect(loadMatchConfig().cacheTtlSeconds).toBe(3600);
  });

  it('clamps TTL=0 up to the documented minimum so cache cannot be silently starved', () => {
    process.env.MATCH_CACHE_TTL_SECONDS = '0';
    expect(loadMatchConfig().cacheTtlSeconds).toBe(MATCH_CACHE_TTL_MIN_SECONDS);
  });

  it('clamps absurdly large TTLs down to the documented maximum', () => {
    process.env.MATCH_CACHE_TTL_SECONDS = '999999999';
    expect(loadMatchConfig().cacheTtlSeconds).toBe(MATCH_CACHE_TTL_MAX_SECONDS);
  });

  it('clamps values below the minimum', () => {
    process.env.MATCH_CACHE_TTL_SECONDS = '5';
    expect(loadMatchConfig().cacheTtlSeconds).toBe(MATCH_CACHE_TTL_MIN_SECONDS);
  });
});
