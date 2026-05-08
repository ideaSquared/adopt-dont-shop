/**
 * ADS-399 — Regression test: prove the popular-terms / autocomplete queries
 * never interpolate the `userId` (or any other dynamic structural fragment)
 * into the raw SQL text. The query body must be byte-identical regardless
 * of whether a userId is supplied; the value must travel only through the
 * `replacements` bag.
 */
import { vi, describe, it, expect, beforeEach } from 'vitest';

const queryMock = vi.fn();

vi.mock('../../sequelize', () => ({
  default: {
    query: (...args: unknown[]) => queryMock(...args),
  },
}));

vi.mock('../../models', () => ({
  Chat: {},
  Message: { findAll: vi.fn().mockResolvedValue([]), count: vi.fn().mockResolvedValue(0) },
  User: {},
}));

vi.mock('../../utils/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

import { MessageSearchService } from '../../services/messageSearch.service';

type ServiceWithPrivates = {
  getPopularTerms: (userId?: string) => Promise<unknown>;
  getAutocompleteSuggestions: (query: string, userId?: string) => Promise<unknown>;
};

const svc = MessageSearchService as unknown as ServiceWithPrivates;

describe('messageSearch — SQL parameterisation (ADS-399)', () => {
  beforeEach(() => {
    queryMock.mockReset();
    queryMock.mockResolvedValue([]);
  });

  it('emits the same SQL text for getPopularTerms whether or not userId is supplied', async () => {
    await svc.getPopularTerms(undefined);
    await svc.getPopularTerms('00000000-0000-0000-0000-000000000001');

    expect(queryMock).toHaveBeenCalledTimes(2);
    const sqlNoUser = queryMock.mock.calls[0][0] as string;
    const sqlWithUser = queryMock.mock.calls[1][0] as string;

    expect(sqlNoUser).toBe(sqlWithUser);
    // No back-tick/$ interpolation residue
    expect(sqlNoUser).not.toMatch(/\$\{/);
    // userId only ever appears as a bind, never as a raw SQL fragment
    expect(sqlNoUser).not.toContain('00000000-0000-0000-0000-000000000001');
  });

  it('binds userId via :userId parameter and never as a raw fragment', async () => {
    const evilId = "' OR '1'='1";
    await svc.getPopularTerms(evilId);

    expect(queryMock).toHaveBeenCalledTimes(1);
    const [sql, opts] = queryMock.mock.calls[0] as [string, { replacements: { userId: unknown } }];

    expect(sql).not.toContain(evilId);
    expect(sql).toMatch(/:userId/);
    expect(opts.replacements.userId).toBe(evilId);
  });

  it('emits the same SQL text for getAutocompleteSuggestions whether or not userId is supplied', async () => {
    await svc.getAutocompleteSuggestions('hello', undefined);
    await svc.getAutocompleteSuggestions('hello', '00000000-0000-0000-0000-000000000001');

    expect(queryMock).toHaveBeenCalledTimes(2);
    const sqlNoUser = queryMock.mock.calls[0][0] as string;
    const sqlWithUser = queryMock.mock.calls[1][0] as string;

    expect(sqlNoUser).toBe(sqlWithUser);
    expect(sqlNoUser).not.toMatch(/\$\{/);
  });

  it('passes null as the userId bind when no user is supplied (closes injection vector)', async () => {
    await svc.getPopularTerms(undefined);

    const [, opts] = queryMock.mock.calls[0] as [string, { replacements: { userId: unknown } }];
    expect(opts.replacements.userId).toBeNull();
  });
});
