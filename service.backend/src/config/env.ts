/**
 * Environment variable validation and type-safe access
 * This module ensures all required environment variables are present and typed correctly
 */

type RequiredEnvVars = {
  JWT_SECRET: string;
  JWT_REFRESH_SECRET: string;
  SESSION_SECRET: string;
  CSRF_SECRET: string;
  ENCRYPTION_KEY: string;
  UPLOAD_SIGNING_SECRET: string;
  DEV_DB_NAME?: string;
  TEST_DB_NAME?: string;
  PROD_DB_NAME?: string;
  DB_USERNAME?: string;
  DB_PASSWORD?: string;
  DB_HOST?: string;
  DB_PORT?: string;
  NODE_ENV?: 'development' | 'test' | 'production';
  DB_LOGGING?: string;
  DEV_DATABASE_URL?: string;
  TEST_DATABASE_URL?: string;
  DATABASE_URL?: string;
  // Analytics reports (ADS-105). All optional — service degrades
  // gracefully when Redis isn't available.
  REDIS_URL?: string;
  JWT_REPORT_SHARE_SECRET?: string;
  WORKER_ENABLED?: string;
  DB_SSL_MODE?: string;
  ALLOW_INSECURE_DB?: string;
};

type ValidatedEnv = {
  JWT_SECRET: string;
  JWT_REFRESH_SECRET: string;
  SESSION_SECRET: string;
  CSRF_SECRET: string;
  ENCRYPTION_KEY: string;
  UPLOAD_SIGNING_SECRET: string;
  DEV_DB_NAME?: string;
  TEST_DB_NAME?: string;
  PROD_DB_NAME?: string;
  DB_USERNAME?: string;
  DB_PASSWORD?: string;
  DB_HOST?: string;
  DB_PORT?: string;
  NODE_ENV?: 'development' | 'test' | 'production';
  DB_LOGGING?: string;
  DEV_DATABASE_URL?: string;
  TEST_DATABASE_URL?: string;
  DATABASE_URL?: string;
  REDIS_URL?: string;
  JWT_REPORT_SHARE_SECRET?: string;
  WORKER_ENABLED?: string;
  DB_SSL_MODE?: string;
  ALLOW_INSECURE_DB?: string;
};

export type DbSslMode = 'disable' | 'require' | 'verify-ca' | 'verify-full';

const DB_SSL_MODES: readonly DbSslMode[] = ['disable', 'require', 'verify-ca', 'verify-full'];

/**
 * Resolve the effective DB SSL mode for the current process.
 *
 * Production defaults to `require` so a plaintext link to the database is
 * never the silent path of least resistance. To opt out of TLS in
 * production (e.g. for an in-cluster Postgres on a trusted bridge), set
 * BOTH `DB_SSL_MODE=disable` AND `ALLOW_INSECURE_DB=true`. Either alone
 * fails boot — mirrors the DEBUG_ERRORS gate in `index.ts`.
 */
export const resolveDbSslMode = (
  nodeEnv: string | undefined,
  rawMode: string | undefined,
  allowInsecure: string | undefined
): DbSslMode => {
  const trimmed = rawMode?.trim().toLowerCase();
  if (trimmed && !DB_SSL_MODES.includes(trimmed as DbSslMode)) {
    throw new Error(
      `Invalid DB_SSL_MODE: "${rawMode}". Expected one of: ${DB_SSL_MODES.join(', ')}.`
    );
  }
  const mode =
    (trimmed as DbSslMode | undefined) ?? (nodeEnv === 'production' ? 'require' : 'disable');

  if (nodeEnv === 'production' && mode === 'disable' && allowInsecure !== 'true') {
    throw new Error(
      'DB_SSL_MODE=disable is not allowed in production. Set DB_SSL_MODE to require/verify-ca/verify-full, ' +
        'or explicitly opt out by setting ALLOW_INSECURE_DB=true (only safe on a fully trusted network).'
    );
  }

  return mode;
};

/**
 * Validates that all required environment variables are present
 * @throws Error if required variables are missing or invalid
 */
const validateEnv = (): ValidatedEnv => {
  const missing: string[] = [];
  const invalid: string[] = [];

  const jwtSecret = process.env.JWT_SECRET;
  const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET;
  const sessionSecret = process.env.SESSION_SECRET;
  const csrfSecret = process.env.CSRF_SECRET;
  const encryptionKey = process.env.ENCRYPTION_KEY;
  const uploadSigningSecret = process.env.UPLOAD_SIGNING_SECRET;
  const jwtReportShareSecret = process.env.JWT_REPORT_SHARE_SECRET;

  const MIN_SECRET_LENGTH = 32;
  // ENCRYPTION_KEY is exactly 32 bytes, hex-encoded = 64 chars, because
  // AES-256 needs a 256-bit key. utils/secrets.ts enforces this too, but
  // failing at startup gives a clearer error than at first encrypt.
  const ENCRYPTION_KEY_HEX_LEN = 64;

  // Check for missing secrets
  if (!jwtSecret) {
    missing.push('JWT_SECRET');
  }

  if (!jwtRefreshSecret) {
    missing.push('JWT_REFRESH_SECRET');
  }

  if (!sessionSecret) {
    missing.push('SESSION_SECRET');
  }

  if (!csrfSecret) {
    missing.push('CSRF_SECRET');
  }

  if (!encryptionKey) {
    missing.push('ENCRYPTION_KEY');
  }

  // ADS-542: dedicated secret for signing short-lived upload URLs. Required
  // in production so a JWT_SECRET disclosure cannot be used to forge signed
  // upload URLs (and vice versa). In dev/test we fall back to a deterministic
  // placeholder if unset, so existing local setups still boot.
  const isProduction = process.env.NODE_ENV === 'production';
  if (!uploadSigningSecret && isProduction) {
    missing.push('UPLOAD_SIGNING_SECRET');
  }

  // Validate secret lengths (only if they exist)
  if (jwtSecret && jwtSecret.length < MIN_SECRET_LENGTH) {
    invalid.push(
      `JWT_SECRET (minimum ${MIN_SECRET_LENGTH} characters required, got ${jwtSecret.length})`
    );
  }

  if (jwtRefreshSecret && jwtRefreshSecret.length < MIN_SECRET_LENGTH) {
    invalid.push(
      `JWT_REFRESH_SECRET (minimum ${MIN_SECRET_LENGTH} characters required, got ${jwtRefreshSecret.length})`
    );
  }

  if (sessionSecret && sessionSecret.length < MIN_SECRET_LENGTH) {
    invalid.push(
      `SESSION_SECRET (minimum ${MIN_SECRET_LENGTH} characters required, got ${sessionSecret.length})`
    );
  }

  if (csrfSecret && csrfSecret.length < MIN_SECRET_LENGTH) {
    invalid.push(
      `CSRF_SECRET (minimum ${MIN_SECRET_LENGTH} characters required, got ${csrfSecret.length})`
    );
  }

  if (uploadSigningSecret && uploadSigningSecret.length < MIN_SECRET_LENGTH) {
    invalid.push(
      `UPLOAD_SIGNING_SECRET (minimum ${MIN_SECRET_LENGTH} characters required, got ${uploadSigningSecret.length})`
    );
  }

  if (encryptionKey) {
    if (encryptionKey.length !== ENCRYPTION_KEY_HEX_LEN) {
      invalid.push(
        `ENCRYPTION_KEY (exactly ${ENCRYPTION_KEY_HEX_LEN} hex characters required, got ${encryptionKey.length}). ` +
          `Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
      );
    } else if (!/^[0-9a-f]+$/i.test(encryptionKey)) {
      invalid.push('ENCRYPTION_KEY must be hex (0-9, a-f)');
    }
  }

  // Report errors
  const errors: string[] = [];

  if (missing.length > 0) {
    errors.push(`Missing required environment variables: ${missing.join(', ')}`);
  }

  if (invalid.length > 0) {
    errors.push(`Invalid environment variables: ${invalid.join(', ')}`);
  }

  if (errors.length > 0) {
    throw new Error(errors.join('. ') + '. Please check your .env file.');
  }

  // Verify all secrets are distinct to prevent compromise blast radius
  if (jwtSecret && jwtRefreshSecret && jwtSecret === jwtRefreshSecret) {
    throw new Error(
      'JWT_SECRET and JWT_REFRESH_SECRET must be distinct. ' +
        'Reusing secrets increases compromise blast radius. ' +
        'Generate new secrets with: npm run secrets:generate'
    );
  }

  if (jwtSecret && sessionSecret && jwtSecret === sessionSecret) {
    throw new Error(
      'JWT_SECRET and SESSION_SECRET must be distinct. ' +
        'Reusing secrets increases compromise blast radius. ' +
        'Generate new secrets with: npm run secrets:generate'
    );
  }

  if (jwtSecret && csrfSecret && jwtSecret === csrfSecret) {
    throw new Error(
      'JWT_SECRET and CSRF_SECRET must be distinct. ' +
        'Reusing secrets increases compromise blast radius. ' +
        'Generate new secrets with: npm run secrets:generate'
    );
  }

  if (jwtRefreshSecret && sessionSecret && jwtRefreshSecret === sessionSecret) {
    throw new Error(
      'JWT_REFRESH_SECRET and SESSION_SECRET must be distinct. ' +
        'Reusing secrets increases compromise blast radius. ' +
        'Generate new secrets with: npm run secrets:generate'
    );
  }

  if (jwtRefreshSecret && csrfSecret && jwtRefreshSecret === csrfSecret) {
    throw new Error(
      'JWT_REFRESH_SECRET and CSRF_SECRET must be distinct. ' +
        'Reusing secrets increases compromise blast radius. ' +
        'Generate new secrets with: npm run secrets:generate'
    );
  }

  if (sessionSecret && csrfSecret && sessionSecret === csrfSecret) {
    throw new Error(
      'SESSION_SECRET and CSRF_SECRET must be distinct. ' +
        'Reusing secrets increases compromise blast radius. ' +
        'Generate new secrets with: npm run secrets:generate'
    );
  }

  // ADS-542: UPLOAD_SIGNING_SECRET must differ from every other secret in
  // the system. Reusing JWT_SECRET (the previous behaviour) meant an HMAC
  // verification oracle in the signed-upload endpoint shared a key with the
  // JWT signing material, expanding the blast radius of a single
  // compromise. Pairwise checks below mirror the pattern above.
  if (uploadSigningSecret) {
    const otherSecrets: Array<[string, string | undefined]> = [
      ['JWT_SECRET', jwtSecret],
      ['JWT_REFRESH_SECRET', jwtRefreshSecret],
      ['SESSION_SECRET', sessionSecret],
      ['CSRF_SECRET', csrfSecret],
      ['ENCRYPTION_KEY', encryptionKey],
      ['JWT_REPORT_SHARE_SECRET', jwtReportShareSecret],
    ];
    for (const [name, value] of otherSecrets) {
      if (value && value === uploadSigningSecret) {
        throw new Error(
          `UPLOAD_SIGNING_SECRET and ${name} must be distinct. ` +
            'Reusing secrets increases compromise blast radius. ' +
            'Generate new secrets with: npm run secrets:generate'
        );
      }
    }
  }

  // ADS-542: dev/test fallback — derive a distinct, deterministic secret from
  // JWT_SECRET so existing dev setups boot without an extra .env entry. In
  // production a missing UPLOAD_SIGNING_SECRET is rejected above; this
  // fallback is only ever reached in development or test.
  const effectiveUploadSigningSecret =
    uploadSigningSecret ?? `dev-upload-signing-secret::${jwtSecret ?? ''}`;

  // After validation, we know all secrets are defined and valid
  // Type assertion is safe here because we've validated above
  const validated: ValidatedEnv = {
    JWT_SECRET: jwtSecret as string,
    JWT_REFRESH_SECRET: jwtRefreshSecret as string,
    SESSION_SECRET: sessionSecret as string,
    CSRF_SECRET: csrfSecret as string,
    ENCRYPTION_KEY: encryptionKey as string,
    UPLOAD_SIGNING_SECRET: effectiveUploadSigningSecret,
    DEV_DB_NAME: process.env.DEV_DB_NAME,
    TEST_DB_NAME: process.env.TEST_DB_NAME,
    PROD_DB_NAME: process.env.PROD_DB_NAME,
    DB_USERNAME: process.env.DB_USERNAME,
    DB_PASSWORD: process.env.DB_PASSWORD,
    DB_HOST: process.env.DB_HOST,
    DB_PORT: process.env.DB_PORT,
    NODE_ENV: process.env.NODE_ENV as 'development' | 'test' | 'production' | undefined,
    DB_LOGGING: process.env.DB_LOGGING,
    DEV_DATABASE_URL: process.env.DEV_DATABASE_URL,
    TEST_DATABASE_URL: process.env.TEST_DATABASE_URL,
    DATABASE_URL: process.env.DATABASE_URL,
    REDIS_URL: process.env.REDIS_URL,
    JWT_REPORT_SHARE_SECRET: process.env.JWT_REPORT_SHARE_SECRET,
    WORKER_ENABLED: process.env.WORKER_ENABLED,
    DB_SSL_MODE: process.env.DB_SSL_MODE,
    ALLOW_INSECURE_DB: process.env.ALLOW_INSECURE_DB,
  };

  // ADS-540: refuse to boot in production with no TLS to the database
  // unless explicitly opted-out. Runs after the secret validation so the
  // error ordering matches operator expectations.
  resolveDbSslMode(validated.NODE_ENV, validated.DB_SSL_MODE, validated.ALLOW_INSECURE_DB);

  return validated;
};

/**
 * Get the database name for the current environment
 * @throws Error if the database name is not configured for the current environment
 */
export const getDatabaseName = (nodeEnv: string): string => {
  const validated = validateEnv();

  switch (nodeEnv) {
    case 'development':
      if (!validated.DEV_DB_NAME) {
        throw new Error('DEV_DB_NAME is required for development environment');
      }
      return validated.DEV_DB_NAME;
    case 'test':
      if (!validated.TEST_DB_NAME) {
        throw new Error('TEST_DB_NAME is required for test environment');
      }
      return validated.TEST_DB_NAME;
    case 'production':
      if (!validated.PROD_DB_NAME) {
        throw new Error('PROD_DB_NAME is required for production environment');
      }
      return validated.PROD_DB_NAME;
    default:
      throw new Error(`Unknown environment: ${nodeEnv}`);
  }
};

// Validate and export the environment variables
export const env = validateEnv();
