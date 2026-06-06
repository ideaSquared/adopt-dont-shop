// Adapter — wraps the plain async handler functions in handlers.ts
// in the grpc-js `(call, callback)` signature ts-proto generates.
//
// Two variants:
//   - `adapt`        — for handlers that REQUIRE a principal
//                      (Logout, GetMe, AssignRole). Throws
//                      UNAUTHENTICATED when metadata is missing.
//   - `adaptUnauth`  — for handlers that DON'T (Login, RefreshToken,
//                      ValidateToken — these mint or verify the
//                      principal). Passes `null` through to the
//                      handler; the handler's signature is typed
//                      `Principal | null`.
//
// HandlerError code mapping mirrors the table in
// services/notifications/src/grpc/adapter.ts so the same gateway
// REST→gRPC code-to-status translation works for every extracted
// service.

import {
  status,
  type Metadata,
  type ServerUnaryCall,
  type ServiceError,
  type sendUnaryData,
} from '@grpc/grpc-js';

import type { Principal } from '@adopt-dont-shop/authz';
import type { Logger } from 'winston';

import { HandlerError, type HandlerDeps, type HandlerErrorCode } from './handlers.js';
import { extractPrincipal, MissingPrincipalError } from './principal.js';

const CODE_TO_GRPC: Record<HandlerErrorCode, number> = {
  INVALID_ARGUMENT: status.INVALID_ARGUMENT,
  UNAUTHENTICATED: status.UNAUTHENTICATED,
  PERMISSION_DENIED: status.PERMISSION_DENIED,
  NOT_FOUND: status.NOT_FOUND,
  ALREADY_EXISTS: status.ALREADY_EXISTS,
  INTERNAL: status.INTERNAL,
};

export type UnaryHandler<Req, Res> = (
  deps: HandlerDeps,
  principal: Principal,
  req: Req
) => Promise<Res>;

export type UnaryHandlerUnauth<Req, Res> = (
  deps: HandlerDeps,
  principal: Principal | null,
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
    void (async () => {
      try {
        const principal = extractPrincipal(call.metadata);
        const response = await handler(deps, principal, call.request);
        callback(null, response);
      } catch (err) {
        callback(toServiceError(err, call.metadata, logger), null);
      }
    })();
  };
}

// `adaptUnauth` skips principal extraction — used by Login,
// RefreshToken, ValidateToken which can be called without one.
export function adaptUnauth<Req, Res>(
  handler: UnaryHandlerUnauth<Req, Res>,
  { deps, logger }: AdaptOptions
): (call: ServerUnaryCall<Req, Res>, callback: sendUnaryData<Res>) => void {
  return (call, callback) => {
    void (async () => {
      try {
        // Best-effort principal extraction — pass it through when
        // present (gateway middleware may already have validated a
        // request the caller could have made authenticated), but
        // never block on its absence.
        let principal: Principal | null = null;
        try {
          principal = extractPrincipal(call.metadata);
        } catch {
          principal = null;
        }
        const response = await handler(deps, principal, call.request);
        callback(null, response);
      } catch (err) {
        callback(toServiceError(err, call.metadata, logger), null);
      }
    })();
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
