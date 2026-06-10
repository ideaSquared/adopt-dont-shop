// Adapter — wraps the plain async handler functions in handlers.ts
// in the grpc-js `(call, callback)` signature ts-proto generates.
//
// All six RescueService RPCs require a principal (the gateway's
// Phase 2.5 authenticate middleware populates the x-user-* metadata
// for every authenticated request), so we only need a single `adapt`
// variant. HandlerError → grpc.status mapping mirrors
// services/pets/src/grpc/adapter.ts.

import {
  status,
  Metadata,
  type ServerUnaryCall,
  type ServiceError,
  type sendUnaryData,
} from '@grpc/grpc-js';

import type { Principal } from '@adopt-dont-shop/authz';
import {
  extractRequestIdFromMetadata,
  REQUEST_ID_HEADER_NAME,
  runWithRequestId,
  startGrpcTimer,
} from '@adopt-dont-shop/observability';
import type { Logger } from 'winston';

import { HandlerError, type HandlerDeps, type HandlerErrorCode } from './handlers.js';
import { extractPrincipal, MissingPrincipalError } from './principal.js';

const SERVICE_NAME = 'service.rescue';

const CODE_TO_GRPC: Record<HandlerErrorCode, number> = {
  INVALID_ARGUMENT: status.INVALID_ARGUMENT,
  UNAUTHENTICATED: status.UNAUTHENTICATED,
  PERMISSION_DENIED: status.PERMISSION_DENIED,
  NOT_FOUND: status.NOT_FOUND,
  INTERNAL: status.INTERNAL,
};

export type UnaryHandler<Req, Res> = (
  deps: HandlerDeps,
  principal: Principal,
  req: Req
) => Promise<Res>;

export type AdaptOptions = {
  deps: HandlerDeps;
  logger: Logger;
};

export function adapt<Req, Res>(
  handler: UnaryHandler<Req, Res>,
  { deps, logger }: AdaptOptions
): (call: ServerUnaryCall<Req, Res>, callback: sendUnaryData<Res>) => void {
  return (call, callback) => {
    const method = handler.name || 'unknown';
    const stop = startGrpcTimer(SERVICE_NAME, method);
    const requestId = extractRequestIdFromMetadata(call.metadata);
    echoRequestId(call, requestId);
    void runWithRequestId(requestId, async () => {
      try {
        const principal = extractPrincipal(call.metadata);
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

export type UnaryHandlerUnauth<Req, Res> = (
  deps: HandlerDeps,
  principal: Principal | null,
  req: Req
) => Promise<Res>;

// adaptUnauth — for RPCs reachable without a principal (e.g. the
// invitation-accept page, where the email link IS the credential and
// the visitor isn't logged in yet). Best-effort principal extraction:
// pass it through when present, never block on its absence.
export function adaptUnauth<Req, Res>(
  handler: UnaryHandlerUnauth<Req, Res>,
  { deps, logger }: AdaptOptions
): (call: ServerUnaryCall<Req, Res>, callback: sendUnaryData<Res>) => void {
  return (call, callback) => {
    const method = handler.name || 'unknown';
    const stop = startGrpcTimer(SERVICE_NAME, method);
    const requestId = extractRequestIdFromMetadata(call.metadata);
    echoRequestId(call, requestId);
    void runWithRequestId(requestId, async () => {
      try {
        let principal: Principal | null = null;
        try {
          principal = extractPrincipal(call.metadata);
        } catch {
          principal = null;
        }
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

function toServiceError(err: unknown, metadata: Metadata, logger: Logger): ServiceError {
  if (err instanceof MissingPrincipalError) {
    return makeServiceError(status.UNAUTHENTICATED, err.message, metadata);
  }
  if (err instanceof HandlerError) {
    return makeServiceError(CODE_TO_GRPC[err.code], err.message, metadata);
  }
  logger.error('unhandled handler error', { err });
  return makeServiceError(status.INTERNAL, 'internal error', metadata);
}

function makeServiceError(code: number, message: string, metadata: Metadata): ServiceError {
  const err = new Error(message) as ServiceError;
  err.code = code;
  err.details = message;
  err.metadata = metadata;
  return err;
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
