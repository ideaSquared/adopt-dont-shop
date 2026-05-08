/**
 * ADS-506 — Reference seed target requires an explicit confirmation flag in prod.
 *
 * Reference data is allowed in every environment by NODE_ENV policy. Until
 * this fix, that meant a misconfigured deploy could quietly overwrite
 * production reference rows. The guard now demands ALLOW_REFERENCE_SEED_PROD
 * when NODE_ENV=production.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { assertSeedAllowed } from '../../seeders/lib/env-guard';

const FLAGS_TO_RESET = [
  'NODE_ENV',
  'ALLOW_REFERENCE_SEED_PROD',
  'ALLOW_DEMO_SEED',
  'ALLOW_BOOTSTRAP',
] as const;

const snapshotEnv = (): Record<string, string | undefined> => {
  const snapshot: Record<string, string | undefined> = {};
  for (const key of FLAGS_TO_RESET) {
    snapshot[key] = process.env[key];
  }
  return snapshot;
};

const restoreEnv = (snapshot: Record<string, string | undefined>): void => {
  for (const key of FLAGS_TO_RESET) {
    const value = snapshot[key];
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
};

describe('seed env-guard reference target [ADS-506]', () => {
  let snapshot: Record<string, string | undefined>;

  beforeEach(() => {
    snapshot = snapshotEnv();
  });

  afterEach(() => {
    restoreEnv(snapshot);
  });

  it('allows reference seeding in development without any flag', () => {
    process.env.NODE_ENV = 'development';
    delete process.env.ALLOW_REFERENCE_SEED_PROD;

    expect(() => assertSeedAllowed('reference')).not.toThrow();
  });

  it('allows reference seeding in staging without any flag', () => {
    process.env.NODE_ENV = 'staging';
    delete process.env.ALLOW_REFERENCE_SEED_PROD;

    expect(() => assertSeedAllowed('reference')).not.toThrow();
  });

  it('rejects reference seeding in production without ALLOW_REFERENCE_SEED_PROD', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.ALLOW_REFERENCE_SEED_PROD;

    expect(() => assertSeedAllowed('reference')).toThrow(
      /ALLOW_REFERENCE_SEED_PROD=true when NODE_ENV=production/
    );
  });

  it('rejects reference seeding in production when the flag is set to a wrong value', () => {
    process.env.NODE_ENV = 'production';
    process.env.ALLOW_REFERENCE_SEED_PROD = 'yes';

    expect(() => assertSeedAllowed('reference')).toThrow(/ALLOW_REFERENCE_SEED_PROD=true/);
  });

  it('allows reference seeding in production when ALLOW_REFERENCE_SEED_PROD=true', () => {
    process.env.NODE_ENV = 'production';
    process.env.ALLOW_REFERENCE_SEED_PROD = 'true';

    expect(() => assertSeedAllowed('reference')).not.toThrow();
  });
});
