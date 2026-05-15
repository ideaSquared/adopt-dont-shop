import { z } from 'zod';
import { logger } from './logger';

/**
 * Environment validation built on a single Zod schema.
 *
 * ADS-409: validate the env-specific DB-name variable (DEV/TEST/PROD)
 *          rather than a non-existent generic DB_NAME.
 * ADS-452/465: there is no DB_NAME variable — code uses
 *          DEV_DB_NAME / TEST_DB_NAME / PROD_DB_NAME consistently.
 * ADS-512: DEBUG_ERRORS is allowed only outside production.
 * ADS-513: JWT_REFRESH_SECRET enforced to the same minimum length as JWT_SECRET.
 *
 * Used at backend boot (validateEnvironment) AND by the
 * `npm run validate:env` CLI (scripts/validate-env.mjs delegates to this
 * module) so operators get the same checks pre-deploy as at startup.
 */

const MIN_SECRET_LENGTH = 32;
// AES-256 needs a 256-bit key — exactly 32 bytes hex-encoded = 64 chars.
const ENCRYPTION_KEY_HEX_LEN = 64;

const placeholderRefiner = (value: string): boolean => !value.startsWith('CHANGE_THIS');
const placeholderMessage = 'must not use the default placeholder value';

const secretField = (name: string) =>
  z
    .string({ error: `${name} is required` })
    .min(MIN_SECRET_LENGTH, {
      message: `${name} must be at least ${MIN_SECRET_LENGTH} characters long for security`,
    })
    .refine(placeholderRefiner, { message: `${name} ${placeholderMessage}` });

const optionalSecretField = (name: string) =>
  z
    .string()
    .min(MIN_SECRET_LENGTH, {
      message: `${name} must be at least ${MIN_SECRET_LENGTH} characters long for security`,
    })
    .refine(placeholderRefiner, { message: `${name} ${placeholderMessage}` })
    .optional();

const numericString = (name: string) =>
  z.string().refine(value => !Number.isNaN(Number(value)), {
    message: `${name} must be a number`,
  });

const booleanString = (name: string) =>
  z.enum(['true', 'false'], {
    error: () => `${name} must be 'true' or 'false'`,
  });

const urlField = (name: string) =>
  z.string().url({ message: `${name} must be a valid URL (include scheme, e.g. https://...)` });

const corsOriginField = z.string().refine(
  value =>
    !value
      .split(',')
      .map(o => o.trim())
      .some(o => o === '*' || o.includes('*')),
  {
    message: "CORS_ORIGIN cannot contain wildcard ('*') in production",
  }
);

/**
 * Schema applied to every environment.
 */
const baseSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']),
  PORT: numericString('PORT').optional(),

  // Connection
  DB_HOST: z.string().min(1, 'DB_HOST is required'),
  DB_PORT: numericString('DB_PORT'),
  DB_USERNAME: z.string().min(1, 'DB_USERNAME is required'),
  DB_PASSWORD: z.string().min(1, 'DB_PASSWORD is required'),
  DB_LOGGING: booleanString('DB_LOGGING').optional(),

  // Secrets — required in every environment so dev configs can't leak in.
  JWT_SECRET: secretField('JWT_SECRET'),
  JWT_REFRESH_SECRET: secretField('JWT_REFRESH_SECRET'),
  SESSION_SECRET: secretField('SESSION_SECRET'),
  CSRF_SECRET: secretField('CSRF_SECRET'),
  ENCRYPTION_KEY: z
    .string({ error: 'ENCRYPTION_KEY is required' })
    .length(ENCRYPTION_KEY_HEX_LEN, {
      message:
        `ENCRYPTION_KEY must be exactly ${ENCRYPTION_KEY_HEX_LEN} hex characters (32 bytes). ` +
        `Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`,
    })
    .regex(/^[0-9a-f]+$/i, { message: 'ENCRYPTION_KEY must be hex (0-9, a-f)' }),

  // ADS-542: dedicated HMAC key for signed upload URLs. Optional in
  // dev/test (boot validator falls back to a derived placeholder); the
  // production-only check below upgrades the missing case to an error.
  UPLOAD_SIGNING_SECRET: optionalSecretField('UPLOAD_SIGNING_SECRET'),

  // Optional in all envs
  REDIS_URL: z.string().url().optional(),
  JWT_REPORT_SHARE_SECRET: optionalSecretField('JWT_REPORT_SHARE_SECRET'),
  WORKER_ENABLED: booleanString('WORKER_ENABLED').optional(),
  BCRYPT_ROUNDS: numericString('BCRYPT_ROUNDS').optional(),

  // ADS-512: DEBUG_ERRORS is allowed only outside production. Refined below.
  DEBUG_ERRORS: booleanString('DEBUG_ERRORS').optional(),

  // Per-environment DB names — refined below.
  DEV_DB_NAME: z.string().optional(),
  TEST_DB_NAME: z.string().optional(),
  PROD_DB_NAME: z.string().optional(),

  // Production-only (refined below)
  CORS_ORIGIN: z.string().optional(),
  FRONTEND_URL: z.string().optional(),
  RESCUE_FRONTEND_URL: z.string().optional(),
  STATSIG_SERVER_SECRET_KEY: z.string().optional(),
});

type ValidationIssue = {
  path: string;
  message: string;
  level: 'error' | 'warning';
};

const distinctSecretsCheck = (env: Record<string, string | undefined>): ValidationIssue[] => {
  const pairs: Array<[string, string]> = [
    ['JWT_SECRET', 'JWT_REFRESH_SECRET'],
    ['JWT_SECRET', 'SESSION_SECRET'],
    ['JWT_SECRET', 'CSRF_SECRET'],
    ['JWT_REFRESH_SECRET', 'SESSION_SECRET'],
    ['JWT_REFRESH_SECRET', 'CSRF_SECRET'],
    ['SESSION_SECRET', 'CSRF_SECRET'],
    // ADS-542: UPLOAD_SIGNING_SECRET must be distinct from every other
    // signing/encryption secret so a single disclosure does not compromise
    // both upload signatures and JWT/session/CSRF/encryption material.
    ['UPLOAD_SIGNING_SECRET', 'JWT_SECRET'],
    ['UPLOAD_SIGNING_SECRET', 'JWT_REFRESH_SECRET'],
    ['UPLOAD_SIGNING_SECRET', 'SESSION_SECRET'],
    ['UPLOAD_SIGNING_SECRET', 'CSRF_SECRET'],
    ['UPLOAD_SIGNING_SECRET', 'ENCRYPTION_KEY'],
    ['UPLOAD_SIGNING_SECRET', 'JWT_REPORT_SHARE_SECRET'],
  ];
  const issues: ValidationIssue[] = [];
  for (const [a, b] of pairs) {
    const va = env[a];
    const vb = env[b];
    if (va && vb && va === vb) {
      issues.push({
        path: `${a}/${b}`,
        message:
          `${a} and ${b} must be distinct. Reusing secrets increases compromise blast radius. ` +
          'Generate new secrets with: npm run secrets:generate',
        level: 'error',
      });
    }
  }
  return issues;
};

const dbNameCheck = (env: Record<string, string | undefined>): ValidationIssue[] => {
  const nodeEnv = env.NODE_ENV;
  const issues: ValidationIssue[] = [];
  // ADS-409: each environment requires its own DB-name variable.
  if (nodeEnv === 'development' && !env.DEV_DB_NAME) {
    issues.push({
      path: 'DEV_DB_NAME',
      message: 'DEV_DB_NAME is required for development',
      level: 'error',
    });
  }
  if (nodeEnv === 'test' && !env.TEST_DB_NAME) {
    issues.push({
      path: 'TEST_DB_NAME',
      message: 'TEST_DB_NAME is required for test',
      level: 'error',
    });
  }
  if (nodeEnv === 'production' && !env.PROD_DB_NAME) {
    issues.push({
      path: 'PROD_DB_NAME',
      message: 'PROD_DB_NAME is required for production',
      level: 'error',
    });
  }
  return issues;
};

const productionOnlyCheck = (env: Record<string, string | undefined>): ValidationIssue[] => {
  if (env.NODE_ENV !== 'production') {
    return [];
  }
  const issues: ValidationIssue[] = [];

  // CORS
  if (!env.CORS_ORIGIN) {
    issues.push({
      path: 'CORS_ORIGIN',
      message: 'CORS_ORIGIN is required in production',
      level: 'error',
    });
  } else {
    const corsResult = corsOriginField.safeParse(env.CORS_ORIGIN);
    if (!corsResult.success) {
      for (const err of corsResult.error.issues) {
        issues.push({ path: 'CORS_ORIGIN', message: err.message, level: 'error' });
      }
    }
  }

  // ADS-410: FRONTEND_URL / RESCUE_FRONTEND_URL must be set in production
  // so password-reset / verification / invitation emails don't link to localhost.
  for (const name of ['FRONTEND_URL', 'RESCUE_FRONTEND_URL'] as const) {
    const value = env[name];
    if (!value) {
      issues.push({
        path: name,
        message: `${name} is required in production (used to build email links)`,
        level: 'error',
      });
      continue;
    }
    const result = urlField(name).safeParse(value);
    if (!result.success) {
      for (const err of result.error.issues) {
        issues.push({ path: name, message: err.message, level: 'error' });
      }
    }
  }

  // ADS-542: UPLOAD_SIGNING_SECRET is required in production. The
  // optionalSecretField above validates length/placeholder when set —
  // this enforces presence specifically in production.
  if (!env.UPLOAD_SIGNING_SECRET) {
    issues.push({
      path: 'UPLOAD_SIGNING_SECRET',
      message:
        'UPLOAD_SIGNING_SECRET is required in production. Generate with: npm run secrets:generate',
      level: 'error',
    });
  }

  // ADS-411: Statsig server secret. Missing -> feature flags silently
  // default-off. Fail loudly so operators see the misconfiguration.
  if (!env.STATSIG_SERVER_SECRET_KEY) {
    issues.push({
      path: 'STATSIG_SERVER_SECRET_KEY',
      message:
        'STATSIG_SERVER_SECRET_KEY is required in production — missing key silently disables ' +
        'all server-side feature flags',
      level: 'error',
    });
  }

  // ADS-512: DEBUG_ERRORS leaks raw error messages to clients — never allow in prod.
  if (env.DEBUG_ERRORS === 'true') {
    issues.push({
      path: 'DEBUG_ERRORS',
      message:
        'DEBUG_ERRORS=true is not allowed in production (leaks raw error messages to clients)',
      level: 'error',
    });
  }

  // BCRYPT_ROUNDS warning in prod
  const bcryptRounds = env.BCRYPT_ROUNDS;
  if (bcryptRounds && Number(bcryptRounds) < 12) {
    issues.push({
      path: 'BCRYPT_ROUNDS',
      message: 'BCRYPT_ROUNDS should be at least 12 for production security',
      level: 'warning',
    });
  }

  // DB_LOGGING warning in prod
  if (env.DB_LOGGING === 'true') {
    issues.push({
      path: 'DB_LOGGING',
      message: 'Database logging is enabled in production - this may log sensitive data',
      level: 'warning',
    });
  }

  return issues;
};

export type EnvValidationResult = {
  ok: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
};

/**
 * Validates the supplied env map against the schema. Pure function so the
 * CLI script and the boot path can both share it without side effects.
 */
export function validateEnv(env: NodeJS.ProcessEnv): EnvValidationResult {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];

  const result = baseSchema.safeParse(env);
  if (!result.success) {
    for (const issue of result.error.issues) {
      errors.push({
        path: issue.path.join('.') || '<env>',
        message: issue.message,
        level: 'error',
      });
    }
  }

  for (const issue of dbNameCheck(env)) {
    if (issue.level === 'error') {
      errors.push(issue);
    } else {
      warnings.push(issue);
    }
  }

  for (const issue of distinctSecretsCheck(env)) {
    if (issue.level === 'error') {
      errors.push(issue);
    } else {
      warnings.push(issue);
    }
  }

  for (const issue of productionOnlyCheck(env)) {
    if (issue.level === 'error') {
      errors.push(issue);
    } else {
      warnings.push(issue);
    }
  }

  return { ok: errors.length === 0, errors, warnings };
}

/**
 * Backward-compatible boot-time validator. Logs warnings, throws on any error.
 *
 * In non-production environments, *missing* required vars are downgraded to
 * warnings so CI / local dev can run without a fully configured .env. Security
 * violations (weak secrets, placeholders, prod-only DEBUG_ERRORS) always fail.
 */
export function validateEnvironment(): void {
  const isProduction = process.env.NODE_ENV === 'production';
  const { errors, warnings } = validateEnv(process.env);

  // In non-production, demote "required X is missing" errors to warnings so
  // the dev workflow isn't blocked. Security-sensitive errors still fail
  // (placeholder secret, length floors, distinctness, DEBUG_ERRORS in prod).
  const downgradeable = (issue: ValidationIssue): boolean => {
    if (isProduction) {
      return false;
    }
    return /required|is required/i.test(issue.message);
  };

  const finalErrors = errors.filter(e => !downgradeable(e));
  const downgraded = errors.filter(downgradeable);
  const finalWarnings = [...warnings, ...downgraded];

  if (finalWarnings.length > 0) {
    logger.warn('Environment validation warnings:');
    finalWarnings.forEach(w => logger.warn(`  - ${w.path}: ${w.message}`));
  }

  if (finalErrors.length > 0) {
    logger.error('Environment validation failed:');
    finalErrors.forEach(e => logger.error(`  - ${e.path}: ${e.message}`));
    throw new Error(`Environment validation failed. ${finalErrors.length} error(s) found.`);
  }

  logger.info('Environment validation passed');
}

export function printEnvironmentInfo(): void {
  logger.info('Environment Information:');
  logger.info(`  - NODE_ENV: ${process.env.NODE_ENV || 'not set'}`);
  logger.info(`  - PORT: ${process.env.PORT || 'not set'}`);
  logger.info(`  - DB_HOST: ${process.env.DB_HOST ? '***' : 'not set'}`);
  logger.info(`  - JWT_SECRET: ${process.env.JWT_SECRET ? '***' : 'not set'}`);
  logger.info(`  - CORS_ORIGIN: ${process.env.CORS_ORIGIN || 'not set'}`);
}
