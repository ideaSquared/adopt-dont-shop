import { Metadata } from '@grpc/grpc-js';
import { describe, expect, it } from 'vitest';

import { extractPrincipal, MissingPrincipalError } from './principal.js';

function buildMetadata(headers: Record<string, string>): Metadata {
  const m = new Metadata();
  for (const [k, v] of Object.entries(headers)) {
    m.set(k, v);
  }
  return m;
}

describe('extractPrincipal', () => {
  it('returns the principal when all required headers are present', () => {
    const m = buildMetadata({
      'x-user-id': 'usr-1',
      'x-user-roles': 'rescue_staff',
      'x-user-permissions': 'pets.read,pets.update,applications.review',
      'x-rescue-id': 'res-1',
    });

    const principal = extractPrincipal(m);

    expect(principal).toEqual({
      userId: 'usr-1',
      roles: ['rescue_staff'],
      permissions: ['pets.read', 'pets.update', 'applications.review'],
      rescueId: 'res-1',
    });
  });

  it('omits rescueId when x-rescue-id header is absent', () => {
    const m = buildMetadata({
      'x-user-id': 'usr-1',
      'x-user-roles': 'adopter',
      'x-user-permissions': 'applications.create',
    });

    const principal = extractPrincipal(m);

    expect(principal.rescueId).toBeUndefined();
  });

  it('treats an empty x-user-permissions header as an empty permission array', () => {
    const m = buildMetadata({
      'x-user-id': 'usr-1',
      'x-user-roles': 'adopter',
      'x-user-permissions': '',
    });

    const principal = extractPrincipal(m);

    expect(principal.permissions).toEqual([]);
  });

  it('treats a missing x-user-permissions header as an empty permission array', () => {
    const m = buildMetadata({
      'x-user-id': 'usr-1',
      'x-user-roles': 'adopter',
    });

    const principal = extractPrincipal(m);

    expect(principal.permissions).toEqual([]);
  });

  it('splits and trims comma-separated roles', () => {
    const m = buildMetadata({
      'x-user-id': 'usr-1',
      'x-user-roles': '  super_admin , moderator  ,  ',
    });

    const principal = extractPrincipal(m);

    expect(principal.roles).toEqual(['super_admin', 'moderator']);
  });

  it('throws MissingPrincipalError when x-user-id is absent', () => {
    const m = buildMetadata({ 'x-user-roles': 'adopter' });

    expect(() => extractPrincipal(m)).toThrow(MissingPrincipalError);
    expect(() => extractPrincipal(m)).toThrow(/x-user-id/);
  });

  it('throws MissingPrincipalError when x-user-roles is absent', () => {
    const m = buildMetadata({ 'x-user-id': 'usr-1' });

    expect(() => extractPrincipal(m)).toThrow(MissingPrincipalError);
    expect(() => extractPrincipal(m)).toThrow(/x-user-roles/);
  });

  it('treats whitespace-only x-rescue-id as absent', () => {
    const m = buildMetadata({
      'x-user-id': 'usr-1',
      'x-user-roles': 'rescue_staff',
      'x-rescue-id': '   ',
    });

    const principal = extractPrincipal(m);

    expect(principal.rescueId).toBeUndefined();
  });
});
