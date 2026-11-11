import { readdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BREEDS_BY_SPECIES, SPECIES, seededUuid } from '@adopt-dont-shop/seed-faker';
import type { MigrationBuilder } from 'node-pg-migrate';
import { describe, expect, it, vi } from 'vitest';

// Smoke tests for the migration files in this directory. We don't run
// them against a real Postgres here — @adopt-dont-shop/db is already
// tested for the runner contract, and the migrations get exercised
// end-to-end by the docker-compose stack smoke.
//
// This file guards the things that break silently:
//   - every migration exports `up` and `down` functions
//   - the file naming convention stays consistent (lexicographic =
//     execution order; node-pg-migrate sorts the dir scan by filename)

const MIGRATIONS_DIR = dirname(fileURLToPath(import.meta.url));
const MIGRATION_FILENAME_PATTERN = /^\d{3}_[a-z0-9_]+\.ts$/;

async function listMigrationFiles(): Promise<string[]> {
  const entries = await readdir(MIGRATIONS_DIR);
  return entries.filter(f => MIGRATION_FILENAME_PATTERN.test(f)).sort((a, b) => a.localeCompare(b));
}

describe('pets migrations', () => {
  it('has migration files following the NNN_snake_case.ts naming convention', async () => {
    const files = await listMigrationFiles();
    expect(files.length).toBeGreaterThanOrEqual(6);
    for (const f of files) {
      expect(f).toMatch(MIGRATION_FILENAME_PATTERN);
    }
  });

  it('numbers migrations sequentially without gaps', async () => {
    const files = await listMigrationFiles();
    const numbers = files.map(f => Number.parseInt(f.slice(0, 3), 10));
    for (let i = 0; i < numbers.length; i++) {
      expect(numbers[i]).toBe(i + 1);
    }
  });

  it.each([
    '001_create_breeds.ts',
    '002_create_pets.ts',
    '003_create_pet_media.ts',
    '004_create_pet_status_transitions.ts',
    '005_create_ratings.ts',
    '006_create_user_favorites.ts',
    '007_pets_list_keyset_index.ts',
    '008_create_event_outbox.ts',
    '009_add_pets_extra_json.ts',
    '010_pets_search_vector_generated.ts',
    '011_backfill_images_into_image_urls.ts',
    '012_create_pet_views.ts',
    '013_seed_breed_reference_data.ts',
  ])('%s exports `up` and `down` functions', async filename => {
    const mod = (await import(`./${filename}`)) as {
      up: unknown;
      down: unknown;
    };
    expect(typeof mod.up).toBe('function');
    expect(typeof mod.down).toBe('function');
  });

  it('012 dedupes pet views with a unique (viewer, pet, UTC hour) index', async () => {
    const createTable = vi.fn();
    const createIndex = vi.fn();
    const sql = vi.fn();
    const pgm = {
      createTable,
      createIndex,
      sql,
      func: (expr: string) => expr,
    } as unknown as MigrationBuilder;
    const mod = await import('./012_create_pet_views.js');
    await mod.up(pgm);

    // Immutable generated expression (AT TIME ZONE 'UTC'): STORED columns reject
    // the stable timestamptz variant of date_trunc.
    expect(sql).toHaveBeenCalledWith(
      expect.stringContaining("date_trunc('hour', viewed_at AT TIME ZONE 'UTC')")
    );
    expect(createIndex).toHaveBeenCalledWith(
      'pet_views',
      ['viewer_id', 'pet_id', 'view_hour'],
      expect.objectContaining({ unique: true })
    );
  });

  it('009 adds the extra_json jsonb column (ADS-1155)', async () => {
    const addColumn = vi.fn();
    const pgm = { addColumn } as unknown as MigrationBuilder;
    const mod = await import('./009_add_pets_extra_json.js');
    await mod.up(pgm);
    expect(addColumn).toHaveBeenCalledWith(
      'pets',
      expect.objectContaining({
        extra_json: expect.objectContaining({ type: 'jsonb' }),
      })
    );
  });

  it('010 recreates search_vector as a maintained generated column + GIN index (ADS-1156)', async () => {
    const sql = vi.fn();
    const createIndex = vi.fn();
    const pgm = {
      dropIndex: vi.fn(),
      dropColumn: vi.fn(),
      sql,
      createIndex,
    } as unknown as MigrationBuilder;
    const mod = await import('./010_pets_search_vector_generated.js');
    await mod.up(pgm);
    const generatedSql = sql.mock.calls.map(call => String(call[0])).join('\n');
    expect(generatedSql).toMatch(/GENERATED ALWAYS AS/);
    expect(generatedSql).toMatch(/to_tsvector/);
    expect(createIndex).toHaveBeenCalledWith(
      'pets',
      'search_vector',
      expect.objectContaining({ method: 'gin' })
    );
  });

  describe('011 backfills the legacy extra_json.images key into image_urls', () => {
    const upSql = async (): Promise<string> => {
      const sql = vi.fn();
      const pgm = { sql } as unknown as MigrationBuilder;
      const mod = await import('./011_backfill_images_into_image_urls.js');
      await mod.up(pgm);
      expect(sql).toHaveBeenCalledTimes(1);
      return String(sql.mock.calls[0][0]);
    };

    it('only touches rows that still carry the legacy key, so re-running is a no-op', async () => {
      const sql = await upSql();
      expect(sql).toMatch(/UPDATE pets\.pets/);
      expect(sql).toMatch(/WHERE extra_json \? 'images'/);
    });

    it('removes the images key and rewrites image_urls', async () => {
      const sql = await upSql();
      expect(sql).toMatch(/extra_json - 'images'/);
      expect(sql).toMatch(/'image_urls'/);
    });

    it('keeps image_urls entries first, then images, deduped in first-seen order', async () => {
      const sql = await upSql();
      // image_urls ranks before images; each url keeps its earliest position.
      expect(sql).toMatch(/jsonb_agg\(url ORDER BY first_pos\)/);
      expect(sql).toMatch(/MIN\(pos\)/);
      expect(sql).toMatch(/1000000 \+/);
    });

    it('is irreversible by design: down is a no-op', async () => {
      const sql = vi.fn();
      const pgm = { sql } as unknown as MigrationBuilder;
      const mod = await import('./011_backfill_images_into_image_urls.js');
      // `down` declares no parameters; pass the builder anyway to prove it is never touched.
      await (mod.down as (pgm: MigrationBuilder) => Promise<void>)(pgm);
      expect(sql).not.toHaveBeenCalled();
    });
  });

  describe('013 seeds the canonical breed reference list', () => {
    const upSql = async (): Promise<string> => {
      const sql = vi.fn();
      const pgm = { sql } as unknown as MigrationBuilder;
      const mod = await import('./013_seed_breed_reference_data.js');
      await mod.up(pgm);
      expect(sql).toHaveBeenCalledTimes(1);
      return String(sql.mock.calls[0][0]);
    };

    const expectedBreeds = SPECIES.flatMap(species =>
      BREEDS_BY_SPECIES[species].map(name => ({
        id: seededUuid(`breed-${species}-${name}`),
        species,
        name,
      }))
    );

    it('inserts every breed the dev seed knows, with the same deterministic ids', async () => {
      const sql = await upSql();
      const inserted = [...sql.matchAll(/\('([0-9a-f-]{36})', '([a-z_]+)', '([^']+)'\)/g)].map(
        m => ({ id: m[1], species: m[2], name: m[3] })
      );
      expect(inserted).toEqual(expectedBreeds);
    });

    it('is idempotent: re-running skips existing (species, name) rows', async () => {
      expect(await upSql()).toMatch(/ON CONFLICT \(species, name\) DO NOTHING/);
    });

    it('down only removes seeded breeds that no pet references', async () => {
      const sql = vi.fn();
      const pgm = { sql } as unknown as MigrationBuilder;
      const mod = await import('./013_seed_breed_reference_data.js');
      // `down` declares no parameters; pass the builder anyway to prove it is never touched.
      await (mod.down as (pgm: MigrationBuilder) => Promise<void>)(pgm);
      const down = String(sql.mock.calls[0][0]);
      expect(down).toMatch(/DELETE FROM breeds/);
      expect(down).toMatch(/NOT EXISTS/);
      expect(down).toContain(expectedBreeds[0].id);
    });
  });
});
