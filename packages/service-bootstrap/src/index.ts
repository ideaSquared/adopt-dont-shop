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
//   extractPrincipal          — parse x-user-* gRPC metadata headers; when a
//                               PRINCIPAL_SIGNING_KEY is configured, requires
//                               and verifies a signed x-principal-token
//                               instead (ADS-800).
//   extractPrincipalOptional  — same but returns null on missing headers.
//   MissingPrincipalError     — thrown by extractPrincipal on absent headers.
//   principalToMetadata       — inverse of extractPrincipal; also stamps a
//                               signed x-principal-token when a key is set.
//   signPrincipalToken /
//   verifyPrincipalToken      — HMAC-SHA256 signed principal tokens (ADS-800).
//   PrincipalTokenError       — typed verification error (malformed /
//                               bad_signature / expired).
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
export type { PrincipalVerification, PrincipalSigning } from './principal.js';

export {
  signPrincipalToken,
  verifyPrincipalToken,
  PrincipalTokenError,
  PRINCIPAL_TOKEN_HEADER,
  DEFAULT_PRINCIPAL_TOKEN_TTL_MS,
  getDefaultPrincipalSigningKey,
  resetDefaultPrincipalSigningKeyForTests,
} from './principal-token.js';
export type {
  PrincipalTokenInput,
  PrincipalTokenPayload,
  PrincipalTokenErrorReason,
  SignPrincipalTokenOptions,
} from './principal-token.js';

export { runServiceShutdown } from './shutdown.js';
export type { ShutdownDeps } from './shutdown.js';
