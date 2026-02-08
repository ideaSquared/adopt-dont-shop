import { FieldPermissionsService } from '../field-permissions-service';
import { ApiService } from '@adopt-dont-shop/lib.api';

jest.mock('@adopt-dont-shop/lib.api');
const MockedApiService = ApiService as jest.MockedClass<typeof ApiService>;

describe('FieldPermissionsService', () => {
  let service: FieldPermissionsService;
  let mockApiService: jest.Mocked<ApiService>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockApiService = new MockedApiService() as jest.Mocked<ApiService>;
    service = new FieldPermissionsService({}, mockApiService);
    service.clearCache();
  });

  describe('getFieldAccess', () => {
    it('should return default access level when no overrides exist', async () => {
      mockApiService.get = jest.fn().mockResolvedValue({ data: [] });

      const result = await service.getFieldAccess('users', 'admin', 'email');

      expect(result).toEqual({
        allowed: true,
        effectiveLevel: 'write',
        source: 'default',
      });
    });

    it('should return none for sensitive fields regardless of role', async () => {
      mockApiService.get = jest.fn().mockResolvedValue({ data: [] });

      const result = await service.getFieldAccess('users', 'admin', 'password');

      expect(result).toEqual({
        allowed: false,
        effectiveLevel: 'none',
        source: 'default',
      });
    });

    it('should return override access level when override exists', async () => {
      mockApiService.get = jest.fn().mockResolvedValue({
        data: [
          {
            fieldPermissionId: '1',
            resource: 'users',
            fieldName: 'email',
            role: 'adopter',
            accessLevel: 'read',
            createdAt: '2024-01-01',
            updatedAt: '2024-01-01',
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
      mockApiService.get = jest.fn().mockResolvedValue({ data: [] });

      const result = await service.getFieldAccess('users', 'adopter', 'email');

      expect(result).toEqual({
        allowed: false,
        effectiveLevel: 'none',
        source: 'default',
      });
    });
  });

  describe('checkFieldAccess', () => {
    beforeEach(() => {
      mockApiService.get = jest.fn().mockResolvedValue({ data: [] });
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
      const result = await service.checkFieldAccess('users', 'adopter', 'email', 'read');

      expect(result).toBe(false);
    });

    it('should always allow none access level', async () => {
      const result = await service.checkFieldAccess('users', 'adopter', 'password', 'none');

      expect(result).toBe(true);
    });
  });

  describe('maskFields', () => {
    beforeEach(() => {
      mockApiService.get = jest.fn().mockResolvedValue({ data: [] });
    });

    it('should remove hidden fields from response for adopter', async () => {
      const userData = {
        userId: 'user-1',
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'jane@example.com',
        password: 'hashed',
        status: 'active',
      };

      const masked = await service.maskFields(userData, {
        resource: 'users',
        role: 'adopter',
        action: 'read',
      });

      expect(masked).toHaveProperty('userId');
      expect(masked).toHaveProperty('firstName');
      expect(masked).toHaveProperty('lastName');
      expect(masked).not.toHaveProperty('email');
      expect(masked).not.toHaveProperty('password');
      expect(masked).not.toHaveProperty('status');
    });

    it('should show more fields to admin than to adopter', async () => {
      const userData = {
        userId: 'user-1',
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'jane@example.com',
        status: 'active',
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
      expect(adminMasked).toHaveProperty('email');
      expect(adopterMasked).not.toHaveProperty('email');
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
      mockApiService.get = jest.fn().mockResolvedValue({ data: [] });
    });

    it('should mask fields consistently across all items', async () => {
      const users = [
        { userId: '1', firstName: 'Alice', email: 'alice@test.com', password: 'hash1' },
        { userId: '2', firstName: 'Bob', email: 'bob@test.com', password: 'hash2' },
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
        expect(item).not.toHaveProperty('email');
        expect(item).not.toHaveProperty('password');
      }
    });
  });

  describe('getWriteBlockedFields', () => {
    beforeEach(() => {
      mockApiService.get = jest.fn().mockResolvedValue({ data: [] });
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

    it('should block all fields for adopter on user resource', async () => {
      const blocked = await service.getWriteBlockedFields('users', 'adopter', [
        'firstName',
        'email',
        'status',
      ]);

      // Adopters have no write access to other users' fields
      expect(blocked.length).toBeGreaterThan(0);
    });
  });

  describe('application field permissions', () => {
    beforeEach(() => {
      mockApiService.get = jest.fn().mockResolvedValue({ data: [] });
    });

    it('should hide internal notes from adopters', async () => {
      const application = {
        applicationId: 'app-1',
        userId: 'user-1',
        status: 'submitted',
        answers: { q1: 'answer1' },
        interviewNotes: 'Staff notes here',
        homeVisitNotes: 'Home visit notes',
        score: 85,
      };

      const masked = await service.maskFields(application, {
        resource: 'applications',
        role: 'adopter',
        action: 'read',
      });

      expect(masked).toHaveProperty('applicationId');
      expect(masked).toHaveProperty('status');
      expect(masked).toHaveProperty('answers');
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
      mockApiService.get = jest.fn().mockResolvedValue({ data: [] });
    });

    it('should hide medical history from adopters', async () => {
      const pet = {
        petId: 'pet-1',
        name: 'Buddy',
        type: 'dog',
        breed: 'Labrador',
        medicalHistory: 'Vaccinated, neutered',
        microchipId: 'CHIP123',
        internalNotes: 'Needs experienced owner',
      };

      const masked = await service.maskFields(pet, {
        resource: 'pets',
        role: 'adopter',
        action: 'read',
      });

      expect(masked).toHaveProperty('name');
      expect(masked).toHaveProperty('type');
      expect(masked).toHaveProperty('breed');
      expect(masked).not.toHaveProperty('medicalHistory');
      expect(masked).not.toHaveProperty('microchipId');
      expect(masked).not.toHaveProperty('internalNotes');
    });

    it('should allow rescue staff full write access to pet fields', async () => {
      const blocked = await service.getWriteBlockedFields('pets', 'rescue_staff', [
        'name',
        'description',
        'medicalHistory',
        'internalNotes',
      ]);

      expect(blocked).toEqual([]);
    });
  });

  describe('caching', () => {
    it('should cache override lookups', async () => {
      mockApiService.get = jest.fn().mockResolvedValue({ data: [] });

      await service.getFieldAccess('users', 'admin', 'email');
      await service.getFieldAccess('users', 'admin', 'firstName');

      // Should only make one API call since both are for the same resource+role
      expect(mockApiService.get).toHaveBeenCalledTimes(1);
    });

    it('should clear cache when requested', async () => {
      mockApiService.get = jest.fn().mockResolvedValue({ data: [] });

      await service.getFieldAccess('users', 'admin', 'email');
      service.clearCache();
      await service.getFieldAccess('users', 'admin', 'email');

      expect(mockApiService.get).toHaveBeenCalledTimes(2);
    });
  });

  describe('updateFieldPermission', () => {
    it('should post the update and clear cache', async () => {
      mockApiService.post = jest.fn().mockResolvedValue({ success: true });

      const result = await service.updateFieldPermission({
        resource: 'users',
        fieldName: 'email',
        role: 'adopter',
        accessLevel: 'read',
        updatedBy: 'admin-1',
      });

      expect(result).toBe(true);
      expect(mockApiService.post).toHaveBeenCalledWith('/api/v1/field-permissions', {
        resource: 'users',
        fieldName: 'email',
        role: 'adopter',
        accessLevel: 'read',
        updatedBy: 'admin-1',
      });
    });
  });

  describe('deleteFieldPermission', () => {
    it('should delete the override and clear cache', async () => {
      mockApiService.delete = jest.fn().mockResolvedValue({ success: true });

      const result = await service.deleteFieldPermission('users', 'adopter', 'email');

      expect(result).toBe(true);
      expect(mockApiService.delete).toHaveBeenCalledWith(
        '/api/v1/field-permissions/users/adopter/email'
      );
    });
  });
});
