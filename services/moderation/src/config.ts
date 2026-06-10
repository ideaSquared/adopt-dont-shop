import { readSecret } from '@adopt-dont-shop/config-secrets';

export type ModerationConfig = {
  // HTTP port for the boot-readiness surface (/health/simple). Distinct
  // from every other service in the stack (5000 backend, 4000 gateway,
  // 5001 notifications, 5002 auth, 5003 pets, 5004 rescue,
  // 5005 applications, 5006 chat).
  port: number;
  host: string;
  // gRPC server port. ModerationService.{FileReport, ResolveReport,
  // SanctionUser, ListReports, OpenTicket, RespondToTicket} bind here
  // once Phase 8.3c brings the server online. Convention: HTTP + 1000.
  grpcPort: number;
  // Environment label, surfaced in health responses and on log lines.
  environment: string;
  // Postgres connection string. Required for migrations + the runtime
  // database client. Same physical Postgres as service.backend; this
  // service owns the `moderation` schema (CAD-style schema-per-service).
  databaseUrl: string;
  // Schema name. Defaults to `moderation`.
  schema: string;
  // NATS bus. Phase 8.3 onwards publishes moderation.reportFiled,
  // moderation.actionTaken, moderation.userSanctioned. Subscribes to
  // chat.messageCreated, pets.created, applications.submitted etc.
  // for content scanning + auto-report triggers.
  natsUrl: string;
};

const DEFAULT_PORT = 5007;
const DEFAULT_GRPC_PORT = 6007;
const DEFAULT_HOST = '0.0.0.0';
const DEFAULT_SCHEMA = 'moderation';
const DEFAULT_NATS_URL = 'nats://nats:4222';

export const loadConfig = (env: NodeJS.ProcessEnv = process.env): ModerationConfig => {
  const port = parsePort(env.MODERATION_PORT, DEFAULT_PORT, 'MODERATION_PORT');
  const grpcPort = parsePort(env.MODERATION_GRPC_PORT, DEFAULT_GRPC_PORT, 'MODERATION_GRPC_PORT');

  const databaseUrl = readSecret('DATABASE_URL', env)?.trim();
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required (Postgres connection string)');
  }

  return {
    port,
    grpcPort,
    host: env.MODERATION_HOST?.trim() || DEFAULT_HOST,
    environment: env.NODE_ENV?.trim() || 'development',
    databaseUrl,
    schema: env.MODERATION_SCHEMA?.trim() || DEFAULT_SCHEMA,
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
