import {
  DISTINCT_SECRET_PAIRS,
  envBaseSchema,
  envCorsOriginField,
  envUrlField,
} from '@adopt-dont-shop/lib.validation';
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
 * ADS-707: base schema + helper validators moved to
 *          @adopt-dont-shop/lib.validation/src/schemas/env.ts so the CLI
 *          script (follow-up) can share the same source of truth.
 *
 * Used at backend boot (validateEnvironment) AND by the
 * `npm run validate:env` CLI (scripts/validate-env.mjs — pending migration
 * to lib.validation per ADS-707 follow-up).
 */

const baseSchema = envBaseSchema;
const urlField = envUrlField;
const corsOriginField = envCorsOriginField;

type ValidationIssue = {
  path: string;
  message: string;
  level: 'error' | 'warning';
};

const distinctSecretsCheck = (env: Record<string, string | undefined>): ValidationIssue[] => {
  const issues: ValidationIssue[] = [];
  for (const [a, b] of DISTINCT_SECRET_PAIRS) {
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
