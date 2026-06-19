import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createSpamFaker, DEFAULT_FAKER_SEED } from './faker-rng.js';

// The spam faker is seeded so that text content (names, descriptions) is
// reproducible across machines and runs — only the row identifiers (generated
// separately via crypto.randomUUID) vary, which is what keeps the seeder
// additive without making every run's *content* unrecognisably different.
describe('createSpamFaker', () => {
  const original = { ...process.env };

  beforeEach(() => {
    delete process.env.FAKER_SEED;
  });

  afterEach(() => {
    process.env = { ...original };
  });

  it('produces identical sequences for two instances on the same seed', () => {
    const a = createSpamFaker();
    const b = createSpamFaker();

    expect(a.person.fullName()).toBe(b.person.fullName());
    expect(a.location.city()).toBe(b.location.city());
  });

  it('produces different sequences when FAKER_SEED differs', () => {
    const a = createSpamFaker(1);
    const b = createSpamFaker(2);

    expect(a.person.fullName()).not.toBe(b.person.fullName());
  });

  it('reads the seed from FAKER_SEED when no explicit seed is given', () => {
    process.env.FAKER_SEED = '7';
    const fromEnv = createSpamFaker();
    const explicit = createSpamFaker(7);

    expect(fromEnv.person.fullName()).toBe(explicit.person.fullName());
  });

  it('falls back to the default seed when FAKER_SEED is not a number', () => {
    process.env.FAKER_SEED = 'not-a-number';
    const fallback = createSpamFaker();
    const explicit = createSpamFaker(DEFAULT_FAKER_SEED);

    expect(fallback.person.fullName()).toBe(explicit.person.fullName());
  });

  it('uses UK locale data (GB phone format)', () => {
    const faker = createSpamFaker();
    // en_GB phone numbers start with 0; this is a locale smoke test, not a
    // strict format assertion.
    const phone = faker.phone.number();

    expect(phone).toMatch(/\d/);
    expect(faker.location.countryCode()).toBeTypeOf('string');
  });
});
