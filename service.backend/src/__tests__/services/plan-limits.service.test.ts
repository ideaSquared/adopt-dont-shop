import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('../../models/Rescue', () => ({
  __esModule: true,
  default: {
    findByPk: vi.fn(),
    sequelize: { transaction: vi.fn() },
  },
}));

vi.mock('../../models/Pet', () => ({
  __esModule: true,
  PetStatus: {
    AVAILABLE: 'available',
    PENDING: 'pending',
    ADOPTED: 'adopted',
    FOSTER: 'foster',
    MEDICAL_HOLD: 'medical_hold',
    BEHAVIORAL_HOLD: 'behavioral_hold',
    NOT_AVAILABLE: 'not_available',
    DECEASED: 'deceased',
  },
  default: {
    count: vi.fn(),
    create: vi.fn(),
    findByPk: vi.fn(),
  },
}));

vi.mock('../../models/StaffMember', () => ({
  __esModule: true,
  default: {
    count: vi.fn(),
    findOne: vi.fn(),
    create: vi.fn(),
  },
}));

vi.mock('../../models/Breed', () => ({ __esModule: true, default: {} }));
vi.mock('../../models/PetMedia', () => ({
  __esModule: true,
  PetMediaType: {},
  default: { bulkCreate: vi.fn() },
}));
vi.mock('../../models/PetStatusTransition', () => ({
  __esModule: true,
  default: { create: vi.fn() },
}));
vi.mock('../../models/UserFavorite', () => ({ __esModule: true, default: {} }));
vi.mock('../../models/Report', () => ({
  __esModule: true,
  ReportCategory: {},
  ReportStatus: {},
  ReportSeverity: {},
  default: {},
}));
vi.mock('../../models/User', () => ({
  __esModule: true,
  UserType: {
    ADMIN: 'admin',
    RESCUE_STAFF: 'rescue_staff',
    ADOPTER: 'adopter',
    MODERATOR: 'moderator',
  },
  default: { findByPk: vi.fn() },
}));
vi.mock('../../models', () => ({
  Application: {},
  Pet: {},
  Rescue: { findByPk: vi.fn(), sequelize: { transaction: vi.fn() } },
  StaffMember: { count: vi.fn(), findOne: vi.fn(), create: vi.fn() },
  User: { findByPk: vi.fn() },
  Role: {},
  UserRole: {},
}));
vi.mock('../../sequelize', () => ({
  __esModule: true,
  default: { getDialect: vi.fn().mockReturnValue('sqlite') },
}));
vi.mock('../../cache/redis-cache', () => ({
  cached: vi.fn((_, fn: () => unknown) => fn()),
  invalidateNamespace: vi.fn(),
}));
vi.mock('../../utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
  loggerHelpers: {
    logBusiness: vi.fn(),
    logDatabase: vi.fn(),
    logPerformance: vi.fn(),
    logExternalService: vi.fn(),
  },
}));
vi.mock('../../services/auditLog.service', () => ({
  AuditLogService: { log: vi.fn() },
}));
vi.mock('../../utils/sort-validation', () => ({ validateSortField: vi.fn() }));
vi.mock('../../utils/geolocation', () => ({
  calculateDistance: vi.fn(),
  extractCoordinates: vi.fn(),
  isValidCoordinates: vi.fn(),
  milesToKilometers: vi.fn(),
}));
vi.mock('../../services/email.service', () => ({ default: { sendEmail: vi.fn() } }));
vi.mock('../../services/companies-house.service', () => ({ verifyCompaniesHouseNumber: vi.fn() }));
vi.mock('../../services/charity-commission.service', () => ({
  verifyCharityRegistrationNumber: vi.fn(),
}));
vi.mock('../../lib/auth-cache', () => ({ invalidateAuthCache: vi.fn() }));

import Rescue from '../../models/Rescue';
import Pet, { PetStatus } from '../../models/Pet';
import StaffMember from '../../models/StaffMember';

const mockRescue = Rescue as unknown as { findByPk: ReturnType<typeof vi.fn> };
const mockPet = Pet as unknown as {
  count: ReturnType<typeof vi.fn>;
  create: ReturnType<typeof vi.fn>;
};
const mockStaff = StaffMember as unknown as { count: ReturnType<typeof vi.fn> };

describe('Plan limit enforcement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Pet active listing limit (via PetService.createPet)', () => {
    it('allows creating a pet when below the free tier limit', async () => {
      mockRescue.findByPk.mockResolvedValue({ plan: 'free' });
      mockPet.count.mockResolvedValue(10); // below 25 limit
      mockPet.create.mockResolvedValue({ petId: 'pet-1', status: PetStatus.AVAILABLE });

      const { PetService } = await import('../../services/pet.service');
      await expect(
        PetService.createPet({ name: 'Buddy', type: 'dog' } as never, 'rescue-1', 'user-1')
      ).resolves.toBeDefined();
    });

    it('throws PLAN_LIMIT_EXCEEDED when free tier limit is reached', async () => {
      mockRescue.findByPk.mockResolvedValue({ plan: 'free' });
      mockPet.count.mockResolvedValue(25); // at limit

      const { PetService } = await import('../../services/pet.service');
      await expect(
        PetService.createPet({ name: 'Buddy', type: 'dog' } as never, 'rescue-1', 'user-1')
      ).rejects.toMatchObject({ code: 'PLAN_LIMIT_EXCEEDED', limit: 25 });
    });

    it('throws PLAN_LIMIT_EXCEEDED when growth tier limit is reached', async () => {
      mockRescue.findByPk.mockResolvedValue({ plan: 'growth' });
      mockPet.count.mockResolvedValue(100); // at limit

      const { PetService } = await import('../../services/pet.service');
      await expect(
        PetService.createPet({ name: 'Buddy', type: 'dog' } as never, 'rescue-1', 'user-1')
      ).rejects.toMatchObject({ code: 'PLAN_LIMIT_EXCEEDED', limit: 100 });
    });

    it('never blocks professional plan regardless of count', async () => {
      mockRescue.findByPk.mockResolvedValue({ plan: 'professional' });
      mockPet.count.mockResolvedValue(9999);
      mockPet.create.mockResolvedValue({ petId: 'pet-1', status: PetStatus.AVAILABLE });

      const { PetService } = await import('../../services/pet.service');
      await expect(
        PetService.createPet({ name: 'Buddy', type: 'dog' } as never, 'rescue-1', 'user-1')
      ).resolves.toBeDefined();
    });
  });

  describe('Staff seat limit (via RescueService.assertStaffSeatLimit)', () => {
    it('allows adding staff when below free tier limit', async () => {
      // Access the private method indirectly through addStaffMember — test
      // the limit check by asserting it doesn't throw at count 4 (limit is 5).
      mockRescue.findByPk.mockResolvedValue({ plan: 'free', rescueId: 'rescue-1' });
      mockStaff.count.mockResolvedValue(4); // below 5 limit

      const { RescueService } = await import('../../services/rescue.service');
      // We only test assertStaffSeatLimit behaviour; stub the rest of addStaffMember
      // by calling it and catching errors other than PLAN_LIMIT_EXCEEDED.
      try {
        await RescueService.addStaffMember('rescue-1', 'user-2', undefined, 'user-1');
      } catch (err) {
        const e = err as { code?: string };
        expect(e.code).not.toBe('PLAN_LIMIT_EXCEEDED');
      }
    });

    it('throws PLAN_LIMIT_EXCEEDED when free tier staff limit is reached', async () => {
      mockRescue.findByPk.mockResolvedValue({ plan: 'free', rescueId: 'rescue-1' });
      mockStaff.count.mockResolvedValue(5); // at limit

      const { RescueService } = await import('../../services/rescue.service');
      await expect(
        RescueService.addStaffMember('rescue-1', 'user-2', undefined, 'user-1')
      ).rejects.toMatchObject({ code: 'PLAN_LIMIT_EXCEEDED', limit: 5 });
    });

    it('throws PLAN_LIMIT_EXCEEDED when growth tier staff limit is reached', async () => {
      mockRescue.findByPk.mockResolvedValue({ plan: 'growth', rescueId: 'rescue-1' });
      mockStaff.count.mockResolvedValue(15); // at limit

      const { RescueService } = await import('../../services/rescue.service');
      await expect(
        RescueService.addStaffMember('rescue-1', 'user-2', undefined, 'user-1')
      ).rejects.toMatchObject({ code: 'PLAN_LIMIT_EXCEEDED', limit: 15 });
    });

    it('never blocks professional plan regardless of staff count', async () => {
      mockRescue.findByPk.mockResolvedValue({ plan: 'professional', rescueId: 'rescue-1' });
      mockStaff.count.mockResolvedValue(500);

      const { RescueService } = await import('../../services/rescue.service');
      try {
        await RescueService.addStaffMember('rescue-1', 'user-2', undefined, 'user-1');
      } catch (err) {
        const e = err as { code?: string };
        expect(e.code).not.toBe('PLAN_LIMIT_EXCEEDED');
      }
    });
  });
});
