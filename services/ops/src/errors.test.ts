import { status } from '@grpc/grpc-js';
import { describe, expect, it } from 'vitest';

import { fromGrpcError, httpStatusFor, redactEmails } from './errors.js';

describe('fromGrpcError', () => {
  it.each([
    [status.INVALID_ARGUMENT, 'INVALID_ARGUMENT', 400],
    [status.PERMISSION_DENIED, 'PERMISSION_DENIED', 403],
    [status.NOT_FOUND, 'NOT_FOUND', 404],
    [status.ALREADY_EXISTS, 'ALREADY_EXISTS', 409],
    [status.FAILED_PRECONDITION, 'FAILED_PRECONDITION', 412],
    [status.UNAVAILABLE, 'UNAVAILABLE', 503],
    [status.DEADLINE_EXCEEDED, 'UNAVAILABLE', 503],
    [status.UNAUTHENTICATED, 'INTERNAL', 500],
    [status.DATA_LOSS, 'INTERNAL', 500],
  ])('maps gRPC status %i to %s with a hint', (code, expected, http) => {
    const err = fromGrpcError('pets.Get', Object.assign(new Error('x'), { code, details: 'd' }));
    expect(err.code).toBe(expected);
    expect(httpStatusFor(err.code)).toBe(http);
    expect(err.hint.length).toBeGreaterThan(0);
  });

  it('survives non-gRPC errors and redacts emails', () => {
    expect(fromGrpcError('pets.Get', 'boom').code).toBe('INTERNAL');
    expect(redactEmails('a@b.co and c.d@e.org')).toBe('[email] and [email]');
  });
});
