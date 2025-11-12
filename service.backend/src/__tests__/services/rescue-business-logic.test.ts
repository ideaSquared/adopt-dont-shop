import { vi } from 'vitest';
/**
 * RescueService Business Logic Tests
 *
 * Tests cover rescue organization business rules including:
 * - Rescue registration and validation
 * - Status state machine (pending → verified, verified → suspended, etc.)
 * - Verification and rejection workflows
 * - Staff management (add, remove, update)
 * - Rescue search and filtering
 * - Soft delete functionality
 * - Adoption policies management
 * - Statistics and analytics
 * - Business invariants (unique email, unique name)
 */

import { RescueService } from '../../services/rescue.service';
import { Rescue, StaffMember, User, Pet, Application, Role, UserRole } from '../../models';
import { AuditLogService } from '../../services/auditLog.service';

// Mock dependencies
vi.mock('../../models');
vi.mock('../../services/auditLog.service');
vi.mock('../../utils/logger');

const MockedRescue = Rescue as vi.Mocked<typeof Rescue>;
const MockedStaffMember = StaffMember as vi.Mocked<typeof StaffMember>;
const MockedUser = User as vi.Mocked<typeof User>;
const MockedRole = Role as vi.Mocked<typeof Role>;
const MockedUserRole = UserRole as vi.Mocked<typeof UserRole>;
const MockedPet = Pet as vi.Mocked<typeof Pet>;
const MockedApplication = Application as vi.Mocked<typeof Application>;
const MockedAuditLogService = AuditLogService as vi.Mocked<typeof AuditLogService>;

describe('RescueService - Business Logic Tests', () => {
  const mockRescueId = '123e4567-e89b-12d3-a456-426614174000';
  const mockUserId = '123e4567-e89b-12d3-a456-426614174001';
  const mockStaffMemberId = '123e4567-e89b-12d3-a456-426614174002';
  const mockRoleId = '123e4567-e89b-12d3-a456-426614174003';
  const mockEmail = 'test@rescue.org';

  // Mock factory functions
  const createMockRescue = (overrides = {}) => ({
    rescueId: mockRescueId,
    rescue_id: mockRescueId,
    name: 'Test Rescue',
    email: mockEmail,
    phone: '555-1234',
    address: '123 Main St',
    city: 'London',
    county: 'Greater London',
    postcode: 'SW1A 1AA',
    country: 'United Kingdom',
    website: 'https://testrescue.org',
    description: 'Test rescue description',
    mission: 'Test mission',
    contactPerson: 'John Doe',
    contactTitle: 'Director',
    contactEmail: 'contact@rescue.org',
    contactPhone: '555-5678',
    status: 'pending',
    verifiedAt: null as Date | null,
    verifiedBy: null as string | null,
    settings: {},
    isDeleted: false,
    deletedAt: null as Date | null,
    deletedBy: null as string | null,
    createdAt: new Date(),
    updatedAt: new Date(),
    update: vi.fn().mockImplementation(function(this: any, data: any) {
      Object.assign(this, data);
      return Promise.resolve(this);
    }),
    save: vi.fn().mockResolvedValue(undefined),
    toJSON: vi.fn().mockReturnThis(),
    sequelize: {
      transaction: vi.fn().mockResolvedValue({
        commit: vi.fn().mockResolvedValue(undefined),
        rollback: vi.fn().mockResolvedValue(undefined),
      }),
    },
    ...overrides,
  });

  const createMockUser = (overrides = {}) => ({
    userId: mockUserId,
    user_id: mockUserId,
    email: 'user@example.com',
    firstName: 'Jane',
    lastName: 'Smith',
    userType: 'rescue_staff',
    toJSON: vi.fn().mockReturnThis(),
    ...overrides,
  });

  const createMockStaffMember = (overrides = {}) => ({
    staffMemberId: mockStaffMemberId,
    staff_member_id: mockStaffMemberId,
    rescueId: mockRescueId,
    rescue_id: mockRescueId,
    userId: mockUserId,
    user_id: mockUserId,
    title: 'Coordinator',
    isVerified: false,
    isDeleted: false,
    deletedAt: null as Date | null,
    deletedBy: null as string | null,
    addedBy: mockUserId,
    addedAt: new Date(),
    user: createMockUser(),
    update: vi.fn().mockImplementation(function(this: any, data: any) {
      Object.assign(this, data);
      return Promise.resolve(this);
    }),
    toJSON: vi.fn().mockReturnThis(),
    ...overrides,
  });

  const createMockRole = (overrides = {}) => ({
    roleId: mockRoleId,
    role_id: mockRoleId,
    name: 'rescue_staff',
    description: 'Rescue staff role',
    ...overrides,
  });

  const createValidRescueData = () => ({
    name: 'New Rescue Organization',
    email: 'newrescue@example.com',
    phone: '555-9999',
    address: '456 Oak Ave',
    city: 'Manchester',
    county: 'Greater Manchester',
    postcode: 'M1 1AA',
    country: 'United Kingdom',
    website: 'https://newrescue.org',
    description: 'A new rescue organization',
    mission: 'Save all the animals',
    contactPerson: 'Alice Johnson',
    contactTitle: 'Founder',
    contactEmail: 'alice@newrescue.org',
    contactPhone: '555-8888',
  });

  beforeEach(() => {
    vi.clearAllMocks();
    MockedAuditLogService.log = vi.fn().mockResolvedValue(undefined);
  });

  describe('Rescue Registration and Creation', () => {
    it('should create new rescue with pending status', async () => {
      // Given: Valid rescue registration data
      const rescueData = createValidRescueData();
      const mockRescue = createMockRescue({
        ...rescueData,
        status: 'pending',
      });

      const mockTransaction = {
        commit: vi.fn().mockResolvedValue(undefined),
        rollback: vi.fn().mockResolvedValue(undefined),
      };

      MockedRescue.findOne = vi.fn().mockResolvedValue(null);
      MockedRescue.create = vi.fn().mockResolvedValue(mockRescue);
      (MockedRescue as any).sequelize = {
        transaction: vi.fn().mockResolvedValue(mockTransaction),
      };

      // When: Creating a new rescue
      const result = await RescueService.createRescue(rescueData, mockUserId);

      // Then: Rescue is created with pending status
      expect(MockedRescue.create).toHaveBeenCalledWith(
        expect.objectContaining({
          ...rescueData,
          status: 'pending',
          isDeleted: false,
        }),
        { transaction: mockTransaction }
      );
      expect(mockTransaction.commit).toHaveBeenCalled();
      expect(MockedAuditLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'create',
          entity: 'rescue',
        })
      );
    });

    it('should prevent duplicate rescue with same email', async () => {
      // Given: A rescue with the email already exists
      const rescueData = createValidRescueData();
      const existingRescue = createMockRescue({ email: rescueData.email });

      const mockTransaction = {
        commit: vi.fn().mockResolvedValue(undefined),
        rollback: vi.fn().mockResolvedValue(undefined),
      };

      MockedRescue.findOne = vi.fn().mockResolvedValue(existingRescue as any);
      (MockedRescue as any).sequelize = {
        transaction: vi.fn().mockResolvedValue(mockTransaction),
      };

      // When & Then: Duplicate email is rejected
      await expect(RescueService.createRescue(rescueData, mockUserId)).rejects.toThrow(
        'A rescue organization with this email already exists'
      );
      expect(mockTransaction.rollback).toHaveBeenCalled();
    });

    it('should prevent email change to existing email', async () => {
      // Given: Updating a rescue to an email that's already taken
      const mockRescue = createMockRescue();
      const conflictingRescue = createMockRescue({
        rescueId: 'different-id',
        email: 'taken@example.com',
      });

      const mockTransaction = {
        commit: vi.fn().mockResolvedValue(undefined),
        rollback: vi.fn().mockResolvedValue(undefined),
      };

      MockedRescue.findByPk = vi.fn().mockResolvedValue(mockRescue as any);
      MockedRescue.findOne = vi.fn().mockResolvedValue(conflictingRescue as any);
      (MockedRescue as any).sequelize = {
        transaction: vi.fn().mockResolvedValue(mockTransaction),
      };

      // When & Then: Email conflict is rejected
      await expect(
        RescueService.updateRescue(mockRescueId, { email: 'taken@example.com' }, mockUserId)
      ).rejects.toThrow('A rescue organization with this email already exists');
      expect(mockTransaction.rollback).toHaveBeenCalled();
    });
  });

  describe('Rescue Status State Machine', () => {
    it('should allow verification of pending rescue', async () => {
      // Given: A pending rescue
      const mockRescue = createMockRescue({ status: 'pending' });

      const mockTransaction = {
        commit: vi.fn().mockResolvedValue(undefined),
        rollback: vi.fn().mockResolvedValue(undefined),
      };

      MockedRescue.findByPk = vi.fn().mockResolvedValue(mockRescue as any);
      (MockedRescue as any).sequelize = {
        transaction: vi.fn().mockResolvedValue(mockTransaction),
      };

      // When: Verifying the rescue
      const result = await RescueService.verifyRescue(
        mockRescueId,
        mockUserId,
        'Verified successfully'
      );

      // Then: Status is updated to verified
      expect(mockRescue.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'verified',
          verifiedBy: mockUserId,
        }),
        { transaction: mockTransaction }
      );
      expect(mockRescue.update).toHaveBeenCalledWith(
        expect.objectContaining({
          verifiedAt: expect.any(Date),
        }),
        { transaction: mockTransaction }
      );
      expect(mockTransaction.commit).toHaveBeenCalled();
    });

    it('should prevent verification of already verified rescue', async () => {
      // Given: An already verified rescue
      const mockRescue = createMockRescue({ status: 'verified' });

      const mockTransaction = {
        commit: vi.fn().mockResolvedValue(undefined),
        rollback: vi.fn().mockResolvedValue(undefined),
      };

      MockedRescue.findByPk = vi.fn().mockResolvedValue(mockRescue as any);
      (MockedRescue as any).sequelize = {
        transaction: vi.fn().mockResolvedValue(mockTransaction),
      };

      // When & Then: Re-verification is rejected
      await expect(RescueService.verifyRescue(mockRescueId, mockUserId)).rejects.toThrow(
        'Rescue is already verified'
      );
      expect(mockTransaction.rollback).toHaveBeenCalled();
    });

    it('should allow rejection of pending rescue', async () => {
      // Given: A pending rescue
      const mockRescue = createMockRescue({ status: 'pending' });

      const mockTransaction = {
        commit: vi.fn().mockResolvedValue(undefined),
        rollback: vi.fn().mockResolvedValue(undefined),
      };

      MockedRescue.findByPk = vi.fn().mockResolvedValue(mockRescue as any);
      (MockedRescue as any).sequelize = {
        transaction: vi.fn().mockResolvedValue(mockTransaction),
      };

      // When: Rejecting the rescue
      await RescueService.rejectRescue(mockRescueId, mockUserId, 'Incomplete documentation');

      // Then: Status is updated to inactive
      expect(mockRescue.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'inactive',
        }),
        { transaction: mockTransaction }
      );
      expect(mockTransaction.commit).toHaveBeenCalled();
    });

    it('should prevent rejection of verified rescue', async () => {
      // Given: A verified rescue
      const mockRescue = createMockRescue({ status: 'verified' });

      const mockTransaction = {
        commit: vi.fn().mockResolvedValue(undefined),
        rollback: vi.fn().mockResolvedValue(undefined),
      };

      MockedRescue.findByPk = vi.fn().mockResolvedValue(mockRescue as any);
      (MockedRescue as any).sequelize = {
        transaction: vi.fn().mockResolvedValue(mockTransaction),
      };

      // When & Then: Rejection of verified rescue is rejected
      await expect(
        RescueService.rejectRescue(mockRescueId, mockUserId, 'Some reason')
      ).rejects.toThrow('Cannot reject an already verified rescue');
      expect(mockTransaction.rollback).toHaveBeenCalled();
    });

    it('should prevent rejection of already inactive rescue', async () => {
      // Given: An inactive rescue
      const mockRescue = createMockRescue({ status: 'inactive' });

      const mockTransaction = {
        commit: vi.fn().mockResolvedValue(undefined),
        rollback: vi.fn().mockResolvedValue(undefined),
      };

      MockedRescue.findByPk = vi.fn().mockResolvedValue(mockRescue as any);
      (MockedRescue as any).sequelize = {
        transaction: vi.fn().mockResolvedValue(mockTransaction),
      };

      // When & Then: Rejection of inactive rescue is rejected
      await expect(RescueService.rejectRescue(mockRescueId, mockUserId)).rejects.toThrow(
        'Rescue is already rejected'
      );
      expect(mockTransaction.rollback).toHaveBeenCalled();
    });
  });

  describe('Staff Management', () => {
    it('should add new staff member to rescue', async () => {
      // Given: A rescue and a user
      const mockRescue = createMockRescue();
      const mockUser = createMockUser();
      const mockRole = createMockRole();
      const mockStaffMember = createMockStaffMember();

      const mockTransaction = {
        commit: vi.fn().mockResolvedValue(undefined),
        rollback: vi.fn().mockResolvedValue(undefined),
      };

      MockedRescue.findByPk = vi.fn().mockResolvedValue(mockRescue as any);
      MockedUser.findByPk = vi.fn().mockResolvedValue(mockUser as any);
      MockedStaffMember.findOne = vi.fn().mockResolvedValue(null);
      MockedStaffMember.create = vi.fn().mockResolvedValue(mockStaffMember as any);
      MockedRole.findOne = vi.fn().mockResolvedValue(mockRole as any);
      MockedUserRole.findOne = vi.fn().mockResolvedValue(null);
      MockedUserRole.create = vi.fn().mockResolvedValue({} as any);
      (MockedRescue as any).sequelize = {
        transaction: vi.fn().mockResolvedValue(mockTransaction),
      };

      // When: Adding a staff member
      const result = await RescueService.addStaffMember(
        mockRescueId,
        mockUserId,
        'Volunteer Coordinator',
        mockUserId
      );

      // Then: Staff member is created with rescue_staff role
      expect(MockedStaffMember.create).toHaveBeenCalledWith(
        expect.objectContaining({
          rescueId: mockRescueId,
          userId: mockUserId,
          title: 'Volunteer Coordinator',
          isVerified: false,
          isDeleted: false,
        }),
        { transaction: mockTransaction }
      );
      expect(MockedUserRole.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: mockUserId,
          roleId: mockRoleId,
        }),
        { transaction: mockTransaction }
      );
      expect(mockTransaction.commit).toHaveBeenCalled();
    });

    it('should prevent adding duplicate active staff member', async () => {
      // Given: User is already an active staff member
      const mockRescue = createMockRescue();
      const mockUser = createMockUser();
      const existingStaff = createMockStaffMember({ isDeleted: false });

      const mockTransaction = {
        commit: vi.fn().mockResolvedValue(undefined),
        rollback: vi.fn().mockResolvedValue(undefined),
      };

      MockedRescue.findByPk = vi.fn().mockResolvedValue(mockRescue as any);
      MockedUser.findByPk = vi.fn().mockResolvedValue(mockUser as any);
      MockedStaffMember.findOne = vi.fn().mockResolvedValue(existingStaff as any);
      (MockedRescue as any).sequelize = {
        transaction: vi.fn().mockResolvedValue(mockTransaction),
      };

      // When & Then: Duplicate staff member is rejected
      await expect(
        RescueService.addStaffMember(mockRescueId, mockUserId, 'Coordinator', mockUserId)
      ).rejects.toThrow('User is already a staff member of this rescue');
      expect(mockTransaction.rollback).toHaveBeenCalled();
    });

    it('should restore soft-deleted staff member when re-adding', async () => {
      // Given: User was previously a staff member (soft deleted)
      const mockRescue = createMockRescue();
      const mockUser = createMockUser();
      const mockRole = createMockRole();
      const softDeletedStaff = createMockStaffMember({
        isDeleted: true,
        deletedAt: new Date(),
        isVerified: true, // Was previously verified
      });

      const mockTransaction = {
        commit: vi.fn().mockResolvedValue(undefined),
        rollback: vi.fn().mockResolvedValue(undefined),
      };

      MockedRescue.findByPk = vi.fn().mockResolvedValue(mockRescue as any);
      MockedUser.findByPk = vi.fn().mockResolvedValue(mockUser as any);
      MockedStaffMember.findOne = vi.fn()
        .mockResolvedValueOnce(null) // First check for active staff
        .mockResolvedValueOnce(softDeletedStaff as any); // Second check for soft-deleted
      MockedRole.findOne = vi.fn().mockResolvedValue(mockRole as any);
      MockedUserRole.findOne = vi.fn().mockResolvedValue({ userId: mockUserId, roleId: mockRoleId } as any);
      (MockedRescue as any).sequelize = {
        transaction: vi.fn().mockResolvedValue(mockTransaction),
      };

      // When: Re-adding the staff member
      await RescueService.addStaffMember(mockRescueId, mockUserId, 'Manager', mockUserId);

      // Then: Staff member is restored with verification status preserved
      expect(softDeletedStaff.update).toHaveBeenCalledWith(
        expect.objectContaining({
          isDeleted: false,
          deletedAt: undefined,
          isVerified: true, // Verification status preserved
          title: 'Manager',
        }),
        { transaction: mockTransaction }
      );
      expect(mockTransaction.commit).toHaveBeenCalled();
    });

    it('should soft delete staff member on removal', async () => {
      // Given: An active staff member
      const mockStaffMember = createMockStaffMember({ isDeleted: false });

      const mockTransaction = {
        commit: vi.fn().mockResolvedValue(undefined),
        rollback: vi.fn().mockResolvedValue(undefined),
      };

      MockedStaffMember.findOne = vi.fn().mockResolvedValue(mockStaffMember as any);
      (MockedRescue as any).sequelize = {
        transaction: vi.fn().mockResolvedValue(mockTransaction),
      };

      // When: Removing the staff member
      await RescueService.removeStaffMember(mockRescueId, mockUserId, mockUserId);

      // Then: Staff member is soft deleted
      expect(mockStaffMember.update).toHaveBeenCalledWith(
        expect.objectContaining({
          isDeleted: true,
          deletedAt: expect.any(Date),
          deletedBy: mockUserId,
        }),
        { transaction: mockTransaction }
      );
      expect(mockTransaction.commit).toHaveBeenCalled();
    });

    it('should update staff member title', async () => {
      // Given: An existing staff member
      const mockRescue = createMockRescue();
      const mockStaffMember = createMockStaffMember({ title: 'Coordinator' });

      MockedRescue.findByPk = vi.fn().mockResolvedValue(mockRescue as any);
      MockedStaffMember.findOne = vi.fn().mockResolvedValue(mockStaffMember as any);

      // When: Updating the staff member title
      const result = await RescueService.updateStaffMember(
        mockRescueId,
        mockUserId,
        { title: 'Senior Coordinator' },
        mockUserId
      );

      // Then: Title is updated
      expect(mockStaffMember.update).toHaveBeenCalled();
      const updateCall = mockStaffMember.update.mock.calls[0];
      expect(updateCall[0]).toEqual({ title: 'Senior Coordinator' });
      expect(updateCall[1]).toHaveProperty('transaction');
    });
  });

  describe('Rescue Search and Filtering', () => {
    it('should search rescues by name', async () => {
      // Given: Multiple rescues
      const mockRescues = [
        createMockRescue({ name: 'Happy Paws Rescue' }),
        createMockRescue({ name: 'Happy Tails Rescue' }),
      ];

      MockedRescue.findAndCountAll = vi.fn().mockResolvedValue({
        count: 2,
        rows: mockRescues,
      });

      // When: Searching by name
      const result = await RescueService.searchRescues({ search: 'Happy' });

      // Then: Matching rescues are returned
      expect(MockedRescue.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            [Symbol.for('or')]: expect.arrayContaining([
              expect.objectContaining({ name: expect.anything() }),
            ]),
          }),
        })
      );
      expect(result.rescues).toHaveLength(2);
    });

    it('should filter rescues by status', async () => {
      // Given: Rescues with different statuses
      const verifiedRescues = [
        createMockRescue({ status: 'verified' }),
        createMockRescue({ status: 'verified' }),
      ];

      MockedRescue.findAndCountAll = vi.fn().mockResolvedValue({
        count: 2,
        rows: verifiedRescues,
      });

      // When: Filtering by verified status
      const result = await RescueService.searchRescues({ status: 'verified' });

      // Then: Only verified rescues are returned
      expect(MockedRescue.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'verified' }),
        })
      );
    });

    it('should filter rescues by location', async () => {
      // Given: Rescues in different locations
      const londonRescues = [createMockRescue({ city: 'London' })];

      MockedRescue.findAndCountAll = vi.fn().mockResolvedValue({
        count: 1,
        rows: londonRescues,
      });

      // When: Filtering by location
      const result = await RescueService.searchRescues({ location: 'London' });

      // Then: Rescues in matching location are returned
      expect(MockedRescue.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            [Symbol.for('or')]: expect.arrayContaining([
              expect.objectContaining({ city: expect.anything() }),
            ]),
          }),
        })
      );
    });

    it('should paginate rescue search results', async () => {
      // Given: Many rescues
      const mockRescues = Array(5)
        .fill(null)
        .map(() => createMockRescue());

      MockedRescue.findAndCountAll = vi.fn().mockResolvedValue({
        count: 50,
        rows: mockRescues,
      });

      // When: Requesting page 2 with limit 5
      const result = await RescueService.searchRescues({ page: 2, limit: 5 });

      // Then: Correct page is returned with pagination metadata
      expect(MockedRescue.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 5,
          offset: 5,
        })
      );
      expect(result.pagination).toEqual({
        page: 2,
        limit: 5,
        total: 50,
        pages: 10,
      });
    });
  });

  describe('Soft Delete Functionality', () => {
    it('should soft delete rescue', async () => {
      // Given: An active rescue
      const mockRescue = createMockRescue({ isDeleted: false });

      const mockTransaction = {
        commit: vi.fn().mockResolvedValue(undefined),
        rollback: vi.fn().mockResolvedValue(undefined),
      };

      MockedRescue.findByPk = vi.fn().mockResolvedValue(mockRescue as any);
      (MockedRescue as any).sequelize = {
        transaction: vi.fn().mockResolvedValue(mockTransaction),
      };

      // When: Deleting the rescue
      await RescueService.deleteRescue(mockRescueId, mockUserId, 'Policy violation');

      // Then: Rescue is soft deleted
      expect(mockRescue.update).toHaveBeenCalledWith(
        expect.objectContaining({
          isDeleted: true,
          deletedAt: expect.any(Date),
          deletedBy: mockUserId,
        }),
        { transaction: mockTransaction }
      );
      expect(mockTransaction.commit).toHaveBeenCalled();
    });

    it('should prevent soft deleting already deleted rescue', async () => {
      // Given: An already deleted rescue
      const mockRescue = createMockRescue({ isDeleted: true });

      const mockTransaction = {
        commit: vi.fn().mockResolvedValue(undefined),
        rollback: vi.fn().mockResolvedValue(undefined),
      };

      MockedRescue.findByPk = vi.fn().mockResolvedValue(mockRescue as any);
      (MockedRescue as any).sequelize = {
        transaction: vi.fn().mockResolvedValue(mockTransaction),
      };

      // When & Then: Re-deletion is rejected
      await expect(RescueService.deleteRescue(mockRescueId, mockUserId)).rejects.toThrow(
        'Rescue organization is already deleted'
      );
      expect(mockTransaction.rollback).toHaveBeenCalled();
    });
  });

  describe('Adoption Policies Management', () => {
    it('should update adoption policies for rescue', async () => {
      // Given: A rescue with existing settings
      const mockRescue = createMockRescue({ settings: { someOtherSetting: 'value' } });

      const adoptionPolicies = {
        requireHomeVisit: true,
        requireReferences: true,
        minimumReferenceCount: 2,
        requireVeterinarianReference: false,
        adoptionFeeRange: {
          min: 100,
          max: 200,
        },
        requirements: ['Must be 21+', 'Own or rent with permission'],
        policies: ['Spay/neuter required', 'Return policy available'],
      };

      const mockTransaction = {
        commit: vi.fn().mockResolvedValue(undefined),
        rollback: vi.fn().mockResolvedValue(undefined),
      };

      MockedRescue.findByPk = vi.fn().mockResolvedValue(mockRescue as any);
      (MockedRescue as any).sequelize = {
        transaction: vi.fn().mockResolvedValue(mockTransaction),
      };

      // When: Updating adoption policies
      await RescueService.updateAdoptionPolicies(mockRescueId, adoptionPolicies, mockUserId);

      // Then: Policies are stored in settings
      expect(mockRescue.update).toHaveBeenCalledWith(
        expect.objectContaining({
          settings: expect.objectContaining({
            adoptionPolicies,
            someOtherSetting: 'value', // Existing settings preserved
          }),
        }),
        { transaction: mockTransaction }
      );
      expect(mockTransaction.commit).toHaveBeenCalled();
    });

    it('should retrieve adoption policies for rescue', async () => {
      // Given: A rescue with adoption policies
      const adoptionPolicies = {
        requireHomeVisit: true,
        requireReferences: true,
        minimumReferenceCount: 3,
        requireVeterinarianReference: true,
        adoptionFeeRange: {
          min: 150,
          max: 250,
        },
        requirements: ['Must be 21+'],
        policies: ['Spay/neuter required'],
      };
      const mockRescue = createMockRescue({
        settings: { adoptionPolicies },
      });

      MockedRescue.findByPk = vi.fn().mockResolvedValue(mockRescue as any);

      // When: Getting adoption policies
      const result = await RescueService.getAdoptionPolicies(mockRescueId);

      // Then: Policies are returned
      expect(result).toEqual(adoptionPolicies);
    });

    it('should return null when no adoption policies exist', async () => {
      // Given: A rescue without adoption policies
      const mockRescue = createMockRescue({ settings: {} });

      MockedRescue.findByPk = vi.fn().mockResolvedValue(mockRescue as any);

      // When: Getting adoption policies
      const result = await RescueService.getAdoptionPolicies(mockRescueId);

      // Then: Null is returned
      expect(result).toBeNull();
    });
  });

  describe('Rescue Statistics', () => {
    it('should calculate rescue statistics', async () => {
      // Given: A rescue with pets and applications
      MockedPet.count = vi.fn()
        .mockResolvedValueOnce(10) // totalPets
        .mockResolvedValueOnce(6) // availablePets
        .mockResolvedValueOnce(3) // adoptedPets
        .mockResolvedValueOnce(1); // monthlyAdoptions

      MockedApplication.count = vi.fn()
        .mockResolvedValueOnce(15) // totalApplications
        .mockResolvedValueOnce(5); // pendingApplications

      MockedStaffMember.count = vi.fn().mockResolvedValue(4);

      MockedPet.findAll = vi.fn().mockResolvedValue([
        {
          created_at: new Date('2024-01-01'),
          adopted_date: new Date('2024-02-01'),
        },
        {
          created_at: new Date('2024-01-15'),
          adopted_date: new Date('2024-03-01'),
        },
      ] as any);

      // When: Getting rescue statistics
      const stats = await RescueService.getRescueStatistics(mockRescueId);

      // Then: Statistics are calculated correctly
      expect(stats).toEqual(
        expect.objectContaining({
          totalPets: 10,
          availablePets: 6,
          adoptedPets: 3,
          pendingApplications: 5,
          totalApplications: 15,
          staffCount: 4,
          activeListings: 6,
          monthlyAdoptions: 1,
          averageTimeToAdoption: expect.any(Number),
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('should throw error when rescue not found', async () => {
      // Given: Rescue does not exist
      MockedRescue.findByPk = vi.fn().mockResolvedValue(null);

      // When & Then: Error is thrown
      await expect(RescueService.getRescueById(mockRescueId)).rejects.toThrow('Rescue not found');
    });

    it('should throw error when user not found when adding staff', async () => {
      // Given: User does not exist
      const mockRescue = createMockRescue();

      const mockTransaction = {
        commit: vi.fn().mockResolvedValue(undefined),
        rollback: vi.fn().mockResolvedValue(undefined),
      };

      MockedRescue.findByPk = vi.fn().mockResolvedValue(mockRescue as any);
      MockedUser.findByPk = vi.fn().mockResolvedValue(null);
      (MockedRescue as any).sequelize = {
        transaction: vi.fn().mockResolvedValue(mockTransaction),
      };

      // When & Then: Error is thrown
      await expect(
        RescueService.addStaffMember(mockRescueId, mockUserId, 'Title', mockUserId)
      ).rejects.toThrow('User not found');
      expect(mockTransaction.rollback).toHaveBeenCalled();
    });

    it('should throw error when staff member not found during removal', async () => {
      // Given: Staff member does not exist
      const mockTransaction = {
        commit: vi.fn().mockResolvedValue(undefined),
        rollback: vi.fn().mockResolvedValue(undefined),
      };

      MockedStaffMember.findOne = vi.fn().mockResolvedValue(null);
      (MockedRescue as any).sequelize = {
        transaction: vi.fn().mockResolvedValue(mockTransaction),
      };

      // When & Then: Error is thrown
      await expect(
        RescueService.removeStaffMember(mockRescueId, mockUserId, mockUserId)
      ).rejects.toThrow('Staff member not found');
      expect(mockTransaction.rollback).toHaveBeenCalled();
    });
  });

  describe('Business Invariants', () => {
    it('should maintain unique rescue email constraint', async () => {
      // Given: Two rescues cannot have the same email
      const rescueData1 = createValidRescueData();
      const rescueData2 = { ...createValidRescueData(), email: rescueData1.email };

      const mockRescue1 = createMockRescue(rescueData1);

      const mockTransaction = {
        commit: vi.fn().mockResolvedValue(undefined),
        rollback: vi.fn().mockResolvedValue(undefined),
      };

      MockedRescue.findOne = vi.fn()
        .mockResolvedValueOnce(null) // First rescue creation succeeds
        .mockResolvedValueOnce(mockRescue1 as any); // Second rescue creation fails

      MockedRescue.create = vi.fn().mockResolvedValue(mockRescue1 as any);
      (MockedRescue as any).sequelize = {
        transaction: vi.fn().mockResolvedValue(mockTransaction),
      };

      // When: Creating first rescue
      await RescueService.createRescue(rescueData1, mockUserId);

      // Then: Second rescue with same email is rejected
      await expect(RescueService.createRescue(rescueData2, mockUserId)).rejects.toThrow(
        'A rescue organization with this email already exists'
      );
    });

    it('should log all rescue operations for audit trail', async () => {
      // Given: Any rescue operation
      const rescueData = createValidRescueData();
      const mockRescue = createMockRescue(rescueData);

      const mockTransaction = {
        commit: vi.fn().mockResolvedValue(undefined),
        rollback: vi.fn().mockResolvedValue(undefined),
      };

      MockedRescue.findOne = vi.fn().mockResolvedValue(null);
      MockedRescue.create = vi.fn().mockResolvedValue(mockRescue as any);
      (MockedRescue as any).sequelize = {
        transaction: vi.fn().mockResolvedValue(mockTransaction),
      };

      // When: Creating a rescue
      await RescueService.createRescue(rescueData, mockUserId);

      // Then: Audit log is created
      expect(MockedAuditLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: mockUserId,
          action: 'create',
          entity: 'rescue',
          entityId: expect.any(String),
        })
      );
    });
  });
});
