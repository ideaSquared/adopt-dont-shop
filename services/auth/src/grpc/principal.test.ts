import { Metadata } from '@grpc/grpc-js';
import { describe, expect, it } from 'vitest';

import { extractPrincipal, MissingPrincipalError } from './principal.js';

function build(headers: Record<string, string>): Metadata {
  const m = new Metadata();
  for (const [k, v] of Object.entries(headers)) m.set(k, v);
  return m;
}

describe('extractPrincipal', () => {
  it('throws MissingPrincipalError when x-user-id is absent', () => {
    expect(() => extractPrincipal(build({ 'x-user-roles': 'adopter' }))).toThrowError(
      MissingPrincipalError
    );
  });

  it('throws MissingPrincipalError when x-user-roles is absent', () => {
    expect(() => extractPrincipal(build({ 'x-user-id': 'u' }))).toThrowError(MissingPrincipalError);
  });

  it('parses comma-separated roles + permissions', () => {
    const p = extractPrincipal(
      build({
        'x-user-id': 'usr-1',
        'x-user-roles': 'rescue_staff, admin',
        'x-user-permissions': 'pets.read , pets.update',
      })
    );
    expect(p.userId).toBe('usr-1');
    expect(p.roles).toEqual(['rescue_staff', 'admin']);
    expect(p.permissions).toEqual(['pets.read', 'pets.update']);
  });

  it('accepts an empty permissions header (role-only authz)', () => {
    const p = extractPrincipal(
      build({ 'x-user-id': 'u', 'x-user-roles': 'adopter', 'x-user-permissions': '' })
    );
    expect(p.permissions).toEqual([]);
  });

  it('carries x-rescue-id when present', () => {
    const p = extractPrincipal(
      build({
        'x-user-id': 'u',
        'x-user-roles': 'rescue_staff',
        'x-rescue-id': 'rsc-42',
      })
    );
    expect(p.rescueId).toBe('rsc-42');
  });
});
