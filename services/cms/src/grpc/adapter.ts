// gRPC adapter — wraps plain async handlers in the grpc-js
// (call, callback) shape. Two variants:
//   - adapt: principal required (throws UNAUTHENTICATED on missing
//     identity headers).
//   - adaptUnauth: principal optional (public reads). Handler receives
//     a Principal | null.

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
import { extractPrincipal, extractPrincipalOptional, MissingPrincipalError } from './principal.js';

const CODE_TO_GRPC: Record<HandlerErrorCode, number> = {
  INVALID_ARGUMENT: status.INVALID_ARGUMENT,
  UNAUTHENTICATED: status.UNAUTHENTICATED,
  PERMISSION_DENIED: status.PERMISSION_DENIED,
  NOT_FOUND: status.NOT_FOUND,
  ALREADY_EXISTS: status.ALREADY_EXISTS,
  INTERNAL: status.INTERNAL,
};

export type AdaptOptions = {
  deps: HandlerDeps;
  logger: Logger;
};

export function adapt<Req, Res>(
  handler: (deps: HandlerDeps, principal: Principal, req: Req) => Promise<Res>,
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

export function adaptUnauth<Req, Res>(
  handler: (deps: HandlerDeps, principal: Principal | null, req: Req) => Promise<Res>,
  { deps, logger }: AdaptOptions
): (call: ServerUnaryCall<Req, Res>, callback: sendUnaryData<Res>) => void {
  return (call, callback) => {
    void (async () => {
      try {
        const principal = extractPrincipalOptional(call.metadata);
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
