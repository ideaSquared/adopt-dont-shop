// Thin adapter shim — delegates to @adopt-dont-shop/service-bootstrap
// with the service name bound.

import {
  adapt as adaptShared,
  adaptUnauth as adaptUnauthShared,
  HandlerError,
} from '@adopt-dont-shop/service-bootstrap';

import type { WithTransactionDeps } from '@adopt-dont-shop/events';
import type { Principal } from '@adopt-dont-shop/authz';
import type { ServerUnaryCall, sendUnaryData } from '@grpc/grpc-js';
import type { Logger } from 'winston';

const SERVICE_NAME = 'service.audit';

export type HandlerDeps = WithTransactionDeps;

export { HandlerError };

export function adapt<Req, Res>(
  handler: (deps: HandlerDeps, principal: Principal, req: Req) => Promise<Res>,
  opts: { deps: HandlerDeps; logger: Logger }
): (call: ServerUnaryCall<Req, Res>, callback: sendUnaryData<Res>) => void {
  return adaptShared<HandlerDeps, Req, Res>(SERVICE_NAME, handler, opts);
}

// For handlers where the credential IS the request (token-link share
// resolution) rather than a caller principal — best-effort principal
// extraction, so the public gateway route can reach the handler without
// stamping x-user-* metadata.
export function adaptUnauth<Req, Res>(
  handler: (deps: HandlerDeps, principal: Principal | null, req: Req) => Promise<Res>,
  opts: { deps: HandlerDeps; logger: Logger }
): (call: ServerUnaryCall<Req, Res>, callback: sendUnaryData<Res>) => void {
  return adaptUnauthShared<HandlerDeps, Req, Res>(SERVICE_NAME, handler, opts);
}
