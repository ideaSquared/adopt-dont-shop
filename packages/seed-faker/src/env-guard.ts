/**
 * Safety gate for the dev-only bulk-data ('spam') seeders.
 *
 * Two independent conditions must BOTH hold before any spam seeder runs:
 *
 *   1. NODE_ENV is one of the permitted environments (development | test).
 *   2. ALLOW_SPAM is exactly "true" — a per-invocation human confirmation.
 *
 * The double-gate exists because a spam run issues thousands of unconditional
 * INSERTs. If a developer's DATABASE_URL were accidentally pointed at staging
 * or production, a single guard could still let the flood through; requiring an
 * explicit ALLOW_SPAM as well means the operator had to opt in on purpose.
 *
 * Unlike the (deleted monolith's) seed guard, an UNSET NODE_ENV is refused
 * rather than defaulted to development: a bare `tsx spam.ts` with no env is the
 * highest-uncertainty case, so it fails closed.
 */

const ALLOWED_ENVS = ['development', 'test'] as const;

export const assertSpamAllowed = (): void => {
  const env = process.env.NODE_ENV;

  if (env === undefined || env === '') {
    throw new Error(
      'Spam seeding refused: NODE_ENV is not set. ' +
        `Set NODE_ENV to one of: ${ALLOWED_ENVS.join(', ')}.`
    );
  }

  if (!ALLOWED_ENVS.includes(env as (typeof ALLOWED_ENVS)[number])) {
    throw new Error(
      `Spam seeding is forbidden in NODE_ENV=${env}. ` + `Allowed envs: ${ALLOWED_ENVS.join(', ')}.`
    );
  }

  if (process.env.ALLOW_SPAM !== 'true') {
    throw new Error(
      'Spam seeding requires ALLOW_SPAM=true to confirm. ' +
        'This double-gate prevents accidentally flooding the wrong database.'
    );
  }
};

/**
 * Safety gate for each service's demo-data `db:seed` (auth, applications, chat,
 * pets, rescue). Unlike `assertSpamAllowed` this is a single-condition,
 * fail-closed denylist: seeding is refused in production and staging unless
 * ALLOW_PROD_SEED is exactly "true".
 *
 * Staging is a deployed, often internet-reachable environment — treated the
 * same as production by every other staging-aware guard in this codebase
 * (ADS-1339, ADS-1271). Seeding it provisions elevated-role accounts with a
 * shared default password, so it must fail closed unless explicitly
 * overridden, the same as production (ADS-1375).
 *
 * Kept as ONE implementation shared by every seeding service so a policy change
 * (another protected NODE_ENV, a tighter override) cannot be applied to four
 * services and silently missed on the fifth (ADS-1383).
 */
export const assertNotProduction = (): void => {
  const env = process.env.NODE_ENV;
  if ((env === 'production' || env === 'staging') && process.env.ALLOW_PROD_SEED !== 'true') {
    throw new Error(`Refusing to run db:seed in ${env}. Set ALLOW_PROD_SEED=true to override.`);
  }
};
