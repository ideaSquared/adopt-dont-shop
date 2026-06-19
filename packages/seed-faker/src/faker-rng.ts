/**
 * Seeded UK Faker for the spam seeders.
 *
 * The seed is fixed (overridable via FAKER_SEED) so generated *text* — names,
 * cities, descriptions — is reproducible. Row identifiers are NOT drawn from
 * this faker; spam seeders mint them with crypto.randomUUID() so that re-runs
 * stay additive (new rows every run) while the human-readable content remains
 * recognisable run to run.
 */

import { base, en, en_GB, Faker } from '@faker-js/faker';

export const DEFAULT_FAKER_SEED = 42;

const resolveSeed = (explicit?: number): number => {
  if (explicit !== undefined) {
    return explicit;
  }
  const raw = process.env.FAKER_SEED;
  if (raw === undefined) {
    return DEFAULT_FAKER_SEED;
  }
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : DEFAULT_FAKER_SEED;
};

export const createSpamFaker = (seed?: number): Faker => {
  const faker = new Faker({ locale: [en_GB, en, base] });
  faker.seed(resolveSeed(seed));
  return faker;
};
