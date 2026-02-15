import {
  defaultFieldPermissions,
  getDefaultFieldAccess,
  getFieldAccessMap,
} from '../field-permission-defaults';

describe('Field Permission Defaults', () => {
  describe('defaultFieldPermissions structure', () => {
    it('should define permissions for all four resources', () => {
      expect(defaultFieldPermissions).toHaveProperty('users');
      expect(defaultFieldPermissions).toHaveProperty('pets');
      expect(defaultFieldPermissions).toHaveProperty('applications');
      expect(defaultFieldPermissions).toHaveProperty('rescues');
    });

    it('should define permissions for all four roles per resource', () => {
      const roles = ['admin', 'moderator', 'rescue_staff', 'adopter'] as const;

      for (const resource of Object.keys(defaultFieldPermissions) as Array<
        keyof typeof defaultFieldPermissions
      >) {
        for (const role of roles) {
          expect(defaultFieldPermissions[resource]).toHaveProperty(role);
        }
      }
    });
  });

  describe('security: sensitive user fields are always hidden', () => {
    const sensitiveFields = [
      'password',
      'resetToken',
      'verificationToken',
      'twoFactorSecret',
      'backupCodes',
    ];

    const roles = ['admin', 'moderator', 'rescue_staff', 'adopter'] as const;

    for (const role of roles) {
      for (const field of sensitiveFields) {
        it(`should hide ${field} from ${role}`, () => {
          const level = getDefaultFieldAccess('users', role, field);
          expect(level).toBe('none');
        });
      }
    }
  });

  describe('role hierarchy: admin has broadest access', () => {
    it('should give admin more accessible user fields than adopter', () => {
      const adminMap = getFieldAccessMap('users', 'admin');
      const adopterMap = getFieldAccessMap('users', 'adopter');

      const adminAccessible = Object.values(adminMap).filter((v) => v !== 'none').length;
      const adopterAccessible = Object.values(adopterMap).filter((v) => v !== 'none').length;

      expect(adminAccessible).toBeGreaterThan(adopterAccessible);
    });

    it('should give admin more accessible application fields than adopter', () => {
      const adminMap = getFieldAccessMap('applications', 'admin');
      const adopterMap = getFieldAccessMap('applications', 'adopter');

      const adminAccessible = Object.values(adminMap).filter((v) => v !== 'none').length;
      const adopterAccessible = Object.values(adopterMap).filter((v) => v !== 'none').length;

      expect(adminAccessible).toBeGreaterThan(adopterAccessible);
    });
  });

  describe('adopter restrictions', () => {
    it('should not allow adopters to see other users email addresses', () => {
      const level = getDefaultFieldAccess('users', 'adopter', 'email');
      expect(level).toBe('none');
    });

    it('should not allow adopters to see phone numbers', () => {
      const level = getDefaultFieldAccess('users', 'adopter', 'phoneNumber');
      expect(level).toBe('none');
    });

    it('should not allow adopters to see application interview notes', () => {
      const level = getDefaultFieldAccess('applications', 'adopter', 'interviewNotes');
      expect(level).toBe('none');
    });

    it('should not allow adopters to see application scores', () => {
      const level = getDefaultFieldAccess('applications', 'adopter', 'score');
      expect(level).toBe('none');
    });

    it('should not allow adopters to see pet medical history', () => {
      const level = getDefaultFieldAccess('pets', 'adopter', 'medicalHistory');
      expect(level).toBe('none');
    });

    it('should allow adopters to read basic pet info', () => {
      expect(getDefaultFieldAccess('pets', 'adopter', 'name')).toBe('read');
      expect(getDefaultFieldAccess('pets', 'adopter', 'type')).toBe('read');
      expect(getDefaultFieldAccess('pets', 'adopter', 'breed')).toBe('read');
      expect(getDefaultFieldAccess('pets', 'adopter', 'description')).toBe('read');
    });

    it('should allow adopters to read their own application status', () => {
      expect(getDefaultFieldAccess('applications', 'adopter', 'status')).toBe('read');
    });
  });

  describe('rescue staff access', () => {
    it('should allow rescue staff to write application internal notes', () => {
      expect(getDefaultFieldAccess('applications', 'rescue_staff', 'interviewNotes')).toBe('write');
      expect(getDefaultFieldAccess('applications', 'rescue_staff', 'homeVisitNotes')).toBe('write');
      expect(getDefaultFieldAccess('applications', 'rescue_staff', 'score')).toBe('write');
    });

    it('should allow rescue staff to write pet details', () => {
      expect(getDefaultFieldAccess('pets', 'rescue_staff', 'name')).toBe('write');
      expect(getDefaultFieldAccess('pets', 'rescue_staff', 'medicalHistory')).toBe('write');
      expect(getDefaultFieldAccess('pets', 'rescue_staff', 'internalNotes')).toBe('write');
    });

    it('should not allow rescue staff to see user status or type', () => {
      expect(getDefaultFieldAccess('users', 'rescue_staff', 'status')).toBe('none');
      expect(getDefaultFieldAccess('users', 'rescue_staff', 'userType')).toBe('none');
    });
  });

  describe('moderator access', () => {
    it('should allow moderators to read user email but not phone', () => {
      expect(getDefaultFieldAccess('users', 'moderator', 'email')).toBe('read');
      expect(getDefaultFieldAccess('users', 'moderator', 'phoneNumber')).toBe('none');
    });

    it('should not allow moderators to write application fields', () => {
      const moderatorMap = getFieldAccessMap('applications', 'moderator');
      const writableFields = Object.entries(moderatorMap).filter(([, level]) => level === 'write');

      expect(writableFields).toHaveLength(0);
    });
  });

  describe('getDefaultFieldAccess', () => {
    it('should return none for unknown fields', () => {
      const level = getDefaultFieldAccess('users', 'admin', 'nonExistentField');
      expect(level).toBe('none');
    });

    it('should return none for unknown resources', () => {
      const level = getDefaultFieldAccess(
        'unknown' as keyof typeof defaultFieldPermissions,
        'admin',
        'email'
      );
      expect(level).toBe('none');
    });
  });

  describe('getFieldAccessMap', () => {
    it('should return a copy of the access map', () => {
      const map1 = getFieldAccessMap('users', 'admin');
      const map2 = getFieldAccessMap('users', 'admin');

      expect(map1).toEqual(map2);
      expect(map1).not.toBe(map2); // Different references
    });

    it('should return empty object for unknown resource', () => {
      const map = getFieldAccessMap('unknown' as keyof typeof defaultFieldPermissions, 'admin');
      expect(map).toEqual({});
    });
  });
});
