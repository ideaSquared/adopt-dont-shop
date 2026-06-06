export type ApplicationsConfig = {
  // HTTP port for the boot-readiness surface (/health/simple). Distinct
  // from service.backend's 5000, service.gateway's 4000,
  // service.notifications' 5001, service.auth's 5002, service.pets's
  // 5003, service.rescue's 5004.
  port: number;
  host: string;
  // gRPC server port. ApplicationService.{StartDraft, SubmitDraft,
  // Get, List, ScheduleHomeVisit, CompleteHomeVisit, Approve, Reject,
  // Withdraw, ...} bind here once Phase 5.3c brings the server online.
  // Convention: HTTP + 1000.
  grpcPort: number;
  // Environment label, surfaced in health responses and on log lines.
  environment: string;
  // Postgres connection string. Required for migrations + the runtime
  // database client. Same physical Postgres as service.backend; this
  // service owns the `applications` schema (CAD-style schema-per-service).
  databaseUrl: string;
  // Schema name. Defaults to `applications` — every table in this
  // service lives here and other services don't read it directly.
  schema: string;
  // NATS bus. Phase 5.3 onwards publishes applications.created,
  // applications.submitted, applications.approved, applications.rejected,
  // applications.homeVisitScheduled etc. for downstream services
  // (notifications, moderation, audit, matching) to consume. This
  // is the multi-consumer event firehose that justifies the
  // event-sourced design.
  natsUrl: string;
  // service.pets gRPC URL — StartDraft resolves pet → rescue via
  // PetService.Get before commanding the domain (the cross-schema FK
  // the database can't enforce). Defaults to the same service-pets:6003
  // address the gateway uses.
  petsGrpcUrl: string;
};

const DEFAULT_PORT = 5005;
const DEFAULT_GRPC_PORT = 6005;
const DEFAULT_HOST = '0.0.0.0';
const DEFAULT_SCHEMA = 'applications';
const DEFAULT_NATS_URL = 'nats://nats:4222';
const DEFAULT_PETS_GRPC_URL = 'service-pets:6003';

export const loadConfig = (env: NodeJS.ProcessEnv = process.env): ApplicationsConfig => {
  const port = parsePort(env.APPLICATIONS_PORT, DEFAULT_PORT, 'APPLICATIONS_PORT');
  const grpcPort = parsePort(
    env.APPLICATIONS_GRPC_PORT,
    DEFAULT_GRPC_PORT,
    'APPLICATIONS_GRPC_PORT'
  );

  const databaseUrl = env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required (Postgres connection string)');
  }

  return {
    port,
    grpcPort,
    host: env.APPLICATIONS_HOST?.trim() || DEFAULT_HOST,
    environment: env.NODE_ENV?.trim() || 'development',
    databaseUrl,
    schema: env.APPLICATIONS_SCHEMA?.trim() || DEFAULT_SCHEMA,
    natsUrl: env.NATS_URL?.trim() || DEFAULT_NATS_URL,
    petsGrpcUrl: env.PETS_GRPC_URL?.trim() || DEFAULT_PETS_GRPC_URL,
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
