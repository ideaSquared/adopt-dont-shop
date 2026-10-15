import type { Pool } from 'pg';
import { describe, expect, it, vi } from 'vitest';

import type { Principal } from '@adopt-dont-shop/authz';
import type { UserId } from '@adopt-dont-shop/lib.types';

import type { HandlerDeps } from './handlers.js';
import { getUserName } from './user-name-handlers.js';

const CALLER: Principal = {
  userId: 'usr-caller' as UserId,
  roles: ['adopter'],
  permissions: [],
};

function makeDeps(query: ReturnType<typeof vi.fn>): HandlerDeps {
  return {
    pool: { query } as unknown as Pool,
    nats: {} as unknown as HandlerDeps['nats'],
    passwordHasher: {} as unknown as HandlerDeps['passwordHasher'],
    tokenIssuer: {} as unknown as HandlerDeps['tokenIssuer'],
    encryptionKey: 'test-key',
  };
}

describe('getUserName', () => {
  it("returns the user's first and last name", async () => {
    const query = vi.fn().mockResolvedValue({
      rows: [{ first_name: 'Jane', last_name: 'Doe' }],
    });

    const res = await getUserName(makeDeps(query), CALLER, { userId: 'usr-1' });

    expect(res).toEqual({ userId: 'usr-1', firstName: 'Jane', lastName: 'Doe' });
    expect(query.mock.calls[0]?.[1]).toEqual(['usr-1']);
  });

  it('never selects email or other PII', async () => {
    const query = vi.fn().mockResolvedValue({ rows: [{ first_name: 'Jane', last_name: 'Doe' }] });

    await getUserName(makeDeps(query), CALLER, { userId: 'usr-1' });

    const [sql] = query.mock.calls[0] as [string, unknown];
    expect(sql).not.toMatch(/email/i);
  });

  it('rejects an unknown user with NOT_FOUND', async () => {
    const query = vi.fn().mockResolvedValue({ rows: [] });

    await expect(
      getUserName(makeDeps(query), CALLER, { userId: 'usr-ghost' })
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('excludes a soft-deleted user from the lookup', async () => {
    const query = vi.fn().mockResolvedValue({ rows: [] });

    await getUserName(makeDeps(query), CALLER, { userId: 'usr-deleted' }).catch(() => undefined);

    const [sql] = query.mock.calls[0] as [string, unknown];
    expect(sql).toMatch(/deleted_at IS NULL/);
  });

  it('rejects an empty user id with INVALID_ARGUMENT', async () => {
    const query = vi.fn();

    await expect(getUserName(makeDeps(query), CALLER, { userId: '' })).rejects.toMatchObject({
      code: 'INVALID_ARGUMENT',
    });
    expect(query).not.toHaveBeenCalled();
  });

  it('defaults a null first/last name to an empty string', async () => {
    const query = vi.fn().mockResolvedValue({ rows: [{ first_name: null, last_name: null }] });

    const res = await getUserName(makeDeps(query), CALLER, { userId: 'usr-1' });

    expect(res).toEqual({ userId: 'usr-1', firstName: '', lastName: '' });
  });
});
