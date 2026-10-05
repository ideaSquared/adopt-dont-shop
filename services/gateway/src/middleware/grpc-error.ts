// Canonical gRPC → HTTP error mapping for all gateway route files.
//
// Centralises two helpers that were previously copy-pasted across every
// route file:
//   - GRPC_TO_HTTP  — the status-code lookup table
//   - handleGrpcError — sends a typed error response via FastifyReply
//
// The table is the *superset* of all per-route local copies, so every
// code that was previously handled in any route is still handled here.
// New circuit-breaker / retry codes added by ADS-834:
//   UNAVAILABLE       → 503  (circuit open, service down)
//   DEADLINE_EXCEEDED → 504  (retry exhausted / upstream timeout)
//   ABORTED           → 409  (concurrent-write conflict)
//   RESOURCE_EXHAUSTED → 429 (rate-limit / quota hit)

import { status } from '@grpc/grpc-js';
import type { FastifyReply } from 'fastify';

export const GRPC_TO_HTTP: Record<number, number> = {
  [status.OK]: 200,
  [status.INVALID_ARGUMENT]: 400,
  [status.UNAUTHENTICATED]: 401,
  [status.PERMISSION_DENIED]: 403,
  [status.NOT_FOUND]: 404,
  [status.ALREADY_EXISTS]: 409,
  [status.ABORTED]: 409,
  [status.FAILED_PRECONDITION]: 409,
  [status.RESOURCE_EXHAUSTED]: 429,
  [status.INTERNAL]: 500,
  [status.UNIMPLEMENTED]: 501,
  [status.UNAVAILABLE]: 503,
  [status.DEADLINE_EXCEEDED]: 504,
};

type GrpcError = { code?: number; details?: string; message?: string };

// Generic client-safe messages for server-side (5xx) statuses. The
// upstream message/details on a 5xx can carry internal stack fragments,
// raw DB errors, connection strings or file paths — none of which a
// client should see. We forward the upstream text ONLY for client-facing
// (4xx) codes, where it comes from validation / business logic and is
// meant for the caller.
const GENERIC_5XX_MESSAGE: Record<number, string> = {
  500: 'internal_error',
  501: 'not_implemented',
  502: 'bad_gateway',
  503: 'service_unavailable',
  504: 'gateway_timeout',
};

// ADS-973, inverted by ADS-1364: forwarding upstream `details`/`message`
// verbatim for every 4xx not on a deny-list assumed every downstream service
// is disciplined about what it puts in a 4xx message — no test enforced
// that, some services echo untrusted input into error strings, and any code
// absent from the deny-list (e.g. ABORTED, RESOURCE_EXHAUSTED) fell through
// to forwarding by default. Explicit forward-ALLOWLIST instead, so an
// unlisted code fails closed to a generic message:
//   INVALID_ARGUMENT, NOT_FOUND, ALREADY_EXISTS — validation / business-logic
//   errors that are meant for the caller, so the upstream text is forwarded.
//   Every other 4xx gets a generic per-code message; the upstream text is
//   still available server-side (whatever logged the original error), never
//   in the HTTP response.
const FORWARD_4XX_CODES = new Set<number>([
  status.INVALID_ARGUMENT,
  status.NOT_FOUND,
  status.ALREADY_EXISTS,
]);

const GENERIC_4XX_MESSAGE: Record<number, string> = {
  [status.PERMISSION_DENIED]: 'forbidden',
  [status.FAILED_PRECONDITION]: 'precondition failed',
  [status.UNAUTHENTICATED]: 'unauthenticated',
  [status.ABORTED]: 'conflict',
  [status.RESOURCE_EXHAUSTED]: 'rate_limited',
};

export const handleGrpcError = (err: unknown, reply: FastifyReply): FastifyReply => {
  const grpcErr = err as GrpcError;
  const httpStatus = (grpcErr?.code !== undefined && GRPC_TO_HTTP[grpcErr.code]) || 500;
  if (httpStatus >= 500) {
    return reply
      .code(httpStatus)
      .send({ error: GENERIC_5XX_MESSAGE[httpStatus] ?? 'internal_error' });
  }
  if (grpcErr?.code !== undefined && FORWARD_4XX_CODES.has(grpcErr.code)) {
    return reply.code(httpStatus).send({
      error: grpcErr.details ?? grpcErr.message ?? 'internal_error',
    });
  }
  const genericMessage =
    grpcErr?.code !== undefined ? GENERIC_4XX_MESSAGE[grpcErr.code] : undefined;
  return reply.code(httpStatus).send({ error: genericMessage ?? 'request_failed' });
};
