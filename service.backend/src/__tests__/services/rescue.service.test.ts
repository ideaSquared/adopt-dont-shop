import { vi } from 'vitest';
// Mock the static log method first (before imports to avoid hoisting issues)
const mockAuditLogAction = vi.fn().mockResolvedValue(undefined);
vi.mock('../../services/auditLog.service', () => ({
  AuditLogService: {
    log: mockAuditLogAction,
  },
}));

import { Op } from 'sequelize';
// Import models from the index to use the mocked versions
import { Application, Pet, Rescue, StaffMember, User } from '../../models';
import {
  CreateRescueRequest,
  RescueSearchOptions,
  RescueService,
  UpdateRescueRequest,
} from '../../services/rescue.service';

// Mock dependencies
vi.mock('../../utils/logger');

const mockRescue = Rescue as vi.Mocked<typeof Rescue>;
const mockStaffMember = StaffMember as vi.Mocked<typeof StaffMember>;
const mockUser = User as vi.Mocked<typeof User>;
const mockPet = Pet as vi.Mocked<typeof Pet>;
const mockApplication = Application as vi.Mocked<typeof Application>;

// Mock data
const mockRescueData = {
  rescueId: 'rescue-123',
  name: 'Test Rescue',
  email: 'test@rescue.org',
  phone: '555-0123',
  address: '123 Main St',
  city: 'Test City',
  state: 'TS',
  zipCode: '12345',
  country: 'US',
  website: 'https://testrescue.org',
  description: 'A test rescue organization',
  mission: 'Save all the animals',
  ein: '12-3456789',
  registrationNumber: 'REG123',
  contactPerson: 'John Doe',
  contactTitle: 'Director',
  contactEmail: 'john@rescue.org',
  contactPhone: '555-0124',
  status: 'pending' as const,
  verifiedAt: null,
  verifiedBy: null,
  settings: {},
  isDeleted: false,
  deletedAt: null,
  deletedBy: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  toJSON: vi.fn(),
  update: vi.fn(),
};

const mockUserData = {
  userId: 'user-123',
  firstName: 'John',
  lastName: 'Doe',
  email: 'john@example.com',
  userType: 'adopter' as const,
};

const mockStaffMemberData = {
  staffMemberId: 'staff-123',
  rescueId: 'rescue-123',
  userId: 'user-123',
  title: 'Volunteer',
  isVerified: false,
  addedBy: 'admin-123',
  addedAt: new Date(),
  isDeleted: false,
  createdAt: new Date(),
  updatedAt: new Date(),
  toJSON: vi.fn(),
  destroy: vi.fn(),
  update: vi.fn().mockResolvedValue(undefined),
  user: mockUserData,
};

describe('RescueService', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mock implementations
    mockRescueData.toJSON.mockReturnValue(mockRescueData);
    mockStaffMemberData.toJSON.mockReturnValue(mockStaffMemberData);
    mockAuditLogAction.mockClear();
  });

  describe('searchRescues', () => {
    it('should search rescues with default options', async () => {
      const mockRescues = [mockRescueData];
      (mockRescue.findAndCountAll as vi.Mock).mockResolvedValue({
        count: 1,
        rows: mockRescues,
      });

      const result = await RescueService.searchRescues();

      expect(mockRescue.findAndCountAll).toHaveBeenCalledWith({
        where: {},
        order: [['createdAt', 'DESC']],
        limit: 20,
        offset: 0,
        include: [
          {
            model: StaffMember,
            as: 'staff',
            required: false,
            include: [
              {
                model: User,
                as: 'user',
                attributes: ['userId', 'firstName', 'lastName', 'email'],
              },
            ],
          },
        ],
      });

      expect(result).toEqual({
        rescues: [mockRescueData],
        pagination: {
          page: 1,
          limit: 20,
          total: 1,
          pages: 1,
        },
      });
    });

    it('should search rescues with text search', async () => {
      const options: RescueSearchOptions = {
        search: 'test',
        page: 2,
        limit: 10,
      };

      (mockRescue.findAndCountAll as vi.Mock).mockResolvedValue({
        count: 1,
        rows: [mockRescueData],
      });

      await RescueService.searchRescues(options);

      expect(mockRescue.findAndCountAll).toHaveBeenCalledWith({
        where: {
          [Op.or]: [
            { name: { [Op.iLike]: '%test%' } },
            { email: { [Op.iLike]: '%test%' } },
            { description: { [Op.iLike]: '%test%' } },
          ],
        },
        order: [['createdAt', 'DESC']],
        limit: 10,
        offset: 10,
        include: expect.any(Array),
      });
    });

    it('should filter rescues by status', async () => {
      const options: RescueSearchOptions = {
        status: 'verified',
      };

      (mockRescue.findAndCountAll as vi.Mock).mockResolvedValue({
        count: 0,
        rows: [],
      });

      await RescueService.searchRescues(options);

      expect(mockRescue.findAndCountAll).toHaveBeenCalledWith({
        where: { status: 'verified' },
        order: [['createdAt', 'DESC']],
        limit: 20,
        offset: 0,
        include: expect.any(Array),
      });
    });

    it('should filter rescues by location', async () => {
      const options: RescueSearchOptions = {
        location: 'New York',
      };

      (mockRescue.findAndCountAll as vi.Mock).mockResolvedValue({
        count: 0,
        rows: [],
      });

      await RescueService.searchRescues(options);

      expect(mockRescue.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            [Op.or]: [
              { city: { [Op.iLike]: '%New York%' } },
              { county: { [Op.iLike]: '%New York%' } },
              { country: { [Op.iLike]: '%New York%' } },
            ],
          },
          order: [['createdAt', 'DESC']],
          limit: 20,
          offset: 0,
        })
      );
    });

    it('should sort rescues by name', async () => {
      const options: RescueSearchOptions = {
        sortBy: 'name',
        sortOrder: 'ASC',
      };

      (mockRescue.findAndCountAll as vi.Mock).mockResolvedValue({
        count: 0,
        rows: [],
      });

      await RescueService.searchRescues(options);

      expect(mockRescue.findAndCountAll).toHaveBeenCalledWith({
        where: {},
        order: [['name', 'ASC']],
        limit: 20,
        offset: 0,
        include: expect.any(Array),
      });
    });

    it('should handle database errors', async () => {
      (mockRescue.findAndCountAll as vi.Mock).mockRejectedValue(new Error('Database error'));

      await expect(RescueService.searchRescues()).rejects.toThrow('Failed to search rescues');
    });
  });

  describe('getRescueById', () => {
    beforeEach(() => {
      // Clear all mocks before each test in this describe block
      vi.clearAllMocks();
    });

    it('should get rescue without statistics', async () => {
      (mockRescue.findByPk as vi.Mock).mockResolvedValue(mockRescueData);

      const result = await RescueService.getRescueById('rescue-123');

      expect(mockRescue.findByPk).toHaveBeenCalledWith('rescue-123', {
        include: [
          {
            model: StaffMember,
            as: 'staff',
            required: false,
            include: [
              {
                model: User,
                as: 'user',
                attributes: ['userId', 'firstName', 'lastName', 'email', 'userType'],
              },
            ],
          },
        ],
      });

      expect(result).toEqual(mockRescueData);
    });

    it('should get rescue with statistics when requested', async () => {
      // Clear all mocks to ensure clean state
      vi.clearAllMocks();

      (mockRescue.findByPk as vi.Mock).mockResolvedValue(mockRescueData);

      // Reset all count mocks to ensure clean state
      (mockPet.count as vi.Mock).mockReset();
      (mockApplication.count as vi.Mock).mockReset();
      (mockStaffMember.count as vi.Mock).mockReset();
      (mockPet.findAll as vi.Mock).mockReset();

      // Mock the statistics method calls in the exact order they are called
      (mockPet.count as vi.Mock)
        .mockResolvedValueOnce(10) // totalPets
        .mockResolvedValueOnce(5) // availablePets
        .mockResolvedValueOnce(3) // adoptedPets
        .mockResolvedValueOnce(2); // monthlyAdoptions

      (mockApplication.count as vi.Mock)
        .mockResolvedValueOnce(4) // totalApplications
        .mockResolvedValueOnce(1); // pendingApplications

      (mockStaffMember.count as vi.Mock).mockResolvedValue(8); // staffCount

      (mockPet.findAll as vi.Mock).mockResolvedValue([]); // recentAdoptions (empty = 0 average)

      const result = await RescueService.getRescueById('rescue-123', true);

      // Mock statistics data to match actual returned values
      const expectedStats = {
        totalPets: 10,
        availablePets: 5,
        adoptedPets: 3,
        pendingApplications: 1, // Actual returned value from mocks (2nd call)
        totalApplications: 4, // Actual returned value from mocks (1st call)
        staffCount: 8, // Actual returned value from mocks
        activeListings: 5,
        monthlyAdoptions: 2, // Actual returned value from mocks (4th call)
        averageTimeToAdoption: 0,
      };

      expect(result).toEqual({
        ...mockRescueData,
        statistics: expectedStats,
      });
    });

    it('should throw error when rescue not found', async () => {
      (mockRescue.findByPk as vi.Mock).mockResolvedValue(null);

      await expect(RescueService.getRescueById('nonexistent')).rejects.toThrow('Rescue not found');
    });

    it('should handle database errors', async () => {
      (mockRescue.findByPk as vi.Mock).mockRejectedValue(new Error('Database error'));

      await expect(RescueService.getRescueById('rescue-123')).rejects.toThrow(
        'Failed to retrieve rescue'
      );
    });
  });

  describe('createRescue', () => {
    const createData: CreateRescueRequest = {
      name: 'New Rescue',
      email: 'new@rescue.org',
      address: '456 Oak St',
      city: 'New City',
      county: 'New County',
      postcode: '54321',
      country: 'US',
      contactPerson: 'Jane Smith',
    };

    beforeEach(() => {
      // Mock transaction
      const mockTransaction = {
        commit: vi.fn(),
        rollback: vi.fn(),
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mockRescue as any).sequelize = {
        transaction: vi.fn().mockResolvedValue(mockTransaction),
      };
    });

    it('should create rescue successfully', async () => {
      (mockRescue.findOne as vi.Mock).mockResolvedValue(null); // No existing rescue
      (mockRescue.create as vi.Mock).mockResolvedValue(mockRescueData);

      const result = await RescueService.createRescue(createData, 'admin-123');

      expect(mockRescue.findOne).toHaveBeenCalledWith({
        where: { email: createData.email },
        transaction: expect.any(Object),
      });

      expect(mockRescue.create).toHaveBeenCalledWith(
        {
          ...createData,
          status: 'pending',
          isDeleted: false,
        },
        { transaction: expect.any(Object) }
      );

      expect(mockAuditLogAction).toHaveBeenCalled();
      expect(result).toEqual(mockRescueData);
    });

    it('should throw error when rescue email already exists', async () => {
      (mockRescue.findOne as vi.Mock).mockResolvedValue(mockRescueData);

      await expect(RescueService.createRescue(createData, 'admin-123')).rejects.toThrow(
        'A rescue organization with this email already exists'
      );
    });

    it('should handle database errors', async () => {
      (mockRescue.findOne as vi.Mock).mockRejectedValue(new Error('Database error'));

      await expect(RescueService.createRescue(createData, 'admin-123')).rejects.toThrow(
        'Database error'
      );
    });
  });

  describe('updateRescue', () => {
    const updateData: UpdateRescueRequest = {
      name: 'Updated Rescue',
      description: 'Updated description',
    };

    beforeEach(() => {
      const mockTransaction = {
        commit: vi.fn(),
        rollback: vi.fn(),
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mockRescue as any).sequelize = {
        transaction: vi.fn().mockResolvedValue(mockTransaction),
      };

      mockRescueData.update.mockResolvedValue(mockRescueData);
    });

    it('should update rescue successfully', async () => {
      (mockRescue.findByPk as vi.Mock).mockResolvedValue(mockRescueData);

      const result = await RescueService.updateRescue('rescue-123', updateData, 'admin-123');

      expect(mockRescue.findByPk).toHaveBeenCalledWith('rescue-123', {
        transaction: expect.any(Object),
      });

      expect(mockRescueData.update).toHaveBeenCalledWith(updateData, {
        transaction: expect.any(Object),
      });

      expect(mockAuditLogAction).toHaveBeenCalled();
      expect(result).toEqual(mockRescueData);
    });

    it('should check for email conflicts when updating email', async () => {
      const updateWithEmail = { ...updateData, email: 'newemail@rescue.org' };

      (mockRescue.findByPk as vi.Mock).mockResolvedValue(mockRescueData);
      (mockRescue.findOne as vi.Mock).mockResolvedValue(null); // No conflict

      await RescueService.updateRescue('rescue-123', updateWithEmail, 'admin-123');

      expect(mockRescue.findOne).toHaveBeenCalledWith({
        where: {
          email: 'newemail@rescue.org',
          rescueId: { [Op.ne]: 'rescue-123' },
        },
        transaction: expect.any(Object),
      });
    });

    it('should throw error when rescue not found', async () => {
      (mockRescue.findByPk as vi.Mock).mockResolvedValue(null);

      await expect(
        RescueService.updateRescue('nonexistent', updateData, 'admin-123')
      ).rejects.toThrow('Rescue not found');
    });

    it('should throw error when email already exists', async () => {
      const updateWithEmail = { email: 'existing@rescue.org' };

      (mockRescue.findByPk as vi.Mock).mockResolvedValue(mockRescueData);
      (mockRescue.findOne as vi.Mock).mockResolvedValue(mockRescueData); // Email exists

      await expect(
        RescueService.updateRescue('rescue-123', updateWithEmail, 'admin-123')
      ).rejects.toThrow('A rescue organization with this email already exists');
    });
  });

  describe('verifyRescue', () => {
    beforeEach(() => {
      const mockTransaction = {
        commit: vi.fn(),
        rollback: vi.fn(),
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mockRescue as any).sequelize = {
        transaction: vi.fn().mockResolvedValue(mockTransaction),
      };
    });

    it('should verify rescue successfully', async () => {
      const unverifiedRescue = {
        ...mockRescueData,
        status: 'pending',
        update: vi.fn().mockResolvedValue(mockRescueData),
        toJSON: vi.fn().mockReturnValue(mockRescueData),
      };
      (mockRescue.findByPk as vi.Mock).mockResolvedValue(unverifiedRescue);

      const result = await RescueService.verifyRescue(
        'rescue-123',
        'admin-123',
        'Verified by admin'
      );

      expect(unverifiedRescue.update).toHaveBeenCalledWith(
        {
          status: 'verified',
          verifiedAt: expect.any(Date),
          verifiedBy: 'admin-123',
        },
        { transaction: expect.any(Object) }
      );

      expect(mockAuditLogAction).toHaveBeenCalled();
      expect(result).toEqual(mockRescueData);
    });

    it('should throw error when rescue not found', async () => {
      (mockRescue.findByPk as vi.Mock).mockResolvedValue(null);

      await expect(RescueService.verifyRescue('nonexistent', 'admin-123')).rejects.toThrow(
        'Rescue not found'
      );
    });

    it('should throw error when rescue already verified', async () => {
      const verifiedRescue = { ...mockRescueData, status: 'verified' };
      (mockRescue.findByPk as vi.Mock).mockResolvedValue(verifiedRescue);

      await expect(RescueService.verifyRescue('rescue-123', 'admin-123')).rejects.toThrow(
        'Rescue is already verified'
      );
    });
  });

  describe('addStaffMember', () => {
    beforeEach(() => {
      // Clear all mocks and ensure proper transaction setup
      vi.clearAllMocks();

      const mockTransaction = {
        commit: vi.fn(),
        rollback: vi.fn(),
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mockRescue as any).sequelize = {
        transaction: vi.fn().mockResolvedValue(mockTransaction),
      };
    });

    it('should add staff member successfully', async () => {
      (mockRescue.findByPk as vi.Mock).mockResolvedValue(mockRescueData);
      (mockUser.findByPk as vi.Mock).mockResolvedValue(mockUserData);
      (mockStaffMember.findOne as vi.Mock).mockResolvedValue(null); // Not already a staff member
      (mockStaffMember.create as vi.Mock).mockResolvedValue(mockStaffMemberData);

      const result = await RescueService.addStaffMember(
        'rescue-123',
        'user-123',
        'Manager',
        'admin-123'
      );

      expect(mockStaffMember.findOne).toHaveBeenCalledWith({
        where: { rescueId: 'rescue-123', userId: 'user-123', isDeleted: false },
        transaction: expect.any(Object),
      });

      expect(mockStaffMember.create).toHaveBeenCalledWith(
        {
          rescueId: 'rescue-123',
          userId: 'user-123',
          title: 'Manager',
          addedBy: 'admin-123',
          isVerified: false,
          isDeleted: false,
          addedAt: expect.any(Date),
        },
        { transaction: expect.any(Object) }
      );

      expect(mockAuditLogAction).toHaveBeenCalled();
      expect(result).toEqual(mockStaffMemberData);
    });

    it('should throw error when rescue not found', async () => {
      (mockRescue.findByPk as vi.Mock).mockResolvedValue(null);

      await expect(
        RescueService.addStaffMember('nonexistent', 'user-123', 'Manager', 'admin-123')
      ).rejects.toThrow('Rescue not found');
    });

    it('should throw error when user not found', async () => {
      (mockRescue.findByPk as vi.Mock).mockResolvedValue(null); // Rescue not found first

      await expect(
        RescueService.addStaffMember('rescue-123', 'nonexistent', 'Manager', 'admin-123')
      ).rejects.toThrow('Rescue not found');
    });

    it('should throw error when rescue exists but user not found', async () => {
      // First, ensure rescue exists
      (mockRescue.findByPk as vi.Mock).mockResolvedValueOnce(mockRescueData);
      // Then, user doesn't exist
      (mockUser.findByPk as vi.Mock).mockResolvedValueOnce(null);

      await expect(
        RescueService.addStaffMember('rescue-123', 'nonexistent', 'Manager', 'admin-123')
      ).rejects.toThrow('User not found');
    });

    it('should throw error when user is already a staff member', async () => {
      (mockRescue.findByPk as vi.Mock).mockResolvedValue(mockRescueData);
      (mockUser.findByPk as vi.Mock).mockResolvedValue(mockUserData);
      (mockStaffMember.findOne as vi.Mock).mockResolvedValue(mockStaffMemberData);

      await expect(
        RescueService.addStaffMember('rescue-123', 'user-123', 'Manager', 'admin-123')
      ).rejects.toThrow('User is already a staff member of this rescue');
    });
  });

  describe('removeStaffMember', () => {
    beforeEach(() => {
      const mockTransaction = {
        commit: vi.fn(),
        rollback: vi.fn(),
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mockRescue as any).sequelize = {
        transaction: vi.fn().mockResolvedValue(mockTransaction),
      };
    });

    it('should remove staff member successfully', async () => {
      (mockStaffMember.findOne as vi.Mock).mockResolvedValue(mockStaffMemberData);

      const result = await RescueService.removeStaffMember('rescue-123', 'user-123', 'admin-123');

      expect(mockStaffMember.findOne).toHaveBeenCalledWith({
        where: { rescueId: 'rescue-123', userId: 'user-123', isDeleted: false },
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['firstName', 'lastName'],
          },
        ],
        transaction: expect.any(Object),
      });

      expect(mockStaffMemberData.update).toHaveBeenCalledWith(
        {
          isDeleted: true,
          deletedAt: expect.any(Date),
          deletedBy: 'admin-123',
        },
        { transaction: expect.any(Object) }
      );

      expect(mockAuditLogAction).toHaveBeenCalled();
      expect(result).toEqual({
        success: true,
        message: 'Staff member removed successfully',
      });
    });

    it('should throw error when staff member not found', async () => {
      (mockStaffMember.findOne as vi.Mock).mockResolvedValue(null);

      await expect(
        RescueService.removeStaffMember('rescue-123', 'user-123', 'admin-123')
      ).rejects.toThrow('Staff member not found');
    });
  });

  describe('getRescueStatistics', () => {
    it('should get rescue statistics successfully', async () => {
      // Mock pet counts
      (mockPet.count as vi.Mock)
        .mockResolvedValueOnce(10) // totalPets
        .mockResolvedValueOnce(5) // availablePets
        .mockResolvedValueOnce(3) // adoptedPets
        .mockResolvedValueOnce(2); // monthlyAdoptions

      // Mock application counts
      (mockApplication.count as vi.Mock)
        .mockResolvedValueOnce(4) // totalApplications
        .mockResolvedValueOnce(1); // pendingApplications

      // Mock staff count
      (mockStaffMember.count as vi.Mock).mockResolvedValue(8);

      // Mock recent adoptions for average calculation
      (mockPet.findAll as vi.Mock).mockResolvedValue([
        {
          created_at: new Date('2024-01-01'),
          adopted_date: new Date('2024-01-31'),
        },
        {
          created_at: new Date('2024-02-01'),
          adopted_date: new Date('2024-02-15'),
        },
      ]);

      const result = await RescueService.getRescueStatistics('rescue-123');

      expect(result).toEqual({
        totalPets: 10,
        availablePets: 5,
        adoptedPets: 3,
        pendingApplications: 1, // Actual returned value from mocks (2nd call)
        totalApplications: 4, // Actual returned value from mocks (1st call)
        staffCount: 8, // Actual returned value from mocks
        activeListings: 5,
        monthlyAdoptions: 2, // Actual returned value from mocks (4th call)
        averageTimeToAdoption: 22, // (30 + 14) / 2 = 22
      });
    });

    it('should handle zero adoptions for average calculation', async () => {
      (mockPet.count as vi.Mock).mockResolvedValue(0);
      (mockApplication.count as vi.Mock).mockResolvedValue(0);
      (mockStaffMember.count as vi.Mock).mockResolvedValue(0);
      (mockPet.findAll as vi.Mock).mockResolvedValue([]);

      const result = await RescueService.getRescueStatistics('rescue-123');

      expect(result.averageTimeToAdoption).toBe(0);
    });

    it('should handle database errors', async () => {
      (mockPet.count as vi.Mock).mockRejectedValue(new Error('Database error'));

      await expect(RescueService.getRescueStatistics('rescue-123')).rejects.toThrow(
        'Failed to retrieve rescue statistics'
      );
    });
  });

  describe('getRescuePets', () => {
    it('should get rescue pets with default options', async () => {
      const mockPets = [
        { petId: 'pet-123', name: 'Buddy', toJSON: () => ({ petId: 'pet-123', name: 'Buddy' }) },
      ];
      (mockPet.findAndCountAll as vi.Mock).mockResolvedValue({
        count: 1,
        rows: mockPets,
      });

      const result = await RescueService.getRescuePets('rescue-123');

      expect(mockPet.findAndCountAll).toHaveBeenCalledWith({
        where: { rescue_id: 'rescue-123' },
        order: [['created_at', 'DESC']],
        limit: 20,
        offset: 0,
      });

      expect(result).toEqual({
        pets: [{ petId: 'pet-123', name: 'Buddy' }],
        pagination: {
          page: 1,
          limit: 20,
          total: 1,
          pages: 1,
        },
      });
    });

    it('should filter pets by status', async () => {
      (mockPet.findAndCountAll as vi.Mock).mockResolvedValue({
        count: 0,
        rows: [],
      });

      await RescueService.getRescuePets('rescue-123', {
        status: 'available',
        page: 2,
        limit: 10,
      });

      expect(mockPet.findAndCountAll).toHaveBeenCalledWith({
        where: { rescue_id: 'rescue-123', status: 'available' },
        order: [['created_at', 'DESC']],
        limit: 10,
        offset: 10,
      });
    });

    it('should handle database errors', async () => {
      (mockPet.findAndCountAll as vi.Mock).mockRejectedValue(new Error('Database error'));

      await expect(RescueService.getRescuePets('rescue-123')).rejects.toThrow(
        'Failed to retrieve rescue pets'
      );
    });
  });

  describe('deleteRescue', () => {
    beforeEach(() => {
      const mockTransaction = {
        commit: vi.fn(),
        rollback: vi.fn(),
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mockRescue as any).sequelize = {
        transaction: vi.fn().mockResolvedValue(mockTransaction),
      };

      mockRescueData.update.mockResolvedValue(mockRescueData);
    });

    it('should soft delete rescue successfully', async () => {
      (mockRescue.findByPk as vi.Mock).mockResolvedValue(mockRescueData);

      const result = await RescueService.deleteRescue(
        'rescue-123',
        'admin-123',
        'No longer operating'
      );

      expect(mockRescueData.update).toHaveBeenCalledWith(
        {
          isDeleted: true,
          deletedAt: expect.any(Date),
          deletedBy: 'admin-123',
        },
        { transaction: expect.any(Object) }
      );

      expect(mockAuditLogAction).toHaveBeenCalled();
      expect(result).toEqual({
        success: true,
        message: 'Rescue deleted successfully',
      });
    });

    it('should throw error when rescue not found', async () => {
      (mockRescue.findByPk as vi.Mock).mockResolvedValue(null);

      await expect(RescueService.deleteRescue('nonexistent', 'admin-123')).rejects.toThrow(
        'Rescue not found'
      );
    });

    it('should throw error when rescue already deleted', async () => {
      const deletedRescue = { ...mockRescueData, isDeleted: true };
      (mockRescue.findByPk as vi.Mock).mockResolvedValue(deletedRescue);

      await expect(RescueService.deleteRescue('rescue-123', 'admin-123')).rejects.toThrow(
        'Rescue organization is already deleted'
      );
    });
  });
});
