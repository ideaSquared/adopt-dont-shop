import { FieldPermissionsService } from '../field-permissions-service';
import { ApiService } from '@adopt-dont-shop/lib.api';

vi.mock('@adopt-dont-shop/lib.api');
const MockedApiService = ApiService as vi.MockedClass<typeof ApiService>;

describe('FieldPermissionsService', () => {
  let service: FieldPermissionsService;
  let mockApiService: vi.Mocked<ApiService>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockApiService = new MockedApiService() as vi.Mocked<ApiService>;
    service = new FieldPermissionsService({}, mockApiService);
    service.clearCache();
  });

  describe('getFieldAccess', () => {
    it('should return default access level when no overrides exist', async () => {
      mockApiService.get = vi.fn().mockResolvedValue({ data: [] });

      const result = await service.getFieldAccess('users', 'admin', 'email');

      expect(result).toEqual({
        allowed: true,
        effectiveLevel: 'write',
        source: 'default',
      });
    });

    it('should return none for sensitive fields regardless of role', async () => {
      mockApiService.get = vi.fn().mockResolvedValue({ data: [] });

      const result = await service.getFieldAccess('users', 'admin', 'password');

      expect(result).toEqual({
        allowed: false,
        effectiveLevel: 'none',
        source: 'default',
      });
    });

    it('should return override access level when override exists', async () => {
      mockApiService.get = vi.fn().mockResolvedValue({
        data: [
          {
            field_permission_id: 1,
            resource: 'users',
            field_name: 'email',
            role: 'adopter',
            access_level: 'read',
            created_at: '2024-01-01',
            updated_at: '2024-01-01',
          },
        ],
      });

      const result = await service.getFieldAccess('users', 'adopter', 'email');

      expect(result).toEqual({
        allowed: true,
        effectiveLevel: 'read',
        source: 'override',
      });
    });

    it('should deny access to hidden fields for adopters by default', async () => {
      mockApiService.get = vi.fn().mockResolvedValue({ data: [] });

      // status is an internal admin field that adopters should never see.
      const result = await service.getFieldAccess('users', 'adopter', 'status');

      expect(result).toEqual({
        allowed: false,
        effectiveLevel: 'none',
        source: 'default',
      });
    });
  });

  describe('checkFieldAccess', () => {
    beforeEach(() => {
      mockApiService.get = vi.fn().mockResolvedValue({ data: [] });
    });

    it('should allow read access when field has write level', async () => {
      const result = await service.checkFieldAccess('users', 'admin', 'email', 'read');

      expect(result).toBe(true);
    });

    it('should allow write access when field has write level', async () => {
      const result = await service.checkFieldAccess('users', 'admin', 'email', 'write');

      expect(result).toBe(true);
    });

    it('should deny write access when field is read-only', async () => {
      const result = await service.checkFieldAccess('users', 'admin', 'userId', 'write');

      expect(result).toBe(false);
    });

    it('should deny read access when field is hidden', async () => {
      // userType is internal metadata that adopters cannot see.
      const result = await service.checkFieldAccess('users', 'adopter', 'userType', 'read');

      expect(result).toBe(false);
    });

    it('should always allow none access level', async () => {
      const result = await service.checkFieldAccess('users', 'adopter', 'password', 'none');

      expect(result).toBe(true);
    });
  });

  describe('maskFields', () => {
    beforeEach(() => {
      mockApiService.get = vi.fn().mockResolvedValue({ data: [] });
    });

    it('should remove hidden fields from response for adopter', async () => {
      const userData = {
        userId: 'user-1',
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'jane@example.com',
        password: 'hashed',
        status: 'active',
        userType: 'adopter',
        lastLoginAt: '2024-01-01T00:00:00Z',
      };

      const masked = await service.maskFields(userData, {
        resource: 'users',
        role: 'adopter',
        action: 'read',
      });

      expect(masked).toHaveProperty('userId');
      expect(masked).toHaveProperty('firstName');
      expect(masked).toHaveProperty('lastName');
      // Adopters can see their own email on the profile endpoint.
      expect(masked).toHaveProperty('email');
      // Security + internal admin fields are still hidden.
      expect(masked).not.toHaveProperty('password');
      expect(masked).not.toHaveProperty('status');
      expect(masked).not.toHaveProperty('userType');
      expect(masked).not.toHaveProperty('lastLoginAt');
    });

    it('should show more fields to admin than to adopter', async () => {
      const userData = {
        userId: 'user-1',
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'jane@example.com',
        status: 'active',
        userType: 'adopter',
        password: 'hashed',
      };

      const adminMasked = await service.maskFields(userData, {
        resource: 'users',
        role: 'admin',
        action: 'read',
      });

      const adopterMasked = await service.maskFields(userData, {
        resource: 'users',
        role: 'adopter',
        action: 'read',
      });

      const adminKeys = Object.keys(adminMasked);
      const adopterKeys = Object.keys(adopterMasked);

      expect(adminKeys.length).toBeGreaterThan(adopterKeys.length);
      // Admins see user status / userType; adopters do not.
      expect(adminMasked).toHaveProperty('status');
      expect(adopterMasked).not.toHaveProperty('status');
      expect(adminMasked).toHaveProperty('userType');
      expect(adopterMasked).not.toHaveProperty('userType');
    });

    it('should never expose password to any role', async () => {
      const userData = {
        userId: 'user-1',
        email: 'test@test.com',
        password: 'secret',
        resetToken: 'token123',
        twoFactorSecret: 'secret123',
      };

      for (const role of ['admin', 'moderator', 'rescue_staff', 'adopter'] as const) {
        const masked = await service.maskFields(userData, {
          resource: 'users',
          role,
          action: 'read',
        });

        expect(masked).not.toHaveProperty('password');
        expect(masked).not.toHaveProperty('resetToken');
        expect(masked).not.toHaveProperty('twoFactorSecret');
      }
    });

    it('should filter writable fields when action is write', async () => {
      const updateData = {
        firstName: 'Updated',
        lastName: 'Name',
        email: 'new@email.com',
        userId: 'attempt-to-change-id',
      };

      const writable = await service.maskFields(updateData, {
        resource: 'users',
        role: 'admin',
        action: 'write',
      });

      expect(writable).toHaveProperty('firstName');
      expect(writable).toHaveProperty('email');
      // userId is read-only, should be filtered out
      expect(writable).not.toHaveProperty('userId');
    });
  });

  describe('maskFieldsArray', () => {
    beforeEach(() => {
      mockApiService.get = vi.fn().mockResolvedValue({ data: [] });
    });

    it('should mask fields consistently across all items', async () => {
      const users = [
        {
          userId: '1',
          firstName: 'Alice',
          email: 'alice@test.com',
          password: 'hash1',
          userType: 'adopter',
        },
        {
          userId: '2',
          firstName: 'Bob',
          email: 'bob@test.com',
          password: 'hash2',
          userType: 'adopter',
        },
      ];

      const masked = await service.maskFieldsArray(users, {
        resource: 'users',
        role: 'adopter',
        action: 'read',
      });

      expect(masked).toHaveLength(2);
      for (const item of masked) {
        expect(item).toHaveProperty('userId');
        expect(item).toHaveProperty('firstName');
        // Security + internal admin fields are hidden from adopters.
        expect(item).not.toHaveProperty('password');
        expect(item).not.toHaveProperty('userType');
      }
    });
  });

  describe('getWriteBlockedFields', () => {
    beforeEach(() => {
      mockApiService.get = vi.fn().mockResolvedValue({ data: [] });
    });

    it('should identify read-only fields in a write request', async () => {
      const blocked = await service.getWriteBlockedFields('users', 'admin', [
        'firstName',
        'userId',
        'createdAt',
      ]);

      expect(blocked).toContain('userId');
      expect(blocked).toContain('createdAt');
      expect(blocked).not.toContain('firstName');
    });

    it('should block admin-only fields from adopter writes', async () => {
      const blocked = await service.getWriteBlockedFields('users', 'adopter', [
        'firstName', // adopter can write (self-edit)
        'email', // read-only even for self
        'status', // admin-only
        'userType', // admin-only
      ]);

      // Adopters can write firstName (self-edit is enforced upstream),
      // but email/status/userType are not writable.
      expect(blocked).not.toContain('firstName');
      expect(blocked).toContain('email');
      expect(blocked).toContain('status');
      expect(blocked).toContain('userType');
    });
  });

  describe('application field permissions', () => {
    beforeEach(() => {
      mockApiService.get = vi.fn().mockResolvedValue({ data: [] });
    });

    it('should hide internal notes from adopters', async () => {
      // ApplicationController transforms DB records into the camelCase
      // FrontendApplication shape before responding — that's what
      // fieldMask('applications') actually sees. Internal assessment
      // fields (interviewNotes, homeVisitNotes, score) only exist on
      // PUT/POST request bodies; they should still be stripped if they
      // ever appear in a response.
      const application = {
        id: 'app-1',
        userId: 'user-1',
        petId: 'pet-1',
        rescueId: 'rescue-1',
        status: 'submitted',
        data: { answers: { q1: 'answer1' } },
        interviewNotes: 'Staff notes here',
        homeVisitNotes: 'Home visit notes',
        score: 85,
      };

      const masked = await service.maskFields(application, {
        resource: 'applications',
        role: 'adopter',
        action: 'read',
      });

      expect(masked).toHaveProperty('id');
      expect(masked).toHaveProperty('status');
      expect(masked).toHaveProperty('data');
      expect(masked).not.toHaveProperty('interviewNotes');
      expect(masked).not.toHaveProperty('homeVisitNotes');
      expect(masked).not.toHaveProperty('score');
    });

    it('should allow rescue staff to see and edit internal notes', async () => {
      const result = await service.getFieldAccess('applications', 'rescue_staff', 'interviewNotes');

      expect(result.effectiveLevel).toBe('write');
      expect(result.allowed).toBe(true);
    });

    it('should allow moderators to read but not write internal notes', async () => {
      const readCheck = await service.checkFieldAccess(
        'applications',
        'moderator',
        'interviewNotes',
        'read'
      );
      const writeCheck = await service.checkFieldAccess(
        'applications',
        'moderator',
        'interviewNotes',
        'write'
      );

      expect(readCheck).toBe(true);
      expect(writeCheck).toBe(false);
    });
  });

  describe('pet field permissions', () => {
    beforeEach(() => {
      mockApiService.get = vi.fn().mockResolvedValue({ data: [] });
    });

    it('should hide medical history from adopters', async () => {
      // Pet model serializes to camelCase
      const pet = {
        petId: 'pet-1',
        name: 'Buddy',
        type: 'dog',
        breed: 'Labrador',
        medicalNotes: 'Vaccinated, neutered',
        microchipId: 'CHIP123',
        behavioralNotes: 'Needs experienced owner',
      };

      const masked = await service.maskFields(pet, {
        resource: 'pets',
        role: 'adopter',
        action: 'read',
      });

      expect(masked).toHaveProperty('name');
      expect(masked).toHaveProperty('type');
      expect(masked).toHaveProperty('breed');
      expect(masked).not.toHaveProperty('medicalNotes');
      expect(masked).not.toHaveProperty('microchipId');
      expect(masked).not.toHaveProperty('behavioralNotes');
    });

    it('should allow rescue staff full write access to pet fields', async () => {
      const blocked = await service.getWriteBlockedFields('pets', 'rescue_staff', [
        'name',
        'shortDescription',
        'medicalNotes',
        'behavioralNotes',
      ]);

      expect(blocked).toEqual([]);
    });
  });

  describe('caching', () => {
    it('should cache override lookups', async () => {
      mockApiService.get = vi.fn().mockResolvedValue({ data: [] });

      await service.getFieldAccess('users', 'admin', 'email');
      await service.getFieldAccess('users', 'admin', 'firstName');

      // Should only make one API call since both are for the same resource+role
      expect(mockApiService.get).toHaveBeenCalledTimes(1);
    });

    it('should clear cache when requested', async () => {
      mockApiService.get = vi.fn().mockResolvedValue({ data: [] });

      await service.getFieldAccess('users', 'admin', 'email');
      service.clearCache();
      await service.getFieldAccess('users', 'admin', 'email');

      expect(mockApiService.get).toHaveBeenCalledTimes(2);
    });
  });

  describe('updateFieldPermission', () => {
    it('should post the update and clear cache', async () => {
      mockApiService.post = vi.fn().mockResolvedValue({ success: true });

      const result = await service.updateFieldPermission({
        resource: 'users',
        field_name: 'email',
        role: 'adopter',
        access_level: 'read',
        updatedBy: 'admin-1',
      });

      expect(result).toBe(true);
      expect(mockApiService.post).toHaveBeenCalledWith('/api/v1/field-permissions', {
        resource: 'users',
        field_name: 'email',
        role: 'adopter',
        access_level: 'read',
        updatedBy: 'admin-1',
      });
    });
  });

  describe('deleteFieldPermission', () => {
    it('should delete the override and clear cache', async () => {
      mockApiService.delete = vi.fn().mockResolvedValue({ success: true });

      const result = await service.deleteFieldPermission('users', 'adopter', 'email');

      expect(result).toBe(true);
      expect(mockApiService.delete).toHaveBeenCalledWith(
        '/api/v1/field-permissions/users/adopter/email'
      );
    });
  });
});
