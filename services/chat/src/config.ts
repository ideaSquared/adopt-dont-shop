import { parsePort, requireSecret } from '@adopt-dont-shop/config-secrets';

export type ChatConfig = {
  // HTTP port for the boot-readiness surface (/health/simple). Distinct
  // from service.backend's 5000, service.gateway's 4000,
  // service.notifications' 5001, service.auth's 5002, service.pets's
  // 5003, service.rescue's 5004, service.applications' 5005.
  port: number;
  host: string;
  // gRPC server port. ChatService.{Send, ListMessages, ListChats,
  // MarkRead, React} bind here once Phase 6.3c brings the server
  // online. Convention: HTTP + 1000.
  grpcPort: number;
  // Environment label, surfaced in health responses and on log lines.
  environment: string;
  // Postgres connection string. Required for migrations + the runtime
  // database client. Same physical Postgres as service.backend; this
  // service owns the `chat` schema (CAD-style schema-per-service).
  databaseUrl: string;
  // Schema name. Defaults to `chat` — every table in this service
  // lives here and other services don't read it directly.
  schema: string;
  // NATS bus. Phase 6.3 onwards publishes chat.messageCreated,
  // chat.messageRead, chat.reactionAdded etc. The gateway's Phase 1.5
  // WS subscriber fans these out to connected Socket.IO clients so
  // open chats receive messages in real time.
  natsUrl: string;
  // ADS-918: OpenChat resolves applicationId → {adopterId, rescueId} via
  // service.applications before creating a chat, so a caller can't stamp
  // an arbitrary rescueId or DM someone unrelated to the application.
  applicationsGrpcUrl: string;
  // ADS-918: OpenChat verifies otherUserId is actually rescue staff (the
  // adopter-initiates-chat direction) via service.rescue's staff list.
  rescueGrpcUrl: string;
};

const DEFAULT_PORT = 5006;
const DEFAULT_GRPC_PORT = 6006;
const DEFAULT_HOST = '0.0.0.0';
const DEFAULT_SCHEMA = 'chat';
const DEFAULT_NATS_URL = 'nats://nats:4222';
const DEFAULT_APPLICATIONS_GRPC_URL = 'service-applications:6005';
const DEFAULT_RESCUE_GRPC_URL = 'service-rescue:6004';

export const loadConfig = (env: NodeJS.ProcessEnv = process.env): ChatConfig => {
  const port = parsePort(env.CHAT_PORT, DEFAULT_PORT, 'CHAT_PORT');
  const grpcPort = parsePort(env.CHAT_GRPC_PORT, DEFAULT_GRPC_PORT, 'CHAT_GRPC_PORT');

  const databaseUrl = requireSecret('DATABASE_URL', env, 'Postgres connection string');

  return {
    port,
    grpcPort,
    host: env.CHAT_HOST?.trim() || DEFAULT_HOST,
    environment: env.NODE_ENV?.trim() || 'development',
    databaseUrl,
    schema: env.CHAT_SCHEMA?.trim() || DEFAULT_SCHEMA,
    natsUrl: env.NATS_URL?.trim() || DEFAULT_NATS_URL,
    applicationsGrpcUrl: env.APPLICATIONS_GRPC_URL?.trim() || DEFAULT_APPLICATIONS_GRPC_URL,
    rescueGrpcUrl: env.RESCUE_GRPC_URL?.trim() || DEFAULT_RESCUE_GRPC_URL,
  };
};
