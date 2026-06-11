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

export const handleGrpcError = (err: unknown, reply: FastifyReply): FastifyReply => {
  const grpcErr = err as GrpcError;
  const httpStatus = (grpcErr?.code !== undefined && GRPC_TO_HTTP[grpcErr.code]) || 500;
  return reply.code(httpStatus).send({
    error: grpcErr?.details ?? grpcErr?.message ?? 'internal_error',
  });
};
