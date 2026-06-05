// Adapter — wraps the plain async handler functions in handlers.ts in
// the grpc-js `(call, callback)` signature ts-proto generates. Handles:
//
//   1. Principal extraction from gRPC metadata (UNAUTHENTICATED if
//      headers are missing).
//   2. Handler invocation.
//   3. HandlerError → grpc.status code mapping.
//   4. Unknown error → INTERNAL with a scrubbed message.
//
// The handler logic itself stays pure (deps, principal, request) →
// Promise<response>, so it's testable in isolation (handlers.test.ts)
// without spinning up grpc transport.

import {
  status,
  type Metadata,
  type ServerUnaryCall,
  type ServiceError,
  type sendUnaryData,
} from '@grpc/grpc-js';

import type { Logger } from 'winston';

import { HandlerError, type HandlerDeps, type HandlerErrorCode } from './handlers.js';
import { extractPrincipal, MissingPrincipalError } from './principal.js';

// HandlerErrorCode → grpc.status mapping. Same table the gateway will
// use when translating gRPC responses to REST status codes in 1.6.
const CODE_TO_GRPC: Record<HandlerErrorCode, number> = {
  INVALID_ARGUMENT: status.INVALID_ARGUMENT,
  UNAUTHENTICATED: status.UNAUTHENTICATED,
  PERMISSION_DENIED: status.PERMISSION_DENIED,
  NOT_FOUND: status.NOT_FOUND,
  INTERNAL: status.INTERNAL,
};

export type UnaryHandler<Req, Res> = (
  deps: HandlerDeps,
  principal: ReturnType<typeof extractPrincipal>,
  req: Req
) => Promise<Res>;

export type AdaptOptions = {
  deps: HandlerDeps;
  logger: Logger;
};

// Wrap a handler in the grpc-js `(call, callback)` shape. Caller
// passes the bound handler functions one at a time to build the
// NotificationServiceServer implementation.
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
  // Unknown error — log the real message + stack for ops, return a
  // scrubbed message to the caller so we don't leak internal detail.
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
