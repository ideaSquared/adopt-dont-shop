import { vi, beforeEach, afterEach, describe, it, expect } from 'vitest';
import sequelize from '../../sequelize';
import { Rescue, StaffMember, User, Role, UserRole } from '../../models';
import { UserType, UserStatus } from '../../models/User';
import { RescueService } from '../../services/rescue.service';
import type { RescueRegistrationRequest } from '@adopt-dont-shop/lib.validation';

// Mock external services
vi.mock('../../services/auditLog.service', async importOriginal => {
  const actual = await importOriginal<typeof import('../../services/auditLog.service')>();
  return {
    ...actual,
    AuditLogService: {
      log: vi.fn().mockResolvedValue(undefined),
    },
  };
});
vi.mock('../../services/companies-house.service', () => ({
  verifyCompaniesHouseNumber: vi.fn().mockResolvedValue({ verified: false, reason: 'No API key' }),
}));
vi.mock('../../services/charity-commission.service', () => ({
  verifyCharityRegistrationNumber: vi
    .fn()
    .mockResolvedValue({ verified: false, reason: 'No API key' }),
}));
vi.mock('../../services/email.service', () => ({
  default: { sendEmail: vi.fn().mockResolvedValue('email-id') },
}));
vi.mock('../../socket/socket-registry', () => ({
  emitToRescue: vi.fn(),
  emitToUser: vi.fn(),
  emitAuthRoleChanged: vi.fn(),
  disconnectAllSockets: vi.fn(),
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

const validRegistration: RescueRegistrationRequest = {
  firstName: 'Jane',
  lastName: 'Doe',
  email: 'jane@example.com',
  password: 'Password1!',
  name: 'Happy Tails Rescue',
  rescueEmail: 'contact@happytails.org',
  address: '1 Rescue Lane',
  city: 'London',
  postcode: 'SW1A 1AA',
  country: 'GB',
};

describe('RescueService.registerRescue', () => {
  beforeEach(async () => {
    await sequelize.sync({ force: true });

    // Create rescue_staff role for the registration flow
    await Role.create({
      name: 'rescue_staff',
      description: 'Rescue staff role',
    });

    vi.clearAllMocks();
  });

  afterEach(async () => {
    await UserRole.destroy({ where: {}, truncate: true, cascade: true });
    await StaffMember.destroy({ where: {}, truncate: true, cascade: true });
    await Rescue.destroy({ where: {}, truncate: true, cascade: true });
    await User.destroy({ where: {}, truncate: true, cascade: true });
    await Role.destroy({ where: {}, truncate: true, cascade: true });
  });

  it('creates a user, rescue, and staff member in a single operation', async () => {
    const result = await RescueService.registerRescue(validRegistration);

    expect(result.rescueId).toBeDefined();
    expect(result.userId).toBeDefined();

    // User was created with correct attributes
    const user = await User.findByPk(result.userId);
    expect(user).not.toBeNull();
    expect(user!.email).toBe('jane@example.com');
    expect(user!.firstName).toBe('Jane');
    expect(user!.userType).toBe(UserType.RESCUE_STAFF);
    expect(user!.status).toBe(UserStatus.PENDING_VERIFICATION);
    expect(user!.emailVerified).toBe(false);

    // Rescue was created in pending state
    const rescue = await Rescue.findByPk(result.rescueId);
    expect(rescue).not.toBeNull();
    expect(rescue!.name).toBe('Happy Tails Rescue');
    expect(rescue!.email).toBe('contact@happytails.org');
    expect(rescue!.status).toBe('pending');

    // Staff member was created as owner
    const staff = await StaffMember.findOne({
      where: { rescueId: result.rescueId, userId: result.userId },
    });
    expect(staff).not.toBeNull();
    expect(staff!.title).toBe('Owner');
    expect(staff!.isVerified).toBe(true);

    // User has rescue_staff role
    const rescueStaffRole = await Role.findOne({ where: { name: 'rescue_staff' } });
    const userRole = await UserRole.findOne({
      where: { userId: result.userId, roleId: rescueStaffRole!.roleId },
    });
    expect(userRole).not.toBeNull();
  });

  it('rejects registration when user email already exists', async () => {
    await User.create({
      userId: 'existing-user',
      email: 'jane@example.com',
      password: 'hashedpassword',
      firstName: 'Existing',
      lastName: 'User',
      userType: UserType.ADOPTER,
      status: UserStatus.ACTIVE,
      emailVerified: true,
    });

    await expect(RescueService.registerRescue(validRegistration)).rejects.toThrow(
      'A user with this email already exists'
    );
  });

  it('rejects registration when rescue email already exists', async () => {
    await Rescue.create({
      name: 'Existing Rescue',
      email: 'contact@happytails.org',
      address: '2 Other Lane',
      city: 'Manchester',
      postcode: 'M1 1AA',
      country: 'GB',
      contactPerson: 'Someone',
      status: 'pending',
    });

    await expect(RescueService.registerRescue(validRegistration)).rejects.toThrow(
      'A rescue organization with this email already exists'
    );
  });

  it('rejects duplicate Companies House number', async () => {
    await Rescue.create({
      name: 'Existing Rescue',
      email: 'other@rescue.org',
      address: '2 Other Lane',
      city: 'Manchester',
      postcode: 'M1 1AA',
      country: 'GB',
      contactPerson: 'Someone',
      status: 'pending',
      companiesHouseNumber: 'AB123456',
    });

    await expect(
      RescueService.registerRescue({
        ...validRegistration,
        companiesHouseNumber: 'AB123456',
      })
    ).rejects.toThrow('A rescue is already registered with this Companies House number');
  });

  it('gracefully handles external verification failure without failing registration', async () => {
    const { verifyCompaniesHouseNumber } = await import('../../services/companies-house.service');
    vi.mocked(verifyCompaniesHouseNumber).mockRejectedValueOnce(new Error('Network timeout'));

    const result = await RescueService.registerRescue({
      ...validRegistration,
      companiesHouseNumber: '12345678',
    });

    // Registration should succeed
    expect(result.rescueId).toBeDefined();

    // Rescue remains in pending state
    const rescue = await Rescue.findByPk(result.rescueId);
    expect(rescue!.status).toBe('pending');
  });

  it('sets contactPerson from owner name', async () => {
    const result = await RescueService.registerRescue(validRegistration);

    const rescue = await Rescue.findByPk(result.rescueId);
    expect(rescue!.contactPerson).toBe('Jane Doe');
  });
});
