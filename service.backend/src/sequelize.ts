import * as dotenv from 'dotenv';
import { Sequelize } from 'sequelize';
import { env, getDatabaseName } from './config/env';

dotenv.config();

/**
 * Build a PostgreSQL connection string from individual environment variables
 * Follows the format: postgresql://username:password@host:port/database
 */
const buildConnectionString = (database: string): string => {
  const username = process.env.DB_USERNAME || 'user';
  const password = process.env.DB_PASSWORD || 'password';
  const host = process.env.DB_HOST || 'localhost';
  const port = process.env.DB_PORT || '5432';

  return `postgresql://${username}:${password}@${host}:${port}/${database}`;
};

/**
 * Get the appropriate database connection string based on NODE_ENV
 * Priority:
 * 1. Environment-specific DATABASE_URL (e.g., DEV_DATABASE_URL, DATABASE_URL)
 * 2. Built from individual environment variables
 */
const getDatabaseUrl = (): string => {
  const nodeEnv = process.env.NODE_ENV || 'development';

  switch (nodeEnv) {
    case 'development':
      return env.DEV_DATABASE_URL || buildConnectionString(getDatabaseName(nodeEnv));
    case 'test':
      return env.TEST_DATABASE_URL || buildConnectionString(getDatabaseName(nodeEnv));
    case 'production':
      // In production, prefer DATABASE_URL (standard for managed services)
      return env.DATABASE_URL || buildConnectionString(getDatabaseName(nodeEnv));
    default:
      throw new Error('NODE_ENV is not set to a valid environment');
  }
};

const databaseUrl = getDatabaseUrl();

// Use SQLite in-memory for tests (industry standard approach)
const isTestEnvironment = process.env.NODE_ENV === 'test';

const sequelize = isTestEnvironment
  ? new Sequelize('sqlite::memory:', {
      dialect: 'sqlite',
      storage: ':memory:',
      logging: false,
      define: {
        underscored: true,
        freezeTableName: false,
        timestamps: true,
        createdAt: 'createdAt',
        updatedAt: 'updatedAt',
        deletedAt: 'deletedAt',
        paranoid: true,
      },
    })
  : new Sequelize(databaseUrl, {
      dialect: 'postgres',
      define: {
        // Convert camelCase to snake_case for database columns
        underscored: true,
        // Use camelCase for model attributes
        freezeTableName: false,
        // Enable timestamps with camelCase names
        timestamps: true,
        createdAt: 'createdAt',
        updatedAt: 'updatedAt',
        deletedAt: 'deletedAt',
        // Enable paranoid (soft delete) by default
        paranoid: true,
      },
      logging:
        process.env.NODE_ENV === 'development' && process.env.DB_LOGGING === 'true'
          ? (sql: string) => {
              // eslint-disable-next-line no-console
              console.log(sql);
            }
          : false,
    });

export default sequelize;
