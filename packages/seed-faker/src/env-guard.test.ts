import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { assertNotProduction, assertSpamAllowed } from './env-guard.js';

// assertSpamAllowed is a double-gate that protects against a stray DATABASE_URL
// flooding the wrong database: the bulk-insert volume it unlocks must only ever
// reach a development/test database that the operator has explicitly armed.
describe('assertSpamAllowed', () => {
  const original = { ...process.env };

  beforeEach(() => {
    delete process.env.NODE_ENV;
    delete process.env.ALLOW_SPAM;
  });

  afterEach(() => {
    process.env = { ...original };
  });

  it('allows a development environment that is explicitly armed', () => {
    process.env.NODE_ENV = 'development';
    process.env.ALLOW_SPAM = 'true';

    expect(() => assertSpamAllowed()).not.toThrow();
  });

  it('allows a test environment that is explicitly armed', () => {
    process.env.NODE_ENV = 'test';
    process.env.ALLOW_SPAM = 'true';

    expect(() => assertSpamAllowed()).not.toThrow();
  });

  it('refuses a production environment even when armed', () => {
    process.env.NODE_ENV = 'production';
    process.env.ALLOW_SPAM = 'true';

    expect(() => assertSpamAllowed()).toThrow(/production/);
  });

  it('refuses a staging environment even when armed', () => {
    process.env.NODE_ENV = 'staging';
    process.env.ALLOW_SPAM = 'true';

    expect(() => assertSpamAllowed()).toThrow(/staging/);
  });

  it('refuses development when the arming flag is absent', () => {
    process.env.NODE_ENV = 'development';

    expect(() => assertSpamAllowed()).toThrow(/ALLOW_SPAM/);
  });

  it('refuses development when the arming flag is not exactly "true"', () => {
    process.env.NODE_ENV = 'development';
    process.env.ALLOW_SPAM = '1';

    expect(() => assertSpamAllowed()).toThrow(/ALLOW_SPAM/);
  });

  // An unset NODE_ENV is the bare `node script.ts` case. Treat it as the most
  // dangerous reading (could be anything) and refuse rather than default-allow.
  it('refuses when NODE_ENV is unset', () => {
    process.env.ALLOW_SPAM = 'true';

    expect(() => assertSpamAllowed()).toThrow(/NODE_ENV/);
  });
});

// assertNotProduction guards the demo-data `db:seed` path of every seeding
// service (auth, applications, chat, pets, rescue). That path provisions
// elevated-role accounts with a shared default password, so a deployed
// database must never be seeded by accident.
describe('assertNotProduction', () => {
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

  // ADS-1375: staging is a deployed, often internet-reachable environment —
  // treated the same way as production by every other staging-aware guard
  // in this codebase (ADS-1339, ADS-1271), so seeding it must fail closed
  // too, the same as production.
  it('throws when NODE_ENV is staging and ALLOW_PROD_SEED is not set', () => {
    vi.stubEnv('NODE_ENV', 'staging');
    vi.stubEnv('ALLOW_PROD_SEED', '');

    expect(() => assertNotProduction()).toThrowError(
      'Refusing to run db:seed in staging. Set ALLOW_PROD_SEED=true to override.'
    );
  });

  it('permits seeding when NODE_ENV is staging and ALLOW_PROD_SEED=true', () => {
    vi.stubEnv('NODE_ENV', 'staging');
    vi.stubEnv('ALLOW_PROD_SEED', 'true');

    expect(() => assertNotProduction()).not.toThrow();
  });

  it('refuses a production environment when the override is not exactly "true"', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('ALLOW_PROD_SEED', '1');

    expect(() => assertNotProduction()).toThrowError(/Refusing to run db:seed in production/);
  });

  it('permits seeding in non-production environments', () => {
    vi.stubEnv('NODE_ENV', 'development');

    expect(() => assertNotProduction()).not.toThrow();
  });
});
