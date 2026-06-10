// gRPC handler adapter — wraps the plain async handler functions in
// the (call, callback) shape ts-proto generates. Identical pattern to
// services/notifications and services/auth — kept inline rather than
// shared so each service can evolve its error-code map independently.

import {
  status,
  Metadata,
  type ServerUnaryCall,
  type ServiceError,
  type sendUnaryData,
} from '@grpc/grpc-js';

import {
  extractRequestIdFromMetadata,
  REQUEST_ID_HEADER_NAME,
  runWithRequestId,
  startGrpcTimer,
} from '@adopt-dont-shop/observability';
import type { Logger } from 'winston';

import { HandlerError, type HandlerDeps, type HandlerErrorCode } from './handlers.js';
import { extractPrincipal, MissingPrincipalError } from './principal.js';

const SERVICE_NAME = 'service.chat';

const CODE_TO_GRPC: Record<HandlerErrorCode, number> = {
  INVALID_ARGUMENT: status.INVALID_ARGUMENT,
  UNAUTHENTICATED: status.UNAUTHENTICATED,
  PERMISSION_DENIED: status.PERMISSION_DENIED,
  NOT_FOUND: status.NOT_FOUND,
  ALREADY_EXISTS: status.ALREADY_EXISTS,
  FAILED_PRECONDITION: status.FAILED_PRECONDITION,
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
