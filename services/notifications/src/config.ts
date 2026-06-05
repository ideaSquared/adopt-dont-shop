export type NotificationsConfig = {
  // Port the HTTP surface listens on. Distinct from service.backend's
  // 5000 and service.gateway's 4000. The gRPC server listens on a
  // sibling port — convention: HTTP + 1000.
  port: number;
  host: string;
  // gRPC server port. Phase 1.3c brings it online alongside the
  // Fastify HTTP server; the gateway dials this address when proxying
  // /api/notifications/* to the extracted service (Phase 1.6).
  grpcPort: number;
  // Environment label, surfaced in health responses and on log lines.
  environment: string;
  // Postgres connection string. Required for migrations + the runtime
  // database client. Same physical Postgres as service.backend; this
  // service owns the `notifications` schema (CAD-style schema-per-service).
  databaseUrl: string;
  // Schema name. Defaults to `notifications` — every table in this
  // service lives here and other services don't read it directly.
  schema: string;
  // NATS bus. Used by both the publish-after-commit pipeline (Create /
  // Dismiss handlers) and the fan-out subscriber (Phase 1.4).
  natsUrl: string;
};

// Defaults match the wider stack:
//   - service.backend  http :5000
//   - service.gateway  http :4000
//   - service.notifications http :5001, gRPC :6001 (HTTP + 1000)
const DEFAULT_PORT = 5001;
const DEFAULT_GRPC_PORT = 6001;
const DEFAULT_HOST = '0.0.0.0';
const DEFAULT_SCHEMA = 'notifications';
const DEFAULT_NATS_URL = 'nats://nats:4222';

export const loadConfig = (env: NodeJS.ProcessEnv = process.env): NotificationsConfig => {
  const port = parsePort(env.NOTIFICATIONS_PORT, DEFAULT_PORT, 'NOTIFICATIONS_PORT');
  const grpcPort = parsePort(
    env.NOTIFICATIONS_GRPC_PORT,
    DEFAULT_GRPC_PORT,
    'NOTIFICATIONS_GRPC_PORT'
  );

  const databaseUrl = env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required (Postgres connection string)');
  }

  return {
    port,
    grpcPort,
    host: env.NOTIFICATIONS_HOST?.trim() || DEFAULT_HOST,
    environment: env.NODE_ENV?.trim() || 'development',
    databaseUrl,
    schema: env.NOTIFICATIONS_SCHEMA?.trim() || DEFAULT_SCHEMA,
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
