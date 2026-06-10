// Shared buildMetadata — lifts the near-identical helper that previously
// lived in every route file into one place. Every gateway → service gRPC
// call goes through this so we have exactly one place to add a header.
//
// Forwards:
//   - x-user-id / x-user-roles / x-user-permissions / x-rescue-id
//     (stamped by the authenticate middleware after ValidateToken)
//   - x-request-id (stamped by the request-id middleware; either
//     mirrored from the inbound header or minted as a UUID)
//
// Downstream gRPC adapters read x-request-id off `call.metadata` and
// attach it to their logger context so a single id traces through every
// hop.

import { Metadata } from '@grpc/grpc-js';
import type { FastifyRequest } from 'fastify';

const FORWARDED_HEADERS = [
  'x-user-id',
  'x-user-roles',
  'x-user-permissions',
  'x-rescue-id',
  'x-request-id',
] as const;

export const buildMetadata = (req: FastifyRequest): Metadata => {
  const m = new Metadata();
  const headers = req.headers as Record<string, string | string[] | undefined>;
  for (const key of FORWARDED_HEADERS) {
    const raw = headers[key];
    if (typeof raw === 'string' && raw.length > 0) {
      m.set(key, raw);
    }
  }
  return m;
};
