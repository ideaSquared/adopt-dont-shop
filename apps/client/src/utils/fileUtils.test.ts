import { describe, it, expect } from 'vitest';
import { resolveFileUrl } from './fileUtils';

describe('resolveFileUrl', () => {
  describe('passes through safe absolute URLs', () => {
    it('returns http URLs unchanged', () => {
      expect(resolveFileUrl('http://cdn.example.com/img.png')).toBe(
        'http://cdn.example.com/img.png'
      );
    });

    it('returns https URLs unchanged', () => {
      expect(resolveFileUrl('https://cdn.example.com/img.png')).toBe(
        'https://cdn.example.com/img.png'
      );
    });

    it('accepts mixed-case http/https schemes', () => {
      expect(resolveFileUrl('HTTPS://cdn.example.com/img.png')).toBe(
        'HTTPS://cdn.example.com/img.png'
      );
    });
  });

  describe('rejects dangerous schemes', () => {
    it('rejects javascript: URLs', () => {
      expect(resolveFileUrl('javascript:alert(1)')).toBeUndefined();
    });

    it('rejects mixed-case / padded javascript: URLs', () => {
      expect(resolveFileUrl('  JaVaScRiPt:alert(1)')).toBeUndefined();
    });

    it('rejects data: URLs', () => {
      expect(resolveFileUrl('data:text/html,<script>alert(1)</script>')).toBeUndefined();
    });

    it('rejects vbscript: URLs', () => {
      expect(resolveFileUrl('vbscript:msgbox(1)')).toBeUndefined();
    });

    it('rejects file: URLs', () => {
      expect(resolveFileUrl('file:///etc/passwd')).toBeUndefined();
    });

    it('rejects protocol-relative URLs', () => {
      expect(resolveFileUrl('//evil.com/path')).toBeUndefined();
    });
  });

  describe('handles empty / placeholder input', () => {
    it('returns undefined for undefined', () => {
      expect(resolveFileUrl(undefined)).toBeUndefined();
    });

    it('returns undefined for empty string', () => {
      expect(resolveFileUrl('')).toBeUndefined();
    });

    it('returns undefined for via.placeholder.com URLs', () => {
      expect(resolveFileUrl('https://via.placeholder.com/150')).toBeUndefined();
    });

    it('does not reject paths that merely contain the word "placeholder"', () => {
      expect(resolveFileUrl('/some/placeholder/path.png')).toBe('/some/placeholder/path.png');
    });

    it('does not reject a different host that has via.placeholder.com as a path segment', () => {
      expect(resolveFileUrl('https://evil.com/via.placeholder.com/150')).toBe(
        'https://evil.com/via.placeholder.com/150'
      );
    });
  });

  describe('resolves relative paths against backend base URL', () => {
    it('resolves /-prefixed paths', () => {
      const result = resolveFileUrl('/uploads/cat.jpg');
      expect(result).toMatch(/\/uploads\/cat\.jpg$/);
    });

    it('resolves bare relative paths', () => {
      const result = resolveFileUrl('uploads/cat.jpg');
      expect(result).toMatch(/\/uploads\/cat\.jpg$/);
    });

    it('uses empty-string base when VITE_API_BASE_URL is unset (same-origin)', () => {
      // With no env var the result is a relative URL — no hardcoded host.
      const result = resolveFileUrl('/uploads/cat.jpg');
      expect(result).toBe('/uploads/cat.jpg');
    });
  });
});
