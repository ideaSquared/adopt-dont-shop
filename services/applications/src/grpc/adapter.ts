// Thin adapter shim — delegates to @adopt-dont-shop/service-bootstrap
// with the service name bound.

import {
  adapt as adaptShared,
  HandlerError,
  type HandlerErrorCode,
} from '@adopt-dont-shop/service-bootstrap';

import type { WithTransactionDeps } from '@adopt-dont-shop/events';
import type { Principal } from '@adopt-dont-shop/authz';
import type { ServerUnaryCall, sendUnaryData } from '@grpc/grpc-js';
import type { Logger } from 'winston';

const SERVICE_NAME = 'service.applications';

export type HandlerDeps = WithTransactionDeps;

export type { HandlerErrorCode };
export { HandlerError };

export function adapt<Req, Res>(
  handler: (deps: HandlerDeps, principal: Principal, req: Req) => Promise<Res>,
  opts: { deps: HandlerDeps; logger: Logger }
): (call: ServerUnaryCall<Req, Res>, callback: sendUnaryData<Res>) => void {
  return adaptShared<HandlerDeps, Req, Res>(SERVICE_NAME, handler, opts);
}
