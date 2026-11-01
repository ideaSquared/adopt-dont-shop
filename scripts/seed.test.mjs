import { describe, expect, it } from 'vitest';

import { bootstrapExec } from './seed.mjs';

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
