// Isolated coverage for the `registerTsxLoader` guard in test-database.ts.
//
// A real end-to-end exercise of this branch (registering tsx's loader, then
// letting node-pg-migrate load a real migration file under it) belongs in
// test-database.test.ts / the real consumers (services/auth's integration
// suite) — but node-pg-migrate + the tsx loader interact badly with a SECOND
// migration run inside the same already-tsx-registered process (a
// `require(esm)`-in-a-cycle failure that has nothing to do with the guard
// logic itself). Mocking both `tsx/esm/api` and `@adopt-dont-shop/db` here
// isolates exactly the guard's own behaviour — call once per process,
// regardless of how many `withTestDatabase({ registerTsxLoader: true })`
// calls are made — from that unrelated interaction.
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('tsx/esm/api', () => ({ register: vi.fn() }));
vi.mock('@adopt-dont-shop/db', () => ({
  runMigrations: vi.fn().mockResolvedValue(undefined),
  createDbClient: vi.fn().mockReturnValue({
    query: vi.fn().mockResolvedValue({ rows: [] }),
    end: vi.fn().mockResolvedValue(undefined),
  }),
}));

import { register } from 'tsx/esm/api';

import { withTestDatabase } from './test-database.js';

const BASE_OPTIONS = {
  migrationsDir: '/unused',
  databaseUrl: 'postgres://unused',
};

describe('withTestDatabase — tsx loader registration', () => {
  beforeEach(() => {
    vi.mocked(register).mockClear();
  });

  it('does not register the tsx loader by default', async () => {
    await withTestDatabase({ ...BASE_OPTIONS, schemaPrefix: 'a' }, async () => undefined);

    expect(register).not.toHaveBeenCalled();
  });

  it('registers the tsx loader once, even across multiple registerTsxLoader calls', async () => {
    await withTestDatabase(
      { ...BASE_OPTIONS, schemaPrefix: 'b', registerTsxLoader: true },
      async () => undefined
    );
    await withTestDatabase(
      { ...BASE_OPTIONS, schemaPrefix: 'c', registerTsxLoader: true },
      async () => undefined
    );

    expect(register).toHaveBeenCalledTimes(1);
  });
});
