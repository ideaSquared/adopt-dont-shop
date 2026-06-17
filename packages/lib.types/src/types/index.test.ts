import { describe, it, expect } from 'vitest';
import { money, countryCode } from './index';

describe('money', () => {
  it('builds a Money value from minor units and a currency code', () => {
    expect(money(1234, 'GBP')).toEqual({ amount: 1234, currency: 'GBP' });
  });

  it('normalises the currency code to uppercase', () => {
    expect(money(500, 'usd').currency).toBe('USD');
  });

  it('rounds fractional amounts to the nearest integer', () => {
    expect(money(99.4, 'GBP').amount).toBe(99);
    expect(money(99.5, 'GBP').amount).toBe(100);
  });
});

describe('countryCode', () => {
  it('normalises a country code to uppercase', () => {
    expect(countryCode('gb')).toBe('GB');
    expect(countryCode('Us')).toBe('US');
  });

  it('leaves an already-uppercase code unchanged', () => {
    expect(countryCode('DE')).toBe('DE');
  });
});
