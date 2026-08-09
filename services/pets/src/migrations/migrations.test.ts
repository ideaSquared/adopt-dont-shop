import { readdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
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
  ])('%s exports `up` and `down` functions', async filename => {
    const mod = (await import(`./${filename}`)) as {
      up: unknown;
      down: unknown;
    };
    expect(typeof mod.up).toBe('function');
    expect(typeof mod.down).toBe('function');
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
});
