import type { MigrationBuilder } from 'node-pg-migrate';

// Seed the canonical breed reference list.
//
// `pets.breeds` was only ever populated by `db:seed` (dev), so production had
// an empty table: resolveBreedId rejected every named breed with
// INVALID_ARGUMENT and the breed list endpoints returned nothing. Breeds are
// reference data, not dev fixtures, so they ship as a migration.
//
// FROZEN: the list is a literal on purpose (no import from
// @adopt-dont-shop/seed-faker) — a migration's content must never change when
// a dev package does. The breed_ids are the deterministic ids the dev seed
// computes (seededUuid(`breed-${species}-${name}`)), so databases that already
// ran `db:seed` are unaffected (ON CONFLICT (species, name) DO NOTHING) and the
// spam seeder's references still resolve. A test pins them against seed-faker.
//
// Idempotent. down() removes only the seeded rows no pet references yet.

export const SEEDED_BREEDS: ReadonlyArray<readonly [string, string, string]> = [
  ['5739973a-fda1-4c5b-8b4f-6936b457db04', 'dog', 'Labrador Retriever'],
  ['3189343a-51c4-4858-b4d2-31e1b2163acf', 'dog', 'Staffordshire Bull Terrier'],
  ['8debefa3-1faa-4004-a869-c5c29eba177d', 'dog', 'Cocker Spaniel'],
  ['00159a75-3643-4294-8f73-58de1a27837b', 'dog', 'Border Collie'],
  ['a8188d16-3e7f-4b3d-b72d-541611192d02', 'dog', 'German Shepherd'],
  ['ec243906-61bc-4802-ad92-26a2784acff3', 'dog', 'Jack Russell Terrier'],
  ['2c245c95-da79-48db-95b9-7c1e7e14e911', 'dog', 'Greyhound'],
  ['2e8adcd8-529f-42be-a23f-4a257afc20a3', 'dog', 'Cavalier King Charles Spaniel'],
  ['6ef46532-452a-4e60-ac07-fbf21db7396a', 'dog', 'Lurcher'],
  ['fc8090b0-a2c9-4438-ae79-f1f3956ac3ca', 'dog', 'Crossbreed'],
  ['7c9ff9fa-125c-4209-8b0d-e2af54ff4a7e', 'cat', 'Domestic Shorthair'],
  ['f8c3a526-d4a0-42ef-9a05-f27af854a0f1', 'cat', 'Domestic Longhair'],
  ['dff74f18-0b3d-46ae-baba-6f91ec3ae854', 'cat', 'Tabby'],
  ['4a226181-f1ce-4e48-aa26-59ab7ec0f6d1', 'cat', 'Maine Coon'],
  ['3eb4dcfa-05e5-46a5-aaed-e706e767b8ed', 'cat', 'Siamese'],
  ['8f94f899-960f-4bf7-b98e-971de679ac91', 'cat', 'British Shorthair'],
  ['e8b72602-ed5a-4279-9768-b54eb98d40eb', 'cat', 'Ragdoll'],
  ['fdd348cb-92c8-419c-a81e-5088544753df', 'cat', 'Bengal'],
  ['7c8bea46-179f-4817-917d-3de4acdff973', 'rabbit', 'Netherland Dwarf'],
  ['6fac125f-9f33-46cb-bde6-4ac54d4f3542', 'rabbit', 'Lop'],
  ['4ef18055-e1ca-4428-a845-b0e32b334c2a', 'rabbit', 'Lionhead'],
  ['e8d7fb99-93a8-4c30-8e46-bcfd7d8c49f4', 'rabbit', 'Rex'],
  ['85428d0b-033f-4879-ade0-3586a5efecc7', 'rabbit', 'Dutch'],
  ['c967cff1-14b6-4ee9-9d18-9cabe25113db', 'rabbit', 'Crossbreed'],
  ['063261b3-13a1-4681-99b7-4415785944dc', 'bird', 'Budgerigar'],
  ['c2b30ab6-eb22-4eeb-8cb1-b44a5baaab72', 'bird', 'Cockatiel'],
  ['53dd25f3-f81f-4fc2-99b6-e1c92755ace8', 'bird', 'Canary'],
  ['476267d8-da3e-493d-9939-2c4d688d7945', 'bird', 'Lovebird'],
  ['3b52737d-acc4-4dd6-82b4-2a7f9fc3cc43', 'bird', 'African Grey'],
  ['f2e55bd8-4bc0-4db8-a9ec-cc88c505ab0a', 'reptile', 'Bearded Dragon'],
  ['2140502c-7d30-4299-9a3a-e812b930958b', 'reptile', 'Leopard Gecko'],
  ['ce66945c-d4d4-4221-8feb-cfac8b205bfb', 'reptile', 'Corn Snake'],
  ['53a93ac2-69f2-421c-ba7e-7b652745c4aa', 'reptile', 'Tortoise'],
  ['e7f0efc5-45cd-4554-909e-1ade62dae8c7', 'small_mammal', 'Guinea Pig'],
  ['477781bf-f78a-45b8-9f95-1cc1b4e07574', 'small_mammal', 'Syrian Hamster'],
  ['283fe53d-604c-4bd5-95b4-f712b8b5edf0', 'small_mammal', 'Ferret'],
  ['8a0ae90d-1e9e-4218-98ef-4abf84d00c29', 'small_mammal', 'Rat'],
  ['64d62163-2878-4c3c-964d-eccf40ad7123', 'small_mammal', 'Gerbil'],
  ['5f78a396-5034-4212-b035-fea254670d76', 'fish', 'Goldfish'],
  ['63c97cd3-8384-4923-a15f-3600877a5064', 'fish', 'Betta'],
  ['cec5924e-c316-44ed-aeb9-91e1d3af8515', 'fish', 'Guppy'],
  ['17a676ec-50aa-4794-8737-b4f26aca9441', 'fish', 'Tetra'],
  ['e3510ab0-3794-40ee-8293-cb73d2e5683f', 'other', 'Unknown'],
];

export const up = async (pgm: MigrationBuilder): Promise<void> => {
  const values = SEEDED_BREEDS.map(
    ([id, species, name]) => `('${id}', '${species}', '${name}')`
  ).join(',\n    ');
  pgm.sql(`
    INSERT INTO breeds (breed_id, species, name)
    VALUES
    ${values}
    ON CONFLICT (species, name) DO NOTHING;
  `);
};

export const down = async (pgm: MigrationBuilder): Promise<void> => {
  const ids = SEEDED_BREEDS.map(([id]) => `'${id}'`).join(', ');
  pgm.sql(`
    DELETE FROM breeds b
    WHERE b.breed_id IN (${ids})
      AND NOT EXISTS (
        SELECT 1 FROM pets p
        WHERE p.breed_id = b.breed_id OR p.secondary_breed_id = b.breed_id
      );
  `);
};
