import { Metadata } from '@grpc/grpc-js';
import { describe, expect, it } from 'vitest';

import { extractPrincipal, extractPrincipalOptional, MissingPrincipalError } from './principal.js';

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

  it('treats missing x-user-permissions as empty list', () => {
    const p = extractPrincipal(
      build({
        'x-user-id': 'u',
        'x-user-roles': 'adopter',
      })
    );
    expect(p.permissions).toEqual([]);
  });
});

describe('extractPrincipalOptional', () => {
  it('returns null when x-user-id is absent', () => {
    expect(extractPrincipalOptional(build({}))).toBeNull();
  });

  it('returns null when x-user-roles is absent', () => {
    expect(extractPrincipalOptional(build({ 'x-user-id': 'u' }))).toBeNull();
  });

  it('returns the principal when headers are present', () => {
    const p = extractPrincipalOptional(
      build({
        'x-user-id': 'usr-2',
        'x-user-roles': 'admin',
        'x-user-permissions': 'pets.read',
      })
    );
    expect(p).not.toBeNull();
    expect(p?.userId).toBe('usr-2');
  });
});
