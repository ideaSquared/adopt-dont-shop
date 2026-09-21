import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ApplicationsConfig } from '../config.js';

import { assertNotProduction, main, seedApplications, type QueryFn } from './seed.js';
import { SEED_APPLICATIONS } from './seed-data.js';

// main() is the `pnpm db:seed` CLI entry point: it builds a real pool via
// @adopt-dont-shop/db and reads config via loadConfig(), so both are mocked
// here (ADS-1330) to exercise main()'s own wiring — building the pool from
// config, passing a `query` callback through to seedApplications, and
// closing the pool in its `finally` — without touching a real database.
// seedApplications itself is NOT mocked: letting it run for real against the
// fake pool proves main() wires the pieces together correctly, not just that
// it calls them.
const { createDbClientMock, poolQueryMock, poolEndMock, loadConfigMock, loggerErrorMock } =
  vi.hoisted(() => ({
    createDbClientMock: vi.fn(),
    poolQueryMock: vi.fn(),
    poolEndMock: vi.fn(),
    loadConfigMock: vi.fn(),
    loggerErrorMock: vi.fn(),
  }));
createDbClientMock.mockImplementation(() => ({ query: poolQueryMock, end: poolEndMock }));

vi.mock('@adopt-dont-shop/db', () => ({
  createDbClient: createDbClientMock,
}));

vi.mock('../config.js', () => ({
  loadConfig: loadConfigMock,
}));

vi.mock('@adopt-dont-shop/observability', () => ({
  createLogger: vi.fn(() => ({
    info: vi.fn(),
    error: loggerErrorMock,
    warn: vi.fn(),
    debug: vi.fn(),
    silly: vi.fn(),
  })),
}));

const TEST_CONFIG: ApplicationsConfig = {
  port: 5005,
  grpcPort: 6005,
  host: '127.0.0.1',
  environment: 'test',
  databaseUrl: 'postgres://test-seed-db',
  schema: 'applications_seed_test',
  natsUrl: 'nats://localhost:4222',
  petsGrpcUrl: 'service-pets:6003',
  applicationDraftPurge: { intervalMs: 86_400_000, batchSize: 500 },
};

describe('production guard', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('throws when NODE_ENV is production and ALLOW_PROD_SEED is not set', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('ALLOW_PROD_SEED', '');

    expect(() => assertNotProduction()).toThrowError(
      'Refusing to run db:seed in production. Set ALLOW_PROD_SEED=true to override.'
    );
  });

  it('permits seeding when NODE_ENV is production and ALLOW_PROD_SEED=true', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('ALLOW_PROD_SEED', 'true');

    expect(() => assertNotProduction()).not.toThrow();
  });

  it('permits seeding in non-production environments', () => {
    vi.stubEnv('NODE_ENV', 'development');

    expect(() => assertNotProduction()).not.toThrow();
  });
});

function recordingQuery(): { query: QueryFn; calls: Array<{ text: string; values: unknown[] }> } {
  const calls: Array<{ text: string; values: unknown[] }> = [];
  const query: QueryFn = async (text, values) => {
    calls.push({ text, values: [...values] });
    return undefined;
  };
  return { query, calls };
}

describe('applications seed', () => {
  it('seeds every application exactly once', async () => {
    const { query, calls } = recordingQuery();

    const seeded = await seedApplications({ query });

    expect(calls).toHaveLength(SEED_APPLICATIONS.length);
    expect(seeded).toEqual(SEED_APPLICATIONS.map(a => a.applicationId));
  });

  it('seeds an application owned by the e2e adopter and scoped to a rescue', async () => {
    const { query, calls } = recordingQuery();

    await seedApplications({ query });

    for (const call of calls) {
      // params: [application_id, user_id, pet_id, rescue_id, status]
      expect(call.values[1]).toBe('98915d9e-69ed-46b2-a897-57d8469ff360'); // John Smith
      expect(call.values[3]).toBeTruthy(); // rescue_id set → rescue inbox resolves it
    }
  });

  it('seeds a non-terminal status so the row is reviewable / not closed out', async () => {
    const { query, calls } = recordingQuery();

    await seedApplications({ query });

    for (const call of calls) {
      expect(['submitted', 'under_review']).toContain(call.values[4]);
    }
  });

  it('is idempotent — every insert uses ON CONFLICT (application_id) DO UPDATE', async () => {
    const { query, calls } = recordingQuery();

    await seedApplications({ query });

    for (const call of calls) {
      expect(call.text).toMatch(/ON CONFLICT \(application_id\) DO UPDATE/);
    }

    const second = recordingQuery();
    await seedApplications({ query: second.query });
    expect(second.calls).toHaveLength(calls.length);
  });
});

describe('main (the `pnpm db:seed` CLI entry point)', () => {
  const originalExitCode = process.exitCode;

  beforeEach(() => {
    vi.stubEnv('NODE_ENV', 'development');
    loadConfigMock.mockReturnValue(TEST_CONFIG);
    createDbClientMock.mockClear();
    poolQueryMock.mockReset().mockResolvedValue(undefined);
    poolEndMock.mockReset().mockResolvedValue(undefined);
    loggerErrorMock.mockClear();
    process.exitCode = undefined;
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    process.exitCode = originalExitCode;
  });

  it('builds the pool from loadConfig, seeds every application through it, and closes the pool afterwards', async () => {
    await main();

    // The pool is built from loadConfig()'s own databaseUrl/schema, not
    // hardcoded — proves the config → pool wiring, not just that a pool
    // exists.
    expect(createDbClientMock).toHaveBeenCalledWith({
      connectionString: TEST_CONFIG.databaseUrl,
      schema: TEST_CONFIG.schema,
    });
    // seedApplications ran for real against the wired `query` callback: one
    // UPSERT per seed fixture, landing on the fake pool.
    expect(poolQueryMock).toHaveBeenCalledTimes(SEED_APPLICATIONS.length);
    const [sql, params] = poolQueryMock.mock.calls[0] as [string, unknown[]];
    expect(sql).toMatch(/ON CONFLICT \(application_id\) DO UPDATE/);
    expect(params[0]).toBe(SEED_APPLICATIONS[0].applicationId);
    // The pool is closed exactly once, and only after every insert has been
    // issued — not before, not skipped.
    expect(poolEndMock).toHaveBeenCalledTimes(1);
    const lastQueryOrder = Math.max(...poolQueryMock.mock.invocationCallOrder);
    expect(poolEndMock.mock.invocationCallOrder[0]).toBeGreaterThan(lastQueryOrder);
  });

  it('still closes the pool and marks the process exit code when a seed insert fails', async () => {
    poolQueryMock.mockReset().mockRejectedValueOnce(new Error('connection reset'));

    await expect(main()).resolves.toBeUndefined(); // caught internally, never rejects

    expect(poolEndMock).toHaveBeenCalledTimes(1);
    expect(process.exitCode).toBe(1);
    expect(loggerErrorMock).toHaveBeenCalledWith(
      'applications seed failed',
      expect.objectContaining({ message: 'connection reset' })
    );
  });

  it('honours the not-production guard before ever building a pool', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('ALLOW_PROD_SEED', '');

    await expect(main()).rejects.toThrow(/Refusing to run db:seed in production/);
    expect(createDbClientMock).not.toHaveBeenCalled();
  });
});
