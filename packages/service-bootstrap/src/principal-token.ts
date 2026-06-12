// Signed principal tokens for internal gRPC (ADS-800).
//
// The gateway (and any service stamping a system principal on a direct
// service-to-service call) signs the principal it puts into the x-user-*
// metadata headers and attaches the result as `x-principal-token`. A
// receiving service configured with PRINCIPAL_SIGNING_KEY verifies the
// token and takes the principal FROM THE TOKEN PAYLOAD — the headers
// become informational, so a forged header can no longer win.
//
// Token format (compact, header-safe):
//   base64url(JSON payload incl. iat/exp) + "." + base64url(HMAC-SHA256
//   over the encoded payload, keyed with the shared signing key)
//
// node:crypto only — no new runtime dependency, no JWT library. The TTL
// is short (default 120s): gRPC calls happen within the lifetime of the
// originating request, and 120s is generous for clock skew between
// containers on the same host.

import { createHmac, timingSafeEqual } from 'node:crypto';

import { z } from 'zod';

import { readSecret } from '@adopt-dont-shop/config-secrets';

import type { Principal } from '@adopt-dont-shop/authz';
import type { Permission, RescueId, UserId, UserRole } from '@adopt-dont-shop/lib.types';

export const DEFAULT_PRINCIPAL_TOKEN_TTL_MS = 120_000;

export const PRINCIPAL_TOKEN_HEADER = 'x-principal-token';

// Schema-first: the wire payload is the principal plus iat/exp epoch-ms
// timestamps. Roles/permissions travel as plain strings — the verifier
// narrows them back to the lib.types unions the same way extractPrincipal
// always has for the header path.
const PrincipalTokenInputSchema = z.object({
  userId: z.string().min(1),
  roles: z.array(z.string()),
  permissions: z.array(z.string()),
  rescueId: z.string().min(1).optional(),
});

const PrincipalTokenPayloadSchema = PrincipalTokenInputSchema.extend({
  iat: z.number().int(),
  exp: z.number().int(),
});

export type PrincipalTokenInput = z.infer<typeof PrincipalTokenInputSchema>;
export type PrincipalTokenPayload = z.infer<typeof PrincipalTokenPayloadSchema>;

export type PrincipalTokenErrorReason = 'malformed' | 'bad_signature' | 'expired';

export class PrincipalTokenError extends Error {
  constructor(
    public readonly reason: PrincipalTokenErrorReason,
    message: string
  ) {
    super(message);
    this.name = 'PrincipalTokenError';
  }
}

export type SignPrincipalTokenOptions = {
  // Token lifetime in milliseconds. Defaults to 120s.
  ttlMs?: number;
  // Epoch-ms "now" — injectable for tests; defaults to Date.now().
  now?: number;
};

export function signPrincipalToken(
  principal: PrincipalTokenInput,
  key: string,
  opts: SignPrincipalTokenOptions = {}
): string {
  const iat = opts.now ?? Date.now();
  const exp = iat + (opts.ttlMs ?? DEFAULT_PRINCIPAL_TOKEN_TTL_MS);
  const payload: PrincipalTokenPayload = {
    userId: principal.userId,
    roles: [...principal.roles],
    permissions: [...principal.permissions],
    ...(principal.rescueId !== undefined ? { rescueId: principal.rescueId } : {}),
    iat,
    exp,
  };
  const encoded = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  return `${encoded}.${mac(encoded, key)}`;
}

export function verifyPrincipalToken(token: string, key: string, now?: number): Principal {
  const parts = token.split('.');
  if (parts.length !== 2 || parts[0].length === 0 || parts[1].length === 0) {
    throw new PrincipalTokenError('malformed', 'principal token is not a two-part compact token');
  }
  const [encoded, signature] = parts;

  // Verify the MAC before touching the payload. timingSafeEqual demands
  // equal-length buffers — a length mismatch is itself a bad signature.
  const expected = Buffer.from(mac(encoded, key), 'base64url');
  const provided = Buffer.from(signature, 'base64url');
  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
    throw new PrincipalTokenError('bad_signature', 'principal token signature mismatch');
  }

  const payload = parsePayload(encoded);

  if ((now ?? Date.now()) > payload.exp) {
    throw new PrincipalTokenError('expired', 'principal token has expired');
  }

  // Same narrowing extractPrincipal performs on the header path: the
  // wire carries plain strings; lib.types brands/unions are compile-time
  // constructs over string.
  return {
    userId: payload.userId as UserId,
    roles: payload.roles as UserRole[],
    permissions: payload.permissions as Permission[],
    rescueId: payload.rescueId !== undefined ? (payload.rescueId as RescueId) : undefined,
  };
}

function parsePayload(encoded: string): PrincipalTokenPayload {
  let raw: unknown;
  try {
    raw = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
  } catch {
    throw new PrincipalTokenError('malformed', 'principal token payload is not valid JSON');
  }
  const parsed = PrincipalTokenPayloadSchema.safeParse(raw);
  if (!parsed.success) {
    throw new PrincipalTokenError(
      'malformed',
      'principal token payload does not match the expected schema'
    );
  }
  return parsed.data;
}

function mac(encodedPayload: string, key: string): string {
  return createHmac('sha256', key).update(encodedPayload).digest('base64url');
}

// --- Default signing-key resolution ----------------------------------
//
// PRINCIPAL_SIGNING_KEY is read through config-secrets (so the
// PRINCIPAL_SIGNING_KEY_FILE Docker-secret variant works) and memoised:
// principalToMetadata signs per-request, and re-reading a file-mounted
// secret on every outbound call would be a sync read on the hot path.
// Secrets are boot-time configuration — they don't rotate mid-process.

let cachedDefaultKey: string | undefined;
let defaultKeyResolved = false;

export function getDefaultPrincipalSigningKey(): string | undefined {
  if (!defaultKeyResolved) {
    cachedDefaultKey = readSecret('PRINCIPAL_SIGNING_KEY')?.trim() || undefined;
    defaultKeyResolved = true;
  }
  return cachedDefaultKey;
}

// Test seam — process.env changes after first resolution are invisible
// without this.
export function resetDefaultPrincipalSigningKeyForTests(): void {
  cachedDefaultKey = undefined;
  defaultKeyResolved = false;
}
