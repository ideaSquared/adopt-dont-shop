// Dev-only bulk-data ('spam') seeder for the pets.* schema.
//
// Floods pets.pets (and pets.ratings) with faker rows tied to the spam
// rescues. MANUAL + gated via assertSpamAllowed. Additive (fresh UUIDs).
//
// Cross-schema reads (dev-only god-access): rescue_ids from rescue.rescues,
// user_ids from auth.users — both restricted to the spam population
// (email LIKE '%@example.test') so we never attach to the fixed personas.
//
// Volume: SPAM_PETS (default 200), SPAM_RATINGS (default 100). Status is
// skewed heavily toward 'available' so the client portal looks populated.

import { randomUUID } from 'node:crypto';

import { createDbClient } from '@adopt-dont-shop/db';
import { createLogger } from '@adopt-dont-shop/observability';
import {
  assertSpamAllowed,
  bulkInsert,
  createSpamFaker,
  spamCount,
} from '@adopt-dont-shop/seed-faker';

import { loadConfig } from '../config.js';

type Faker = ReturnType<typeof createSpamFaker>;
export type QueryFn = (text: string, values: readonly unknown[]) => Promise<unknown>;

const PET_TYPES = ['dog', 'cat', 'rabbit', 'bird', 'reptile', 'small_mammal', 'fish', 'other'];
const GENDERS = ['male', 'female', 'unknown'];
const SIZES = ['extra_small', 'small', 'medium', 'large', 'extra_large'];
const AGE_GROUPS = ['baby', 'young', 'adult', 'senior'];
const ENERGY = ['low', 'medium', 'high', 'very_high'];
// Weighted toward 'available' (most pets a visitor sees should be adoptable).
const STATUS_BAG = [
  ...Array<string>(70).fill('available'),
  ...Array<string>(12).fill('pending'),
  ...Array<string>(10).fill('adopted'),
  ...Array<string>(4).fill('foster'),
  ...Array<string>(4).fill('not_available'),
];

const PET_COLUMNS = [
  'pet_id',
  'name',
  'rescue_id',
  'short_description',
  'long_description',
  'age_years',
  'age_group',
  'gender',
  'status',
  'type',
  'size',
  'energy_level',
  'adoption_fee_minor',
  'adoption_fee_currency',
  'created_by',
  'created_at',
  'updated_at',
] as const;

const RATING_COLUMNS = [
  'rating_id',
  'rating_type',
  'category',
  'score',
  'review_text',
  'reviewer_id',
  'rescue_id',
  'created_at',
  'updated_at',
] as const;

const pick = <T>(faker: Faker, arr: readonly T[]): T => faker.helpers.arrayElement(arr);

const petRow = (faker: Faker, rescueId: string, now: Date): readonly unknown[] => [
  randomUUID(),
  faker.person.firstName(),
  rescueId,
  faker.lorem.sentence(),
  faker.lorem.paragraph(),
  faker.number.int({ min: 0, max: 15 }),
  pick(faker, AGE_GROUPS),
  pick(faker, GENDERS),
  pick(faker, STATUS_BAG),
  pick(faker, PET_TYPES),
  pick(faker, SIZES),
  pick(faker, ENERGY),
  faker.number.int({ min: 0, max: 30000 }),
  'GBP',
  rescueId,
  now,
  now,
];

const ratingRow = (
  faker: Faker,
  reviewerId: string,
  rescueId: string,
  now: Date
): readonly unknown[] => [
  randomUUID(),
  'rescue',
  'overall',
  faker.number.int({ min: 1, max: 5 }),
  faker.lorem.sentence(),
  reviewerId,
  rescueId,
  now,
  now,
];

export const spamPets = async (deps: {
  query: QueryFn;
  faker: Faker;
  pets: number;
  ratings: number;
  rescueIds: readonly string[];
  adopterIds: readonly string[];
}): Promise<{ pets: number; ratings: number }> => {
  const now = new Date();
  const petRows = Array.from({ length: deps.pets }, () =>
    petRow(deps.faker, pick(deps.faker, deps.rescueIds), now)
  );
  await bulkInsert({ query: deps.query }, 'pets.pets', PET_COLUMNS, petRows);

  // Ratings need both a reviewer (adopter) and a rescue; skip if either pool
  // is empty (e.g. SPAM_ADOPTERS=0).
  const canRate = deps.adopterIds.length > 0 && deps.rescueIds.length > 0;
  const ratingRows = canRate
    ? Array.from({ length: deps.ratings }, () =>
        ratingRow(
          deps.faker,
          pick(deps.faker, deps.adopterIds),
          pick(deps.faker, deps.rescueIds),
          now
        )
      )
    : [];
  await bulkInsert({ query: deps.query }, 'pets.ratings', RATING_COLUMNS, ratingRows);

  return { pets: deps.pets, ratings: ratingRows.length };
};

const fetchIds = async (query: QueryFn, sql: string, column: string): Promise<string[]> => {
  const result = (await query(sql, [])) as { rows: Record<string, string>[] };
  return result.rows.map(r => r[column]);
};

const main = async (): Promise<void> => {
  const logger = createLogger({ serviceName: 'service.pets.spam' });
  assertSpamAllowed();
  const config = loadConfig();
  const pool = createDbClient({ connectionString: config.databaseUrl, schema: config.schema });
  try {
    const query: QueryFn = (text, values) => pool.query(text, values as unknown[]);
    const rescueIds = await fetchIds(
      query,
      `SELECT rescue_id FROM rescue.rescues WHERE email LIKE '%@example.test'`,
      'rescue_id'
    );
    if (rescueIds.length === 0) {
      throw new Error('no spam rescues found — run the rescue spam first');
    }
    const adopterIds = await fetchIds(
      query,
      `SELECT user_id FROM auth.users WHERE user_type = 'adopter' AND email LIKE '%@example.test'`,
      'user_id'
    );
    const pets = spamCount('PETS', 200);
    const ratings = spamCount('RATINGS', 100);
    logger.info('spamming pets', { pets, ratings, rescues: rescueIds.length });
    const result = await spamPets({
      query,
      faker: createSpamFaker(),
      pets,
      ratings,
      rescueIds,
      adopterIds,
    });
    logger.info('pets spam complete', result);
  } catch (err) {
    logger.error('pets spam failed', {
      message: (err as Error)?.message,
      stack: (err as Error)?.stack,
    });
    console.error(err);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
};

if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  void main();
}
