// Behaviour tests for the canonical gRPC → HTTP error helper.
//
// Verifies:
//   - Every code in the mapping table produces the expected HTTP status
//   - Unknown / unmapped codes fall through to 500
//   - The error body shape is { error: <details | message | 'internal_error'> }
//   - The function returns the FastifyReply instance it was given

import { status } from '@grpc/grpc-js';
import type { FastifyReply } from 'fastify';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { handleGrpcError } from './grpc-error.js';

// Minimal FastifyReply stub — code() chains back to itself; send() returns the stub.
const makeFakeReply = () => {
  const reply = {
    code: vi.fn(),
    send: vi.fn(),
  };
  reply.code.mockReturnValue(reply);
  reply.send.mockReturnValue(reply);
  return reply as unknown as FastifyReply & {
    code: ReturnType<typeof vi.fn>;
    send: ReturnType<typeof vi.fn>;
  };
};

describe('handleGrpcError', () => {
  let reply: ReturnType<typeof makeFakeReply>;

  beforeEach(() => {
    reply = makeFakeReply();
  });

  // ── Mappings from existing route copies (ADS-782) ─────────────────────────

  it('maps OK (0) → 200', () => {
    handleGrpcError({ code: status.OK }, reply);
    expect(reply.code).toHaveBeenCalledWith(200);
  });

  it('maps INVALID_ARGUMENT → 400', () => {
    handleGrpcError({ code: status.INVALID_ARGUMENT, details: 'bad input' }, reply);
    expect(reply.code).toHaveBeenCalledWith(400);
  });

  it('maps UNAUTHENTICATED → 401', () => {
    handleGrpcError({ code: status.UNAUTHENTICATED, details: 'no token' }, reply);
    expect(reply.code).toHaveBeenCalledWith(401);
  });

  it('maps PERMISSION_DENIED → 403', () => {
    handleGrpcError({ code: status.PERMISSION_DENIED, details: 'forbidden' }, reply);
    expect(reply.code).toHaveBeenCalledWith(403);
  });

  it('maps NOT_FOUND → 404', () => {
    handleGrpcError({ code: status.NOT_FOUND, details: 'not found' }, reply);
    expect(reply.code).toHaveBeenCalledWith(404);
  });

  it('maps ALREADY_EXISTS → 409', () => {
    handleGrpcError({ code: status.ALREADY_EXISTS, details: 'duplicate' }, reply);
    expect(reply.code).toHaveBeenCalledWith(409);
  });

  it('maps FAILED_PRECONDITION → 409', () => {
    handleGrpcError({ code: status.FAILED_PRECONDITION, details: 'precondition' }, reply);
    expect(reply.code).toHaveBeenCalledWith(409);
  });

  it('maps UNIMPLEMENTED → 501', () => {
    handleGrpcError({ code: status.UNIMPLEMENTED, details: 'not implemented' }, reply);
    expect(reply.code).toHaveBeenCalledWith(501);
  });

  it('maps INTERNAL → 500', () => {
    handleGrpcError({ code: status.INTERNAL, details: 'boom' }, reply);
    expect(reply.code).toHaveBeenCalledWith(500);
  });

  // ── New mappings (ADS-834) ─────────────────────────────────────────────────

  it('maps UNAVAILABLE → 503 (circuit breaker / service down)', () => {
    handleGrpcError({ code: status.UNAVAILABLE, details: 'circuit open' }, reply);
    expect(reply.code).toHaveBeenCalledWith(503);
  });

  it('maps DEADLINE_EXCEEDED → 504 (retry exhausted / timeout)', () => {
    handleGrpcError({ code: status.DEADLINE_EXCEEDED, details: 'timeout' }, reply);
    expect(reply.code).toHaveBeenCalledWith(504);
  });

  it('maps ABORTED → 409', () => {
    handleGrpcError({ code: status.ABORTED, details: 'conflict' }, reply);
    expect(reply.code).toHaveBeenCalledWith(409);
  });

  it('maps RESOURCE_EXHAUSTED → 429 (rate-limit / quota)', () => {
    handleGrpcError({ code: status.RESOURCE_EXHAUSTED, details: 'too many' }, reply);
    expect(reply.code).toHaveBeenCalledWith(429);
  });

  // ── Unknown / unmapped codes fall through to 500 ──────────────────────────

  it('defaults unmapped numeric code to 500', () => {
    // gRPC code 99 does not appear in any mapping
    handleGrpcError({ code: 99 }, reply);
    expect(reply.code).toHaveBeenCalledWith(500);
  });

  it('defaults when code is undefined to 500', () => {
    handleGrpcError({}, reply);
    expect(reply.code).toHaveBeenCalledWith(500);
  });

  it('defaults when err is a plain Error with no gRPC code to 500', () => {
    handleGrpcError(new Error('something went wrong'), reply);
    expect(reply.code).toHaveBeenCalledWith(500);
  });

  it('defaults when err is null to 500', () => {
    handleGrpcError(null, reply);
    expect(reply.code).toHaveBeenCalledWith(500);
  });

  // ── Error body shape ───────────────────────────────────────────────────────

  it('sends { error: details } when details is set', () => {
    handleGrpcError({ code: status.NOT_FOUND, details: 'pet not found' }, reply);
    expect(reply.send).toHaveBeenCalledWith({ error: 'pet not found' });
  });

  it('sends { error: "internal_error" } when neither details nor message is set', () => {
    handleGrpcError({ code: status.INTERNAL }, reply);
    expect(reply.send).toHaveBeenCalledWith({ error: 'internal_error' });
  });

  // ── 5xx codes never leak upstream message/details to the client ──────────────
  // The upstream message/details on a server-side error can carry internal
  // stack fragments, DB errors, file paths, etc. We forward upstream text only
  // for client-facing (4xx) codes — those come from validation / business logic.

  it('does NOT leak upstream message on INTERNAL (500)', () => {
    handleGrpcError({ code: status.INTERNAL, message: 'connection to db pool failed' }, reply);
    expect(reply.send).toHaveBeenCalledWith({ error: 'internal_error' });
  });

  it('does NOT leak upstream details on INTERNAL (500)', () => {
    handleGrpcError({ code: status.INTERNAL, details: 'ECONNREFUSED 10.0.3.5:5432' }, reply);
    expect(reply.send).toHaveBeenCalledWith({ error: 'internal_error' });
  });

  it('does NOT leak upstream text on UNAVAILABLE (503)', () => {
    handleGrpcError({ code: status.UNAVAILABLE, details: 'no connection established' }, reply);
    expect(reply.send).toHaveBeenCalledWith({ error: 'service_unavailable' });
  });

  it('does NOT leak upstream text on DEADLINE_EXCEEDED (504)', () => {
    handleGrpcError({ code: status.DEADLINE_EXCEEDED, details: 'retry budget exhausted' }, reply);
    expect(reply.send).toHaveBeenCalledWith({ error: 'gateway_timeout' });
  });

  it('does NOT leak a non-gRPC Error message to the client', () => {
    handleGrpcError(new Error('TypeError: cannot read property foo of undefined'), reply);
    expect(reply.send).toHaveBeenCalledWith({ error: 'internal_error' });
  });

  it('still forwards upstream details for client-facing codes (400)', () => {
    handleGrpcError({ code: status.INVALID_ARGUMENT, details: 'email is required' }, reply);
    expect(reply.send).toHaveBeenCalledWith({ error: 'email is required' });
  });

  it('prefers details over message when both are present', () => {
    handleGrpcError(
      { code: status.INVALID_ARGUMENT, details: 'details text', message: 'message text' },
      reply
    );
    expect(reply.send).toHaveBeenCalledWith({ error: 'details text' });
  });

  // ── ADS-973: per-code allowlist for 4xx — some codes get a generic
  // message instead of the forwarded upstream text, because that text can
  // carry internal identifiers or policy detail not meant for the caller.

  it('sends a generic message for PERMISSION_DENIED, not the upstream details', () => {
    handleGrpcError(
      { code: status.PERMISSION_DENIED, details: 'user usr-123 lacks role admin on rescue rsc-9' },
      reply
    );
    expect(reply.code).toHaveBeenCalledWith(403);
    expect(reply.send).toHaveBeenCalledWith({ error: 'forbidden' });
  });

  it('sends a generic message for FAILED_PRECONDITION, not the upstream details', () => {
    handleGrpcError(
      { code: status.FAILED_PRECONDITION, details: 'row version 4 conflicts with row version 7' },
      reply
    );
    expect(reply.code).toHaveBeenCalledWith(409);
    expect(reply.send).toHaveBeenCalledWith({ error: 'precondition failed' });
  });

  it('sends a generic message for UNAUTHENTICATED, not the upstream details', () => {
    handleGrpcError(
      { code: status.UNAUTHENTICATED, details: 'signing key rotated at 2026-07-18T00:00:00Z' },
      reply
    );
    expect(reply.code).toHaveBeenCalledWith(401);
    expect(reply.send).toHaveBeenCalledWith({ error: 'unauthenticated' });
  });

  it('still forwards detailed messages for INVALID_ARGUMENT', () => {
    handleGrpcError({ code: status.INVALID_ARGUMENT, details: 'email is required' }, reply);
    expect(reply.send).toHaveBeenCalledWith({ error: 'email is required' });
  });

  it('still forwards detailed messages for NOT_FOUND', () => {
    handleGrpcError({ code: status.NOT_FOUND, details: 'pet pet-42 not found' }, reply);
    expect(reply.send).toHaveBeenCalledWith({ error: 'pet pet-42 not found' });
  });

  it('still forwards detailed messages for ALREADY_EXISTS', () => {
    handleGrpcError({ code: status.ALREADY_EXISTS, details: 'email already registered' }, reply);
    expect(reply.send).toHaveBeenCalledWith({ error: 'email already registered' });
  });

  // ── Return value ───────────────────────────────────────────────────────────

  it('returns the FastifyReply instance', () => {
    const result = handleGrpcError({ code: status.NOT_FOUND }, reply);
    expect(result).toBe(reply);
  });
});
