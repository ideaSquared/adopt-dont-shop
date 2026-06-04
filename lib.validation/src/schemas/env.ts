/**
 * Shared environment-variable schema (ADS-707).
 *
 * Single source of truth consumed by:
 *   - service.backend startup validator (validateEnvironment)
 *   - scripts/validate-env.mjs CLI gate (follow-up: migrate to tsx import)
 *
 * Pure schema + pure refinement functions — no logger / no side effects, so
 * the same module is safe to import from the boot path and the CLI tool.
 *
 * Note: this is the scaffold tranche of ADS-707. The .mjs CLI script still
 * carries its own rule copy and must be migrated in a follow-up so the two
 * paths cannot drift again. The backend validator is the first consumer.
 */
import { z } from 'zod';

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
  z.string().refine((value) => !Number.isNaN(Number(value)), {
    message: `${name} must be a number`,
  });

const booleanString = (name: string) =>
  z.enum(['true', 'false'], {
    error: () => `${name} must be 'true' or 'false'`,
  });

export const envUrlField = (name: string) =>
  z.string().url({ message: `${name} must be a valid URL (include scheme, e.g. https://...)` });

export const envCorsOriginField = z.string().refine(
  (value) =>
    !value
      .split(',')
      .map((o) => o.trim())
      .some((o) => o === '*' || o.includes('*')),
  {
    message: "CORS_ORIGIN cannot contain wildcard ('*') in production",
  }
);

/**
 * Base schema — applied to every environment. Per-environment refinements
 * (production-only requirements, DEBUG_ERRORS gates, etc.) live in the
 * backend validator next to the issue formatter.
 */
export const envBaseSchema = z.object({
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
  ADMIN_FRONTEND_URL: z.string().optional(),
  STATSIG_SERVER_SECRET_KEY: z.string().optional(),

  // ADS-784: previously-unvalidated vars with safe runtime fallbacks. Bringing
  // them into the schema means an invalid value (e.g. a typo'd LOG_LEVEL or a
  // misspelled provider) fails validation fast rather than silently taking the
  // wrong default. All optional — the consuming code already defaults them.
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'http', 'debug', 'silly']).optional(),
  SMS_PROVIDER: z.enum(['console', 'twilio']).optional(),
  PUSH_PROVIDER: z.enum(['console', 'fcm']).optional(),
  EMAIL_PROVIDER: z.enum(['console', 'ethereal', 'resend']).optional(),
  METRICS_AUTH_TOKEN: z.string().optional(),
  SENTRY_DSN: z.string().optional(),
  ANON_SWIPE_LIMIT: numericString('ANON_SWIPE_LIMIT').optional(),
});

export type EnvVars = z.infer<typeof envBaseSchema>;

// Pairs of secrets that must not share the same value.
export const DISTINCT_SECRET_PAIRS: ReadonlyArray<readonly [string, string]> = [
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
] as const;
