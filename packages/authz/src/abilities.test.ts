import { subject } from '@casl/ability';
import { describe, expect, it } from 'vitest';

import type { RescueId, UserId } from '@adopt-dont-shop/lib.types';

import { defineAbilitiesFor, type Principal } from './abilities.js';

const userId = 'usr-1' as UserId;
const otherUserId = 'usr-2' as UserId;
const rescueId = 'res-1' as RescueId;
const otherRescueId = 'res-2' as RescueId;

function principal(overrides: Partial<Principal> & Pick<Principal, 'userType'>): Principal {
  return { userId, ...overrides };
}

describe('defineAbilitiesFor', () => {
  describe('super_admin', () => {
    const ability = defineAbilitiesFor(principal({ userType: 'super_admin' }));

    it('can manage every subject', () => {
      expect(ability.can('manage', 'all')).toBe(true);
      expect(ability.can('delete', 'User')).toBe(true);
      expect(ability.can('suspend', 'User')).toBe(true);
      expect(ability.can('moderate', 'Report')).toBe(true);
    });
  });

  describe('admin (rescue admin)', () => {
    const ability = defineAbilitiesFor(principal({ userType: 'admin', rescueId }));

    it('can manage all entities scoped to their own rescue', () => {
      expect(ability.can('manage', 'Pet')).toBe(true);
      expect(ability.can('manage', 'Application')).toBe(true);
      expect(ability.can('manage', 'StaffMember')).toBe(true);
    });

    it('cannot manage another rescue’s entities (scope mismatch)', () => {
      // Tagged subject with wrong rescueId fails the condition.
      expect(ability.can('delete', subject('Pet', { rescueId: otherRescueId }))).toBe(false);
      expect(ability.can('update', subject('Application', { rescueId: otherRescueId }))).toBe(
        false
      );
    });

    it('falls back to no rescue-scoped abilities when rescueId is missing', () => {
      const noScope = defineAbilitiesFor(principal({ userType: 'admin' }));
      expect(noScope.can('manage', 'Pet')).toBe(false);
      expect(noScope.can('manage', 'Application')).toBe(false);
    });
  });

  describe('rescue_staff', () => {
    const ability = defineAbilitiesFor(principal({ userType: 'rescue_staff', rescueId }));

    it('can review and approve applications for their own rescue', () => {
      expect(ability.can('review', 'Application')).toBe(true);
      expect(ability.can('approve', 'Application')).toBe(true);
      expect(ability.can('reject', 'Application')).toBe(true);
    });

    it('cannot manage staff or rescue settings (admin owns those)', () => {
      expect(ability.can('delete', subject('StaffMember', { rescueId }))).toBe(false);
      expect(ability.can('update', subject('Rescue', { rescueId }))).toBe(false);
    });
  });

  describe('moderator', () => {
    const ability = defineAbilitiesFor(principal({ userType: 'moderator' }));

    it('can review and moderate reports across all rescues', () => {
      expect(ability.can('moderate', 'Report')).toBe(true);
      expect(ability.can('review', 'Report')).toBe(true);
      expect(ability.can('moderate', 'Message')).toBe(true);
    });

    it('can suspend a User but not delete or update them via generic update', () => {
      expect(ability.can('suspend', 'User')).toBe(true);
      expect(ability.can('delete', 'User')).toBe(false);
      expect(ability.can('update', 'User')).toBe(false);
    });
  });

  describe('support_agent', () => {
    const ability = defineAbilitiesFor(principal({ userType: 'support_agent' }));

    it('can read and update support tickets but not moderate content', () => {
      expect(ability.can('update', 'SupportTicket')).toBe(true);
      expect(ability.can('read', 'User')).toBe(true);
      expect(ability.can('moderate', 'Report')).toBe(false);
      expect(ability.can('suspend', 'User')).toBe(false);
    });
  });

  describe('adopter', () => {
    const ability = defineAbilitiesFor(principal({ userType: 'adopter' }));

    it('can read and list public pets without scope', () => {
      expect(ability.can('read', 'Pet')).toBe(true);
      expect(ability.can('list', 'Pet')).toBe(true);
    });

    it('cannot mutate pets at all', () => {
      expect(ability.can('update', 'Pet')).toBe(false);
      expect(ability.can('delete', 'Pet')).toBe(false);
    });

    it('can read and update their OWN user record but not others’', () => {
      expect(ability.can('update', subject('User', { userId }))).toBe(true);
      expect(ability.can('update', subject('User', { userId: otherUserId }))).toBe(false);
    });

    it('can create and read their OWN applications but not others’', () => {
      expect(ability.can('create', subject('Application', { adopterId: userId }))).toBe(true);
      expect(ability.can('read', subject('Application', { adopterId: userId }))).toBe(true);
      expect(ability.can('read', subject('Application', { adopterId: otherUserId }))).toBe(false);
    });

    it('cannot review or approve any application', () => {
      const ownApp = subject('Application', { adopterId: userId });
      expect(ability.can('review', ownApp)).toBe(false);
      expect(ability.can('approve', ownApp)).toBe(false);
    });
  });
});
