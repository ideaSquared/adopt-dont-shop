import { describe, it, expect } from 'vitest';
import { formatCurrency, formatCurrencyWhole, formatNumber, parseCurrency } from './currency';

describe('formatCurrency', () => {
  it('formats a number as GBP with two decimals', () => {
    expect(formatCurrency(1234.56)).toBe('£1,234.56');
  });

  it('formats zero', () => {
    expect(formatCurrency(0)).toBe('£0.00');
  });

  it('formats negative amounts', () => {
    expect(formatCurrency(-5)).toBe('-£5.00');
  });

  it('honours custom Intl options', () => {
    expect(formatCurrency(1234.5, { minimumFractionDigits: 0, maximumFractionDigits: 0 })).toBe(
      '£1,235'
    );
  });

  it('falls back to a symbol + fixed string on invalid options', () => {
    // An out-of-range fraction-digits value makes the Intl constructor throw.
    expect(formatCurrency(12.5, { minimumFractionDigits: -1 })).toBe('£12.50');
  });
});

describe('formatCurrencyWhole', () => {
  it('rounds to whole pounds with no decimals', () => {
    expect(formatCurrencyWhole(1234.56)).toBe('£1,235');
  });
});

describe('formatNumber', () => {
  it('adds thousand separators with two decimals by default', () => {
    expect(formatNumber(1234.56)).toBe('1,234.56');
  });

  it('respects a custom decimal count', () => {
    expect(formatNumber(1234.5, 0)).toBe('1,235');
    expect(formatNumber(1.23456, 3)).toBe('1.235');
  });

  it('enters the catch branch and propagates a RangeError for invalid decimals', () => {
    // A negative fraction-digit count makes Intl.NumberFormat throw; the catch
    // logs and then re-attempts toFixed(-1), which throws RangeError too, so the
    // error propagates rather than being silently swallowed.
    expect(() => formatNumber(12.5, -1)).toThrow(RangeError);
  });
});

describe('parseCurrency', () => {
  it('parses a fully formatted currency string', () => {
    expect(parseCurrency('£1,234.56')).toBe(1234.56);
  });

  it('parses a plain number string', () => {
    expect(parseCurrency('1234.56')).toBe(1234.56);
  });

  it('strips dollar signs and whitespace', () => {
    expect(parseCurrency(' $ 99.00 ')).toBe(99);
  });

  it('returns NaN for non-numeric input', () => {
    expect(parseCurrency('abc')).toBeNaN();
  });
});
