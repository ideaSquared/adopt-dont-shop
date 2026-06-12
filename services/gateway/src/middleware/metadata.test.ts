import { describe, expect, it } from 'vitest';

import type { FastifyRequest } from 'fastify';

import { buildMetadata } from './metadata.js';

// buildMetadata only reads req.headers — a plain object is enough.
function makeRequest(headers: Record<string, string | string[] | undefined>): FastifyRequest {
  return { headers } as unknown as FastifyRequest;
}

describe('buildMetadata', () => {
  it('forwards the identity, request-id and principal-token headers', () => {
    const m = buildMetadata(
      makeRequest({
        'x-user-id': 'usr-1',
        'x-user-roles': 'rescue_staff,admin',
        'x-user-permissions': 'pets.read',
        'x-rescue-id': 'rsc-1',
        'x-request-id': 'req-1',
        'x-principal-token': 'payload.signature',
      })
    );

    expect(m.get('x-user-id')).toEqual(['usr-1']);
    expect(m.get('x-user-roles')).toEqual(['rescue_staff,admin']);
    expect(m.get('x-user-permissions')).toEqual(['pets.read']);
    expect(m.get('x-rescue-id')).toEqual(['rsc-1']);
    expect(m.get('x-request-id')).toEqual(['req-1']);
    expect(m.get('x-principal-token')).toEqual(['payload.signature']);
  });

  it('omits absent and empty headers', () => {
    const m = buildMetadata(makeRequest({ 'x-user-id': '', 'x-request-id': undefined }));
    expect(m.get('x-user-id')).toHaveLength(0);
    expect(m.get('x-request-id')).toHaveLength(0);
    expect(m.get('x-principal-token')).toHaveLength(0);
  });

  it('does not forward arbitrary headers', () => {
    const m = buildMetadata(makeRequest({ authorization: 'Bearer secret', cookie: 'a=b' }));
    expect(m.get('authorization')).toHaveLength(0);
    expect(m.get('cookie')).toHaveLength(0);
  });
});
