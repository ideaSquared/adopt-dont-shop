import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('node-pg-migrate', () => ({
  runner: vi.fn(),
}));

import { runner } from 'node-pg-migrate';

import { MIGRATION_IGNORE_PATTERN, runMigrations } from './migrate.js';

const mockRunner = vi.mocked(runner);

const baseOpts = {
  databaseUrl: 'postgres://test',
  schema: 'test_schema',
  migrationsDir: '/tmp/migrations',
  retryBackoffMs: 0,
};

describe('MIGRATION_IGNORE_PATTERN', () => {
  const ignored = (name: string) => new RegExp(`^${MIGRATION_IGNORE_PATTERN}$`).test(name);

  it('skips the .d.ts declaration siblings tsc emits next to compiled migrations', () => {
    expect(ignored('001_create_users.d.ts')).toBe(true);
    expect(ignored('001_create_users.d.ts.map')).toBe(true);
  });

  it('still skips maps, dotfiles and co-located tests', () => {
    expect(ignored('001_create_users.js.map')).toBe(true);
    expect(ignored('.gitkeep')).toBe(true);
    expect(ignored('migrations.test.ts')).toBe(true);
    expect(ignored('001_create_users.spec.js')).toBe(true);
  });

  it('keeps real compiled and source migrations', () => {
    expect(ignored('001_create_users.js')).toBe(false);
    expect(ignored('001_create_users.ts')).toBe(false);
  });
});

describe('runMigrations', () => {
  beforeEach(() => {
    mockRunner.mockReset();
  });

  it('runs the runner once when the first attempt succeeds', async () => {
    mockRunner.mockResolvedValueOnce(undefined as unknown as Awaited<ReturnType<typeof runner>>);

    await runMigrations(baseOpts);

    expect(mockRunner).toHaveBeenCalledTimes(1);
  });

  it('passes the four CAD-lesson safety options through to the runner', async () => {
    mockRunner.mockResolvedValueOnce(undefined as unknown as Awaited<ReturnType<typeof runner>>);

    await runMigrations({ ...baseOpts, schema: 'pets' });

    expect(mockRunner).toHaveBeenCalledWith(
      expect.objectContaining({
        schema: 'pets',
        // CAD lesson #1
        createSchema: true,
        // CAD lesson #3 — also drops *.test.[jt]s / *.spec.[jt]s so vitest
        // test files never get loaded as migrations (the import side-effect
        // crashed the schema-equivalence smoke).
        ignorePattern: MIGRATION_IGNORE_PATTERN,
        // Set by the helper, not the caller
        migrationsTable: 'pgmigrations',
        direction: 'up',
      })
    );
  });

  it('retries on the advisory-lock contention message and eventually succeeds (CAD-#9)', async () => {
    const lockErr = new Error('Another migration is already running');
    mockRunner
      .mockRejectedValueOnce(lockErr)
      .mockRejectedValueOnce(lockErr)
      .mockResolvedValueOnce(undefined as unknown as Awaited<ReturnType<typeof runner>>);

    await runMigrations(baseOpts);

    expect(mockRunner).toHaveBeenCalledTimes(3);
  });

  it('does not retry non-lock errors — they propagate immediately', async () => {
    const sqlErr = new Error('relation "x" does not exist');
    mockRunner.mockRejectedValueOnce(sqlErr);

    await expect(runMigrations(baseOpts)).rejects.toThrow('relation "x" does not exist');
    expect(mockRunner).toHaveBeenCalledTimes(1);
  });

  it('gives up after maxRetries lock errors and re-throws the last error', async () => {
    const lockErr = new Error('Another migration is already running');
    mockRunner.mockRejectedValue(lockErr);

    await expect(runMigrations({ ...baseOpts, maxRetries: 3 })).rejects.toThrow(
      'Another migration is already running'
    );
    expect(mockRunner).toHaveBeenCalledTimes(3);
  });
});
