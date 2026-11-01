import { createSpamFaker, seededUuid } from '@adopt-dont-shop/seed-faker';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ApplicationsConfig } from '../config.js';
import { fold, type ApplicationEvent } from '../domain/index.js';

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
  {
    pet_id: seededUuid('pet-0'),
    rescue_id: seededUuid('rescue-0'),
    reviewer_id: seededUuid('staff-0'),
  },
  {
    pet_id: seededUuid('pet-1'),
    rescue_id: seededUuid('rescue-1'),
    reviewer_id: seededUuid('staff-1'),
  },
];

// Split a recorded bulk INSERT back into rows of `width` columns.
const rowsOf = (call: { values: unknown[] }, width: number): unknown[][] =>
  Array.from({ length: call.values.length / width }, (_, i) =>
    call.values.slice(i * width, (i + 1) * width)
  );

// A small in-memory stand-in for the two tables spamApplications touches:
// INSERT ... ON CONFLICT DO NOTHING keeps an existing row, the stream lookup
// returns rows that have no events yet, and UPDATEs are recorded.
type ProjectionRow = { application_id: string; user_id: string; pet_id: string; status: string };
function fakeDb(existing: { rows?: ProjectionRow[]; streams?: string[] } = {}) {
  const projection = new Map((existing.rows ?? []).map(r => [r.application_id, r]));
  const events: unknown[][] = (existing.streams ?? []).map(id => ['evt', id, 1]);
  const versionUpdates: Array<{ ids: unknown; versions: unknown }> = [];
  const query: QueryFn = async (text, values) => {
    if (text.includes('INSERT INTO applications.applications ')) {
      for (const row of rowsOf({ values: [...values] }, 12)) {
        const id = String(row[0]);
        if (!projection.has(id)) {
          projection.set(id, {
            application_id: id,
            user_id: String(row[1]),
            pet_id: String(row[2]),
            status: String(row[4]),
          });
        }
      }
    }
    if (text.includes('INSERT INTO applications.application_events')) {
      events.push(...rowsOf({ values: [...values] }, 7));
    }
    if (text.includes('NOT EXISTS')) {
      const ids = values[0] as string[];
      return {
        rows: ids
          .map(id => projection.get(id))
          .filter((r): r is ProjectionRow => r !== undefined)
          .filter(r => !events.some(e => e[1] === r.application_id)),
      };
    }
    if (text.startsWith('UPDATE applications.applications')) {
      versionUpdates.push({ ids: values[0], versions: values[1] });
    }
    return { rows: [] };
  };
  // Events written by this run (the seeded stream markers excluded).
  const written = () => events.filter(e => e[0] !== 'evt');
  return { query, projection, written, versionUpdates };
}

const chainFor = (events: unknown[][], applicationId: string) =>
  events.filter(e => e[1] === applicationId).sort((a, b) => Number(a[2]) - Number(b[2]));

const foldChain = (chain: unknown[][]) =>
  fold(chain.map(e => JSON.parse(String(e[4])) as ApplicationEvent));

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
    const projection = calls.find(c => c.text.includes('INSERT INTO applications.applications '))!;
    expect(projection.text).toMatch(/ON CONFLICT \(application_id\) DO NOTHING/);
    // First column of the first row is the deterministic per-pair id.
    const firstId = projection.values[0];
    expect([
      seededUuid(`app-${ADOPTERS[0]}-${PETS[0].pet_id}`),
      seededUuid(`app-${ADOPTERS[0]}-${PETS[1].pet_id}`),
    ]).toContain(firstId);
  });

  it("writes each application's event chain, so the event-sourced reads can load it", async () => {
    const db = fakeDb();
    const adopters = Array.from({ length: 30 }, (_, i) => seededUuid(`adopter-${i}`));

    await spamApplications({
      query: db.query,
      faker: createSpamFaker(),
      applications: 60,
      adopterIds: adopters,
      pets: PETS,
    });

    const rows = [...db.projection.values()];
    // The skewed bag covers every non-draft status we seed.
    expect(new Set(rows.map(r => r.status))).toEqual(
      new Set(['submitted', 'under_review', 'approved', 'rejected', 'withdrawn'])
    );
    // event_id, aggregate_id, version, event_type, event_data, occurred_at, actor_user_id
    for (const row of rows) {
      const chain = chainFor(db.written(), row.application_id);
      expect(chain.map(e => e[2])).toEqual(chain.map((_, i) => i + 1));
      // Folding the written events reproduces the projected row.
      const state = foldChain(chain);
      expect(state.applicationId).toBe(row.application_id);
      expect(state.status).toBe(row.status);
      for (const e of chain) {
        expect(JSON.parse(String(e[4])).type).toBe(e[3]);
      }
    }
  });

  it('leaves an existing event stream alone on a re-run, even when the status draw changes', async () => {
    const applicationId = seededUuid(`app-${ADOPTERS[0]}-${PETS[0].pet_id}`);
    const db = fakeDb({
      rows: [
        {
          application_id: applicationId,
          user_id: ADOPTERS[0],
          pet_id: PETS[0].pet_id,
          status: 'submitted',
        },
      ],
      streams: [applicationId],
    });

    await spamApplications({
      query: db.query,
      faker: createSpamFaker(),
      applications: 2,
      adopterIds: ADOPTERS,
      pets: PETS,
    });

    expect(chainFor(db.written(), applicationId)).toEqual([]);
  });

  it('backfills an eventless application from the status it already has', async () => {
    // A row written before the seeder wrote events: whatever this run draws,
    // the events must reproduce the stored 'approved' status.
    const applicationId = seededUuid(`app-${ADOPTERS[0]}-${PETS[1].pet_id}`);
    const db = fakeDb({
      rows: [
        {
          application_id: applicationId,
          user_id: ADOPTERS[0],
          pet_id: PETS[1].pet_id,
          status: 'approved',
        },
      ],
    });

    await spamApplications({
      query: db.query,
      faker: createSpamFaker(),
      applications: 2,
      adopterIds: ADOPTERS,
      pets: PETS,
    });

    const state = foldChain(chainFor(db.written(), applicationId));
    expect(state.status).toBe('approved');
    expect(state.rescueId).toBe(PETS[1].rescue_id);
    // The projection's version is brought in line with its new stream.
    const update = db.versionUpdates[0];
    const index = (update.ids as string[]).indexOf(applicationId);
    expect((update.versions as number[])[index]).toBe(state.version);
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
