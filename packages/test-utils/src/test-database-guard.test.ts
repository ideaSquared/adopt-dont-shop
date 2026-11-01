// The exact-schema guard, without a real Postgres: pg and the migration
// runner are faked so this runs everywhere (the real-database round trip
// lives in test-database.test.ts, gated on DATABASE_URL).
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { clientQuery, runMigrations, createDbClient } = vi.hoisted(() => ({
  clientQuery: vi.fn(),
  runMigrations: vi.fn(),
  createDbClient: vi.fn(),
}));

vi.mock('pg', () => ({
  Client: class {
    connect = vi.fn();
    query = clientQuery;
    end = vi.fn();
  },
}));
vi.mock('@adopt-dont-shop/db', () => ({ runMigrations, createDbClient }));

import { withTestDatabase } from './test-database.js';

const OPTIONS = {
  schemaPrefix: 'pets',
  exactSchemaName: true,
  migrationsDir: '/migrations',
  databaseUrl: 'postgres://dev-db',
};

describe('withTestDatabase with an exact schema name', () => {
  beforeEach(() => {
    clientQuery.mockReset();
    runMigrations.mockReset();
    createDbClient.mockReset();
  });

  it('refuses a schema that already exists, before migrating into it or dropping it', async () => {
    clientQuery.mockResolvedValue({ rows: [{ '?column?': 1 }] });
    const fn = vi.fn();

    await expect(withTestDatabase(OPTIONS, fn)).rejects.toThrow(
      /schema "pets" already exists.*disposable database/
    );
    expect(runMigrations).not.toHaveBeenCalled();
    expect(fn).not.toHaveBeenCalled();
  });

  it('migrates and runs the test when the schema does not exist yet', async () => {
    clientQuery.mockResolvedValue({ rows: [] });
    const pool = { query: vi.fn().mockResolvedValue({}), end: vi.fn() };
    createDbClient.mockReturnValue(pool);

    const result = await withTestDatabase(OPTIONS, async () => 'ran');

    expect(result).toBe('ran');
    expect(runMigrations).toHaveBeenCalledWith(expect.objectContaining({ schema: 'pets' }));
    expect(pool.query).toHaveBeenCalledWith('DROP SCHEMA IF EXISTS "pets" CASCADE');
  });
});
