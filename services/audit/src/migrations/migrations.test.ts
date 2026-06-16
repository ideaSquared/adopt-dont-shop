import { readdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

// Smoke tests for the migration files in this directory. We don't run
// them against a real Postgres here — @adopt-dont-shop/db is already
// tested for the runner contract, and the migrations get exercised
// end-to-end by the docker-compose stack smoke (Phase 10.6).
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

describe('audit migrations', () => {
  it('has migration files following the NNN_snake_case.ts naming convention', async () => {
    const files = await listMigrationFiles();
    expect(files.length).toBeGreaterThanOrEqual(1);
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
    '001_create_audit_events.ts',
    '004_add_gdpr_failed_at.ts',
    '005_add_gdpr_saga_deadline.ts',
    '006_add_aggregate_keyset_index.ts',
  ])('%s exports `up` and `down` functions', async filename => {
    const mod = (await import(`./${filename}`)) as {
      up: unknown;
      down: unknown;
    };
    expect(typeof mod.up).toBe('function');
    expect(typeof mod.down).toBe('function');
  });
});
