import { parsePort, requireSecret } from '@adopt-dont-shop/config-secrets';

export type AuditConfig = {
  // HTTP port for the boot-readiness surface (/health/simple). Distinct
  // from service.backend's 5000, service.gateway's 4000,
  // service.notifications' 5001, service.auth's 5002, service.pets's
  // 5003, service.rescue's 5004, service.applications' 5005,
  // service.chat's 5006, service.moderation's 5007, service.matching's
  // 5008.
  port: number;
  host: string;
  // gRPC server port. AuditQueryService.{Query, GetByTarget} bind
  // here once Phase 10.3c brings the server online. Convention:
  // HTTP + 1000.
  grpcPort: number;
  // Environment label, surfaced in health responses and on log lines.
  environment: string;
  // Postgres connection string. Required for migrations + the runtime
  // database client. Same physical Postgres as service.backend; this
  // service owns the `audit` schema (CAD-style schema-per-service).
  databaseUrl: string;
  // Schema name. Defaults to `audit` — the audit_events table lives
  // here. Row-level trigger rejects UPDATE/DELETE (CAD PR #49
  // pattern); this service is the sole producer/consumer.
  schema: string;
  // NATS bus. Phase 10.3 onwards subscribes to *.actionTaken topics
  // and persists each event idempotently by event_id.
  natsUrl: string;
};

const DEFAULT_PORT = 5009;
const DEFAULT_GRPC_PORT = 6009;
const DEFAULT_HOST = '0.0.0.0';
const DEFAULT_SCHEMA = 'audit';
const DEFAULT_NATS_URL = 'nats://nats:4222';

export const loadConfig = (env: NodeJS.ProcessEnv = process.env): AuditConfig => {
  const port = parsePort(env.AUDIT_PORT, DEFAULT_PORT, 'AUDIT_PORT');
  const grpcPort = parsePort(env.AUDIT_GRPC_PORT, DEFAULT_GRPC_PORT, 'AUDIT_GRPC_PORT');

  const databaseUrl = requireSecret('DATABASE_URL', env, 'Postgres connection string');

  return {
    port,
    grpcPort,
    host: env.AUDIT_HOST?.trim() || DEFAULT_HOST,
    environment: env.NODE_ENV?.trim() || 'development',
    databaseUrl,
    schema: env.AUDIT_SCHEMA?.trim() || DEFAULT_SCHEMA,
    natsUrl: env.NATS_URL?.trim() || DEFAULT_NATS_URL,
  };
};
