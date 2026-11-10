import { describe, it, expect } from 'vitest';
import { isSafeRedirectPath, redirectTargetFromState } from './safeRedirect';

describe('isSafeRedirectPath', () => {
  describe('safe paths', () => {
    it('accepts a simple root path', () => {
      expect(isSafeRedirectPath('/')).toBe(true);
    });

    it('accepts a normal internal path', () => {
      expect(isSafeRedirectPath('/pets/123')).toBe(true);
    });

    it('accepts a path with query string', () => {
      expect(isSafeRedirectPath('/search?q=cats')).toBe(true);
    });

    it('accepts a path with hash fragment', () => {
      expect(isSafeRedirectPath('/settings#notifications')).toBe(true);
    });
  });

  describe('unsafe paths', () => {
    it('rejects a protocol-relative URL (//evil.com)', () => {
      expect(isSafeRedirectPath('//evil.com')).toBe(false);
    });

    it('rejects a backslash variant (/\\\\evil)', () => {
      expect(isSafeRedirectPath('/\\evil')).toBe(false);
    });

    it('rejects an http absolute URL', () => {
      expect(isSafeRedirectPath('http://evil.com')).toBe(false);
    });

    it('rejects an https absolute URL', () => {
      expect(isSafeRedirectPath('https://evil.com/steal')).toBe(false);
    });

    it('rejects a javascript: pseudo-URL', () => {
      expect(isSafeRedirectPath('javascript:alert(1)')).toBe(false);
    });

    it('rejects an empty string', () => {
      expect(isSafeRedirectPath('')).toBe(false);
    });

    it('rejects null', () => {
      expect(isSafeRedirectPath(null)).toBe(false);
    });

    it('rejects undefined', () => {
      expect(isSafeRedirectPath(undefined)).toBe(false);
    });

    it('rejects a relative path without leading slash', () => {
      expect(isSafeRedirectPath('evil.com')).toBe(false);
    });
  });
});

describe('redirectTargetFromState', () => {
  it('returns the guarded location with its query and hash', () => {
    const state = { from: { pathname: '/pets', search: '?status=x', hash: '#top' } };
    expect(redirectTargetFromState(state)).toBe('/pets?status=x#top');
  });

  it('returns just the path when the location has no query or hash', () => {
    expect(redirectTargetFromState({ from: { pathname: '/pets' } })).toBe('/pets');
  });

  it.each([
    ['no state', null],
    ['state without from', {}],
    ['a from without a path', { from: {} }],
    ['a protocol-relative path', { from: { pathname: '//evil.com', search: '?a=1' } }],
    ['an absolute URL', { from: { pathname: 'https://evil.com' } }],
    ['a non-object from', { from: '/pets' }],
  ])('falls back to "/" for %s', (_label, state) => {
    expect(redirectTargetFromState(state)).toBe('/');
  });
});
