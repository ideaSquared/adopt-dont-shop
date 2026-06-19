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
