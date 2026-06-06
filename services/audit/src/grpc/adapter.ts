// Adapter — wraps the plain async handler functions (Phase 10.3b)
// in the grpc-js `(call, callback)` signature ts-proto generates.
//
// Both AuditQueryService RPCs (Query, GetByTarget) require a
// principal — the gateway only forwards these calls after gating on
// the `view Audit` ability (admin+). HandlerError → grpc.status
// mapping mirrors services/rescue/src/grpc/adapter.ts.
//
// HandlerError + HandlerErrorCode + HandlerDeps are defined here
// rather than in a separate handlers.ts so this PR can land
// standalone — the actual RPC handler functions arrive in Phase
// 10.3b's handlers.ts and import HandlerError from this file.

import {
  status,
  type Metadata,
  type ServerUnaryCall,
  type ServiceError,
  type sendUnaryData,
} from '@grpc/grpc-js';

import type { Principal } from '@adopt-dont-shop/authz';
import type { WithTransactionDeps } from '@adopt-dont-shop/events';
import type { Logger } from 'winston';

import { extractPrincipal, MissingPrincipalError } from './principal.js';

// Per-handler dependencies — Postgres pool + NATS publisher etc.
// Audit doesn't write through the gRPC surface (it's read-only), so
// the deps are just the read side: a Postgres pool wrapped for query
// + transaction semantics. Same shape as other services so the
// adapter is identical.
export type HandlerDeps = WithTransactionDeps;

export type HandlerErrorCode =
  | 'INVALID_ARGUMENT'
  | 'UNAUTHENTICATED'
  | 'PERMISSION_DENIED'
  | 'NOT_FOUND'
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
