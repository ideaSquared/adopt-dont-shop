import { describe, it, expect } from 'vitest';
import { isSafeRedirectPath } from './safeRedirect';

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
