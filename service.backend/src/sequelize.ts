import * as dotenv from 'dotenv';
import { Sequelize, DataTypes } from 'sequelize';
import { env, getDatabaseName, resolveDbSslMode, DbSslMode } from './config/env';
import { logger } from './utils/logger';

dotenv.config();

/**
 * Connection pool + statement/lock timeouts (ADS-401).
 *
 * Sequelize defaults to a 5-connection pool with no per-query timeout, which
 * lets a single slow query exhaust the pool and cascade to 500s. The values
 * below are env-overridable so ops can tune per instance count.
 */
type PoolConfig = {
  max: number;
  min: number;
  acquire: number;
  idle: number;
};

type TimeoutConfig = {
  statementTimeoutMs: number;
  lockTimeoutMs: number;
  idleInTransactionSessionTimeoutMs: number;
};

const parseIntEnv = (name: string, fallback: number): number => {
  const raw = process.env[name];
  if (!raw) {
    return fallback;
  }
  const parsed = Number.parseInt(raw, 10);
  if (Number.isNaN(parsed) || parsed < 0) {
    return fallback;
  }
  return parsed;
};

export const buildPoolConfig = (): PoolConfig => ({
  max: parseIntEnv('DB_POOL_MAX', 20),
  min: parseIntEnv('DB_POOL_MIN', 2),
  acquire: parseIntEnv('DB_POOL_ACQUIRE_MS', 30000),
  idle: parseIntEnv('DB_POOL_IDLE_MS', 10000),
});

export const buildTimeoutConfig = (): TimeoutConfig => ({
  statementTimeoutMs: parseIntEnv('DB_STATEMENT_TIMEOUT_MS', 30000),
  lockTimeoutMs: parseIntEnv('DB_LOCK_TIMEOUT_MS', 10000),
  idleInTransactionSessionTimeoutMs: parseIntEnv('DB_IDLE_IN_TRANSACTION_TIMEOUT_MS', 60000),
});

/**
 * Build the `pg`-shaped SSL config from a DB_SSL_MODE value (ADS-540).
 *
 * The `pg` driver accepts `false` (no TLS) or an object that maps onto
 * libpq sslmode values:
 *   - require:     TLS, no cert verification
 *   - verify-ca:   TLS, verify CA but not hostname
 *   - verify-full: TLS, verify CA + hostname
 *
 * For managed providers (RDS / Neon / Supabase) mount the provider's CA
 * bundle into the container and set `DB_SSL_ROOT_CERT` to its path, then
 * use `verify-full`.
 */
export const buildSslConfig = (
  mode: DbSslMode
): false | { rejectUnauthorized: boolean; ca?: string } => {
  if (mode === 'disable') {
    return false;
  }
  const ca = process.env.DB_SSL_ROOT_CERT;
  if (mode === 'require') {
    return { rejectUnauthorized: false };
  }
  // verify-ca / verify-full — both require certificate validation.
  return ca ? { rejectUnauthorized: true, ca } : { rejectUnauthorized: true };
};

export const logEffectiveDbConfig = (
  pool: PoolConfig,
  timeouts: TimeoutConfig,
  sslMode: DbSslMode = 'disable',
  log: (message: string) => void = msg => {
    // eslint-disable-next-line no-console
    console.log(msg);
  }
): void => {
  log(
    `[db] pool max=${pool.max} min=${pool.min} acquireMs=${pool.acquire} idleMs=${pool.idle} ` +
      `statementTimeoutMs=${timeouts.statementTimeoutMs} ` +
      `lockTimeoutMs=${timeouts.lockTimeoutMs} ` +
      `idleInTransactionSessionTimeoutMs=${timeouts.idleInTransactionSessionTimeoutMs} ` +
      `sslMode=${sslMode}`
  );
};

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

const poolConfig = buildPoolConfig();
const timeoutConfig = buildTimeoutConfig();
const dbSslMode = resolveDbSslMode(env.NODE_ENV, env.DB_SSL_MODE, env.ALLOW_INSECURE_DB);
const sslConfig = buildSslConfig(dbSslMode);

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
      pool: {
        max: poolConfig.max,
        min: poolConfig.min,
        acquire: poolConfig.acquire,
        idle: poolConfig.idle,
      },
      dialectOptions: {
        // Per-query and per-lock-wait ceilings keep a single misbehaving
        // query from holding a connection forever. Values are in ms.
        statement_timeout: timeoutConfig.statementTimeoutMs,
        lock_timeout: timeoutConfig.lockTimeoutMs,
        idle_in_transaction_session_timeout: timeoutConfig.idleInTransactionSessionTimeoutMs,
        // ADS-540: enforce TLS on the DB link. `disable` returns `false`
        // so the `pg` driver opens a plaintext socket explicitly — the
        // env guard in `config/env.ts` blocks that path in production
        // unless ALLOW_INSECURE_DB=true is also set.
        ssl: sslConfig,
      },
      logging:
        process.env.DB_LOGGING === 'true'
          ? (sql: string) => {
              // ADS-509: route through Winston so DB queries are structured,
              // correlation-stamped, and gated by the logger's level (debug)
              // rather than printing raw plaintext to stdout if accidentally
              // toggled in production.
              logger.debug('sequelize.query', { sql });
            }
          : false,
    });

if (!isTestEnvironment) {
  logEffectiveDbConfig(poolConfig, timeoutConfig, dbSslMode);
}

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
