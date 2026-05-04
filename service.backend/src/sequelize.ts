import * as dotenv from 'dotenv';
import { Sequelize, DataTypes } from 'sequelize';
import { env, getDatabaseName } from './config/env';

dotenv.config();

const buildConnectionString = (database: string): string => {
  const username = process.env.DB_USERNAME;
  const password = process.env.DB_PASSWORD;
  const host = process.env.DB_HOST;
  const port = process.env.DB_PORT;

  if (!username) {
    throw new Error('DB_USERNAME environment variable is not set');
  }
  if (!password) {
    throw new Error('DB_PASSWORD environment variable is not set');
  }
  if (!host) {
    throw new Error('DB_HOST environment variable is not set');
  }
  if (!port) {
    throw new Error('DB_PORT environment variable is not set');
  }

  // URL-encode userinfo and database name. Random passwords (e.g. base64) can
  // contain '/', '+', '=', and other characters that are reserved in URI
  // userinfo; without encoding, the URL parser misreads the authority and
  // ends up resolving the username as the host.
  const u = encodeURIComponent(username);
  const p = encodeURIComponent(password);
  const db = encodeURIComponent(database);
  return `postgresql://${u}:${p}@${host}:${port}/${db}`;
};

export { buildConnectionString };

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

// Use SQLite in-memory for tests (industry standard approach)
const isTestEnvironment = process.env.NODE_ENV === 'test';

const databaseUrl = isTestEnvironment ? '' : getDatabaseUrl();

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

/**
 * Get the appropriate JSON data type based on the database dialect
 * PostgreSQL supports JSONB (binary JSON with indexing)
 * SQLite only supports JSON (stored as text)
 */
export const getJsonType = () => {
  return isTestEnvironment ? DataTypes.JSON : DataTypes.JSONB;
};

/**
 * Get the appropriate UUID data type based on the database dialect
 * PostgreSQL has native UUID type
 * SQLite stores UUIDs as strings
 */
export const getUuidType = () => {
  return isTestEnvironment ? DataTypes.STRING : DataTypes.UUID;
};

/**
 * Get the appropriate ARRAY data type based on the database dialect
 * PostgreSQL has native ARRAY types
 * SQLite stores arrays as JSON strings
 */
export const getArrayType = (itemType: typeof DataTypes.STRING) => {
  return isTestEnvironment ? DataTypes.TEXT : DataTypes.ARRAY(itemType);
};

/**
 * Get the appropriate GEOMETRY data type based on the database dialect
 * PostgreSQL has PostGIS GEOMETRY types
 * SQLite stores geometry as TEXT (WKT or JSON format)
 */
export const getGeometryType = (geometryType?: string) => {
  return isTestEnvironment
    ? DataTypes.TEXT
    : geometryType
      ? DataTypes.GEOMETRY(geometryType)
      : DataTypes.GEOMETRY;
};

/**
 * Opaque type for PostgreSQL TSVECTOR columns.
 * TSVECTOR is stored and searched natively in Postgres; in SQLite tests it degrades to STRING.
 */
export type TsVector = string & { readonly __brand: 'TsVector' };

/**
 * Get the appropriate TSVECTOR data type based on the database dialect.
 * PostgreSQL has native TSVECTOR; SQLite stores it as TEXT (full-text search not functional in tests).
 */
export const getTsVectorType = () => {
  return isTestEnvironment ? DataTypes.TEXT : DataTypes.TSVECTOR;
};

/**
 * Get the appropriate case-insensitive text type based on the database dialect.
 * PostgreSQL uses CITEXT (requires the citext extension).
 * SQLite uses TEXT COLLATE NOCASE — Sequelize's built-in CITEXT shim handles this
 * automatically when dialect === sqlite, so DataTypes.CITEXT is safe on both paths.
 */
export const getCitextType = () => {
  return DataTypes.CITEXT;
};

export default sequelize;
