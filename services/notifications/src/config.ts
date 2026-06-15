import { parsePort, requireSecret } from '@adopt-dont-shop/config-secrets';

export type EmailProviderConfig =
  | { kind: 'console' }
  | { kind: 'ethereal' }
  | { kind: 'resend'; apiKey: string; fromEmail: string; fromName: string; replyTo?: string };

export type PushProviderConfig =
  | { kind: 'console' }
  | { kind: 'fcm'; serviceAccountJson: string; projectId: string };

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
  // service.auth gRPC URL — needed by the Broadcast RPC which calls
  // AuthService.ListUserIdsByCohort to expand the cohort filter into
  // concrete user_ids. Optional in tests / migrations smokes; Broadcast
  // returns INTERNAL when unset.
  authGrpcUrl?: string;
  // service.pets gRPC URL — needed by the pets.statusChanged fan-out
  // (PetService.ListFavoriters discovers who favourited the pet). Optional;
  // when unset the fan-out no-ops gracefully, like Broadcast without auth.
  petsGrpcUrl?: string;
  // service.rescue gRPC URL — needed by the rescue.verified / rescue.rejected
  // fan-out (RescueService.ListStaffMembers + Get discover the rescue's
  // staff). Optional; when unset the fan-out no-ops gracefully.
  rescueGrpcUrl?: string;
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
  // Email provider selection — Phase 7 round-out. ADS-549 rule: in
  // production an unknown / unconfigured provider crashes boot rather
  // than silently downgrading to console.
  emailProvider: EmailProviderConfig;
  // Toggle the email queue worker. Defaults to true. Tests + the
  // migrations-only smoke set this to false to keep the loop quiet.
  emailWorkerEnabled: boolean;
  // Toggle the email CHANNEL adapter — the notifications.created subscriber
  // that enqueues transactional emails. Distinct from emailWorkerEnabled
  // (which drains the queue). Defaults to true, but only starts when an
  // auth client is configured (it needs AdminGetUser to resolve addresses).
  emailChannelEnabled: boolean;
  // From-address for adapter-generated transactional emails.
  defaultFromEmail: string;
  defaultFromName: string;
  // Push provider selection — Phase 7.2. Same ADS-549 rule: production
  // refuses 'console' so an unconfigured push channel surfaces at boot.
  pushProvider: PushProviderConfig;
  // Toggle the push worker (the NATS subscriber). Defaults to true.
  pushWorkerEnabled: boolean;
  // Toggle the scheduled-jobs loop (weekly digest + future tasks).
  // Defaults to true. Tests + the migrations-only smoke disable.
  schedulerEnabled: boolean;
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

  const databaseUrl = requireSecret('DATABASE_URL', env, 'Postgres connection string');

  return {
    port,
    grpcPort,
    authGrpcUrl: env.AUTH_GRPC_URL?.trim() || undefined,
    petsGrpcUrl: env.PETS_GRPC_URL?.trim() || undefined,
    rescueGrpcUrl: env.RESCUE_GRPC_URL?.trim() || undefined,
    host: env.NOTIFICATIONS_HOST?.trim() || DEFAULT_HOST,
    environment: env.NODE_ENV?.trim() || 'development',
    databaseUrl,
    schema: env.NOTIFICATIONS_SCHEMA?.trim() || DEFAULT_SCHEMA,
    natsUrl: env.NATS_URL?.trim() || DEFAULT_NATS_URL,
    emailProvider: loadEmailProviderConfig(env),
    emailWorkerEnabled: env.EMAIL_WORKER_ENABLED?.trim() !== 'false',
    emailChannelEnabled: env.EMAIL_CHANNEL_ENABLED?.trim() !== 'false',
    defaultFromEmail: env.DEFAULT_FROM_EMAIL?.trim() || 'noreply@adoptdontshop.com',
    defaultFromName: env.DEFAULT_FROM_NAME?.trim() || "Adopt Don't Shop",
    pushProvider: loadPushProviderConfig(env),
    pushWorkerEnabled: env.PUSH_WORKER_ENABLED?.trim() !== 'false',
    schedulerEnabled: env.SCHEDULER_ENABLED?.trim() !== 'false',
  };
};

const loadPushProviderConfig = (env: NodeJS.ProcessEnv): PushProviderConfig => {
  const requested = env.PUSH_PROVIDER?.trim().toLowerCase() ?? 'console';
  const isProd = (env.NODE_ENV?.trim() ?? '').toLowerCase() === 'production';

  switch (requested) {
    case 'console':
      if (isProd) {
        throw new Error(
          "PUSH_PROVIDER='console' is not permitted in production — every push notification would land in stdout"
        );
      }
      return { kind: 'console' };
    case 'fcm': {
      const serviceAccountJson = env.FCM_SERVICE_ACCOUNT_JSON?.trim();
      const projectId = env.FCM_PROJECT_ID?.trim();
      if (!serviceAccountJson) {
        throw new Error("PUSH_PROVIDER='fcm' requires FCM_SERVICE_ACCOUNT_JSON");
      }
      if (!projectId) {
        throw new Error("PUSH_PROVIDER='fcm' requires FCM_PROJECT_ID");
      }
      return { kind: 'fcm', serviceAccountJson, projectId };
    }
    default:
      throw new Error(
        `PUSH_PROVIDER='${requested}' is not recognised (expected 'console' | 'fcm')`
      );
  }
};

const loadEmailProviderConfig = (env: NodeJS.ProcessEnv): EmailProviderConfig => {
  const requested = env.EMAIL_PROVIDER?.trim().toLowerCase() ?? 'console';
  const isProd = (env.NODE_ENV?.trim() ?? '').toLowerCase() === 'production';

  switch (requested) {
    case 'console':
      // ADS-549: console in prod is a misconfig (every transactional
      // email would land in stdout). Surface the misconfig — the boot
      // path treats this as a fatal validation error.
      if (isProd) {
        throw new Error(
          "EMAIL_PROVIDER='console' is not permitted in production — every transactional email would land in stdout"
        );
      }
      return { kind: 'console' };
    case 'ethereal':
      return { kind: 'ethereal' };
    case 'resend': {
      const apiKey = env.RESEND_API_KEY?.trim();
      const fromEmail = env.DEFAULT_FROM_EMAIL?.trim();
      if (!apiKey) {
        throw new Error("EMAIL_PROVIDER='resend' requires RESEND_API_KEY");
      }
      if (!fromEmail) {
        throw new Error("EMAIL_PROVIDER='resend' requires DEFAULT_FROM_EMAIL");
      }
      return {
        kind: 'resend',
        apiKey,
        fromEmail,
        fromName: env.DEFAULT_FROM_NAME?.trim() || "Adopt Don't Shop",
        replyTo: env.DEFAULT_REPLY_TO_EMAIL?.trim() || undefined,
      };
    }
    default:
      throw new Error(
        `EMAIL_PROVIDER='${requested}' is not recognised (expected 'console' | 'ethereal' | 'resend')`
      );
  }
};
