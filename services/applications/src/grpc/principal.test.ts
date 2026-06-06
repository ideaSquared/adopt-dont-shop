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

  it('parses comma-separated roles + permissions for an adopter', () => {
    const p = extractPrincipal(
      build({
        'x-user-id': 'usr-1',
        'x-user-roles': 'adopter',
        'x-user-permissions': 'applications.create , applications.read',
      })
    );
    expect(p.userId).toBe('usr-1');
    expect(p.roles).toEqual(['adopter']);
    expect(p.permissions).toEqual(['applications.create', 'applications.read']);
  });

  it('parses rescue staff with x-rescue-id scope', () => {
    const p = extractPrincipal(
      build({
        'x-user-id': 'usr-2',
        'x-user-roles': 'rescue_staff, admin',
        'x-rescue-id': 'rsc-42',
        'x-user-permissions': 'applications.update, applications.approve',
      })
    );
    expect(p.roles).toEqual(['rescue_staff', 'admin']);
    expect(p.rescueId).toBe('rsc-42');
    expect(p.permissions).toEqual(['applications.update', 'applications.approve']);
  });

  it('omits rescueId when x-rescue-id is absent (adopter case)', () => {
    const p = extractPrincipal(
      build({
        'x-user-id': 'usr-3',
        'x-user-roles': 'adopter',
      })
    );
    expect(p.rescueId).toBeUndefined();
  });

  it('drops empty permission slots from a trailing comma', () => {
    const p = extractPrincipal(
      build({
        'x-user-id': 'usr-4',
        'x-user-roles': 'adopter',
        'x-user-permissions': 'applications.read,, ',
      })
    );
    expect(p.permissions).toEqual(['applications.read']);
  });
});
