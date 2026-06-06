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
    expect(() => extractPrincipal(build({ 'x-user-roles': 'admin' }))).toThrowError(
      MissingPrincipalError
    );
  });

  it('throws MissingPrincipalError when x-user-roles is absent', () => {
    expect(() => extractPrincipal(build({ 'x-user-id': 'u' }))).toThrowError(MissingPrincipalError);
  });

  it('parses an admin with view Audit permission', () => {
    const p = extractPrincipal(
      build({
        'x-user-id': 'admin-1',
        'x-user-roles': 'admin, super_admin',
        'x-user-permissions': 'audit.view , audit.read',
      })
    );
    expect(p.userId).toBe('admin-1');
    expect(p.roles).toEqual(['admin', 'super_admin']);
    expect(p.permissions).toEqual(['audit.view', 'audit.read']);
  });

  it('omits rescueId when x-rescue-id is absent (audit is admin-only, no rescue scope)', () => {
    const p = extractPrincipal(
      build({
        'x-user-id': 'admin-2',
        'x-user-roles': 'admin',
      })
    );
    expect(p.rescueId).toBeUndefined();
  });

  it('drops empty permission slots from a trailing comma', () => {
    const p = extractPrincipal(
      build({
        'x-user-id': 'admin-3',
        'x-user-roles': 'admin',
        'x-user-permissions': 'audit.view,, ',
      })
    );
    expect(p.permissions).toEqual(['audit.view']);
  });
});
