import type { NatsConnection } from 'nats';
import type { Pool, PoolClient } from 'pg';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Principal } from '@adopt-dont-shop/authz';
import type { UserId } from '@adopt-dont-shop/lib.types';

import type { HandlerDeps } from './handlers.js';
import { getConsentStatus, recordConsent } from './consent-handlers.js';

// --- Principals -------------------------------------------------------

const SELF: Principal = {
  userId: 'usr-self' as UserId,
  roles: ['adopter'],
  permissions: [],
};

// The adapter guarantees a principal on this path, but the handler guards
// against an empty id as defence-in-depth — this principal exercises it.
const ANON: Principal = {
  userId: '' as UserId,
  roles: [],
  permissions: [],
};

// --- Mocks ------------------------------------------------------------

function makeMocks() {
  const clientScript: Array<{ rows: unknown[] }> = [];
  const client = {
    query: vi.fn(async (sql: string) => {
      const op = sql.trim().split(/\s+/)[0].toUpperCase();
      if (op === 'BEGIN' || op === 'COMMIT' || op === 'ROLLBACK') {
        return { rows: [] };
      }
      if (sql.includes('event_outbox')) {
        return { rows: [] };
      }
      const next = clientScript.shift();
      if (!next) {
        throw new Error(`client.query unscripted: ${sql.slice(0, 80)}`);
      }
      return next;
    }),
    release: vi.fn(),
  };
  const poolScript: Array<{ rows: unknown[] }> = [];
  const pool = {
    connect: vi.fn().mockResolvedValue(client),
    query: vi.fn(async () => poolScript.shift() ?? { rows: [] }),
  };
  const natsPublish = vi.fn();
  const nats = { publish: natsPublish, jetstream: () => ({ publish: natsPublish }) };
  const deps: HandlerDeps = {
    pool: pool as unknown as Pool,
    nats: nats as unknown as NatsConnection,
    passwordHasher: { hash: vi.fn(), verify: vi.fn() } as unknown as HandlerDeps['passwordHasher'],
    tokenIssuer: {
      mintTokens: vi.fn(),
      mintAccess: vi.fn(),
      mintRefresh: vi.fn(),
    } as unknown as HandlerDeps['tokenIssuer'],
  };
  return {
    client: client as unknown as PoolClient,
    poolMock: pool,
    clientMock: client,
    natsMock: nats,
    clientScript,
    poolScript,
    deps,
  };
}

const consentInserts = (mocks: ReturnType<typeof makeMocks>): unknown[][] =>
  mocks.clientMock.query.mock.calls
    .filter(call => String(call[0]).includes('consent_events'))
    .map(call => call[1] as unknown[]);

// --- recordConsent ----------------------------------------------------

describe('recordConsent', () => {
  let mocks: ReturnType<typeof makeMocks>;
  beforeEach(() => {
    mocks = makeMocks();
  });
  afterEach(() => {
    vi.resetAllMocks();
  });

  it('writes one row per decision and returns the count', async () => {
    mocks.clientScript.push({ rows: [] }, { rows: [] });

    const res = await recordConsent(mocks.deps, SELF, {
      decisions: [
        { documentType: 'terms', version: '2026-05-10-v1' },
        { documentType: 'privacy', version: '2026-05-10-v1' },
      ],
    });

    expect(res.recorded).toBe(2);
    const inserts = consentInserts(mocks);
    expect(inserts).toHaveLength(2);
    // Every row is stamped with the calling principal's id, never a body value.
    expect(inserts.every(params => params[1] === 'usr-self')).toBe(true);
  });

  it('records the cookies analytics opt-in on the row', async () => {
    mocks.clientScript.push({ rows: [] });

    await recordConsent(mocks.deps, SELF, {
      decisions: [{ documentType: 'cookies', version: 'c1', analyticsConsent: true }],
    });

    const [params] = consentInserts(mocks);
    // params: [id, userId, documentType, version, analyticsConsent, ip, userAgent]
    expect(params[2]).toBe('cookies');
    expect(params[3]).toBe('c1');
    expect(params[4]).toBe(true);
  });

  it('publishes a single auth.actionTaken audit event', async () => {
    mocks.clientScript.push({ rows: [] });

    await recordConsent(mocks.deps, SELF, {
      decisions: [{ documentType: 'terms', version: 'v1' }],
    });

    expect(mocks.natsMock.publish).toHaveBeenCalledTimes(1);
    expect(mocks.natsMock.publish.mock.calls[0][0]).toBe('auth.actionTaken');
  });

  it('rejects an empty decision list', async () => {
    await expect(recordConsent(mocks.deps, SELF, { decisions: [] })).rejects.toMatchObject({
      code: 'INVALID_ARGUMENT',
    });
  });

  it('rejects an unknown document type', async () => {
    await expect(
      recordConsent(mocks.deps, SELF, {
        decisions: [{ documentType: 'marketing', version: 'v1' }],
      })
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
  });

  it('rejects a decision with no version', async () => {
    await expect(
      recordConsent(mocks.deps, SELF, {
        decisions: [{ documentType: 'terms', version: '' }],
      })
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
  });

  it('rejects an unauthenticated principal', async () => {
    await expect(
      recordConsent(mocks.deps, ANON, {
        decisions: [{ documentType: 'terms', version: 'v1' }],
      })
    ).rejects.toMatchObject({ code: 'UNAUTHENTICATED' });
  });
});

// --- getConsentStatus -------------------------------------------------

describe('getConsentStatus', () => {
  let mocks: ReturnType<typeof makeMocks>;
  beforeEach(() => {
    mocks = makeMocks();
  });
  afterEach(() => {
    vi.resetAllMocks();
  });

  it('maps the latest row per document type', async () => {
    mocks.poolScript.push({
      rows: [
        {
          document_type: 'terms',
          version: '2026-05-10-v1',
          analytics_consent: null,
          created_at: new Date('2026-06-01T00:00:00Z'),
        },
        {
          document_type: 'cookies',
          version: 'c2',
          analytics_consent: true,
          created_at: new Date('2026-06-02T00:00:00Z'),
        },
      ],
    });

    const res = await getConsentStatus(mocks.deps, SELF, {});

    expect(res.records).toHaveLength(2);
    const terms = res.records.find(r => r.documentType === 'terms');
    expect(terms?.version).toBe('2026-05-10-v1');
    expect(terms?.acceptedAt).toBe('2026-06-01T00:00:00.000Z');
    expect(terms?.analyticsConsent).toBeUndefined();
    const cookies = res.records.find(r => r.documentType === 'cookies');
    expect(cookies?.analyticsConsent).toBe(true);
  });

  it('returns an empty list when the user has no consent history', async () => {
    mocks.poolScript.push({ rows: [] });

    const res = await getConsentStatus(mocks.deps, SELF, {});

    expect(res.records).toEqual([]);
  });

  it('rejects an unauthenticated principal', async () => {
    await expect(getConsentStatus(mocks.deps, ANON, {})).rejects.toMatchObject({
      code: 'UNAUTHENTICATED',
    });
  });
});
