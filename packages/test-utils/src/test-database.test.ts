import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { Client } from 'pg';
import { describe, expect, it } from 'vitest';

import { withTestDatabase } from './test-database.js';

function writeTrivialMigrationsDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'with-test-database-spec-migrations-'));
  writeFileSync(
    join(dir, '001_create_widget.ts'),
    `import type { MigrationBuilder } from 'node-pg-migrate';

export const up = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.createTable('widget', { id: { type: 'uuid', primaryKey: true } });
};

export const down = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.dropTable('widget');
};
`
  );
  return dir;
}

describe('withTestDatabase', () => {
  // These two guard clauses run unconditionally (no real Postgres needed) —
  // the fail-fast validation is meant to catch local misuse before ever
  // opening a connection.
  it('throws when DATABASE_URL is not set and no override is given', async () => {
    const original = process.env.DATABASE_URL;
    delete process.env.DATABASE_URL;
    try {
      await expect(
        withTestDatabase(
          { schemaPrefix: 'spec', migrationsDir: '/nonexistent' },
          async () => undefined
        )
      ).rejects.toThrow(/DATABASE_URL/);
    } finally {
      if (original !== undefined) {
        process.env.DATABASE_URL = original;
      }
    }
  });

  it('rejects an invalid schemaPrefix before touching the database', async () => {
    await expect(
      withTestDatabase(
        {
          schemaPrefix: 'not valid!',
          migrationsDir: '/nonexistent',
          databaseUrl: 'postgres://unused',
        },
        async () => undefined
      )
    ).rejects.toThrow(/invalid schemaPrefix/);
  });

  // The full round trip (create + migrate + yield + drop) needs a real
  // Postgres — see docs/testing.md for how to run this locally / in CI.
  describe.skipIf(!process.env.DATABASE_URL)('against a real Postgres', () => {
    it('migrates a throwaway schema, yields a working pool, and drops the schema afterwards', async () => {
      const migrationsDir = writeTrivialMigrationsDir();
      const schema = `test_utils_spec_${Date.now()}`;

      const rowCount = await withTestDatabase(
        { schemaPrefix: schema, exactSchemaName: true, migrationsDir },
        async pool => {
          await pool.query('INSERT INTO widget (id) VALUES (gen_random_uuid())');
          const { rows } = await pool.query<{ count: number }>(
            'SELECT count(*)::int AS count FROM widget'
          );
          return rows[0].count;
        }
      );

      expect(rowCount).toBe(1);

      // Reconnect independently of the (now-ended) pool the harness handed
      // in — proves the schema was actually dropped, not just that the pool
      // was closed.
      const client = new Client({ connectionString: process.env.DATABASE_URL });
      await client.connect();
      try {
        const { rows } = await client.query('SELECT 1 FROM pg_namespace WHERE nspname = $1', [
          schema,
        ]);
        expect(rows).toHaveLength(0);
      } finally {
        await client.end();
      }
    });
  });
});
