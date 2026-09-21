import { createSpamFaker, seededUuid } from '@adopt-dont-shop/seed-faker';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ApplicationsConfig } from '../config.js';

import { main, runSpam, spamApplications, type QueryFn } from './spam.js';

// main() is the `pnpm db:spam` CLI entry point: it builds a real pool via
// @adopt-dont-shop/db and reads config via loadConfig(), so both are mocked
// here (ADS-1330) to exercise main()'s own wiring — building the pool +
// logger from config, passing `query`/`log` callbacks through to runSpam,
// and closing the pool in its `finally` — without touching a real database.
// runSpam/spamApplications are NOT mocked (can't be — they're same-module
// sibling exports main() calls directly, so vi.mock couldn't intercept them
// anyway): letting them run for real against the fake pool proves main()
// wires the pieces together correctly, not just that it calls them.
// @adopt-dont-shop/seed-faker stays real too (createSpamFaker/seededUuid are
// already imported directly above for the existing tests).
const {
  createDbClientMock,
  poolQueryMock,
  poolEndMock,
  loadConfigMock,
  loggerInfoMock,
  loggerErrorMock,
} = vi.hoisted(() => ({
  createDbClientMock: vi.fn(),
  poolQueryMock: vi.fn(),
  poolEndMock: vi.fn(),
  loadConfigMock: vi.fn(),
  loggerInfoMock: vi.fn(),
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
    info: loggerInfoMock,
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
  databaseUrl: 'postgres://test-spam-db',
  schema: 'applications_spam_test',
  natsUrl: 'nats://localhost:4222',
  petsGrpcUrl: 'service-pets:6003',
  applicationDraftPurge: { intervalMs: 86_400_000, batchSize: 500 },
};

function recording(): { query: QueryFn; calls: Array<{ text: string; values: unknown[] }> } {
  const calls: Array<{ text: string; values: unknown[] }> = [];
  const query: QueryFn = async (text, values) => {
    calls.push({ text, values: [...values] });
    return { rows: [] };
  };
  return { query, calls };
}

const ADOPTERS = [seededUuid('adopter-0')];
const PETS = [
  { pet_id: seededUuid('pet-0'), rescue_id: seededUuid('rescue-0') },
  { pet_id: seededUuid('pet-1'), rescue_id: seededUuid('rescue-1') },
];

describe('spamApplications', () => {
  it('inserts idempotently on the deterministic application_id', async () => {
    const { query, calls } = recording();

    const result = await spamApplications({
      query,
      faker: createSpamFaker(),
      applications: 10,
      adopterIds: ADOPTERS,
      pets: PETS,
    });

    // Only two adopter/pet pairs exist, so the request is capped at 2.
    expect(result.applications).toBe(2);
    expect(calls[0].text).toMatch(/ON CONFLICT \(application_id\) DO NOTHING/);
    // First column of the first row is the deterministic per-pair id.
    const firstId = calls[0].values[0];
    expect([
      seededUuid(`app-${ADOPTERS[0]}-${PETS[0].pet_id}`),
      seededUuid(`app-${ADOPTERS[0]}-${PETS[1].pet_id}`),
    ]).toContain(firstId);
  });
});

describe('runSpam', () => {
  const stubReads = (): QueryFn => async text => {
    if (text.includes("user_type = 'adopter'")) {
      return { rows: ADOPTERS.map(user_id => ({ user_id })) };
    }
    if (text.includes('FROM pets.pets p')) {
      return { rows: PETS };
    }
    return { rows: [] };
  };

  it('reads the spam adopters + pets and seeds applications for their pairs', async () => {
    const result = await runSpam({ query: stubReads(), faker: createSpamFaker() });
    // 1 adopter × 2 pets = 2 distinct pairs.
    expect(result.applications).toBe(2);
  });

  it('throws when no spam adopters/pets exist yet', async () => {
    const emptyQuery: QueryFn = async () => ({ rows: [] });
    await expect(runSpam({ query: emptyQuery, faker: createSpamFaker() })).rejects.toThrow(
      /run the auth, rescue and pets spam first/
    );
  });
});

describe('main (the `pnpm db:spam` CLI entry point)', () => {
  const originalExitCode = process.exitCode;

  const stubReads = (): void => {
    poolQueryMock.mockReset().mockImplementation(async (text: string) => {
      if (text.includes("user_type = 'adopter'")) {
        return { rows: ADOPTERS.map(user_id => ({ user_id })) };
      }
      if (text.includes('FROM pets.pets p')) {
        return { rows: PETS };
      }
      return { rows: [] }; // the bulk INSERT — bulkInsert never reads the result
    });
  };

  beforeEach(() => {
    vi.stubEnv('NODE_ENV', 'test');
    vi.stubEnv('ALLOW_SPAM', 'true');
    loadConfigMock.mockReturnValue(TEST_CONFIG);
    createDbClientMock.mockClear();
    poolEndMock.mockReset().mockResolvedValue(undefined);
    loggerInfoMock.mockClear();
    loggerErrorMock.mockClear();
    process.exitCode = undefined;
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    process.exitCode = originalExitCode;
  });

  it('builds the pool + logger from config, seeds spam applications through runSpam, and closes the pool afterwards', async () => {
    stubReads();

    await main();

    // The pool is built from loadConfig()'s own databaseUrl/schema.
    expect(createDbClientMock).toHaveBeenCalledWith({
      connectionString: TEST_CONFIG.databaseUrl,
      schema: TEST_CONFIG.schema,
    });
    // The `log` callback main() passes to runSpam forwards to the real
    // logger's .info — proves that wiring, not just that logging happened.
    expect(loggerInfoMock).toHaveBeenCalledWith(
      'spamming applications',
      expect.objectContaining({ adopters: ADOPTERS.length, pets: PETS.length })
    );
    // runSpam -> spamApplications -> bulkInsert ran for real against the
    // wired pool: one batched INSERT covering both adopter/pet pairs.
    const insertCall = poolQueryMock.mock.calls.find(call =>
      (call[0] as string).includes('INSERT INTO applications.applications')
    ) as [string, unknown[]];
    expect(insertCall[0]).toMatch(/ON CONFLICT \(application_id\) DO NOTHING/);
    expect([
      seededUuid(`app-${ADOPTERS[0]}-${PETS[0].pet_id}`),
      seededUuid(`app-${ADOPTERS[0]}-${PETS[1].pet_id}`),
    ]).toContain(insertCall[1][0]);
    expect(loggerInfoMock).toHaveBeenCalledWith('applications spam complete', {
      applications: PETS.length,
    });
    // The pool is closed exactly once, and only after the insert has been
    // issued — not before, not skipped.
    expect(poolEndMock).toHaveBeenCalledTimes(1);
    const lastQueryOrder = Math.max(...poolQueryMock.mock.invocationCallOrder);
    expect(poolEndMock.mock.invocationCallOrder[0]).toBeGreaterThan(lastQueryOrder);
  });

  it('still closes the pool and marks the process exit code when the read query fails', async () => {
    poolQueryMock.mockReset().mockRejectedValueOnce(new Error('db unreachable'));

    await expect(main()).resolves.toBeUndefined(); // caught internally, never rejects

    expect(poolEndMock).toHaveBeenCalledTimes(1);
    expect(process.exitCode).toBe(1);
    expect(loggerErrorMock).toHaveBeenCalledWith(
      'applications spam failed',
      expect.objectContaining({ message: 'db unreachable' })
    );
  });

  it('honours the spam-allowed guard before ever building a pool', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('ALLOW_SPAM', 'true');

    await expect(main()).rejects.toThrow(/forbidden in NODE_ENV=production/);
    expect(createDbClientMock).not.toHaveBeenCalled();
  });
});
