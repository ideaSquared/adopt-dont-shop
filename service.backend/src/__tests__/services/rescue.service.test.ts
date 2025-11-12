import { vi, beforeEach, afterEach, describe, it, expect } from 'vitest';
import sequelize from '../../sequelize';
import { Rescue, StaffMember, User, Pet, Application } from '../../models';
import { UserType, UserStatus } from '../../models/User';
import { PetStatus } from '../../models/Pet';
import { RescueService } from '../../services/rescue.service';

// Mock only external services
vi.mock('../../services/auditLog.service', () => ({
  AuditLogService: {
    log: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../../utils/logger', () => ({
  __esModule: true,
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
  loggerHelpers: {
    logBusiness: vi.fn(),
    logDatabase: vi.fn(),
    logPerformance: vi.fn(),
    logExternalService: vi.fn(),
  },
}));

describe('RescueService - Behavioral Testing', () => {
  beforeEach(async () => {
    await sequelize.sync({ force: true });

    // Create admin user for operations
    await User.create({
      userId: 'admin-123',
      email: 'admin@test.com',
      password: 'hashedpassword',
      firstName: 'Admin',
      lastName: 'User',
      userType: UserType.ADMIN,
      status: UserStatus.ACTIVE,
      emailVerified: true,
    });

    // Create test user for staff operations
    await User.create({
      userId: 'user-123',
      email: 'user@test.com',
      password: 'hashedpassword',
      firstName: 'Test',
      lastName: 'User',
      userType: UserType.RESCUE_STAFF,
      status: UserStatus.ACTIVE,
      emailVerified: true,
    });

    vi.clearAllMocks();
  });

  afterEach(async () => {
    await Application.destroy({ where: {}, truncate: true, cascade: true });
    await Pet.destroy({ where: {}, truncate: true, cascade: true });
    await StaffMember.destroy({ where: {}, truncate: true, cascade: true });
    await Rescue.destroy({ where: {}, truncate: true, cascade: true });
    await User.destroy({ where: {}, truncate: true, cascade: true });
  });

  describe('searchRescues', () => {
    it('should search rescues with default options', async () => {
      await Rescue.create({
        name: 'Happy Paws Rescue',
        email: 'happy@rescue.org',
        phone: '555-0123',
        address: '123 Main St',
        city: 'London',
        county: 'Greater London',
        postcode: 'SW1A 1AA',
        country: 'UK',
        contactPerson: 'Jane Smith',
        status: 'pending',
      });

      const result = await RescueService.searchRescues();

      expect(result.rescues).toHaveLength(1);
      expect(result.rescues[0].name).toBe('Happy Paws Rescue');
      expect(result.pagination.total).toBe(1);
    });

    it.skip('should search rescues with text search', async () => {
      // Skip: Uses Op.iLike which is PostgreSQL-specific, not supported in SQLite
      await Rescue.create({
        name: 'Happy Paws Rescue',
        email: 'happy@rescue.org',
        phone: '555-0123',
        address: '123 Main St',
        city: 'London',
        postcode: 'SW1A 1AA',
        country: 'UK',
        contactPerson: 'Jane Smith',
        status: 'verified',
      });

      await Rescue.create({
        name: 'Safe Haven Animal Shelter',
        email: 'haven@rescue.org',
        phone: '555-0124',
        address: '456 Oak Ave',
        city: 'Manchester',
        postcode: 'M1 1AA',
        country: 'UK',
        contactPerson: 'John Doe',
        status: 'verified',
      });

      const result = await RescueService.searchRescues({ search: 'Happy' });

      expect(result.rescues).toHaveLength(1);
      expect(result.rescues[0].name).toBe('Happy Paws Rescue');
    });

    it('should filter rescues by status', async () => {
      await Rescue.create({
        name: 'Verified Rescue',
        email: 'verified@rescue.org',
        phone: '555-0123',
        address: '123 Main St',
        city: 'London',
        postcode: 'SW1A 1AA',
        country: 'UK',
        contactPerson: 'Jane Smith',
        status: 'verified',
      });

      await Rescue.create({
        name: 'Pending Rescue',
        email: 'pending@rescue.org',
        phone: '555-0124',
        address: '456 Oak Ave',
        city: 'London',
        postcode: 'SW1A 1AB',
        country: 'UK',
        contactPerson: 'John Doe',
        status: 'pending',
      });

      const result = await RescueService.searchRescues({ status: 'verified' });

      expect(result.rescues).toHaveLength(1);
      expect(result.rescues[0].status).toBe('verified');
    });

    it.skip('should filter rescues by location', async () => {
      // Skip: Uses Op.iLike which is PostgreSQL-specific, not supported in SQLite
      await Rescue.create({
        name: 'London Rescue',
        email: 'london@rescue.org',
        phone: '555-0123',
        address: '123 Main St',
        city: 'London',
        postcode: 'SW1A 1AA',
        country: 'UK',
        contactPerson: 'Jane Smith',
        status: 'verified',
      });

      await Rescue.create({
        name: 'Manchester Rescue',
        email: 'manchester@rescue.org',
        phone: '555-0124',
        address: '456 Oak Ave',
        city: 'Manchester',
        postcode: 'M1 1AA',
        country: 'UK',
        contactPerson: 'John Doe',
        status: 'verified',
      });

      const result = await RescueService.searchRescues({ location: 'London' });

      expect(result.rescues).toHaveLength(1);
      expect(result.rescues[0].city).toBe('London');
    });

    it('should sort rescues by name', async () => {
      await Rescue.create({
        name: 'Zebra Animal Rescue',
        email: 'zebra@rescue.org',
        phone: '555-0123',
        address: '123 Main St',
        city: 'London',
        postcode: 'SW1A 1AA',
        country: 'UK',
        contactPerson: 'Jane Smith',
        status: 'verified',
      });

      await Rescue.create({
        name: 'Alpha Pet Shelter',
        email: 'alpha@rescue.org',
        phone: '555-0124',
        address: '456 Oak Ave',
        city: 'London',
        postcode: 'SW1A 1AB',
        country: 'UK',
        contactPerson: 'John Doe',
        status: 'verified',
      });

      const result = await RescueService.searchRescues({ sortBy: 'name', sortOrder: 'ASC' });

      expect(result.rescues[0].name).toBe('Alpha Pet Shelter');
      expect(result.rescues[1].name).toBe('Zebra Animal Rescue');
    });

    it('should handle database errors', async () => {
      // Force a database error by passing invalid parameters
      await expect(RescueService.searchRescues({ page: -1, limit: 0 })).rejects.toThrow();
    });
  });

  describe('getRescueById', () => {
    it('should get rescue without statistics', async () => {
      const rescue = await Rescue.create({
        name: 'Test Rescue',
        email: 'test@rescue.org',
        phone: '555-0123',
        address: '123 Main St',
        city: 'London',
        postcode: 'SW1A 1AA',
        country: 'UK',
        contactPerson: 'Jane Smith',
        status: 'verified',
      });

      const result = await RescueService.getRescueById(rescue.rescueId);

      expect(result.name).toBe('Test Rescue');
      expect(result.email).toBe('test@rescue.org');
    });

    it('should get rescue with statistics when requested', async () => {
      const rescue = await Rescue.create({
        name: 'Test Rescue',
        email: 'test@rescue.org',
        phone: '555-0123',
        address: '123 Main St',
        city: 'London',
        postcode: 'SW1A 1AA',
        country: 'UK',
        contactPerson: 'Jane Smith',
        status: 'verified',
      });

      // Create some pets for statistics
      await Pet.create({
        rescue_id: rescue.rescueId,
        name: 'Buddy',
        type: 'dog',
        breed: 'Labrador',
        ageYears: 3,
        gender: 'male',
        size: 'large',
        status: PetStatus.AVAILABLE,
        images: [],
        videos: [],
      });

      const result = await RescueService.getRescueById(rescue.rescueId, true);

      expect(result.name).toBe('Test Rescue');
      expect(result.statistics).toBeDefined();
    });

    it('should throw error when rescue not found', async () => {
      await expect(RescueService.getRescueById('nonexistent-id')).rejects.toThrow();
    });

    it('should handle database errors', async () => {
      // Pass invalid UUID format
      await expect(RescueService.getRescueById('invalid-uuid-format')).rejects.toThrow();
    });
  });

  describe('createRescue', () => {
    it('should create rescue successfully', async () => {
      const rescueData = {
        name: 'New Rescue Organization',
        email: 'new@rescue.org',
        phone: '555-0123',
        address: '123 Main St',
        city: 'London',
        postcode: 'SW1A 1AA',
        country: 'UK',
        contactPerson: 'Jane Smith',
      };

      const result = await RescueService.createRescue(rescueData);

      expect(result.name).toBe('New Rescue Organization');
      expect(result.email).toBe('new@rescue.org');
      expect(result.status).toBe('pending');
    });

    it('should throw error when rescue email already exists', async () => {
      await Rescue.create({
        name: 'Existing Rescue',
        email: 'existing@rescue.org',
        phone: '555-0123',
        address: '123 Main St',
        city: 'London',
        postcode: 'SW1A 1AA',
        country: 'UK',
        contactPerson: 'Jane Smith',
        status: 'verified',
      });

      await expect(
        RescueService.createRescue({
          name: 'New Rescue',
          email: 'existing@rescue.org',
          phone: '555-0124',
          address: '456 Oak Ave',
          city: 'Manchester',
          postcode: 'M1 1AA',
          country: 'UK',
          contactPerson: 'John Doe',
        })
      ).rejects.toThrow();
    });

    it('should handle database errors', async () => {
      // Missing required field
      await expect(
        RescueService.createRescue({
          name: 'Invalid Rescue',
          email: 'invalid@rescue.org',
          // Missing required fields
        } as any)
      ).rejects.toThrow();
    });
  });

  describe('updateRescue', () => {
    it('should update rescue successfully', async () => {
      const rescue = await Rescue.create({
        name: 'Original Name',
        email: 'original@rescue.org',
        phone: '555-0123',
        address: '123 Main St',
        city: 'London',
        postcode: 'SW1A 1AA',
        country: 'UK',
        contactPerson: 'Jane Smith',
        status: 'verified',
      });

      const result = await RescueService.updateRescue(rescue.rescueId, {
        name: 'Updated Name',
        phone: '555-9999',
      });

      expect(result.name).toBe('Updated Name');
      expect(result.phone).toBe('555-9999');
      expect(result.email).toBe('original@rescue.org'); // Unchanged
    });

    it('should check for email conflicts when updating email', async () => {
      const rescue = await Rescue.create({
        name: 'Test Rescue',
        email: 'test@rescue.org',
        phone: '555-0123',
        address: '123 Main St',
        city: 'London',
        postcode: 'SW1A 1AA',
        country: 'UK',
        contactPerson: 'Jane Smith',
        status: 'verified',
      });

      const result = await RescueService.updateRescue(rescue.rescueId, {
        email: 'newemail@rescue.org',
      });

      expect(result.email).toBe('newemail@rescue.org');
    });

    it('should throw error when rescue not found', async () => {
      await expect(
        RescueService.updateRescue('nonexistent-id', { name: 'Test' })
      ).rejects.toThrow();
    });

    it('should throw error when email already exists', async () => {
      const rescue1 = await Rescue.create({
        name: 'Rescue 1',
        email: 'rescue1@test.org',
        phone: '555-0123',
        address: '123 Main St',
        city: 'London',
        postcode: 'SW1A 1AA',
        country: 'UK',
        contactPerson: 'Jane Smith',
        status: 'verified',
      });

      await Rescue.create({
        name: 'Rescue 2',
        email: 'rescue2@test.org',
        phone: '555-0124',
        address: '456 Oak Ave',
        city: 'London',
        postcode: 'SW1A 1AB',
        country: 'UK',
        contactPerson: 'John Doe',
        status: 'verified',
      });

      await expect(
        RescueService.updateRescue(rescue1.rescueId, { email: 'rescue2@test.org' })
      ).rejects.toThrow();
    });
  });

  describe('verifyRescue', () => {
    it('should verify rescue successfully', async () => {
      const rescue = await Rescue.create({
        name: 'Test Rescue',
        email: 'test@rescue.org',
        phone: '555-0123',
        address: '123 Main St',
        city: 'London',
        postcode: 'SW1A 1AA',
        country: 'UK',
        contactPerson: 'Jane Smith',
        status: 'pending',
      });

      const result = await RescueService.verifyRescue(rescue.rescueId, 'admin-123');

      expect(result.status).toBe('verified');
      expect(result.verifiedBy).toBe('admin-123');
      expect(result.verifiedAt).toBeDefined();
    });

    it('should throw error when rescue not found', async () => {
      await expect(RescueService.verifyRescue('nonexistent-id', 'admin-123')).rejects.toThrow();
    });

    it('should throw error when rescue already verified', async () => {
      const rescue = await Rescue.create({
        name: 'Test Rescue',
        email: 'test@rescue.org',
        phone: '555-0123',
        address: '123 Main St',
        city: 'London',
        postcode: 'SW1A 1AA',
        country: 'UK',
        contactPerson: 'Jane Smith',
        status: 'verified',
        verifiedBy: 'admin-123',
        verifiedAt: new Date(),
      });

      await expect(RescueService.verifyRescue(rescue.rescueId, 'admin-123')).rejects.toThrow();
    });
  });

  describe('addStaffMember', () => {
    it('should add staff member successfully', async () => {
      const rescue = await Rescue.create({
        name: 'Test Rescue',
        email: 'test@rescue.org',
        phone: '555-0123',
        address: '123 Main St',
        city: 'London',
        postcode: 'SW1A 1AA',
        country: 'UK',
        contactPerson: 'Jane Smith',
        status: 'verified',
      });

      const result = await RescueService.addStaffMember(
        rescue.rescueId,
        'user-123',
        'Volunteer',
        'admin-123'
      );

      expect(result.rescueId).toBe(rescue.rescueId);
      expect(result.userId).toBe('user-123');
      expect(result.title).toBe('Volunteer');
    });

    it('should throw error when rescue not found', async () => {
      await expect(
        RescueService.addStaffMember('nonexistent-id', 'user-123', 'Volunteer', 'admin-123')
      ).rejects.toThrow();
    });

    it('should throw error when user not found', async () => {
      const rescue = await Rescue.create({
        name: 'Test Rescue',
        email: 'test@rescue.org',
        phone: '555-0123',
        address: '123 Main St',
        city: 'London',
        postcode: 'SW1A 1AA',
        country: 'UK',
        contactPerson: 'Jane Smith',
        status: 'verified',
      });

      await expect(
        RescueService.addStaffMember(rescue.rescueId, 'nonexistent-user', 'Volunteer', 'admin-123')
      ).rejects.toThrow();
    });

    it('should throw error when rescue exists but user not found', async () => {
      const rescue = await Rescue.create({
        name: 'Test Rescue',
        email: 'test@rescue.org',
        phone: '555-0123',
        address: '123 Main St',
        city: 'London',
        postcode: 'SW1A 1AA',
        country: 'UK',
        contactPerson: 'Jane Smith',
        status: 'verified',
      });

      await expect(
        RescueService.addStaffMember(rescue.rescueId, 'fake-user-id', 'Volunteer', 'admin-123')
      ).rejects.toThrow();
    });

    it('should throw error when user is already a staff member', async () => {
      const rescue = await Rescue.create({
        name: 'Test Rescue',
        email: 'test@rescue.org',
        phone: '555-0123',
        address: '123 Main St',
        city: 'London',
        postcode: 'SW1A 1AA',
        country: 'UK',
        contactPerson: 'Jane Smith',
        status: 'verified',
      });

      await StaffMember.create({
        rescueId: rescue.rescueId,
        userId: 'user-123',
        title: 'Volunteer',
        addedBy: 'admin-123',
      });

      await expect(
        RescueService.addStaffMember(rescue.rescueId, 'user-123', 'Manager', 'admin-123')
      ).rejects.toThrow();
    });
  });

  describe('removeStaffMember', () => {
    it('should remove staff member successfully', async () => {
      const rescue = await Rescue.create({
        name: 'Test Rescue',
        email: 'test@rescue.org',
        phone: '555-0123',
        address: '123 Main St',
        city: 'London',
        postcode: 'SW1A 1AA',
        country: 'UK',
        contactPerson: 'Jane Smith',
        status: 'verified',
      });

      await StaffMember.create({
        rescueId: rescue.rescueId,
        userId: 'user-123',
        title: 'Volunteer',
        addedBy: 'admin-123',
      });

      await RescueService.removeStaffMember(rescue.rescueId, 'user-123', 'admin-123');

      const found = await StaffMember.findOne({
        where: { rescueId: rescue.rescueId, userId: 'user-123' },
      });
      expect(found).toBeNull();
    });

    it('should throw error when staff member not found', async () => {
      await expect(
        RescueService.removeStaffMember('nonexistent-id', 'admin-123')
      ).rejects.toThrow();
    });
  });

  describe('getRescueStatistics', () => {
    it('should get rescue statistics successfully', async () => {
      const rescue = await Rescue.create({
        name: 'Test Rescue',
        email: 'test@rescue.org',
        phone: '555-0123',
        address: '123 Main St',
        city: 'London',
        postcode: 'SW1A 1AA',
        country: 'UK',
        contactPerson: 'Jane Smith',
        status: 'verified',
      });

      // Create pets
      await Pet.create({
        rescueId: rescue.rescueId,
        name: 'Buddy',
        type: 'dog',
        breed: 'Labrador',
        ageYears: 3,
        gender: 'male',
        size: 'large',
        status: PetStatus.AVAILABLE,
        images: [],
        videos: [],
      });

      await Pet.create({
        rescueId: rescue.rescueId,
        name: 'Max',
        type: 'dog',
        breed: 'Golden Retriever',
        ageYears: 5,
        gender: 'male',
        size: 'large',
        status: PetStatus.ADOPTED,
        images: [],
        videos: [],
      });

      const result = await RescueService.getRescueStatistics(rescue.rescueId);

      expect(result.totalPets).toBe(2);
      expect(result.availablePets).toBe(1);
      expect(result.adoptedPets).toBe(1);
    });

    it('should handle zero adoptions for average calculation', async () => {
      const rescue = await Rescue.create({
        name: 'Test Rescue',
        email: 'test@rescue.org',
        phone: '555-0123',
        address: '123 Main St',
        city: 'London',
        postcode: 'SW1A 1AA',
        country: 'UK',
        contactPerson: 'Jane Smith',
        status: 'verified',
      });

      const result = await RescueService.getRescueStatistics(rescue.rescueId);

      expect(result.totalPets).toBe(0);
      expect(result.adoptedPets).toBe(0);
    });

    it('should handle database errors', async () => {
      await expect(RescueService.getRescueStatistics('invalid-uuid')).rejects.toThrow();
    });
  });

  describe('getRescuePets', () => {
    it('should get rescue pets with default options', async () => {
      const rescue = await Rescue.create({
        name: 'Test Rescue',
        email: 'test@rescue.org',
        phone: '555-0123',
        address: '123 Main St',
        city: 'London',
        postcode: 'SW1A 1AA',
        country: 'UK',
        contactPerson: 'Jane Smith',
        status: 'verified',
      });

      await Pet.create({
        rescueId: rescue.rescueId,
        name: 'Buddy',
        type: 'dog',
        breed: 'Labrador',
        ageYears: 3,
        gender: 'male',
        size: 'large',
        status: PetStatus.AVAILABLE,
        images: [],
        videos: [],
      });

      const result = await RescueService.getRescuePets(rescue.rescueId);

      expect(result.pets).toHaveLength(1);
      expect(result.pets[0].name).toBe('Buddy');
    });

    it('should filter pets by status', async () => {
      const rescue = await Rescue.create({
        name: 'Test Rescue',
        email: 'test@rescue.org',
        phone: '555-0123',
        address: '123 Main St',
        city: 'London',
        postcode: 'SW1A 1AA',
        country: 'UK',
        contactPerson: 'Jane Smith',
        status: 'verified',
      });

      await Pet.create({
        rescueId: rescue.rescueId,
        name: 'Buddy',
        type: 'dog',
        breed: 'Labrador',
        ageYears: 3,
        gender: 'male',
        size: 'large',
        status: PetStatus.AVAILABLE,
        images: [],
        videos: [],
      });

      await Pet.create({
        rescueId: rescue.rescueId,
        name: 'Max',
        type: 'dog',
        breed: 'Golden Retriever',
        ageYears: 5,
        gender: 'male',
        size: 'large',
        status: PetStatus.ADOPTED,
        images: [],
        videos: [],
      });

      const result = await RescueService.getRescuePets(rescue.rescueId, {
        status: PetStatus.AVAILABLE,
      });

      expect(result.pets).toHaveLength(1);
      expect(result.pets[0].status).toBe(PetStatus.AVAILABLE);
    });

    it('should handle database errors', async () => {
      await expect(RescueService.getRescuePets('invalid-uuid')).rejects.toThrow();
    });
  });

  describe('deleteRescue', () => {
    it('should soft delete rescue successfully', async () => {
      const rescue = await Rescue.create({
        name: 'Test Rescue',
        email: 'test@rescue.org',
        phone: '555-0123',
        address: '123 Main St',
        city: 'London',
        postcode: 'SW1A 1AA',
        country: 'UK',
        contactPerson: 'Jane Smith',
        status: 'verified',
      });

      await RescueService.deleteRescue(rescue.rescueId, 'admin-123');

      const deleted = await Rescue.findByPk(rescue.rescueId);
      expect(deleted?.isDeleted).toBe(true);
      expect(deleted?.deletedBy).toBe('admin-123');
    });

    it('should throw error when rescue not found', async () => {
      await expect(RescueService.deleteRescue('nonexistent-id', 'admin-123')).rejects.toThrow();
    });

    it('should throw error when rescue already deleted', async () => {
      const rescue = await Rescue.create({
        name: 'Test Rescue',
        email: 'test@rescue.org',
        phone: '555-0123',
        address: '123 Main St',
        city: 'London',
        postcode: 'SW1A 1AA',
        country: 'UK',
        contactPerson: 'Jane Smith',
        status: 'verified',
        isDeleted: true,
        deletedBy: 'admin-123',
        deletedAt: new Date(),
      });

      await expect(RescueService.deleteRescue(rescue.rescueId, 'admin-123')).rejects.toThrow();
    });
  });
});
