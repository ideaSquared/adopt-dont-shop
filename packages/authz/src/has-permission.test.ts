import { describe, expect, it } from 'vitest';

import type { Permission, RescueId, UserId } from '@adopt-dont-shop/lib.types';

import { hasPermission } from './has-permission.js';
import type { Principal } from './principal.js';

const userId = 'usr-1' as UserId;
const rescueId = 'res-1' as RescueId;

function makePrincipal(overrides: Partial<Principal> = {}): Principal {
  return {
    userId,
    roles: ['rescue_staff'],
    permissions: [],
    ...overrides,
  };
}

describe('hasPermission', () => {
  it('returns true when the permission is in the principal’s permissions array', () => {
    const principal = makePrincipal({ permissions: ['pets.update' as Permission] });
    expect(hasPermission(principal, 'pets.update' as Permission)).toBe(true);
  });

  it('returns false when the permission is NOT in the array', () => {
    const principal = makePrincipal({ permissions: ['pets.read' as Permission] });
    expect(hasPermission(principal, 'pets.update' as Permission)).toBe(false);
  });

  it('returns true for ANY permission when the principal has the super_admin role (short-circuit)', () => {
    const principal = makePrincipal({ roles: ['super_admin'], permissions: [] });
    expect(hasPermission(principal, 'pets.update' as Permission)).toBe(true);
    expect(hasPermission(principal, 'admin.audit_logs' as Permission)).toBe(true);
    expect(hasPermission(principal, 'moderation.users.suspend' as Permission)).toBe(true);
  });

  it('does NOT short-circuit on other admin-flavoured roles (admin / moderator are NOT platform superusers)', () => {
    const adminWithoutPermission = makePrincipal({
      roles: ['admin'],
      permissions: ['pets.read' as Permission],
      rescueId,
    });
    expect(hasPermission(adminWithoutPermission, 'admin.audit_logs' as Permission)).toBe(false);

    const moderatorWithoutPermission = makePrincipal({
      roles: ['moderator'],
      permissions: ['moderation.reports.review' as Permission],
    });
    expect(hasPermission(moderatorWithoutPermission, 'admin.system_settings' as Permission)).toBe(
      false
    );
  });

  it('returns false when the principal has no permissions at all', () => {
    const principal = makePrincipal({ permissions: [] });
    expect(hasPermission(principal, 'pets.read' as Permission)).toBe(false);
  });
});
