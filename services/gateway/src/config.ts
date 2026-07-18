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
  // Test-only one-time-token peek seam (ADS-871). Lets the Playwright e2e
  // suite read password-reset / email-verification / staff-invitation tokens
  // that are normally only delivered by email, so it can drive the full
  // auth round-trips. SECURITY: this exposes one-time secrets, so it is
  // OFF unless E2E_TOKEN_PEEK === "true", and loadConfig HARD-REFUSES to
  // enable it when NODE_ENV === 'production' (boot fails). It also needs a
  // databaseUrl, which production never wires to the gateway. See
  // routes/test-token-peek.ts.
  testTokenPeek: {
    enabled: boolean;
    // Postgres connection string for the shared (schema-per-service) DB the
    // seam queries directly. Undefined unless DATABASE_URL is set.
    databaseUrl: string | undefined;
  };
  // CORS — explicit allowed-origin list for the @fastify/cors plugin.
  // Loaded from CORS_ORIGIN (comma-separated). The list must include the
  // origins of every SPA that calls the gateway directly. nginx also
  // applies CORS at the edge; the gateway layer is defence-in-depth for
  // scenarios where the gateway is hit without nginx in front.
  cors: {
    origins: string[];
  };
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
  const environment = env.NODE_ENV?.trim() || 'development';

  return {
    port,
    host: env.GATEWAY_HOST?.trim() || DEFAULT_HOST,
    environment,
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
    legal: {
      enabled: env.GATEWAY_LEGAL_ENABLED?.trim().toLowerCase() !== 'false',
      docsDir: env.LEGAL_DOCS_DIR?.trim() || 'docs/legal',
    },
    config: {
      publicEnabled: env.GATEWAY_CONFIG_ENABLED?.trim().toLowerCase() !== 'false',
    },
    principalSigningKey: readOptionalSecret('PRINCIPAL_SIGNING_KEY', env, 32),
    testTokenPeek: buildTestTokenPeekConfig(env),
    cors: buildCorsConfig(env, environment),
    rateLimit: buildRateLimitConfig(env),
  };
};

// Build the CORS config block. CORS_ORIGIN is a comma-separated list
// of allowed origins (e.g. "http://localhost:3000,http://localhost:3001").
// Defaults to localhost dev origins when unset so local dev works without
// extra config. production/staging FAIL CLOSED instead: booting with the
// localhost allowlist + credentials:true (see server.ts) would let any
// page on *.localhost issue credentialed cross-origin requests against a
// real prod/staging deploy (ADS-967).
function buildCorsConfig(env: NodeJS.ProcessEnv, environment: string): GatewayConfig['cors'] {
  const raw = env.CORS_ORIGIN?.trim() || '';
  if (!raw) {
    if (environment === 'production' || environment === 'staging') {
      throw new Error(
        `CORS_ORIGIN must be set when NODE_ENV=${environment} — refusing to fall back to the localhost dev allowlist`
      );
    }
    return {
      origins: [
        'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:3002',
        'http://localhost',
        'http://admin.localhost',
        'http://rescue.localhost',
        'http://api.localhost',
      ],
    };
  }
  const origins = raw
    .split(',')
    .map(o => o.trim())
    .filter(Boolean);
  return { origins };
}

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

// Build the test-token-peek config block (ADS-871). The seam is OFF by
// default and can only be turned on outside production: even if a misconfig
// sets E2E_TOKEN_PEEK=true in a production deploy, this THROWS at boot so the
// gateway never comes up exposing one-time secrets. The seam additionally
// needs DATABASE_URL (which prod never wires to the gateway) — defence in
// depth. Enabled requires the exact string "true" (case-insensitive), per the
// isEnabled() convention.
function buildTestTokenPeekConfig(env: NodeJS.ProcessEnv): GatewayConfig['testTokenPeek'] {
  const enabled = isEnabled(env.E2E_TOKEN_PEEK);
  const environment = env.NODE_ENV?.trim() || 'development';
  if (enabled && environment === 'production') {
    throw new Error(
      'E2E_TOKEN_PEEK must never be enabled in production — it exposes one-time auth tokens'
    );
  }
  return {
    enabled,
    databaseUrl: readSecret('DATABASE_URL', env)?.trim() || undefined,
  };
}

// A boolean env flag is on only for the exact string "true" (case-insensitive).
// Anything else — unset, "false", "0", "" — is treated as off.
function isEnabled(raw: string | undefined): boolean {
  return raw?.trim().toLowerCase() === 'true';
}

// Build the storage config block. Mirrors @adopt-dont-shop/storage's
// StorageConfig shape: both `local` and `s3` are always present (s3
// fields are optional); `provider` selects which one drives uploads.
function buildStorageConfig(env: NodeJS.ProcessEnv): GatewayConfig['storage'] {
  const provider: 'local' | 's3' = env.STORAGE_PROVIDER?.trim() === 's3' ? 's3' : 'local';
  const maxFileSizeRaw = env.MAX_FILE_SIZE?.trim();
  const maxFileSize = maxFileSizeRaw ? Number.parseInt(maxFileSizeRaw, 10) : 10485760;
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
    // if larger PDFs are expected. A non-numeric / non-positive value falls
    // back to the default rather than plumbing NaN into the body limit
    // (mirrors buildRateLimitConfig).
    maxFileSize: Number.isNaN(maxFileSize) || maxFileSize <= 0 ? 10485760 : maxFileSize,
    signingSecret: readOptionalSecret('UPLOAD_SIGNING_SECRET', env, 32),
  };
}

// Read an OPTIONAL secret that, when present, must clear a byte-length floor.
// Absence is fine (returns undefined — the consuming route degrades safely);
// a present-but-too-short value fails boot, because a weak HMAC secret is
// offline-brute-forceable and would let an attacker forge signatures (ADS-845).
function readOptionalSecret(
  name: string,
  env: NodeJS.ProcessEnv,
  minBytes: number
): string | undefined {
  const value = readSecret(name, env)?.trim();
  if (!value) {
    return undefined;
  }
  if (Buffer.byteLength(value, 'utf8') < minBytes) {
    throw new Error(`${name} must be at least ${minBytes} bytes`);
  }
  return value;
}
