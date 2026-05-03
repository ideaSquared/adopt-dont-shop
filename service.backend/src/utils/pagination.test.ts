import { parsePaginationLimit } from './pagination';

describe('parsePaginationLimit', () => {
  it('returns default limit when limit is not provided', () => {
    const result = parsePaginationLimit(undefined, {
      default: 10,
      max: 100,
    });
    expect(result).toBe(10);
  });

  it('returns default limit when limit is empty string', () => {
    const result = parsePaginationLimit('', {
      default: 10,
      max: 100,
    });
    expect(result).toBe(10);
  });

  it('returns default limit when limit is not a valid number', () => {
    const result = parsePaginationLimit('abc', {
      default: 10,
      max: 100,
    });
    expect(result).toBe(10);
  });

  it('returns the provided limit when it is within bounds', () => {
    const result = parsePaginationLimit('25', {
      default: 10,
      max: 100,
    });
    expect(result).toBe(25);
  });

  it('clamps limit to max when exceeded', () => {
    const result = parsePaginationLimit('1000000', {
      default: 10,
      max: 100,
    });
    expect(result).toBe(100);
  });

  it('clamps limit to min when below minimum', () => {
    const result = parsePaginationLimit('0', {
      default: 10,
      max: 100,
    });
    expect(result).toBe(1);
  });

  it('respects custom min value', () => {
    const result = parsePaginationLimit('2', {
      default: 10,
      max: 100,
      min: 5,
    });
    expect(result).toBe(5);
  });

  it('handles negative numbers by clamping to min', () => {
    const result = parsePaginationLimit('-50', {
      default: 10,
      max: 100,
    });
    expect(result).toBe(1);
  });
});
