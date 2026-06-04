import { AbilityBuilder, createMongoAbility, subject } from '@casl/ability';
import { describe, expect, it } from 'vitest';

import type { AppAbility } from './abilities.js';
import { requireAbility } from './require-ability.js';

// Build a tiny ability with a tier-conditioned rule so we can reproduce the
// CAD-#10 bare-string-vs-tagged-subject mismatch. The CAD repo wrote the
// test up against an `Incident` subject; we use `Pet` + `rescueId` here
// because that's the shape of every scoped rule in adopt-dont-shop.
function buildScopedAbility(): AppAbility {
  const { can, build } = new AbilityBuilder<AppAbility>(createMongoAbility);
  can('read', 'Pet', { rescueId: 'res-1' });
  return build();
}

describe('requireAbility', () => {
  describe('CAD-#10 bare-string vs tagged-subject semantics', () => {
    const ability = buildScopedAbility();

    it('returns TRUE for a bare-string subject because any rule on the type passes (CASL semantics)', () => {
      // Direct call shows the underlying CASL behaviour we're working with.
      expect(ability.can('read', 'Pet')).toBe(true);
    });

    it('returns FALSE for a tagged subject with empty conditions (the bug CAD-#10 fixed)', () => {
      // This is the trap: the helper used to always tag the subject, which
      // made unscoped reads 403 for users whose rules required matching
      // conditions. We assert the underlying CASL behaviour first.
      expect(ability.can('read', subject('Pet', {}))).toBe(false);
    });

    it('passes the bare string when scope has no conditions (helper fix)', () => {
      expect(requireAbility(ability, 'read', { kind: 'Pet' })).toBe(true);
    });

    it('passes a tagged subject when scope has at least one condition', () => {
      expect(requireAbility(ability, 'read', { kind: 'Pet', rescueId: 'res-1' })).toBe(true);
      expect(requireAbility(ability, 'read', { kind: 'Pet', rescueId: 'res-2' })).toBe(false);
    });

    it('accepts a bare subject string directly (shorthand for unscoped checks)', () => {
      expect(requireAbility(ability, 'read', 'Pet')).toBe(true);
    });
  });

  describe('integration with action verbs', () => {
    it('returns false for an action the ability does not grant', () => {
      const ability = buildScopedAbility();
      expect(requireAbility(ability, 'delete', { kind: 'Pet', rescueId: 'res-1' })).toBe(false);
    });
  });
});
