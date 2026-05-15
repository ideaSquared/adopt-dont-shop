import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock env so the queue and logger initialisers don't try to read real config.
vi.mock('../../config/env', () => ({
  env: {
    JWT_SECRET: 'test-jwt-secret-min-32-characters-long-12345',
    REDIS_URL: undefined,
  },
}));

vi.mock('../../models/RevokedToken', () => ({
  __esModule: true,
  default: {
    destroy: vi.fn(),
  },
}));

vi.mock('../../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
  loggerHelpers: {
    logSecurity: vi.fn(),
  },
}));

import RevokedToken from '../../models/RevokedToken';
import { purgeExpiredRevokedTokens } from '../../jobs/revoked-tokens-purge.job';

describe('purgeExpiredRevokedTokens (ADS-544)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deletes rows whose expires_at is in the past', async () => {
    (RevokedToken.destroy as ReturnType<typeof vi.fn>).mockResolvedValue(7);

    const deleted = await purgeExpiredRevokedTokens();

    expect(deleted).toBe(7);
    expect(RevokedToken.destroy).toHaveBeenCalledTimes(1);
    const call = (RevokedToken.destroy as ReturnType<typeof vi.fn>).mock.calls[0][0];
    // The where clause uses Sequelize Op.lt — we can't introspect the symbol
    // here, but we can confirm it's a Date value bound to expires_at.
    expect(Object.keys(call.where)).toContain('expires_at');
    const expiresAtClause = call.where.expires_at as Record<symbol, Date>;
    const symbols = Object.getOwnPropertySymbols(expiresAtClause);
    expect(symbols.length).toBe(1);
    expect(expiresAtClause[symbols[0]]).toBeInstanceOf(Date);
  });

  it('returns zero when no rows are expired', async () => {
    (RevokedToken.destroy as ReturnType<typeof vi.fn>).mockResolvedValue(0);
    const deleted = await purgeExpiredRevokedTokens();
    expect(deleted).toBe(0);
  });
});
