import { describe, expect, it } from 'vitest';

import type { Permission, RescueId, UserId } from '@adopt-dont-shop/lib.types';

import type { Principal } from './principal.js';
import { requirePermission } from './require-permission.js';

const userId = 'usr-1' as UserId;
const otherUserId = 'usr-2' as UserId;
const rescueId = 'res-1' as RescueId;
const otherRescueId = 'res-2' as RescueId;

const PETS_UPDATE = 'pets.update' as Permission;
const APPLICATIONS_READ = 'applications.read' as Permission;
const APPLICATIONS_APPROVE = 'applications.approve' as Permission;

function makePrincipal(overrides: Partial<Principal> = {}): Principal {
  return {
    userId,
    roles: ['rescue_staff'],
    permissions: [],
    ...overrides,
  };
}

describe('requirePermission', () => {
  describe('super_admin short-circuit', () => {
    const principal = makePrincipal({ roles: ['super_admin'], permissions: [] });

    it('allows any permission with no scope', () => {
      expect(requirePermission(principal, PETS_UPDATE)).toBe(true);
    });

    it('allows any permission even when the rescueId scope would otherwise mismatch', () => {
      expect(requirePermission(principal, PETS_UPDATE, { rescueId: otherRescueId })).toBe(true);
    });

    it('allows any permission even when the userId scope would otherwise mismatch', () => {
      expect(requirePermission(principal, APPLICATIONS_READ, { userId: otherUserId })).toBe(true);
    });
  });

  describe('no scope supplied — pure permission check', () => {
    it('returns true when the permission is in the principal’s set', () => {
      const principal = makePrincipal({ permissions: [PETS_UPDATE], rescueId });
      expect(requirePermission(principal, PETS_UPDATE)).toBe(true);
    });

    it('returns false when the permission is NOT in the principal’s set', () => {
      const principal = makePrincipal({ permissions: [APPLICATIONS_READ], rescueId });
      expect(requirePermission(principal, PETS_UPDATE)).toBe(false);
    });
  });

  describe('rescueId scope', () => {
    const principal = makePrincipal({ permissions: [PETS_UPDATE], rescueId });

    it('allows when principal.rescueId equals scope.rescueId', () => {
      expect(requirePermission(principal, PETS_UPDATE, { rescueId })).toBe(true);
    });

    it('denies when principal.rescueId differs from scope.rescueId (cross-rescue write blocked)', () => {
      expect(requirePermission(principal, PETS_UPDATE, { rescueId: otherRescueId })).toBe(false);
    });

    it('denies when the principal has no rescueId at all but a scope.rescueId is required', () => {
      const unboundPrincipal = makePrincipal({
        roles: ['moderator'],
        permissions: [PETS_UPDATE],
        rescueId: undefined,
      });
      expect(requirePermission(unboundPrincipal, PETS_UPDATE, { rescueId })).toBe(false);
    });

    it('denies when the permission is missing, even if the scope would have matched', () => {
      const noPermission = makePrincipal({ permissions: [], rescueId });
      expect(requirePermission(noPermission, PETS_UPDATE, { rescueId })).toBe(false);
    });
  });

  describe('userId scope (self-only resources)', () => {
    const adopter = makePrincipal({
      roles: ['adopter'],
      permissions: [APPLICATIONS_READ],
      rescueId: undefined,
    });

    it('allows when principal.userId equals scope.userId', () => {
      expect(requirePermission(adopter, APPLICATIONS_READ, { userId })).toBe(true);
    });

    it('denies when principal.userId differs from scope.userId (adopter reading someone else’s data)', () => {
      expect(requirePermission(adopter, APPLICATIONS_READ, { userId: otherUserId })).toBe(false);
    });
  });

  describe('both scopes supplied — logical AND', () => {
    const principal = makePrincipal({
      permissions: [APPLICATIONS_APPROVE],
      rescueId,
    });

    it('allows only when BOTH rescueId and userId match', () => {
      expect(requirePermission(principal, APPLICATIONS_APPROVE, { rescueId, userId })).toBe(true);
    });

    it('denies when rescueId matches but userId does not', () => {
      expect(
        requirePermission(principal, APPLICATIONS_APPROVE, { rescueId, userId: otherUserId })
      ).toBe(false);
    });

    it('denies when userId matches but rescueId does not', () => {
      expect(
        requirePermission(principal, APPLICATIONS_APPROVE, { rescueId: otherRescueId, userId })
      ).toBe(false);
    });
  });
});
