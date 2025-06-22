import { logger } from './logger';

interface EnvVar {
  name: string;
  required: boolean;
  type: 'string' | 'number' | 'boolean';
  description: string;
}

const requiredEnvVars: EnvVar[] = [
  {
    name: 'NODE_ENV',
    required: true,
    type: 'string',
    description: 'Application environment (development, production, test)',
  },
  {
    name: 'PORT',
    required: false,
    type: 'number',
    description: 'Port number for the server',
  },
  {
    name: 'DB_HOST',
    required: true,
    type: 'string',
    description: 'Database host',
  },
  {
    name: 'DB_PORT',
    required: true,
    type: 'number',
    description: 'Database port',
  },
  {
    name: 'DB_USERNAME',
    required: true,
    type: 'string',
    description: 'Database username',
  },
  {
    name: 'DB_PASSWORD',
    required: true,
    type: 'string',
    description: 'Database password',
  },
  {
    name: 'DB_NAME',
    required: true,
    type: 'string',
    description: 'Database name',
  },
  {
    name: 'JWT_SECRET',
    required: true,
    type: 'string',
    description: 'JWT signing secret (minimum 32 characters)',
  },
];

const productionOnlyEnvVars: EnvVar[] = [
  {
    name: 'CORS_ORIGIN',
    required: true,
    type: 'string',
    description: 'CORS origin URL for production',
  },
  {
    name: 'SESSION_SECRET',
    required: true,
    type: 'string',
    description: 'Session secret for production',
  },
];

export function validateEnvironment(): void {
  const errors: string[] = [];
  const warnings: string[] = [];
  const isProduction = process.env.NODE_ENV === 'production';

  // Check required environment variables
  const varsToCheck = isProduction
    ? [...requiredEnvVars, ...productionOnlyEnvVars]
    : requiredEnvVars;

  for (const envVar of varsToCheck) {
    const value = process.env[envVar.name];

    if (envVar.required && !value) {
      errors.push(`Missing required environment variable: ${envVar.name} - ${envVar.description}`);
      continue;
    }

    if (value) {
      // Type validation
      if (envVar.type === 'number' && isNaN(Number(value))) {
        errors.push(`Environment variable ${envVar.name} must be a number, got: ${value}`);
      }

      if (envVar.type === 'boolean' && !['true', 'false'].includes(value.toLowerCase())) {
        errors.push(`Environment variable ${envVar.name} must be 'true' or 'false', got: ${value}`);
      }

      // Security validation
      if (envVar.name === 'JWT_SECRET' && value.length < 32) {
        errors.push(`JWT_SECRET must be at least 32 characters long for security`);
      }

      if (envVar.name === 'SESSION_SECRET' && value.length < 32) {
        errors.push(`SESSION_SECRET must be at least 32 characters long for security`);
      }

      if (envVar.name === 'CORS_ORIGIN' && isProduction && value === '*') {
        errors.push(`CORS_ORIGIN cannot be '*' in production environment`);
      }
    }
  }

  // Additional security checks
  if (isProduction) {
    if (process.env.DB_LOGGING === 'true') {
      warnings.push('Database logging is enabled in production - this may log sensitive data');
    }

    if (!process.env.BCRYPT_ROUNDS || Number(process.env.BCRYPT_ROUNDS) < 12) {
      warnings.push('BCRYPT_ROUNDS should be at least 12 for production security');
    }
  }

  // Log warnings
  if (warnings.length > 0) {
    logger.warn('Environment validation warnings:');
    warnings.forEach(warning => logger.warn(`  - ${warning}`));
  }

  // Handle errors
  if (errors.length > 0) {
    logger.error('Environment validation failed:');
    errors.forEach(error => logger.error(`  - ${error}`));

    if (isProduction) {
      throw new Error(`Environment validation failed. ${errors.length} error(s) found.`);
    } else {
      logger.warn('Continuing in development mode despite validation errors...');
    }
  } else {
    logger.info('Environment validation passed ✓');
  }
}

export function printEnvironmentInfo(): void {
  logger.info('Environment Information:');
  logger.info(`  - NODE_ENV: ${process.env.NODE_ENV || 'not set'}`);
  logger.info(`  - PORT: ${process.env.PORT || 'not set'}`);
  logger.info(`  - DB_HOST: ${process.env.DB_HOST ? '***' : 'not set'}`);
  logger.info(`  - JWT_SECRET: ${process.env.JWT_SECRET ? '***' : 'not set'}`);
  logger.info(`  - CORS_ORIGIN: ${process.env.CORS_ORIGIN || 'not set'}`);
}
