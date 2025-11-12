/**
 * Environment variable validation and type-safe access
 * This module ensures all required environment variables are present and typed correctly
 */

type RequiredEnvVars = {
  JWT_SECRET: string;
  JWT_REFRESH_SECRET: string;
  SESSION_SECRET: string;
  CSRF_SECRET: string;
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
};

type ValidatedEnv = {
  JWT_SECRET: string;
  JWT_REFRESH_SECRET: string;
  SESSION_SECRET: string;
  CSRF_SECRET: string;
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

  const MIN_SECRET_LENGTH = 32;

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

  // After validation, we know all secrets are defined and valid
  // Type assertion is safe here because we've validated above
  const validated: ValidatedEnv = {
    JWT_SECRET: jwtSecret as string,
    JWT_REFRESH_SECRET: jwtRefreshSecret as string,
    SESSION_SECRET: sessionSecret as string,
    CSRF_SECRET: csrfSecret as string,
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
  };

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
