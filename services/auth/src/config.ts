export type AuthConfig = {
  // HTTP port for the boot-readiness surface (/health/simple). Distinct
  // from service.backend's 5000, service.gateway's 4000,
  // service.notifications' 5001.
  port: number;
  host: string;
  // gRPC server port. AuthService.{Login, Logout, RefreshToken,
  // ValidateToken, GetMe, AssignRole} bind here once Phase 2.3c brings
  // the server online. Convention: HTTP + 1000.
  grpcPort: number;
  // Environment label, surfaced in health responses and on log lines.
  environment: string;
  // Postgres connection string. Required for migrations + the runtime
  // database client. Same physical Postgres as service.backend; this
  // service owns the `auth` schema (CAD-style schema-per-service).
  databaseUrl: string;
  // Schema name. Defaults to `auth` — every table in this service
  // lives here and other services don't read it directly.
  schema: string;
  // NATS bus. Phase 2.4+ publishes auth.userCreated, auth.roleAssigned,
  // auth.tokenRevoked etc. for downstream services to consume.
  natsUrl: string;
  // JWT signing secret for short-lived access tokens. Required at
  // boot — a misconfigured deploy must fail fast, not at first
  // login attempt.
  jwtSecret: string;
  // JWT signing secret for refresh tokens. Distinct from jwtSecret so
  // a leaked access-token secret doesn't compromise refresh either.
  jwtRefreshSecret: string;
};

const DEFAULT_PORT = 5002;
const DEFAULT_GRPC_PORT = 6002;
const DEFAULT_HOST = '0.0.0.0';
const DEFAULT_SCHEMA = 'auth';
const DEFAULT_NATS_URL = 'nats://nats:4222';

export const loadConfig = (env: NodeJS.ProcessEnv = process.env): AuthConfig => {
  const port = parsePort(env.AUTH_PORT, DEFAULT_PORT, 'AUTH_PORT');
  const grpcPort = parsePort(env.AUTH_GRPC_PORT, DEFAULT_GRPC_PORT, 'AUTH_GRPC_PORT');

  const databaseUrl = env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required (Postgres connection string)');
  }

  const jwtSecret = env.JWT_SECRET?.trim();
  if (!jwtSecret) {
    throw new Error('JWT_SECRET is required (access-token signing secret)');
  }

  const jwtRefreshSecret = env.JWT_REFRESH_SECRET?.trim();
  if (!jwtRefreshSecret) {
    throw new Error('JWT_REFRESH_SECRET is required (refresh-token signing secret)');
  }

  return {
    port,
    grpcPort,
    host: env.AUTH_HOST?.trim() || DEFAULT_HOST,
    environment: env.NODE_ENV?.trim() || 'development',
    databaseUrl,
    schema: env.AUTH_SCHEMA?.trim() || DEFAULT_SCHEMA,
    natsUrl: env.NATS_URL?.trim() || DEFAULT_NATS_URL,
    jwtSecret,
    jwtRefreshSecret,
  };
};

function parsePort(raw: string | undefined, fallback: number, name: string): number {
  const trimmed = raw?.trim();
  const value = trimmed ? Number.parseInt(trimmed, 10) : fallback;
  if (Number.isNaN(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer, got "${trimmed}"`);
  }
  return value;
}
