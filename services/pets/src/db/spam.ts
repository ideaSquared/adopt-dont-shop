// Dev bulk-data seeder for the pets.* schema — the realistic dev catalogue.
//
// Plants a populated, real-looking catalogue: real pet names + breeds (by
// species) + composed bios + species-matched photos (extra_json.image_urls,
// plus the breed name for display), each row weighted toward 'available' so
// the client portal looks live.
//
// Idempotent + deterministic: pet_id / breed_id / cross-refs are derived from
// a fixed key via seededUuid, and every INSERT is ON CONFLICT DO NOTHING, so a
// re-run (or every container boot) converges to the SAME catalogue instead of
// piling on. The rescue/staff/adopter ids are COMPUTED with the same key
// scheme the auth/rescue seeders use — no cross-schema read — so per-container
// boot seeding needs no run-order guarantee.
//
// Gated via assertSpamAllowed (NODE_ENV + ALLOW_SPAM). On boot the compose
// command sets SEED_ONLY_IF_EMPTY=true, so it plants only when the anchor pet
// (index 0) is absent; the manual `pnpm db:seed:dev` leaves it unset to
// (re)populate on demand.

import { createDbClient } from '@adopt-dont-shop/db';
import { createLogger } from '@adopt-dont-shop/observability';
import {
  assertSpamAllowed,
  BREEDS_BY_SPECIES,
  bulkInsert,
  composeBio,
  createSpamFaker,
  PET_NAMES,
  photoUrl,
  seededUuid,
  shouldSeed,
  spamCount,
  type Species,
} from '@adopt-dont-shop/seed-faker';

import { loadConfig } from '../config.js';
import { seedBreeds } from './seed.js';

type Faker = ReturnType<typeof createSpamFaker>;
export type QueryFn = (text: string, values: readonly unknown[]) => Promise<unknown>;

// Weighted so the catalogue is mostly cats & dogs, like a real shelter.
const SPECIES_BAG: readonly Species[] = [
  ...Array<Species>(9).fill('dog'),
  ...Array<Species>(9).fill('cat'),
  ...Array<Species>(2).fill('rabbit'),
  'bird',
  'small_mammal',
  'reptile',
  'fish',
  'other',
];
const GENDERS = ['male', 'female', 'unknown'];
const SIZES = ['extra_small', 'small', 'medium', 'large', 'extra_large'];
const ENERGY = ['low', 'medium', 'high', 'very_high'];
const AGE_GROUP_YEARS: Record<string, readonly [number, number]> = {
  baby: [0, 0],
  young: [1, 2],
  adult: [3, 8],
  senior: [9, 15],
};
const AGE_GROUPS = Object.keys(AGE_GROUP_YEARS);
// Weighted toward 'available' (most pets a visitor sees should be adoptable).
const STATUS_BAG = [
  ...Array<string>(70).fill('available'),
  ...Array<string>(12).fill('pending'),
  ...Array<string>(10).fill('adopted'),
  ...Array<string>(4).fill('foster'),
  ...Array<string>(4).fill('not_available'),
];
const REVIEWS = [
  'The team could not have been more helpful — our adoption went smoothly.',
  'Caring, knowledgeable staff who clearly love the animals.',
  'A brilliant rescue. We felt supported every step of the way.',
  'Well-run and honest about each pet needs. Highly recommend.',
  'They matched us with the perfect companion. Thank you!',
];

const PET_COLUMNS = [
  'pet_id',
  'name',
  'rescue_id',
  'breed_id',
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
  'extra_json',
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

const petRow = (
  faker: Faker,
  index: number,
  rescueIds: readonly string[],
  staffIds: readonly string[],
  now: Date
): readonly unknown[] => {
  const species = pick(faker, SPECIES_BAG);
  const name = pick(faker, PET_NAMES);
  const breedName = pick(faker, BREEDS_BY_SPECIES[species]);
  const ageGroup = pick(faker, AGE_GROUPS);
  const [minAge, maxAge] = AGE_GROUP_YEARS[ageGroup];
  const { short, long } = composeBio(faker, name, species);
  const photoCount = faker.number.int({ min: 1, max: 4 });
  const imageUrls = Array.from({ length: photoCount }, (_, k) => photoUrl(species, index * 4 + k));
  // Photos + display breed name ride in extra_json; the gateway surfaces both.
  const extraJson = JSON.stringify({ image_urls: imageUrls, breed: breedName });
  return [
    seededUuid(`pet-${index}`),
    name,
    rescueIds[index % rescueIds.length],
    seededUuid(`breed-${species}-${breedName}`),
    short,
    long,
    faker.number.int({ min: minAge, max: maxAge }),
    ageGroup,
    pick(faker, GENDERS),
    pick(faker, STATUS_BAG),
    species,
    pick(faker, SIZES),
    pick(faker, ENERGY),
    faker.number.int({ min: 0, max: 30000 }),
    'GBP',
    extraJson,
    staffIds.length > 0 ? staffIds[index % staffIds.length] : null,
    now,
    now,
  ];
};

const ratingRow = (
  faker: Faker,
  index: number,
  adopterIds: readonly string[],
  rescueIds: readonly string[],
  now: Date
): readonly unknown[] => [
  seededUuid(`rating-${index}`),
  'rescue',
  'overall',
  faker.number.int({ min: 3, max: 5 }),
  pick(faker, REVIEWS),
  adopterIds[index % adopterIds.length],
  rescueIds[index % rescueIds.length],
  now,
  now,
];

// Pure builders — deterministic given a seeded faker, so tests can assert the
// generated shape without a database.
export const buildPetRows = (
  faker: Faker,
  count: number,
  rescueIds: readonly string[],
  staffIds: readonly string[],
  now = new Date()
): (readonly unknown[])[] =>
  Array.from({ length: count }, (_, i) => petRow(faker, i, rescueIds, staffIds, now));

export const buildRatingRows = (
  faker: Faker,
  count: number,
  adopterIds: readonly string[],
  rescueIds: readonly string[],
  now = new Date()
): (readonly unknown[])[] =>
  Array.from({ length: count }, (_, i) => ratingRow(faker, i, adopterIds, rescueIds, now));

export const spamPets = async (deps: {
  query: QueryFn;
  faker: Faker;
  pets: number;
  ratings: number;
  rescueIds: readonly string[];
  adopterIds: readonly string[];
  staffIds: readonly string[];
}): Promise<{ pets: number; ratings: number }> => {
  const now = new Date();
  const petRows = buildPetRows(deps.faker, deps.pets, deps.rescueIds, deps.staffIds, now);
  await bulkInsert(
    { query: deps.query },
    'pets.pets',
    PET_COLUMNS,
    petRows,
    500,
    'ON CONFLICT (pet_id) DO NOTHING'
  );

  // Ratings need both a reviewer (adopter) and a rescue; skip if either pool
  // is empty (e.g. SPAM_ADOPTERS=0).
  const canRate = deps.adopterIds.length > 0 && deps.rescueIds.length > 0;
  const ratingRows = canRate
    ? buildRatingRows(deps.faker, deps.ratings, deps.adopterIds, deps.rescueIds, now)
    : [];
  await bulkInsert(
    { query: deps.query },
    'pets.ratings',
    RATING_COLUMNS,
    ratingRows,
    500,
    'ON CONFLICT (rating_id) DO NOTHING'
  );

  return { pets: deps.pets, ratings: ratingRows.length };
};

const idRange = (prefix: string, count: number): string[] =>
  Array.from({ length: count }, (_, i) => seededUuid(`${prefix}-${i}`));

const anchorExists = async (query: QueryFn): Promise<boolean> => {
  const res = (await query(`SELECT 1 FROM pets.pets WHERE pet_id = $1 LIMIT 1`, [
    seededUuid('pet-0'),
  ])) as { rows: unknown[] };
  return res.rows.length > 0;
};

// Orchestration over injected seams so the seed-if-empty guard, breed
// bootstrap and count logic are testable without a real pool.
export const runSpam = async (deps: {
  query: QueryFn;
  faker: Faker;
  log?: (message: string, meta?: Record<string, unknown>) => void;
}): Promise<{ seeded: boolean; pets: number; ratings: number }> => {
  if (!(await shouldSeed(() => anchorExists(deps.query)))) {
    deps.log?.('pets catalogue already populated — skipping (SEED_ONLY_IF_EMPTY)');
    return { seeded: false, pets: 0, ratings: 0 };
  }

  // breed_id is an FK into pets.breeds; make sure the lookup exists first so
  // the seeder is self-contained regardless of run order.
  await seedBreeds({ query: deps.query });

  const rescueIds = idRange('rescue', spamCount('RESCUES', 8));
  if (rescueIds.length === 0) {
    throw new Error('SPAM_RESCUES=0 — pets need at least one rescue to attach to');
  }
  const staffIds = idRange('staff', spamCount('STAFF', 20));
  const adopterIds = idRange('adopter', spamCount('ADOPTERS', 50));
  const pets = spamCount('PETS', 200);
  const ratings = spamCount('RATINGS', 100);
  deps.log?.('spamming pets', { pets, ratings, rescues: rescueIds.length });
  const result = await spamPets({
    query: deps.query,
    faker: deps.faker,
    pets,
    ratings,
    rescueIds,
    adopterIds,
    staffIds,
  });
  return { seeded: true, ...result };
};

const main = async (): Promise<void> => {
  const logger = createLogger({ serviceName: 'service.pets.spam' });
  assertSpamAllowed();
  const config = loadConfig();
  const pool = createDbClient({ connectionString: config.databaseUrl, schema: config.schema });
  try {
    const result = await runSpam({
      query: (text, values) => pool.query(text, values as unknown[]),
      faker: createSpamFaker(),
      log: (message, meta) => logger.info(message, meta),
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
