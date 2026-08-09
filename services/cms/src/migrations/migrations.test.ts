import { readdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { MigrationBuilder } from 'node-pg-migrate';
import { describe, expect, it } from 'vitest';

// Smoke tests for the migration files in this directory plus a focused
// regression for ADS-1182. We don't run migrations against a real
// Postgres here — @adopt-dont-shop/db owns the runner contract — so the
// ADS-1182 test renders the DDL each migration emits and asserts on it.

const MIGRATIONS_DIR = dirname(fileURLToPath(import.meta.url));
const MIGRATION_FILENAME_PATTERN = /^\d{3}_[a-z0-9_]+\.ts$/;

async function listMigrationFiles(): Promise<string[]> {
  const entries = await readdir(MIGRATIONS_DIR);
  return entries.filter(f => MIGRATION_FILENAME_PATTERN.test(f)).sort((a, b) => a.localeCompare(b));
}

// A no-op db double for MigrationBuilder. The DDL operations under test
// (dropConstraint / createIndex / addConstraint / dropIndex) never query
// the db, so this is only here to satisfy the constructor. The `as never`
// mirrors the backend-test convention for fully-typed third-party shapes.
const noopDb = {
  query: async () => ({ rows: [] }),
  select: async () => [],
} as never;

async function renderSql(run: (pgm: MigrationBuilder) => Promise<void>): Promise<string> {
  // decamelize=false matches @adopt-dont-shop/db's runner config, so the
  // rendered identifiers stay snake_case exactly as the migrations write them.
  const pgm = new MigrationBuilder(noopDb, undefined, false, console);
  await run(pgm);
  return pgm.getSql();
}

describe('cms migrations', () => {
  it('has migration files following the NNN_snake_case.ts naming convention', async () => {
    const files = await listMigrationFiles();
    expect(files.length).toBeGreaterThanOrEqual(5);
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

  it('every migration exports `up` and `down` functions', async () => {
    const files = await listMigrationFiles();
    for (const f of files) {
      const mod = (await import(`./${f}`)) as { up: unknown; down: unknown };
      expect(typeof mod.up).toBe('function');
      expect(typeof mod.down).toBe('function');
    }
  });
});

describe('ADS-1182: slug uniqueness spans only live rows', () => {
  it('up drops the all-rows slug UNIQUE constraint and adds a partial (live-only) unique index', async () => {
    const { up } = await import('./005_cms_content_slug_partial_unique.js');
    const sql = await renderSql(up);

    // The original column-level UNIQUE (auto-named cms_content_slug_key by
    // Postgres) covered every row, including soft-deleted ones — remove it.
    expect(sql).toContain('DROP CONSTRAINT IF EXISTS "cms_content_slug_key"');

    // Uniqueness is now enforced only over rows that are not soft-deleted,
    // so a slug freed by soft delete becomes reusable.
    expect(sql).toMatch(
      /CREATE UNIQUE INDEX .*ON "cms_content" \("slug"\) WHERE deleted_at IS NULL/
    );
  });

  it('down restores the all-rows slug UNIQUE constraint', async () => {
    const { down } = await import('./005_cms_content_slug_partial_unique.js');
    const sql = await renderSql(down);

    expect(sql).toContain('ADD CONSTRAINT "cms_content_slug_key" UNIQUE ("slug")');
    expect(sql).toMatch(/DROP INDEX IF EXISTS/);
  });
});
