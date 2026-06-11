import { describe, it, expect } from 'vitest';
import { safeHref } from './safe-href';

describe('safeHref', () => {
  describe('passes through safe URLs', () => {
    it('returns http URLs unchanged', () => {
      expect(safeHref('http://example.com')).toBe('http://example.com');
      expect(safeHref('http://example.com/path?q=1')).toBe('http://example.com/path?q=1');
    });

    it('returns https URLs unchanged', () => {
      expect(safeHref('https://example.com')).toBe('https://example.com');
    });

    it('returns mailto URLs unchanged', () => {
      expect(safeHref('mailto:user@example.com')).toBe('mailto:user@example.com');
    });

    it('returns tel URLs unchanged', () => {
      expect(safeHref('tel:+441234567890')).toBe('tel:+441234567890');
    });

    it('returns same-origin relative paths unchanged', () => {
      expect(safeHref('/path/foo')).toBe('/path/foo');
      expect(safeHref('/')).toBe('/');
    });

    it('returns scheme-less relative URLs unchanged', () => {
      expect(safeHref('foo/bar')).toBe('foo/bar');
      expect(safeHref('page.html')).toBe('page.html');
    });

    it('accepts mixed-case allowed schemes', () => {
      expect(safeHref('HTTPS://example.com')).toBe('HTTPS://example.com');
      expect(safeHref('MailTo:user@example.com')).toBe('MailTo:user@example.com');
    });

    it('trims whitespace before evaluating allowlisted schemes', () => {
      expect(safeHref('  https://example.com  ')).toBe('https://example.com');
    });
  });

  describe('blocks dangerous URLs', () => {
    it('rejects javascript: URLs', () => {
      expect(safeHref('javascript:alert(1)')).toBe('#');
    });

    it('rejects mixed-case javascript: URLs', () => {
      expect(safeHref('JaVaScRiPt:alert(1)')).toBe('#');
      expect(safeHref('JAVASCRIPT:alert(1)')).toBe('#');
    });

    it('rejects javascript: URLs with leading whitespace', () => {
      expect(safeHref('  javascript:alert(1)')).toBe('#');
      expect(safeHref('\tjavascript:alert(1)')).toBe('#');
      expect(safeHref('\njavascript:alert(1)')).toBe('#');
    });

    it('rejects data: URLs', () => {
      expect(safeHref('data:text/html,<script>alert(1)</script>')).toBe('#');
    });

    it('rejects vbscript: URLs', () => {
      expect(safeHref('vbscript:msgbox(1)')).toBe('#');
    });

    it('rejects file: URLs', () => {
      expect(safeHref('file:///etc/passwd')).toBe('#');
    });

    it('rejects protocol-relative URLs', () => {
      expect(safeHref('//evil.com/path')).toBe('#');
    });
  });

  describe('handles empty / nullish input', () => {
    it('returns # for empty string', () => {
      expect(safeHref('')).toBe('#');
    });

    it('returns # for whitespace-only string', () => {
      expect(safeHref('   ')).toBe('#');
    });

    it('returns # for null', () => {
      expect(safeHref(null)).toBe('#');
    });

    it('returns # for undefined', () => {
      expect(safeHref(undefined)).toBe('#');
    });
  });
});
