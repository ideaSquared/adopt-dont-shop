export type GatewayConfig = {
  // Port the gateway listens on. Distinct from service.backend's 5000 so
  // both can run side-by-side during the strangler-fig migration. Nginx
  // (already in docker-compose) routes the public api.localhost host
  // here once the gateway is in front.
  port: number;
  host: string;
  // URL of the residual service.backend monolith. Every /api/* request
  // that doesn't yet have a per-path route to an extracted service
  // proxies here.
  upstreamBackendUrl: string;
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
};

const DEFAULT_PORT = 4000;
const DEFAULT_HOST = '0.0.0.0';
const DEFAULT_UPSTREAM = 'http://service-backend:5000';
const DEFAULT_NATS_URL = 'nats://nats:4222';
const DEFAULT_NOTIFICATIONS_GRPC_URL = 'service-notifications:6001';
const DEFAULT_AUTH_GRPC_URL = 'service-auth:6002';
const DEFAULT_PETS_GRPC_URL = 'service-pets:6003';
const DEFAULT_RESCUE_GRPC_URL = 'service-rescue:6004';
const DEFAULT_APPLICATIONS_GRPC_URL = 'service-applications:6005';
const DEFAULT_MODERATION_GRPC_URL = 'service-moderation:6007';
const DEFAULT_MATCHING_GRPC_URL = 'service-matching:6008';
const DEFAULT_AUDIT_GRPC_URL = 'service-audit:6009';

export const loadConfig = (env: NodeJS.ProcessEnv = process.env): GatewayConfig => {
  const portRaw = env.GATEWAY_PORT?.trim();
  const port = portRaw ? Number.parseInt(portRaw, 10) : DEFAULT_PORT;
  if (Number.isNaN(port) || port <= 0) {
    throw new Error(`GATEWAY_PORT must be a positive integer, got "${portRaw}"`);
  }

  return {
    port,
    host: env.GATEWAY_HOST?.trim() || DEFAULT_HOST,
    upstreamBackendUrl: env.UPSTREAM_BACKEND_URL?.trim() || DEFAULT_UPSTREAM,
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
  };
};
