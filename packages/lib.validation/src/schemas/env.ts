/**
 * Shared environment-variable schema and validator (ADS-707).
 *
 * Single source of truth consumed by:
 *   - service.backend startup validator (validateEnvironment)
 *   - scripts/validate-env.ts CLI gate
 *
 * Pure schema + pure refinement functions — no logger / no side effects, so
 * the same module is safe to import from the boot path and the CLI tool.
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
  // ADS-886: Redis --requirepass value (docker-compose.yml, ADS-878/ADS-886
  // file-mounted secrets). Optional — REDIS_URL alone is a valid connection
  // method — but when set it must not be the .env.example placeholder.
  // generate-secrets.mjs / bootstrap.mjs emit a 48-char hex value and
  // docs/SECRETS-MANAGEMENT.md recommends `openssl rand -base64 32`, both
  // well above the shared 32-char secret minimum, so optionalSecretField
  // matches real setups.
  REDIS_PASSWORD: optionalSecretField('REDIS_PASSWORD'),
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
  ['JWT_REFRESH_SECRET', 'SESSION_SECRET'],
  // ADS-542: UPLOAD_SIGNING_SECRET must be distinct from every other
  // signing/encryption secret so a single disclosure does not compromise
  // both upload signatures and JWT/session/encryption material.
  ['UPLOAD_SIGNING_SECRET', 'JWT_SECRET'],
  ['UPLOAD_SIGNING_SECRET', 'JWT_REFRESH_SECRET'],
  ['UPLOAD_SIGNING_SECRET', 'SESSION_SECRET'],
  ['UPLOAD_SIGNING_SECRET', 'ENCRYPTION_KEY'],
  ['UPLOAD_SIGNING_SECRET', 'JWT_REPORT_SHARE_SECRET'],
] as const;

// ---------------------------------------------------------------------------
// Pure validateEnv — used by both the backend boot path and the CLI gate.
// No logging / no process.exit; callers decide how to surface issues.
// ---------------------------------------------------------------------------

export type ValidationIssue = {
  path: string;
  message: string;
  level: 'error' | 'warning';
};

export type EnvValidationResult = {
  ok: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
};

type EnvMap = Record<string, string | undefined>;

const distinctSecretsCheck = (env: EnvMap): ValidationIssue[] => {
  const issues: ValidationIssue[] = [];
  for (const [a, b] of DISTINCT_SECRET_PAIRS) {
    const va = env[a];
    const vb = env[b];
    if (va && vb && va === vb) {
      issues.push({
        path: `${a}/${b}`,
        message:
          `${a} and ${b} must be distinct. Reusing secrets increases compromise blast radius. ` +
          'Generate new secrets with: pnpm secrets:generate',
        level: 'error',
      });
    }
  }
  return issues;
};

const dbNameCheck = (env: EnvMap): ValidationIssue[] => {
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

const productionOnlyCheck = (env: EnvMap): ValidationIssue[] => {
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
    const corsResult = envCorsOriginField.safeParse(env.CORS_ORIGIN);
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
    const result = envUrlField(name).safeParse(value);
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
        'UPLOAD_SIGNING_SECRET is required in production. Generate with: pnpm secrets:generate',
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

/**
 * Validates the supplied env map against the schema and the per-environment
 * refinements. Pure function so the CLI script and the boot path can both
 * share it without side effects.
 */
export function validateEnv(env: EnvMap): EnvValidationResult {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];

  const result = envBaseSchema.safeParse(env);
  if (!result.success) {
    for (const issue of result.error.issues) {
      errors.push({
        path: issue.path.join('.') || '<env>',
        message: issue.message,
        level: 'error',
      });
    }
  }

  const collect = (issues: ValidationIssue[]): void => {
    for (const issue of issues) {
      if (issue.level === 'error') {
        errors.push(issue);
      } else {
        warnings.push(issue);
      }
    }
  };

  collect(dbNameCheck(env));
  collect(distinctSecretsCheck(env));
  collect(productionOnlyCheck(env));

  return { ok: errors.length === 0, errors, warnings };
}
