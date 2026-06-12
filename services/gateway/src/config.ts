import { readSecret } from '@adopt-dont-shop/config-secrets';

export type GatewayConfig = {
  // Port the gateway listens on. Nginx (already in docker-compose)
  // routes the public api.localhost host here.
  port: number;
  host: string;
  // Environment label, surfaced in health responses and on log lines.
  // Falls back to NODE_ENV.
  environment: string;
  // NATS bus. Phase 1.5 onwards: gateway subscribes to notifications.*
  // (and chat.*, applications.* etc. as services extract) and fans the
  // events to connected Socket.IO clients.
  natsUrl: string;
  // service.notifications gRPC URL — Phase 1.6 cuts /api/notifications/*
  // over to this address. Phase 2+ services add their own URLs here.
  notificationsGrpcUrl: string;
  // service.auth gRPC URL — Phase 2.5 onwards the gateway calls
  // AuthService.ValidateToken for every non-public request so the
  // x-user-* metadata is server-derived from a JWT instead of being
  // client-trusted (the Phase 1.5 dev mode).
  authGrpcUrl: string;
  // service.pets gRPC URL — Phase 3.5 cuts /api/pets/* over to this
  // address.
  petsGrpcUrl: string;
  // service.rescue gRPC URL — Phase 4.5 cuts /api/rescue/* over to
  // this address.
  rescueGrpcUrl: string;
  // service.applications gRPC URL — Phase 5.3d cuts /api/applications/*
  // over to this address.
  applicationsGrpcUrl: string;
  // service.moderation gRPC URL — Phase 8.5 cuts /api/moderation/* over
  // to this address.
  moderationGrpcUrl: string;
  // service.matching gRPC URL — Phase 9.5 cuts /api/matching/* over to
  // this address.
  matchingGrpcUrl: string;
  // service.audit gRPC URL — Phase 10.5 cuts /api/audit/* over to this
  // address.
  auditGrpcUrl: string;
  // service.chat gRPC URL — Phase 6.x cuts /api/v1/chats/* + the
  // message-level reaction endpoint over to this address.
  chatGrpcUrl: string;
  // service.cms gRPC URL. CMS extracted as its own service (the original
  // plan folded it into the gateway, but the SPA shape is large enough
  // — content, menus, versions — that it earns its own schema/service).
  cmsGrpcUrl: string;
  // Storage for uploaded files (e.g. application documents). The gateway
  // stores bytes via @adopt-dont-shop/storage, then records metadata via
  // the owning service's RPC. Defaults to local under ./uploads — set
  // STORAGE_PROVIDER=s3 + the S3 vars below to switch. Shape mirrors
  // StorageConfig from @adopt-dont-shop/storage (provider + local + s3),
  // plus a gateway-only maxFileSize for multipart's body limit.
  storage: {
    provider: 'local' | 's3';
    local: { directory: string; publicPath: string };
    s3: {
      bucket?: string;
      region?: string;
      accessKeyId?: string;
      secretAccessKey?: string;
      cloudFrontDomain?: string;
    };
    maxFileSize: number;
    // HMAC secret used to sign + verify /uploads-signed URLs. Optional
    // because dev environments may run without it (the route then returns
    // 503). Production sets UPLOAD_SIGNING_SECRET — shared with anything
    // else that wants to mint a signed URL.
    signingSecret?: string;
  };
  // Per-domain strangler cutover switches. When false (the default), the
  // gateway does NOT register that domain's /api/v1/* routes, so requests
  // fall through the catch-all proxy to the residual monolith — today's
  // behaviour. Flip a domain to true ONLY once its gateway routes return
  // a frontend-compatible response shape (see ADR 0002 — the gRPC
  // proto-JSON shape diverges from the frontend contract, so a per-domain
  // adapter must land before that domain goes live). Env:
  // CUTOVER_<DOMAIN>=true.
  cutover: {
    auth: boolean;
    notifications: boolean;
    pets: boolean;
    rescue: boolean;
    applications: boolean;
    moderation: boolean;
    matching: boolean;
    audit: boolean;
    chat: boolean;
    cms: boolean;
  };
  // Gateway-folded routes — per the plan's "small static reads fold
  // into service.gateway" guidance. Each block is independently
  // toggle-able so a deploy can roll out legal vs config separately.
  legal: {
    enabled: boolean;
    // Absolute path to the directory holding terms.md / privacy.md /
    // cookies.md. Defaults to the monorepo's docs/legal dir; docker
    // sets this to the mounted path inside the gateway container.
    docsDir: string;
  };
  config: {
    publicEnabled: boolean;
  };
  // HMAC key for signed principal tokens (ADS-800). When set, the
  // authenticate middleware stamps a signed x-principal-token alongside
  // the x-user-* headers so downstream gRPC services running with the
  // same key can verify the principal instead of trusting bare headers.
  // Optional: unset → legacy header-only propagation (phased rollout).
  // Read via config-secrets so PRINCIPAL_SIGNING_KEY_FILE works.
  principalSigningKey: string | undefined;
  // Rate limiting — applied at the gateway edge for every route.
  // Backed by a shared Redis store in production/staging so per-replica
  // limits don't multiply by N replicas. Falls back to an in-memory
  // store (with a logged warning) if Redis is unreachable.
  rateLimit: {
    // Redis URL for the shared rate-limit store. When unset the gateway
    // runs with an in-memory store only (single-replica / dev use).
    redisUrl: string | undefined;
    // Maximum requests per IP per window (global blanket limit).
    // Override with GATEWAY_RATE_LIMIT_MAX env var.
    max: number;
    // Time window in ms or @lukeed/ms string, e.g. "1 minute".
    // Override with GATEWAY_RATE_LIMIT_WINDOW env var.
    timeWindow: string;
  };
};

const DEFAULT_PORT = 4000;
const DEFAULT_HOST = '0.0.0.0';
const DEFAULT_NATS_URL = 'nats://nats:4222';
const DEFAULT_NOTIFICATIONS_GRPC_URL = 'service-notifications:6001';
const DEFAULT_AUTH_GRPC_URL = 'service-auth:6002';
const DEFAULT_PETS_GRPC_URL = 'service-pets:6003';
const DEFAULT_RESCUE_GRPC_URL = 'service-rescue:6004';
const DEFAULT_APPLICATIONS_GRPC_URL = 'service-applications:6005';
const DEFAULT_MODERATION_GRPC_URL = 'service-moderation:6007';
const DEFAULT_MATCHING_GRPC_URL = 'service-matching:6008';
const DEFAULT_AUDIT_GRPC_URL = 'service-audit:6009';
const DEFAULT_CHAT_GRPC_URL = 'service-chat:6006';
const DEFAULT_CMS_GRPC_URL = 'service-cms:6010';

export const loadConfig = (env: NodeJS.ProcessEnv = process.env): GatewayConfig => {
  const portRaw = env.GATEWAY_PORT?.trim();
  const port = portRaw ? Number.parseInt(portRaw, 10) : DEFAULT_PORT;
  if (Number.isNaN(port) || port <= 0) {
    throw new Error(`GATEWAY_PORT must be a positive integer, got "${portRaw}"`);
  }

  return {
    port,
    host: env.GATEWAY_HOST?.trim() || DEFAULT_HOST,
    environment: env.NODE_ENV?.trim() || 'development',
    natsUrl: env.NATS_URL?.trim() || DEFAULT_NATS_URL,
    notificationsGrpcUrl: env.NOTIFICATIONS_GRPC_URL?.trim() || DEFAULT_NOTIFICATIONS_GRPC_URL,
    authGrpcUrl: env.AUTH_GRPC_URL?.trim() || DEFAULT_AUTH_GRPC_URL,
    petsGrpcUrl: env.PETS_GRPC_URL?.trim() || DEFAULT_PETS_GRPC_URL,
    rescueGrpcUrl: env.RESCUE_GRPC_URL?.trim() || DEFAULT_RESCUE_GRPC_URL,
    applicationsGrpcUrl: env.APPLICATIONS_GRPC_URL?.trim() || DEFAULT_APPLICATIONS_GRPC_URL,
    moderationGrpcUrl: env.MODERATION_GRPC_URL?.trim() || DEFAULT_MODERATION_GRPC_URL,
    matchingGrpcUrl: env.MATCHING_GRPC_URL?.trim() || DEFAULT_MATCHING_GRPC_URL,
    auditGrpcUrl: env.AUDIT_GRPC_URL?.trim() || DEFAULT_AUDIT_GRPC_URL,
    chatGrpcUrl: env.CHAT_GRPC_URL?.trim() || DEFAULT_CHAT_GRPC_URL,
    cmsGrpcUrl: env.CMS_GRPC_URL?.trim() || DEFAULT_CMS_GRPC_URL,
    storage: buildStorageConfig(env),
    cutover: {
      auth: isEnabled(env.CUTOVER_AUTH),
      notifications: isEnabled(env.CUTOVER_NOTIFICATIONS),
      pets: isEnabled(env.CUTOVER_PETS),
      rescue: isEnabled(env.CUTOVER_RESCUE),
      applications: isEnabled(env.CUTOVER_APPLICATIONS),
      moderation: isEnabled(env.CUTOVER_MODERATION),
      matching: isEnabled(env.CUTOVER_MATCHING),
      audit: isEnabled(env.CUTOVER_AUDIT),
      chat: isEnabled(env.CUTOVER_CHAT),
      cms: isEnabled(env.CUTOVER_CMS),
    },
    legal: {
      enabled: env.GATEWAY_LEGAL_ENABLED?.trim().toLowerCase() !== 'false',
      docsDir: env.LEGAL_DOCS_DIR?.trim() || 'docs/legal',
    },
    config: {
      publicEnabled: env.GATEWAY_CONFIG_ENABLED?.trim().toLowerCase() !== 'false',
    },
    principalSigningKey: readSecret('PRINCIPAL_SIGNING_KEY', env)?.trim() || undefined,
    rateLimit: buildRateLimitConfig(env),
  };
};

// Build the rate-limit config block.
function buildRateLimitConfig(env: NodeJS.ProcessEnv): GatewayConfig['rateLimit'] {
  const maxRaw = env.GATEWAY_RATE_LIMIT_MAX?.trim();
  const max = maxRaw ? Number.parseInt(maxRaw, 10) : 100;
  return {
    redisUrl: readSecret('REDIS_URL', env)?.trim() || undefined,
    max: Number.isNaN(max) || max <= 0 ? 100 : max,
    timeWindow: env.GATEWAY_RATE_LIMIT_WINDOW?.trim() || '1 minute',
  };
}

// A cutover flag is on only for the exact string "true" (case-insensitive).
// Anything else — unset, "false", "0", "" — leaves the domain proxied to
// the monolith.
function isEnabled(raw: string | undefined): boolean {
  return raw?.trim().toLowerCase() === 'true';
}

// Build the storage config block. Mirrors @adopt-dont-shop/storage's
// StorageConfig shape: both `local` and `s3` are always present (s3
// fields are optional); `provider` selects which one drives uploads.
function buildStorageConfig(env: NodeJS.ProcessEnv): GatewayConfig['storage'] {
  const provider: 'local' | 's3' = env.STORAGE_PROVIDER?.trim() === 's3' ? 's3' : 'local';
  return {
    provider,
    local: {
      directory: env.UPLOAD_DIR?.trim() || 'uploads',
      publicPath: env.PUBLIC_UPLOAD_PATH?.trim() || '/uploads',
    },
    s3: {
      bucket: env.S3_BUCKET_NAME?.trim(),
      region: env.S3_REGION?.trim() || 'us-east-1',
      accessKeyId: env.AWS_ACCESS_KEY_ID?.trim(),
      secretAccessKey: env.AWS_SECRET_ACCESS_KEY?.trim(),
      cloudFrontDomain: env.CLOUDFRONT_DOMAIN?.trim(),
    },
    // Multipart body limit — 10 MiB default. Override with MAX_FILE_SIZE
    // if larger PDFs are expected.
    maxFileSize: Number.parseInt(env.MAX_FILE_SIZE?.trim() || '10485760', 10),
    signingSecret: readSecret('UPLOAD_SIGNING_SECRET', env)?.trim() || undefined,
  };
}
