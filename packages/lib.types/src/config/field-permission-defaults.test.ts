import {
  defaultFieldPermissions,
  enforceSensitiveDenylist,
  getDefaultFieldAccess,
  getFieldAccessMap,
  isSensitiveField,
  SENSITIVE_FIELD_DENYLIST,
} from './field-permission-defaults';

describe('field-permission defaults', () => {
  describe('isSensitiveField', () => {
    it('returns true for known user secrets', () => {
      for (const f of SENSITIVE_FIELD_DENYLIST.users) {
        expect(isSensitiveField('users', f)).toBe(true);
      }
    });

    it('returns false for non-sensitive user fields', () => {
      expect(isSensitiveField('users', 'firstName')).toBe(false);
      expect(isSensitiveField('users', 'email')).toBe(false);
    });

    it('returns false for resources with no denylist entries', () => {
      expect(isSensitiveField('pets', 'name')).toBe(false);
      expect(isSensitiveField('applications', 'status')).toBe(false);
      expect(isSensitiveField('rescues', 'name')).toBe(false);
    });
  });

  describe('getDefaultFieldAccess', () => {
    it('forces sensitive fields to none for every role', () => {
      const roles = ['admin', 'moderator', 'rescue_staff', 'adopter', 'super_admin'] as const;
      for (const role of roles) {
        for (const field of SENSITIVE_FIELD_DENYLIST.users) {
          expect(getDefaultFieldAccess('users', role, field)).toBe('none');
        }
      }
    });

    it('returns the configured access level for non-sensitive fields', () => {
      expect(getDefaultFieldAccess('users', 'admin', 'firstName')).toBe('write');
      expect(getDefaultFieldAccess('users', 'adopter', 'firstName')).toBe('write');
      expect(getDefaultFieldAccess('users', 'rescue_staff', 'firstName')).toBe('read');
    });

    it("returns 'none' for fields not configured for the role", () => {
      expect(getDefaultFieldAccess('users', 'adopter', 'nonexistentField')).toBe('none');
    });
  });

  describe('getFieldAccessMap', () => {
    it('produces a frozen-shape map with sensitive fields forced to none', () => {
      const map = getFieldAccessMap('users', 'admin');
      expect(map.firstName).toBe('write');
      expect(map.password).toBe('none');
      // mutating the returned map must not affect the source defaults
      map.firstName = 'none';
      expect(getDefaultFieldAccess('users', 'admin', 'firstName')).toBe('write');
    });

    it('returns an empty map for an unknown resource', () => {
      // @ts-expect-error — verifying defensive behaviour with bad input
      expect(getFieldAccessMap('pets-typo', 'admin')).toEqual({});
    });
  });

  describe('enforceSensitiveDenylist', () => {
    it('forces every denylisted field on the input map to none', () => {
      const input = { password: 'write' as const, firstName: 'write' as const };
      const result = enforceSensitiveDenylist('users', input);
      expect(result.password).toBe('none');
      expect(result.firstName).toBe('write');
    });

    it('returns the input unchanged for resources with no denylist', () => {
      const input = { name: 'write' as const };
      expect(enforceSensitiveDenylist('pets', input)).toBe(input);
    });
  });

  describe('shape invariants', () => {
    it('configures every supported role for every resource', () => {
      const resources = ['users', 'applications', 'pets', 'rescues'] as const;
      const roles = ['admin', 'moderator', 'rescue_staff', 'adopter', 'super_admin'] as const;
      for (const r of resources) {
        for (const role of roles) {
          expect(defaultFieldPermissions[r][role]).toBeDefined();
        }
      }
    });

    it('exports a denylist for every resource keyed by FieldPermissionConfig', () => {
      expect(Object.keys(SENSITIVE_FIELD_DENYLIST).sort()).toEqual([
        'applications',
        'pets',
        'rescues',
        'users',
      ]);
    });
  });
});
