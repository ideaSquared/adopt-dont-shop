// @adopt-dont-shop/service-bootstrap
//
// Shared boot mechanics for gRPC microservices. Extracted from 10 services
// that were copy-pasting the same ~200 lines.
//
// Exports:
//   createMicroserviceServer  — Fastify HTTP server with health, metrics,
//                               request-id and the isReady 503-gating.
//   startGrpcServer           — bind/shutdown wrapper for a grpc.Server.
//   adapt / adaptUnauth       — gRPC adapter functions with canonical
//                               CODE_TO_GRPC table (incl. ALREADY_EXISTS).
//   HandlerError              — typed service error with HandlerErrorCode.
//   HandlerErrorCode          — canonical union (INVALID_ARGUMENT,
//                               UNAUTHENTICATED, PERMISSION_DENIED,
//                               NOT_FOUND, ALREADY_EXISTS,
//                               FAILED_PRECONDITION, INTERNAL).
//   HandlerDeps               — base dependency type (pool + nats).
//   extractPrincipal          — parse x-user-* gRPC metadata headers.
//   extractPrincipalOptional  — same but returns null on missing headers.
//   MissingPrincipalError     — thrown by extractPrincipal on absent headers.
//   runServiceShutdown        — SIGTERM/SIGINT teardown sequencer.

export { createMicroserviceServer } from './server.js';
export type { CreateServerOptions, CreateServerConfig } from './server.js';

export { startGrpcServer } from './grpc-server.js';
export type { RunningGrpcServer, GrpcServerConfig } from './grpc-server.js';

export { adapt, adaptUnauth, HandlerError } from './adapter.js';
export type {
  HandlerErrorCode,
  HandlerDeps,
  UnaryHandler,
  UnaryHandlerUnauth,
  AdaptOptions,
} from './adapter.js';

export {
  extractPrincipal,
  extractPrincipalOptional,
  principalToMetadata,
  MissingPrincipalError,
} from './principal.js';

export { runServiceShutdown } from './shutdown.js';
export type { ShutdownDeps } from './shutdown.js';
