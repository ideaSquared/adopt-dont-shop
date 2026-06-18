// Behaviour tests for principal and metadata builders.
//
// These tests prove that:
//   - `testPrincipal()` returns a valid Principal with sensible defaults.
//   - Overrides are applied correctly without affecting unspecified fields.
//   - `metadataFor()` stamps the correct x-user-* headers that the gateway
//     forwards to downstream services.
//   - x-rescue-id is only set when the principal carries one.

import { Metadata } from '@grpc/grpc-js';
import { describe, expect, it } from 'vitest';
import type { Permission, RescueId, UserId, UserRole } from '@adopt-dont-shop/lib.types';

import { metadataFor, testPrincipal } from './principal-builders.js';

describe('testPrincipal — default shape', () => {
  it('returns a non-empty userId', () => {
    const p = testPrincipal();
    expect(p.userId).toBeTruthy();
  });

  it('returns at least one role', () => {
    const p = testPrincipal();
    expect(p.roles.length).toBeGreaterThan(0);
  });

  it('returns an empty permissions list by default', () => {
    const p = testPrincipal();
    expect(p.permissions).toEqual([]);
  });

  it('does not include rescueId by default', () => {
    const p = testPrincipal();
    expect(p.rescueId).toBeUndefined();
  });
});

describe('testPrincipal — overrides', () => {
  it('applies a custom userId', () => {
    const p = testPrincipal({ userId: 'usr-custom' as UserId });
    expect(p.userId).toBe('usr-custom');
  });

  it('applies custom roles', () => {
    const p = testPrincipal({ roles: ['admin'] as UserRole[] });
    expect(p.roles).toEqual(['admin']);
  });

  it('applies custom permissions', () => {
    const p = testPrincipal({ permissions: ['pets.read'] as Permission[] });
    expect(p.permissions).toEqual(['pets.read']);
  });

  it('applies rescueId when provided', () => {
    const p = testPrincipal({ rescueId: 'rsc-42' as RescueId });
    expect(p.rescueId).toBe('rsc-42');
  });

  it('does not include rescueId when explicitly undefined in override', () => {
    const p = testPrincipal({ rescueId: undefined });
    expect(p.rescueId).toBeUndefined();
  });

  it('leaves unspecified fields at their defaults', () => {
    const p = testPrincipal({ userId: 'usr-partial' as UserId });
    // roles and permissions should still be the defaults
    expect(p.roles.length).toBeGreaterThan(0);
    expect(p.permissions).toEqual([]);
  });
});

describe('metadataFor — header stamping', () => {
  it('stamps x-user-id with the principal userId', () => {
    const p = testPrincipal({ userId: 'usr-meta-test' as UserId });
    const m = metadataFor(p);

    expect(getHeader(m, 'x-user-id')).toBe('usr-meta-test');
  });

  it('stamps x-user-roles as comma-separated roles', () => {
    const p = testPrincipal({ roles: ['admin', 'rescue_staff'] as UserRole[] });
    const m = metadataFor(p);

    expect(getHeader(m, 'x-user-roles')).toBe('admin,rescue_staff');
  });

  it('stamps x-user-permissions as a comma-separated list', () => {
    const p = testPrincipal({ permissions: ['pets.read', 'pets.update'] as Permission[] });
    const m = metadataFor(p);

    expect(getHeader(m, 'x-user-permissions')).toBe('pets.read,pets.update');
  });

  it('stamps x-user-permissions as empty string when permissions are empty', () => {
    const p = testPrincipal({ permissions: [] });
    const m = metadataFor(p);

    expect(getHeader(m, 'x-user-permissions')).toBe('');
  });

  it('stamps x-rescue-id when the principal carries one', () => {
    const p = testPrincipal({ rescueId: 'rsc-7' as RescueId });
    const m = metadataFor(p);

    expect(getHeader(m, 'x-rescue-id')).toBe('rsc-7');
  });

  it('does not stamp x-rescue-id when the principal has none', () => {
    const p = testPrincipal();
    const m = metadataFor(p);

    expect(m.get('x-rescue-id')).toHaveLength(0);
  });

  it('returns a Metadata instance', () => {
    const m = metadataFor(testPrincipal());
    expect(m).toBeInstanceOf(Metadata);
  });
});

// Helpers

function getHeader(m: Metadata, key: string): string {
  const values = m.get(key);
  const first = values[0];
  return typeof first === 'string' ? first : String(first ?? '');
}
