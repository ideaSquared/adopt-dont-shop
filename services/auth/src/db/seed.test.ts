import { afterEach, describe, expect, it, vi } from 'vitest';

import { assertNotProduction, seedUsers, type QueryFn } from './seed.js';
import { SEED_PASSWORD, SEED_USERS } from './seed-data.js';

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

// A recording query stub — the seed is pure aside from the injected
// query/hash, so we can assert the SQL + params it would run without a
// live Postgres.
function recordingQuery(): { query: QueryFn; calls: Array<{ text: string; values: unknown[] }> } {
  const calls: Array<{ text: string; values: unknown[] }> = [];
  const query: QueryFn = async (text, values) => {
    calls.push({ text, values: [...values] });
    return undefined;
  };
  return { query, calls };
}

const fakeHash = vi.fn(async (password: string) => `hashed:${password}`);

describe('auth seed', () => {
  it('seeds every canonical persona exactly once', async () => {
    const { query, calls } = recordingQuery();

    const seeded = await seedUsers({ query, hash: fakeHash });

    expect(calls).toHaveLength(SEED_USERS.length);
    expect(seeded).toEqual(SEED_USERS.map(u => u.email));
  });

  it('includes the e2e adopter john.smith with the pinned user id', async () => {
    const { query, calls } = recordingQuery();

    await seedUsers({ query, hash: fakeHash });

    const johnRow = calls.find(c => c.values.includes('john.smith@gmail.com'));
    expect(johnRow).toBeDefined();
    // Pinned to e2e/helpers/seeds.ts SEEDED_ADOPTER_USER_ID.
    expect(johnRow?.values[0]).toBe('98915d9e-69ed-46b2-a897-57d8469ff360');
    // user_type is the last param.
    expect(johnRow?.values.at(-1)).toBe('adopter');
  });

  it('seeds the admin + rescue-staff personas the e2e suite logs in as', async () => {
    const { query, calls } = recordingQuery();

    await seedUsers({ query, hash: fakeHash });

    const emails = calls.flatMap(c => c.values).filter(v => typeof v === 'string');
    expect(emails).toContain('superadmin@adoptdontshop.dev');
    expect(emails).toContain('rescue.manager@pawsrescue.dev');
  });

  it('hashes the shared dev password once and stores the hash, never the plaintext', async () => {
    const hash = vi.fn(async (password: string) => `hashed:${password}`);
    const { query, calls } = recordingQuery();

    await seedUsers({ query, hash });

    // One hash call regardless of persona count (all share SEED_PASSWORD).
    expect(hash).toHaveBeenCalledTimes(1);
    expect(hash).toHaveBeenCalledWith(SEED_PASSWORD);
    for (const call of calls) {
      // password is the 5th param ($5).
      expect(call.values[4]).toBe(`hashed:${SEED_PASSWORD}`);
      expect(call.values).not.toContain(SEED_PASSWORD);
    }
  });

  it('is idempotent — uses ON CONFLICT DO UPDATE so a re-run does not error', async () => {
    const { query, calls } = recordingQuery();

    await seedUsers({ query, hash: fakeHash });

    for (const call of calls) {
      expect(call.text).toMatch(/ON CONFLICT \(user_id\) DO UPDATE/);
    }

    // Re-running produces the same set of statements (no throw, no growth
    // in distinct targets).
    const second = recordingQuery();
    await seedUsers({ query: second.query, hash: fakeHash });
    expect(second.calls).toHaveLength(calls.length);
  });

  it('marks every seeded user active + email-verified so login works immediately', async () => {
    const { query, calls } = recordingQuery();

    await seedUsers({ query, hash: fakeHash });

    for (const call of calls) {
      expect(call.text).toMatch(/email_verified[\s\S]*true/);
      expect(call.text).toContain("'active'");
    }
  });
});
