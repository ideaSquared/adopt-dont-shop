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

  it('parses comma-separated roles + permissions for an adopter filing a report', () => {
    const p = extractPrincipal(
      build({
        'x-user-id': 'usr-1',
        'x-user-roles': 'adopter',
        'x-user-permissions': 'reports.create , reports.read',
      })
    );
    expect(p.userId).toBe('usr-1');
    expect(p.roles).toEqual(['adopter']);
    expect(p.permissions).toEqual(['reports.create', 'reports.read']);
  });

  it('parses moderator with action permissions', () => {
    const p = extractPrincipal(
      build({
        'x-user-id': 'mod-1',
        'x-user-roles': 'moderator, admin',
        'x-user-permissions': 'reports.resolve, sanctions.issue',
      })
    );
    expect(p.roles).toEqual(['moderator', 'admin']);
    expect(p.permissions).toEqual(['reports.resolve', 'sanctions.issue']);
  });

  it('omits rescueId when x-rescue-id is absent', () => {
    const p = extractPrincipal(
      build({
        'x-user-id': 'usr-3',
        'x-user-roles': 'moderator',
      })
    );
    expect(p.rescueId).toBeUndefined();
  });
});
