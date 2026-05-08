/**
 * Two-layer safety gate for seed operations.
 *
 *   1. NODE_ENV policy — each target lists the environments where it is permitted.
 *   2. ALLOW_* flag    — destructive or production-impacting targets require a
 *      per-invocation human confirmation, so an accidental DSN swap cannot
 *      silently nuke the wrong database.
 *
 * The DB-privilege belt described in the design doc is a separate, ops-side
 * defence: even if this guard is bypassed, the application role in production
 * is expected to lack TRUNCATE / DROP / ALTER privileges.
 */

export type SeedTarget = 'reference' | 'demo' | 'fixtures' | 'bootstrap' | 'reset';

type NodeEnv = 'development' | 'test' | 'staging' | 'production';

const POLICY: Record<SeedTarget, readonly NodeEnv[]> = {
  reference: ['development', 'test', 'staging', 'production'],
  demo: ['development', 'test', 'staging'],
  fixtures: ['development', 'test', 'staging'],
  bootstrap: ['production', 'staging'],
  reset: ['development', 'test'],
};

const FLAG_REQUIREMENTS: Partial<Record<SeedTarget, { var: string; value: string }>> = {
  demo: { var: 'ALLOW_DEMO_SEED', value: 'true' },
  reset: { var: 'ALLOW_DEMO_SEED', value: 'true' },
  bootstrap: { var: 'ALLOW_BOOTSTRAP', value: 'true' },
};

/**
 * Production-only flag requirements (ADS-506).
 *
 * Targets in this map are allowed in production by NODE_ENV policy but still
 * require a per-invocation confirmation flag when NODE_ENV=production. This
 * stops `npm run db:seed:reference` from silently overwriting reference data
 * if it is accidentally pointed at a prod DSN.
 */
const PROD_ONLY_FLAG_REQUIREMENTS: Partial<Record<SeedTarget, { var: string; value: string }>> = {
  reference: { var: 'ALLOW_REFERENCE_SEED_PROD', value: 'true' },
};

const isNodeEnv = (value: string): value is NodeEnv =>
  value === 'development' || value === 'test' || value === 'staging' || value === 'production';

export function assertSeedAllowed(target: SeedTarget): void {
  const raw = process.env.NODE_ENV ?? 'development';
  const env: NodeEnv = isNodeEnv(raw) ? raw : 'development';

  if (!POLICY[target].includes(env)) {
    throw new Error(
      `Seed target "${target}" is forbidden in NODE_ENV=${env}. ` +
        `Allowed envs: ${POLICY[target].join(', ')}.`
    );
  }

  const flag = FLAG_REQUIREMENTS[target];
  if (flag && process.env[flag.var] !== flag.value) {
    throw new Error(
      `Seed target "${target}" requires ${flag.var}=${flag.value} to confirm. ` +
        `This double-gate prevents accidental destructive operations.`
    );
  }

  if (env === 'production') {
    const prodFlag = PROD_ONLY_FLAG_REQUIREMENTS[target];
    if (prodFlag && process.env[prodFlag.var] !== prodFlag.value) {
      throw new Error(
        `Seed target "${target}" requires ${prodFlag.var}=${prodFlag.value} when NODE_ENV=production. ` +
          `This guards against accidental seed runs against a production database.`
      );
    }
  }
}
