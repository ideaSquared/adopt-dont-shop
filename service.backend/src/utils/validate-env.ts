import {
  validateEnv,
  type EnvValidationResult,
  type ValidationIssue,
} from '@adopt-dont-shop/lib.validation';
import { logger } from './logger';

/**
 * Backend boot-time environment validator.
 *
 * The pure schema + `validateEnv` function live in
 * `@adopt-dont-shop/lib.validation/src/schemas/env.ts` so the
 * `scripts/validate-env.ts` CLI gate can share the same rules (ADS-707).
 *
 * This module only adds the boot-time wrapper that logs through Winston and
 * downgrades "missing required var" errors to warnings outside production
 * (see ADS-409/452/465/512/513).
 */

export { validateEnv };
export type { EnvValidationResult, ValidationIssue };

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
