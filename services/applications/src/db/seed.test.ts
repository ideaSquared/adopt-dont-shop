import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ApplicationsConfig } from '../config.js';
import { fold, type ApplicationEvent } from '../domain/index.js';

import { main, seedApplications, type QueryFn } from './seed.js';
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

function recordingQuery(): { query: QueryFn; calls: Array<{ text: string; values: unknown[] }> } {
  const calls: Array<{ text: string; values: unknown[] }> = [];
  const query: QueryFn = async (text, values) => {
    calls.push({ text, values: [...values] });
    return undefined;
  };
  return { query, calls };
}

const isEventInsert = (c: { text: string }): boolean =>
  /INSERT INTO applications\.application_events/.test(c.text);
const isProjectionInsert = (c: { text: string }): boolean =>
  /INSERT INTO applications\.applications/.test(c.text);

describe('applications seed', () => {
  it('seeds every application exactly once', async () => {
    const { query, calls } = recordingQuery();

    const seeded = await seedApplications({ query });

    expect(calls.filter(isProjectionInsert)).toHaveLength(SEED_APPLICATIONS.length);
    expect(seeded).toEqual(SEED_APPLICATIONS.map(a => a.applicationId));
  });

  it('seeds an application owned by the e2e adopter and scoped to a rescue', async () => {
    const { query, calls } = recordingQuery();

    await seedApplications({ query });

    for (const call of calls.filter(isProjectionInsert)) {
      // params: [application_id, user_id, pet_id, rescue_id, status, version]
      expect(call.values[1]).toBe('98915d9e-69ed-46b2-a897-57d8469ff360'); // John Smith
      expect(call.values[3]).toBeTruthy(); // rescue_id set → rescue inbox resolves it
    }
  });

  it('seeds a non-terminal status so the row is reviewable / not closed out', async () => {
    const { query, calls } = recordingQuery();

    await seedApplications({ query });

    for (const call of calls.filter(isProjectionInsert)) {
      expect(['submitted', 'under_review']).toContain(call.values[4]);
    }
  });

  // The list and detail reads fold application_events and never the projection
  // row, so a row without events loads as an empty aggregate and is dropped.
  it('seeds an event stream whose fold matches the projection row', async () => {
    const { query, calls } = recordingQuery();

    await seedApplications({ query });

    for (const app of SEED_APPLICATIONS) {
      const events = calls
        .filter(isEventInsert)
        .filter(c => c.values[0] === app.applicationId)
        .map(c => JSON.parse(c.values[3] as string) as ApplicationEvent);
      const state = fold(events);
      const projection = calls
        .filter(isProjectionInsert)
        .find(c => c.values[0] === app.applicationId);

      expect(state.applicationId).toBe(app.applicationId);
      expect(state.adopterId).toBe(app.userId);
      expect(state.petId).toBe(app.petId);
      expect(state.rescueId).toBe(app.rescueId);
      expect(state.status).toBe(app.status);
      expect(projection?.values[5]).toBe(state.version);
    }
  });

  it('writes events at consecutive versions starting at 1 before the projection row', async () => {
    const { query, calls } = recordingQuery();

    await seedApplications({ query });

    const eventCalls = calls.filter(isEventInsert);
    expect(eventCalls.map(c => c.values[1])).toEqual(eventCalls.map((_, i) => i + 1));
    const firstProjection = calls.findIndex(isProjectionInsert);
    expect(calls.findIndex(isEventInsert)).toBeLessThan(firstProjection);
  });

  it('is idempotent — events DO NOTHING on conflict, the projection DO UPDATEs', async () => {
    const { query, calls } = recordingQuery();

    await seedApplications({ query });

    for (const call of calls.filter(isEventInsert)) {
      expect(call.text).toMatch(/ON CONFLICT \(aggregate_id, version\) DO NOTHING/);
    }
    for (const call of calls.filter(isProjectionInsert)) {
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
    const sqls = poolQueryMock.mock.calls.map(([sql]) => sql as string);
    expect(sqls.filter(sql => /INSERT INTO applications\.applications/.test(sql))).toHaveLength(
      SEED_APPLICATIONS.length
    );
    expect(sqls.some(sql => /INSERT INTO applications\.application_events/.test(sql))).toBe(true);
    const projection = poolQueryMock.mock.calls.find(([sql]) =>
      /INSERT INTO applications\.applications/.test(sql as string)
    ) as [string, unknown[]];
    expect(projection[0]).toMatch(/ON CONFLICT \(application_id\) DO UPDATE/);
    expect(projection[1][0]).toBe(SEED_APPLICATIONS[0].applicationId);
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
