// Shared instrumentation helpers for the per-service gRPC adapters.
//
// Each service ships its own `adapt(handler, ...)` (services/*/src/grpc/
// adapter.ts) — different HandlerError types make a single shared
// adapter impractical. But the cross-cutting concerns (read request-id
// off metadata; record duration + grpc code on completion) are
// identical. These two tiny helpers let each adapter add observability
// in three lines.

import { randomUUID } from 'node:crypto';

import type { Metadata } from '@grpc/grpc-js';

import { recordGrpcDuration, type GrpcDirection } from './metrics.js';
import { REQUEST_ID_HEADER_NAME } from './request-id.js';

// Pull x-request-id off incoming gRPC metadata, fall back to a fresh
// UUID. Adapter uses this to seed the AsyncLocalStorage context (via
// runWithRequestId) so log lines + nested outbound calls pick it up.
export const extractRequestIdFromMetadata = (metadata: Metadata): string => {
  const raw = metadata.get(REQUEST_ID_HEADER_NAME);
  for (const v of raw) {
    if (typeof v === 'string' && v.length > 0) {
      return v;
    }
  }
  return randomUUID();
};

// Start a duration measurement for a single gRPC call (handler or
// outbound client call). Caller invokes `stop(code)` once the call
// resolves / rejects, passing the final grpc status code (0 on
// success, the mapped HandlerErrorCode on failure). Direction defaults
// to 'in' for handler use; the gateway's gRPC clients pass 'out'.
export type StopFn = (code: number) => void;

export const startGrpcTimer = (
  service: string,
  method: string,
  direction: GrpcDirection = 'in'
): StopFn => {
  const start = process.hrtime.bigint();
  return (code: number) => {
    const elapsedNs = process.hrtime.bigint() - start;
    recordGrpcDuration({
      service,
      method,
      code,
      direction,
      durationSeconds: Number(elapsedNs) / 1e9,
    });
  };
};
