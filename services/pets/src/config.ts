export type PetsConfig = {
  // HTTP port for the boot-readiness surface (/health/simple). Distinct
  // from service.backend's 5000, service.gateway's 4000,
  // service.notifications' 5001, service.auth's 5002.
  port: number;
  host: string;
  // gRPC server port. PetService.{Create, Get, List, UpdateStatus,
  // Delete, ...} bind here once Phase 3.3c brings the server online.
  // Convention: HTTP + 1000.
  grpcPort: number;
  // Environment label, surfaced in health responses and on log lines.
  environment: string;
  // Postgres connection string. Required for migrations + the runtime
  // database client. Same physical Postgres as service.backend; this
  // service owns the `pets` schema (CAD-style schema-per-service).
  databaseUrl: string;
  // Schema name. Defaults to `pets` — every table in this service
  // lives here and other services don't read it directly.
  schema: string;
  // NATS bus. Phase 3.3 onwards publishes pets.created,
  // pets.statusChanged, pets.deleted etc. for downstream services
  // (notifications, matching, moderation, applications) to consume.
  natsUrl: string;
};

const DEFAULT_PORT = 5003;
const DEFAULT_GRPC_PORT = 6003;
const DEFAULT_HOST = '0.0.0.0';
const DEFAULT_SCHEMA = 'pets';
const DEFAULT_NATS_URL = 'nats://nats:4222';

export const loadConfig = (env: NodeJS.ProcessEnv = process.env): PetsConfig => {
  const port = parsePort(env.PETS_PORT, DEFAULT_PORT, 'PETS_PORT');
  const grpcPort = parsePort(env.PETS_GRPC_PORT, DEFAULT_GRPC_PORT, 'PETS_GRPC_PORT');

  const databaseUrl = env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required (Postgres connection string)');
  }

  return {
    port,
    grpcPort,
    host: env.PETS_HOST?.trim() || DEFAULT_HOST,
    environment: env.NODE_ENV?.trim() || 'development',
    databaseUrl,
    schema: env.PETS_SCHEMA?.trim() || DEFAULT_SCHEMA,
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
