// Shared gRPC adapter — wraps plain async handler functions in the
// grpc-js `(call, callback)` signature ts-proto generates.
//
// Two variants:
//   - `adapt`        — handlers that REQUIRE a principal. Throws
//                      UNAUTHENTICATED when metadata headers are missing.
//   - `adaptUnauth`  — handlers that do NOT (public reads, token-minting).
//                      Passes Principal | null through to the handler.
//
// Canonical CODE_TO_GRPC table (superset across all services):
//   INVALID_ARGUMENT, UNAUTHENTICATED, PERMISSION_DENIED,
//   NOT_FOUND, ALREADY_EXISTS, FAILED_PRECONDITION, INTERNAL
//
// Services whose HandlerErrorCode union is a strict subset of the
// canonical table work unchanged — TypeScript enforces that every
// code in the union has a mapping entry.

import {
  Metadata,
  status,
  type ServerUnaryCall,
  type ServiceError,
  type sendUnaryData,
} from '@grpc/grpc-js';

import type { Principal } from '@adopt-dont-shop/authz';
import type { NatsConnection } from 'nats';
import type { Pool } from 'pg';
import {
  extractRequestIdFromMetadata,
  REQUEST_ID_HEADER_NAME,
  runWithRequestId,
  startGrpcTimer,
} from '@adopt-dont-shop/observability';
import type { Logger } from 'winston';

import { getDefaultPrincipalSigningKey, PrincipalTokenError } from './principal-token.js';
import {
  extractPrincipal,
  extractPrincipalOptional,
  MissingPrincipalError,
  type PrincipalVerification,
} from './principal.js';

// Canonical error code set. Services declare HandlerErrorCode as a
// subset of this union; the shared CODE_TO_GRPC table covers all codes.
export type HandlerErrorCode =
  | 'INVALID_ARGUMENT'
  | 'UNAUTHENTICATED'
  | 'PERMISSION_DENIED'
  | 'NOT_FOUND'
  | 'ALREADY_EXISTS'
  | 'FAILED_PRECONDITION'
  | 'INTERNAL';

export class HandlerError extends Error {
  constructor(
    public readonly code: HandlerErrorCode,
    message: string
  ) {
    super(message);
    this.name = 'HandlerError';
  }
}

// Handler dependency shape — Postgres pool + NATS connection. Each
// service's HandlerDeps is structurally compatible with this.
export type HandlerDeps = {
  pool: Pool;
  nats: NatsConnection;
};

const CODE_TO_GRPC: Record<HandlerErrorCode, number> = {
  INVALID_ARGUMENT: status.INVALID_ARGUMENT,
  UNAUTHENTICATED: status.UNAUTHENTICATED,
  PERMISSION_DENIED: status.PERMISSION_DENIED,
  NOT_FOUND: status.NOT_FOUND,
  ALREADY_EXISTS: status.ALREADY_EXISTS,
  FAILED_PRECONDITION: status.FAILED_PRECONDITION,
  INTERNAL: status.INTERNAL,
};

// Handlers may declare a fourth `metadata` parameter to read
// gateway-stamped call metadata (e.g. x-client-ip / x-client-user-agent
// for forensic columns — ADS-931). Three-parameter handlers remain
// assignable, so existing services are unaffected.
export type UnaryHandler<Deps, Req, Res> = (
  deps: Deps,
  principal: Principal,
  req: Req,
  metadata: Metadata
) => Promise<Res>;

export type UnaryHandlerUnauth<Deps, Req, Res> = (
  deps: Deps,
  principal: Principal | null,
  req: Req
) => Promise<Res>;

export type AdaptOptions<Deps> = {
  deps: Deps;
  logger: Logger;
  // Signed-principal verification (ADS-800). When set — or when the
  // service has PRINCIPAL_SIGNING_KEY configured (resolved via
  // config-secrets, so the _FILE variant works) — extractPrincipal
  // requires a valid x-principal-token and takes the principal from the
  // token payload instead of the x-user-* headers. Unset and no env key
  // → legacy header-trust behaviour, unchanged.
  principalVerification?: PrincipalVerification;
};

// Resolve the default verification config from PRINCIPAL_SIGNING_KEY.
// Returns undefined when no key is configured (legacy header trust).
function defaultPrincipalVerification(): PrincipalVerification | undefined {
  const signingKey = getDefaultPrincipalSigningKey();
  return signingKey ? { signingKey } : undefined;
}

export function adapt<Deps, Req, Res>(
  serviceName: string,
  handler: UnaryHandler<Deps, Req, Res>,
  { deps, logger, principalVerification }: AdaptOptions<Deps>
): (call: ServerUnaryCall<Req, Res>, callback: sendUnaryData<Res>) => void {
  return (call, callback) => {
    const verification = principalVerification ?? defaultPrincipalVerification();
    const method = handler.name || 'unknown';
    const stop = startGrpcTimer(serviceName, method);
    const requestId = extractRequestIdFromMetadata(call.metadata);
    echoRequestId(call, requestId);
    void runWithRequestId(requestId, async () => {
      try {
        const principal = extractPrincipal(call.metadata, verification);
        const response = await handler(deps, principal, call.request, call.metadata);
        stop(status.OK);
        callback(null, response);
      } catch (err) {
        const svcErr = toServiceError(err, call.metadata, logger);
        stop(svcErr.code ?? status.INTERNAL);
        callback(svcErr, null);
      }
    });
  };
}

// `adaptUnauth` — for handlers that don't require a principal (public
// reads, token-minting entry points). Best-effort principal extraction:
// passes the principal through if present, null if absent.
export function adaptUnauth<Deps, Req, Res>(
  serviceName: string,
  handler: UnaryHandlerUnauth<Deps, Req, Res>,
  { deps, logger, principalVerification }: AdaptOptions<Deps>
): (call: ServerUnaryCall<Req, Res>, callback: sendUnaryData<Res>) => void {
  return (call, callback) => {
    const verification = principalVerification ?? defaultPrincipalVerification();
    const method = handler.name || 'unknown';
    const stop = startGrpcTimer(serviceName, method);
    const requestId = extractRequestIdFromMetadata(call.metadata);
    echoRequestId(call, requestId);
    void runWithRequestId(requestId, async () => {
      try {
        const principal = extractPrincipalOptional(call.metadata, verification);
        const response = await handler(deps, principal, call.request);
        stop(status.OK);
        callback(null, response);
      } catch (err) {
        const svcErr = toServiceError(err, call.metadata, logger);
        stop(svcErr.code ?? status.INTERNAL);
        callback(svcErr, null);
      }
    });
  };
}

// Echo x-request-id on the response metadata where the transport
// supports it. Errors out of sendMetadata (e.g. already sent) are
// swallowed — observability must never affect the call outcome.
function echoRequestId<Req, Res>(call: ServerUnaryCall<Req, Res>, requestId: string): void {
  try {
    const md = new Metadata();
    md.set(REQUEST_ID_HEADER_NAME, requestId);
    call.sendMetadata(md);
  } catch {
    // No-op — never let observability break the call.
  }
}

function toServiceError(err: unknown, metadata: Metadata, logger: Logger): ServiceError {
  // MissingPrincipalError — check by name for cross-module identity safety.
  if (isMissingPrincipalError(err)) {
    return makeServiceError(status.UNAUTHENTICATED, (err as Error).message, metadata);
  }
  // PrincipalTokenError (ADS-800) — invalid / expired / malformed signed
  // principal token. Same UNAUTHENTICATED path as a missing principal.
  if (isPrincipalTokenError(err)) {
    return makeServiceError(status.UNAUTHENTICATED, (err as Error).message, metadata);
  }
  // HandlerError — duck-type on name + code rather than instanceof so that
  // service-local HandlerError subclasses (defined before handlers.ts was
  // migrated) are still detected correctly across module boundaries.
  if (isHandlerError(err)) {
    const code = (err as { code: HandlerErrorCode }).code;
    const grpcCode = CODE_TO_GRPC[code] ?? status.INTERNAL;
    return makeServiceError(grpcCode, (err as Error).message, metadata);
  }
  logger.error('unhandled handler error', { err });
  return makeServiceError(status.INTERNAL, 'internal error', metadata);
}

function isMissingPrincipalError(err: unknown): boolean {
  return (
    err instanceof MissingPrincipalError ||
    (err instanceof Error && err.name === 'MissingPrincipalError')
  );
}

function isPrincipalTokenError(err: unknown): boolean {
  return (
    err instanceof PrincipalTokenError ||
    (err instanceof Error && err.name === 'PrincipalTokenError')
  );
}

function isHandlerError(err: unknown): boolean {
  if (err instanceof HandlerError) {
    return true;
  }
  if (
    err instanceof Error &&
    err.name === 'HandlerError' &&
    typeof (err as { code?: unknown }).code === 'string'
  ) {
    const code = (err as unknown as { code: string }).code;
    return code in CODE_TO_GRPC;
  }
  return false;
}

function makeServiceError(code: number, message: string, metadata: Metadata): ServiceError {
  const err = new Error(message) as ServiceError;
  err.code = code;
  err.details = message;
  err.metadata = metadata;
  return err;
}
