import type { MigrationBuilder } from 'node-pg-migrate';

// ADS-1156 — full-text search always returned zero results.
//
// The List handler filters on `search_vector @@ websearch_to_tsquery(...)`
// but the `search_vector` column (migration 002) was inert: no trigger and
// no generated expression ever populated it, so every pet's vector stayed
// NULL and matched nothing.
//
// Replace the inert plain column with a STORED generated column derived
// from name + descriptions. Postgres computes the expression for every
// existing row when the column is added (the backfill) and re-computes it
// on every insert/update (staying maintained), so new and edited pets are
// immediately searchable. The handler predicate and the GIN index that
// backs it are unchanged — the column just becomes real.
//
// (Breed lives in a separate table via breed_id, so it can't ride in a
// single-table generated expression; name + short/long description cover
// the acceptance case. Breed continues to be searchable via the dedicated
// `breed` filter on the List handler.)

const SEARCH_VECTOR_INDEX = 'pets_search_vector_gin_idx';

export const up = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.dropIndex('pets', 'search_vector', { name: SEARCH_VECTOR_INDEX, ifExists: true });
  pgm.dropColumn('pets', 'search_vector');
  pgm.sql(`
    ALTER TABLE pets.pets
      ADD COLUMN search_vector tsvector
      GENERATED ALWAYS AS (
        to_tsvector(
          'english',
          coalesce(name, '') || ' ' ||
          coalesce(short_description, '') || ' ' ||
          coalesce(long_description, '')
        )
      ) STORED
  `);
  pgm.createIndex('pets', 'search_vector', { name: SEARCH_VECTOR_INDEX, method: 'gin' });
};

export const down = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.dropIndex('pets', 'search_vector', { name: SEARCH_VECTOR_INDEX, ifExists: true });
  pgm.dropColumn('pets', 'search_vector');
  pgm.addColumn('pets', { search_vector: { type: 'tsvector' } });
  pgm.createIndex('pets', 'search_vector', { name: SEARCH_VECTOR_INDEX, method: 'gin' });
};
