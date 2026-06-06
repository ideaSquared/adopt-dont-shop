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

  it('parses an adopter browsing for pets', () => {
    const p = extractPrincipal(
      build({
        'x-user-id': 'usr-1',
        'x-user-roles': 'adopter',
        'x-user-permissions': 'pets.read , matching.swipe',
      })
    );
    expect(p.userId).toBe('usr-1');
    expect(p.roles).toEqual(['adopter']);
    expect(p.permissions).toEqual(['pets.read', 'matching.swipe']);
  });

  it('omits rescueId when x-rescue-id is absent (adopters never have a rescue scope)', () => {
    const p = extractPrincipal(
      build({
        'x-user-id': 'usr-2',
        'x-user-roles': 'adopter',
      })
    );
    expect(p.rescueId).toBeUndefined();
  });

  it('drops empty permission slots from a trailing comma', () => {
    const p = extractPrincipal(
      build({
        'x-user-id': 'usr-3',
        'x-user-roles': 'adopter',
        'x-user-permissions': 'pets.read,, ',
      })
    );
    expect(p.permissions).toEqual(['pets.read']);
  });
});
