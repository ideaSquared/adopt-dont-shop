/**
 * Deterministic Faker instance for demo seeders.
 *
 * The seed value is committed so `db:reset:dev` produces byte-identical
 * data across machines, which keeps screenshot tests stable and makes
 * "did my change cause this?" investigations tractable.
 *
 * Override via FAKER_SEED for one-off "give me different data" runs.
 * Staging is expected to use a different default seed than dev so that
 * implicit ordering bugs surface in only one environment.
 */

import { faker, Faker, en, en_GB, base } from '@faker-js/faker';

export const DEFAULT_FAKER_SEED = 42;

const seedFromEnv = (): number => {
  const raw = process.env.FAKER_SEED;
  if (raw === undefined) {
    return DEFAULT_FAKER_SEED;
  }
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : DEFAULT_FAKER_SEED;
};

faker.seed(seedFromEnv());

export const ukFaker = new Faker({ locale: [en_GB, en, base] });
ukFaker.seed(seedFromEnv());

export { faker };
