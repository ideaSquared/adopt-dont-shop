import type { NatsConnection } from 'nats';
import type { Pool } from 'pg';
import { describe, expect, it, vi } from 'vitest';

import {
  bootstrapSuperAdmin,
  resolveCliIdentity,
  type BootstrapAdminInput,
} from './bootstrap-admin-core.js';

const PASSWORD = 'correct-horse-battery';

const INPUT: BootstrapAdminInput = {
  email: 'ops@adoptdontshop.example',
  firstName: 'Ada',
  lastName: 'Admin',
  password: PASSWORD,
};

type Row = Record<string, unknown>;

// Scripts the guard query results; everything else (BEGIN/COMMIT, advisory
// lock, INSERTs, outbox writes) is recorded and returns no rows.
const makeDeps = (guards: { superAdmins?: Row[]; sameEmail?: Row[] } = {}) => {
  const queries: Array<{ sql: string; values: unknown[] }> = [];
  const query = vi.fn(async (sql: string, values: unknown[] = []) => {
    queries.push({ sql, values });
    if (sql.includes('FROM auth.users') && sql.includes("'super_admin'")) {
      return { rows: guards.superAdmins ?? [] };
    }
    if (sql.includes('FROM auth.users') && sql.includes('email = $1')) {
      return { rows: guards.sameEmail ?? [] };
    }
    return { rows: [] };
  });
  const client = { query, release: vi.fn() };
  // withTransaction flushes the outbox after commit via
  // nats.jetstream().publish() — same double as account-handlers.test.ts.
  const publishSpy = vi.fn();
  const nats = { publish: publishSpy, jetstream: () => ({ publish: publishSpy }), publishSpy };
  const hash = vi.fn(async (password: string) => `hashed:${password.length}`);
  return {
    deps: {
      pool: { connect: vi.fn().mockResolvedValue(client) } as unknown as Pool,
      nats: nats as unknown as NatsConnection,
      hash,
    },
    queries,
    nats,
    hash,
  };
};

const written = (queries: Array<{ sql: string }>, table: string) =>
  queries.filter(q => q.sql.includes(`INSERT INTO ${table}`));

describe('bootstrapSuperAdmin', () => {
  it('creates an active, verified super_admin and returns its id', async () => {
    const { deps, queries, hash } = makeDeps();

    const result = await bootstrapSuperAdmin(deps, INPUT);

    const inserts = written(queries, 'auth.users');
    expect(inserts).toHaveLength(1);
    expect(inserts[0].sql).toContain("'active'");
    expect(inserts[0].values).toEqual(
      expect.arrayContaining([result.userId, INPUT.email, 'Ada', 'Admin', 'super_admin'])
    );
    expect(hash).toHaveBeenCalledWith(PASSWORD);
    expect(inserts[0].values).toContain(`hashed:${PASSWORD.length}`);
    expect(inserts[0].values).not.toContain(PASSWORD);
    expect(queries.some(q => q.sql === 'COMMIT')).toBe(true);
  });

  it('records an auth.actionTaken audit event without the password', async () => {
    const { deps, nats, queries } = makeDeps();

    const { userId } = await bootstrapSuperAdmin(deps, INPUT);

    // Staged in the transactional outbox inside the same transaction.
    const outbox = queries.filter(q => q.sql.includes('event_outbox'));
    expect(outbox.length).toBeGreaterThan(0);
    const staged = JSON.stringify(outbox.map(q => q.values));
    expect(staged).toContain('auth.actionTaken');
    expect(staged).toContain(userId);
    expect(staged).toContain('bootstrap_super_admin');
    expect(staged).not.toContain(PASSWORD);
    expect(nats.publishSpy).toHaveBeenCalled();
  });

  it('refuses when an active super_admin already exists and writes nothing', async () => {
    const { deps, queries, nats } = makeDeps({ superAdmins: [{ user_id: 'u-1' }] });

    await expect(bootstrapSuperAdmin(deps, INPUT)).rejects.toMatchObject({
      code: 'ALREADY_EXISTS',
      message: expect.stringContaining('super_admin already exists'),
    });

    expect(written(queries, 'auth.users')).toHaveLength(0);
    expect(queries.some(q => q.sql === 'ROLLBACK')).toBe(true);
    expect(nats.publishSpy).not.toHaveBeenCalled();
  });

  it('refuses when the email is already registered', async () => {
    const { deps, queries } = makeDeps({ sameEmail: [{ user_id: 'u-2' }] });

    await expect(bootstrapSuperAdmin(deps, INPUT)).rejects.toMatchObject({
      code: 'ALREADY_EXISTS',
    });
    expect(written(queries, 'auth.users')).toHaveLength(0);
  });

  it('rejects a password below the auth service policy', async () => {
    const { deps, queries } = makeDeps();

    await expect(bootstrapSuperAdmin(deps, { ...INPUT, password: 'short' })).rejects.toMatchObject({
      code: 'INVALID_ARGUMENT',
    });
    expect(queries).toHaveLength(0);
  });

  it.each([
    ['missing', ''],
    ['malformed', 'not-an-email'],
  ])('rejects a %s email', async (_label, email) => {
    const { deps, queries } = makeDeps();

    await expect(bootstrapSuperAdmin(deps, { ...INPUT, email })).rejects.toMatchObject({
      code: 'INVALID_ARGUMENT',
    });
    expect(queries).toHaveLength(0);
  });

  it('rejects a missing name', async () => {
    const { deps } = makeDeps();

    await expect(bootstrapSuperAdmin(deps, { ...INPUT, firstName: ' ' })).rejects.toMatchObject({
      code: 'INVALID_ARGUMENT',
    });
  });

  it('does not leak the password in a thrown error', async () => {
    const { deps } = makeDeps({ superAdmins: [{ user_id: 'u-1' }] });

    const error = await bootstrapSuperAdmin(deps, INPUT).catch((e: Error) => e);

    expect(String(error)).not.toContain(PASSWORD);
  });
});

describe('resolveCliIdentity', () => {
  it('prefers flags over environment variables', () => {
    const identity = resolveCliIdentity(
      { email: 'flag@x.io', 'first-name': 'F', 'last-name': 'L', 'password-stdin': true },
      { BOOTSTRAP_ADMIN_EMAIL: 'env@x.io', BOOTSTRAP_ADMIN_FIRST_NAME: 'E' }
    );
    expect(identity).toEqual({ email: 'flag@x.io', firstName: 'F', lastName: 'L' });
  });

  it('falls back to BOOTSTRAP_ADMIN_* environment variables', () => {
    const identity = resolveCliIdentity(
      { 'password-stdin': true },
      {
        BOOTSTRAP_ADMIN_EMAIL: 'env@x.io',
        BOOTSTRAP_ADMIN_FIRST_NAME: 'E',
        BOOTSTRAP_ADMIN_LAST_NAME: 'N',
      }
    );
    expect(identity).toEqual({ email: 'env@x.io', firstName: 'E', lastName: 'N' });
  });

  it('requires --password-stdin so the password never comes from argv or env', () => {
    expect(() => resolveCliIdentity({ email: 'a@b.io' }, {})).toThrow('--password-stdin');
  });
});
