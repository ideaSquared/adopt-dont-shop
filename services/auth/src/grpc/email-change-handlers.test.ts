import { createHash } from 'node:crypto';

import type { NatsConnection } from 'nats';
import type { Pool } from 'pg';
import { describe, expect, it, vi } from 'vitest';

import type { Principal } from '@adopt-dont-shop/authz';
import type { Permission, UserId } from '@adopt-dont-shop/lib.types';

import { confirmEmailChange, requestEmailChange } from './email-change-handlers.js';
import type { HandlerDeps } from './handlers.js';

const PRINCIPAL: Principal = {
  userId: 'usr-1' as UserId,
  roles: ['adopter'],
  permissions: ['notifications.read' as Permission],
};

type UserFixture = {
  email: string;
  first_name: string | null;
  password: string;
  two_factor_enabled: boolean;
  two_factor_secret: string | null;
  two_factor_last_step: number | null;
};

type PendingFixture = { user_id: string; email: string; pending_email: string };

const USER: UserFixture = {
  email: 'alex@example.com',
  first_name: 'Alex',
  password: '$2b$10$hash',
  two_factor_enabled: false,
  two_factor_secret: null,
  two_factor_last_step: null,
};

const PENDING: PendingFixture = {
  user_id: 'usr-1',
  email: 'alex@example.com',
  pending_email: 'new@example.com',
};

type Scenario = {
  user?: UserFixture | null;
  passwordOk?: boolean;
  // Another account already holds the target address.
  emailTaken?: boolean;
  pending?: PendingFixture | null;
  // The swap UPDATE fails (e.g. a unique violation from a concurrent write).
  swapError?: unknown;
};

// One SQL router serves both pool.query and the transaction client, so a test
// describes the world (who exists, which address is taken) rather than the
// order of the handler's queries.
function makeMocks(scenario: Scenario = {}) {
  const calls: Array<{ sql: string; params: unknown[] }> = [];
  const route = async (sql: string, params: unknown[] = []) => {
    calls.push({ sql, params });
    if (/SELECT email, first_name, password/.test(sql)) {
      const user = scenario.user === undefined ? USER : scenario.user;
      return { rows: user ? [user] : [] };
    }
    if (/SELECT 1 FROM auth\.users WHERE email = \$1/.test(sql)) {
      return { rows: scenario.emailTaken ? [{ '?column?': 1 }] : [] };
    }
    if (/FOR UPDATE/.test(sql)) {
      const pending = scenario.pending === undefined ? PENDING : scenario.pending;
      return { rows: pending ? [pending] : [] };
    }
    if (/SET email = pending_email/.test(sql) && scenario.swapError) {
      throw scenario.swapError;
    }
    return { rows: [] };
  };
  const client = { query: vi.fn(route), release: vi.fn() };
  const pool = { connect: vi.fn().mockResolvedValue(client), query: vi.fn(route) };
  const natsPublish = vi.fn();
  const nats = { publish: natsPublish, jetstream: () => ({ publish: natsPublish }) };
  const passwordHasher = {
    compare: vi.fn().mockResolvedValue(scenario.passwordOk ?? true),
    hash: vi.fn(),
  };
  const deps: HandlerDeps = {
    pool: pool as unknown as Pool,
    nats: nats as unknown as NatsConnection,
    passwordHasher,
    tokenIssuer: { mint: vi.fn(), verifyAccess: vi.fn(), verifyRefresh: vi.fn() },
    encryptionKey: 'a'.repeat(64),
  };
  return { deps, calls, natsPublish };
}

type Published = { subject: string; payload: Record<string, unknown> };

const publishedEvents = (natsPublish: ReturnType<typeof vi.fn>): Published[] =>
  natsPublish.mock.calls.map(([subject, data]) => ({
    subject: String(subject),
    payload: (JSON.parse(new TextDecoder().decode(data as Uint8Array)) as Published).payload,
  }));

const eventOn = (natsPublish: ReturnType<typeof vi.fn>, subject: string) =>
  publishedEvents(natsPublish).find(e => e.subject === subject);

const sqlMatching = (calls: Array<{ sql: string; params: unknown[] }>, pattern: RegExp) =>
  calls.filter(c => pattern.test(c.sql));

const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');

const REQUEST = { newEmail: 'new@example.com', password: 'hunter22' };

describe('requestEmailChange', () => {
  it('rejects an unauthenticated caller', async () => {
    const { deps } = makeMocks();
    await expect(requestEmailChange(deps, null, REQUEST)).rejects.toMatchObject({
      code: 'UNAUTHENTICATED',
    });
  });

  it('rejects a malformed address with invalid_email and stores nothing', async () => {
    const { deps, calls, natsPublish } = makeMocks();

    await expect(
      requestEmailChange(deps, PRINCIPAL, { ...REQUEST, newEmail: 'not-an-email' })
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT', message: 'invalid_email' });

    expect(sqlMatching(calls, /pending_email/)).toEqual([]);
    expect(natsPublish).not.toHaveBeenCalled();
  });

  it('rejects the current address (after trimming and lower-casing) with email_unchanged', async () => {
    const { deps, natsPublish } = makeMocks();

    await expect(
      requestEmailChange(deps, PRINCIPAL, { ...REQUEST, newEmail: '  ALEX@Example.com ' })
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT', message: 'email_unchanged' });

    expect(natsPublish).not.toHaveBeenCalled();
  });

  it('answers NOT_FOUND when the caller has no live account', async () => {
    const { deps } = makeMocks({ user: null });
    await expect(requestEmailChange(deps, PRINCIPAL, REQUEST)).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });

  it('stores the normalised address as pending with a hashed 24h token and mails the token to it', async () => {
    const { deps, calls, natsPublish } = makeMocks();
    const before = Date.now();

    const res = await requestEmailChange(deps, PRINCIPAL, {
      ...REQUEST,
      newEmail: ' New@Example.COM ',
    });

    expect(res).toEqual({ verified: true, twoFactorRequired: false });

    const requested = eventOn(natsPublish, 'auth.emailChangeRequested');
    expect(requested?.payload).toMatchObject({
      userId: 'usr-1',
      firstName: 'Alex',
      oldEmail: 'alex@example.com',
      newEmail: 'new@example.com',
    });
    const token = String(requested?.payload.token);
    expect(token.length).toBeGreaterThan(20);
    const expiresAt = new Date(String(requested?.payload.expiresAt)).getTime();
    expect(expiresAt - before).toBeGreaterThanOrEqual(24 * 60 * 60 * 1000 - 1000);
    expect(expiresAt - before).toBeLessThanOrEqual(24 * 60 * 60 * 1000 + 5000);

    // Only the hash of the token is persisted, never the raw value.
    const [store] = sqlMatching(calls, /SET pending_email = \$1/);
    expect(store.params).toContain('new@example.com');
    expect(store.params).toContain(sha256(token));
    expect(store.params).not.toContain(token);
  });

  it('audits the request inside the transaction without the token or either address', async () => {
    const { deps, natsPublish } = makeMocks();

    await requestEmailChange(deps, PRINCIPAL, REQUEST);

    const token = String(eventOn(natsPublish, 'auth.emailChangeRequested')?.payload.token);
    const audits = publishedEvents(natsPublish).filter(e => e.subject === 'auth.actionTaken');
    const requestAudit = audits.find(a => a.payload.action === 'email_change.request');
    expect(requestAudit?.payload).toMatchObject({
      aggregateType: 'user',
      aggregateId: 'usr-1',
      actorUserId: 'usr-1',
      outcome: 'success',
    });
    const serialised = JSON.stringify(requestAudit);
    expect(serialised).not.toContain(token);
    expect(serialised).not.toContain('new@example.com');
    expect(serialised).not.toContain('alex@example.com');
  });

  it('answers a taken address exactly like a free one, stores nothing and tells that address instead', async () => {
    const { deps, calls, natsPublish } = makeMocks({ emailTaken: true });

    const res = await requestEmailChange(deps, PRINCIPAL, REQUEST);

    expect(res).toEqual({ verified: true, twoFactorRequired: false });
    expect(sqlMatching(calls, /SET pending_email/)).toEqual([]);
    expect(eventOn(natsPublish, 'auth.emailChangeRequested')).toBeUndefined();
    expect(eventOn(natsPublish, 'auth.emailChangeConflict')?.payload).toEqual({
      userId: 'usr-1',
      newEmail: 'new@example.com',
    });
  });

  it('reports a wrong password as unverified and stores nothing', async () => {
    const { deps, calls, natsPublish } = makeMocks({ passwordOk: false });

    const res = await requestEmailChange(deps, PRINCIPAL, REQUEST);

    expect(res).toEqual({ verified: false, twoFactorRequired: false });
    expect(sqlMatching(calls, /SET pending_email/)).toEqual([]);
    expect(eventOn(natsPublish, 'auth.emailChangeRequested')).toBeUndefined();
    expect(eventOn(natsPublish, 'auth.emailChangeConflict')).toBeUndefined();
  });

  it('reports two_factor_required for a 2FA account with no code and stores nothing', async () => {
    const { deps, calls, natsPublish } = makeMocks({
      user: { ...USER, two_factor_enabled: true, two_factor_secret: 'enc' },
    });

    const res = await requestEmailChange(deps, PRINCIPAL, REQUEST);

    expect(res).toEqual({ verified: false, twoFactorRequired: true });
    expect(sqlMatching(calls, /SET pending_email/)).toEqual([]);
    expect(natsPublish).not.toHaveBeenCalled();
  });

  it('reports a wrong TOTP code as unverified and stores nothing', async () => {
    const { deps, calls } = makeMocks({
      user: { ...USER, two_factor_enabled: true, two_factor_secret: 'not-decryptable' },
    });

    const res = await requestEmailChange(deps, PRINCIPAL, {
      ...REQUEST,
      twoFactorToken: '000000',
    });

    expect(res).toEqual({ verified: false, twoFactorRequired: false });
    expect(sqlMatching(calls, /SET pending_email/)).toEqual([]);
  });
});

describe('confirmEmailChange', () => {
  it('swaps the email to the pending address, marks it verified and ends every session', async () => {
    const { deps, calls, natsPublish } = makeMocks();

    const res = await confirmEmailChange(deps, null, { token: 'raw-token' });

    expect(res).toEqual({});
    const [lookup] = sqlMatching(calls, /FOR UPDATE/);
    expect(lookup.params).toEqual([sha256('raw-token')]);

    const [swap] = sqlMatching(calls, /SET email = pending_email/);
    expect(swap.sql).toContain('email_verified = true');
    expect(swap.sql).toContain('pending_email = NULL');
    expect(swap.sql).toContain('tokens_valid_from = now()');
    expect(swap.params).toContain('usr-1');

    const [revoke] = sqlMatching(calls, /auth\.refresh_tokens/);
    expect(revoke.sql).toContain('is_revoked = true');
    expect(revoke.params).toContain('usr-1');

    expect(eventOn(natsPublish, 'auth.emailChanged')?.payload).toEqual({
      userId: 'usr-1',
      oldEmail: 'alex@example.com',
      newEmail: 'new@example.com',
    });
    const audit = publishedEvents(natsPublish).find(
      e => e.subject === 'auth.actionTaken' && e.payload.action === 'email_change.confirm'
    );
    expect(audit?.payload).toMatchObject({ aggregateId: 'usr-1', outcome: 'success' });
    expect(JSON.stringify(audit)).not.toContain('raw-token');
    expect(JSON.stringify(audit)).not.toContain('new@example.com');
  });

  it('rejects an unknown, used or expired token with invalid_or_expired_token', async () => {
    const { deps, calls, natsPublish } = makeMocks({ pending: null });

    await expect(confirmEmailChange(deps, null, { token: 'stale' })).rejects.toMatchObject({
      code: 'INVALID_ARGUMENT',
      message: 'invalid_or_expired_token',
    });

    expect(sqlMatching(calls, /SET email = pending_email/)).toEqual([]);
    expect(natsPublish).not.toHaveBeenCalled();
  });

  it('rejects an empty token with invalid_or_expired_token', async () => {
    const { deps } = makeMocks();
    await expect(confirmEmailChange(deps, null, { token: '' })).rejects.toMatchObject({
      code: 'INVALID_ARGUMENT',
      message: 'invalid_or_expired_token',
    });
  });

  it('refuses with email_in_use when another account took the address meanwhile, and clears the pending change', async () => {
    const { deps, calls, natsPublish } = makeMocks({ emailTaken: true });

    await expect(confirmEmailChange(deps, null, { token: 'raw-token' })).rejects.toMatchObject({
      code: 'ALREADY_EXISTS',
      message: 'email_in_use',
    });

    expect(sqlMatching(calls, /SET email = pending_email/)).toEqual([]);
    const [clear] = sqlMatching(calls, /SET pending_email = NULL/);
    expect(clear.params).toContain('usr-1');
    expect(eventOn(natsPublish, 'auth.emailChanged')).toBeUndefined();
  });

  it('refuses with email_in_use when a concurrent write wins the unique constraint, and clears the pending change', async () => {
    const { deps, calls, natsPublish } = makeMocks({
      swapError: Object.assign(new Error('duplicate key'), { code: '23505' }),
    });

    await expect(confirmEmailChange(deps, null, { token: 'raw-token' })).rejects.toMatchObject({
      code: 'ALREADY_EXISTS',
      message: 'email_in_use',
    });

    const clears = sqlMatching(calls, /SET pending_email = NULL/).filter(
      c => !/SET email = pending_email/.test(c.sql)
    );
    expect(clears).toHaveLength(1);
    expect(clears[0].params).toContain(sha256('raw-token'));
    expect(eventOn(natsPublish, 'auth.emailChanged')).toBeUndefined();
  });

  it('rethrows unexpected failures', async () => {
    const { deps } = makeMocks({ swapError: new Error('db down') });
    await expect(confirmEmailChange(deps, null, { token: 'raw-token' })).rejects.toThrow('db down');
  });
});
