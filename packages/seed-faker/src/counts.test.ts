import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { spamCount } from './counts.js';

describe('spamCount', () => {
  const original = { ...process.env };

  beforeEach(() => {
    delete process.env.SPAM_PETS;
  });

  afterEach(() => {
    process.env = { ...original };
  });

  it('returns the default when the env var is unset', () => {
    expect(spamCount('PETS', 200)).toBe(200);
  });

  it('reads a positive integer override from SPAM_<ENTITY>', () => {
    process.env.SPAM_PETS = '50';
    expect(spamCount('PETS', 200)).toBe(50);
  });

  it('allows an explicit zero override', () => {
    process.env.SPAM_PETS = '0';
    expect(spamCount('PETS', 200)).toBe(0);
  });

  it('falls back to the default for a non-numeric value', () => {
    process.env.SPAM_PETS = 'lots';
    expect(spamCount('PETS', 200)).toBe(200);
  });

  it('falls back to the default for a negative value', () => {
    process.env.SPAM_PETS = '-5';
    expect(spamCount('PETS', 200)).toBe(200);
  });
});
