export { assertSpamAllowed } from './env-guard.js';
export { createSpamFaker, DEFAULT_FAKER_SEED } from './faker-rng.js';
export { bulkInsert, type BulkInsertDeps, type QueryFn } from './bulk-insert.js';
export { spamCount } from './counts.js';
export { seededUuid } from './deterministic-id.js';
export { seedOnlyIfEmpty, shouldSeed } from './should-seed.js';
export {
  BREEDS_BY_SPECIES,
  composeBio,
  PET_NAMES,
  photoUrl,
  SPECIES,
  type Species,
} from './data/pets.js';
