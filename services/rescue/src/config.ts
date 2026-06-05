export type RescueConfig = {
  // HTTP port for the boot-readiness surface (/health/simple). Distinct
  // from service.backend's 5000, service.gateway's 4000,
  // service.notifications' 5001, service.auth's 5002, service.pets's 5003.
  port: number;
  host: string;
  // gRPC server port. RescueService.{Create, Get, List, Update,
  // Verify, InviteStaff, ...} bind here once Phase 4.3c brings the
  // server online. Convention: HTTP + 1000.
  grpcPort: number;
  // Environment label, surfaced in health responses and on log lines.
  environment: string;
  // Postgres connection string. Required for migrations + the runtime
  // database client. Same physical Postgres as service.backend; this
  // service owns the `rescue` schema (CAD-style schema-per-service).
  databaseUrl: string;
  // Schema name. Defaults to `rescue` — every table in this service
  // lives here and other services don't read it directly.
  schema: string;
  // NATS bus. Phase 4.3 onwards publishes rescue.created,
  // rescue.verified, rescue.staffInvited etc. for downstream services
  // to consume. The service also SUBSCRIBES to auth.userCreated so
  // it can denormalise newly-registered users into staff_member rows
  // (CAD-style cross-service maintained read model).
  natsUrl: string;
};

const DEFAULT_PORT = 5004;
const DEFAULT_GRPC_PORT = 6004;
const DEFAULT_HOST = '0.0.0.0';
const DEFAULT_SCHEMA = 'rescue';
const DEFAULT_NATS_URL = 'nats://nats:4222';

export const loadConfig = (env: NodeJS.ProcessEnv = process.env): RescueConfig => {
  const port = parsePort(env.RESCUE_PORT, DEFAULT_PORT, 'RESCUE_PORT');
  const grpcPort = parsePort(env.RESCUE_GRPC_PORT, DEFAULT_GRPC_PORT, 'RESCUE_GRPC_PORT');

  const databaseUrl = env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required (Postgres connection string)');
  }

  return {
    port,
    grpcPort,
    host: env.RESCUE_HOST?.trim() || DEFAULT_HOST,
    environment: env.NODE_ENV?.trim() || 'development',
    databaseUrl,
    schema: env.RESCUE_SCHEMA?.trim() || DEFAULT_SCHEMA,
    natsUrl: env.NATS_URL?.trim() || DEFAULT_NATS_URL,
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
