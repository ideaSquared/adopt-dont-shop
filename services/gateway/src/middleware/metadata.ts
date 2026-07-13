// Shared buildMetadata — lifts the near-identical helper that previously
// lived in every route file into one place. Every gateway → service gRPC
// call goes through this so we have exactly one place to add a header.
//
// Forwards:
//   - x-user-id / x-user-roles / x-user-permissions / x-rescue-id
//     (stamped by the authenticate middleware after ValidateToken)
//   - x-principal-token (ADS-800 — signed principal, stamped by the
//     authenticate middleware when PRINCIPAL_SIGNING_KEY is configured;
//     the middleware strips any client-supplied value first)
//   - x-request-id (stamped by the request-id middleware; either
//     mirrored from the inbound header or minted as a UUID)
//   - x-client-ip / x-client-user-agent (ADS-931 — stamped from the
//     gateway's OWN connection context, never forwarded from
//     client-supplied headers, so callers can't forge the forensic
//     ip/user-agent columns backend services persist)
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
  'x-principal-token',
  'x-request-id',
] as const;

// Client-context metadata (ADS-931). req.ip is fastify's
// trust-proxy-resolved connection address; the User-Agent header is the
// connection's own. A client-sent x-client-ip / x-client-user-agent
// header is NOT in FORWARDED_HEADERS, so it can never reach a backend.
const CLIENT_IP_HEADER = 'x-client-ip';
const CLIENT_USER_AGENT_HEADER = 'x-client-user-agent';

export const buildMetadata = (req: FastifyRequest): Metadata => {
  const m = new Metadata();
  const headers = req.headers as Record<string, string | string[] | undefined>;
  for (const key of FORWARDED_HEADERS) {
    const raw = headers[key];
    if (typeof raw === 'string' && raw.length > 0) {
      m.set(key, raw);
    }
  }
  if (typeof req.ip === 'string' && req.ip.length > 0) {
    m.set(CLIENT_IP_HEADER, req.ip);
  }
  const userAgent = headers['user-agent'];
  if (typeof userAgent === 'string' && userAgent.length > 0) {
    m.set(CLIENT_USER_AGENT_HEADER, userAgent);
  }
  return m;
};
