import { describe, expect, it } from 'vitest';

import { backfillExec, backfillFailureMessage, bootstrapExec } from './seed.mjs';

describe('bootstrapExec', () => {
  it('passes the seed password into the container, so the super_admin gets the password the API phase logs in with', () => {
    const { args, env } = bootstrapExec(
      'service-auth',
      '@adopt-dont-shop/service.auth',
      'AlternatePassword123!'
    );

    // `-e NAME` (no value) forwards NAME from the exec's own environment, so
    // the password never appears on the command line.
    expect(args).toEqual([
      'compose',
      'exec',
      '-T',
      '-e',
      'SEED_PASSWORD',
      'service-auth',
      'pnpm',
      '--filter',
      '@adopt-dont-shop/service.auth',
      'run',
      'db:seed',
    ]);
    expect(env.SEED_PASSWORD).toBe('AlternatePassword123!');
  });
});

describe('backfillFailureMessage', () => {
  it('blames the backfill not running, not being offline (offline is reported by the backfill itself)', () => {
    const message = backfillFailureMessage();

    expect(message).toContain('could not run the coordinate backfill');
    expect(message).not.toMatch(/offline/i);
    expect(message).toContain('pnpm --filter @adopt-dont-shop/service.rescue backfill:coordinates');
  });
});

describe('backfillExec', () => {
  it('runs the rescue service backfill inside its container, so reseeding geocodes any rescue still missing coordinates', () => {
    expect(backfillExec().args).toEqual([
      'compose',
      'exec',
      '-T',
      'service-rescue',
      'pnpm',
      '--filter',
      '@adopt-dont-shop/service.rescue',
      'run',
      'backfill:coordinates',
    ]);
  });
});
