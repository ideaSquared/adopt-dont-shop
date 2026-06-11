// Thin adapter shim — delegates to @adopt-dont-shop/service-bootstrap
// with the service name bound. The two-argument signatures (handler, opts)
// match what server.ts call-sites expect.

import {
  adapt as adaptShared,
  HandlerError,
  type HandlerErrorCode,
} from '@adopt-dont-shop/service-bootstrap';

import type { Principal } from '@adopt-dont-shop/authz';
import type { ServerUnaryCall, sendUnaryData } from '@grpc/grpc-js';
import type { Logger } from 'winston';

import type { HandlerDeps } from './handlers.js';

const SERVICE_NAME = 'service.chat';

export type { HandlerErrorCode };
export { HandlerError };

export function adapt<Req, Res>(
  handler: (deps: HandlerDeps, principal: Principal, req: Req) => Promise<Res>,
  opts: { deps: HandlerDeps; logger: Logger }
): (call: ServerUnaryCall<Req, Res>, callback: sendUnaryData<Res>) => void {
  return adaptShared<HandlerDeps, Req, Res>(SERVICE_NAME, handler, opts);
}
