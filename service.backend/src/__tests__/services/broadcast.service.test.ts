import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Notification, { NotificationChannel } from '../../models/Notification';
import Role from '../../models/Role';
import User, { UserStatus, UserType } from '../../models/User';
import UserRole from '../../models/UserRole';
import sequelize from '../../sequelize';
import { BroadcastService } from '../../services/broadcast.service';

// Sidestep the channel service's email/push/SMS side-effects — we
// assert at the broadcast layer (counts + persisted in-app rows) and
// trust the channel service's own tests for downstream delivery.
vi.mock('../../services/notificationChannelService', () => ({
  NotificationChannelService: {
    getDeliveryChannels: vi.fn(async () => ['email']),
    deliverToChannels: vi.fn(async () => []),
    isInQuietHours: vi.fn(() => false),
  },
}));

vi.mock('../../services/auditLog.service', () => ({
  AuditLogService: { log: vi.fn(async () => undefined) },
}));

import { NotificationChannelService } from '../../services/notificationChannelService';

const mockedChannelService = vi.mocked(NotificationChannelService);

const createUser = async (
  email: string,
  status: UserStatus = UserStatus.ACTIVE,
  userType: UserType = UserType.ADOPTER
): Promise<string> => {
  const user = await User.create({
    email,
    password: 'hashed-password-min-length',
    firstName: 'Test',
    lastName: 'User',
    status,
    userType,
    loginAttempts: 0,
    emailVerified: true,
  });
  return user.userId;
};

const seedRoles = async (): Promise<Record<string, number>> => {
  const names = [
    'super_admin',
    'admin',
    'moderator',
    'rescue_admin',
    'rescue_staff',
    'rescue_volunteer',
    'adopter',
    'verified_adopter',
  ];
  const out: Record<string, number> = {};
  for (const name of names) {
    const [role] = await Role.findOrCreate({
      where: { name },
      defaults: { name, description: name },
    });
    out[name] = role.roleId;
  }
  return out;
};

const assignRole = async (userId: string, roleId: number): Promise<void> => {
  await UserRole.create({ userId, roleId });
};

const seedCohorts = async (): Promise<{
  roles: Record<string, number>;
  staffId: string;
  rescueStaffId: string;
  rescueVolunteerId: string;
  adopterId: string;
  inactiveAdopterId: string;
}> => {
  const roles = await seedRoles();
  const staffId = await createUser('admin@test.dev', UserStatus.ACTIVE, UserType.ADMIN);
  await assignRole(staffId, roles.admin);

  const rescueStaffId = await createUser(
    'rescue@test.dev',
    UserStatus.ACTIVE,
    UserType.RESCUE_STAFF
  );
  await assignRole(rescueStaffId, roles.rescue_staff);

  const rescueVolunteerId = await createUser('vol@test.dev');
  await assignRole(rescueVolunteerId, roles.rescue_volunteer);

  const adopterId = await createUser('adopter@test.dev');
  await assignRole(adopterId, roles.adopter);

  const inactiveAdopterId = await createUser(
    'inactive@test.dev',
    UserStatus.SUSPENDED,
    UserType.ADOPTER
  );
  await assignRole(inactiveAdopterId, roles.adopter);

  return { roles, staffId, rescueStaffId, rescueVolunteerId, adopterId, inactiveAdopterId };
};

describe('BroadcastService', () => {
  beforeEach(async () => {
    // Paranoid User model + SQLite truncate-as-delete in setup leaves
    // soft-deleted rows that re-trigger the unique-email constraint on
    // re-seed. Rebuilding the schema each test is the simplest reset.
    await sequelize.sync({ force: true });
    mockedChannelService.getDeliveryChannels.mockResolvedValue(['email']);
    mockedChannelService.deliverToChannels.mockResolvedValue([]);
    mockedChannelService.isInQuietHours.mockReturnValue(false);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('audience resolution', () => {
    it('targets every active user for "all"', async () => {
      const cohorts = await seedCohorts();

      const result = await BroadcastService.broadcast({
        audience: 'all',
        title: 'Hello',
        body: 'World',
        channels: [NotificationChannel.IN_APP],
        initiatedBy: cohorts.staffId,
      });

      // 4 active users: admin, rescue_staff, rescue_volunteer, adopter
      // (the suspended adopter is excluded).
      expect(result.targetCount).toBe(4);
      expect(result.deliveredInApp).toBe(4);
    });

    it('targets only rescue role holders for "all-rescues"', async () => {
      const cohorts = await seedCohorts();

      const result = await BroadcastService.broadcast({
        audience: 'all-rescues',
        title: 'Rescue news',
        body: 'Update',
        channels: [NotificationChannel.IN_APP],
        initiatedBy: cohorts.staffId,
      });

      // rescue_staff + rescue_volunteer
      expect(result.targetCount).toBe(2);
    });

    it('targets only staff (admin/super_admin/moderator) for "all-staff"', async () => {
      const cohorts = await seedCohorts();

      const result = await BroadcastService.broadcast({
        audience: 'all-staff',
        title: 'Staff memo',
        body: 'Update',
        channels: [NotificationChannel.IN_APP],
        initiatedBy: cohorts.staffId,
      });

      expect(result.targetCount).toBe(1);
    });

    it('excludes rescue + staff users for "all-adopters"', async () => {
      const cohorts = await seedCohorts();

      const result = await BroadcastService.broadcast({
        audience: 'all-adopters',
        title: 'Adopter news',
        body: 'Update',
        channels: [NotificationChannel.IN_APP],
        initiatedBy: cohorts.staffId,
      });

      // Only the active adopter — the suspended one is excluded by status.
      expect(result.targetCount).toBe(1);
    });

    it('skips suspended users from "all"', async () => {
      const roles = await seedRoles();
      const active = await createUser('a@test.dev');
      await assignRole(active, roles.adopter);
      const suspended = await createUser('s@test.dev', UserStatus.SUSPENDED);
      await assignRole(suspended, roles.adopter);

      const result = await BroadcastService.broadcast({
        audience: 'all',
        title: 'x',
        body: 'y',
        channels: [NotificationChannel.IN_APP],
        initiatedBy: active,
      });

      expect(result.targetCount).toBe(1);
    });
  });

  describe('preferences and DND', () => {
    it('counts DND users as skipped without invoking channel delivery', async () => {
      const cohorts = await seedCohorts();
      mockedChannelService.isInQuietHours.mockReturnValue(true);

      const result = await BroadcastService.broadcast({
        audience: 'all-staff',
        title: 'Memo',
        body: 'Body',
        channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
        initiatedBy: cohorts.staffId,
      });

      expect(result.targetCount).toBe(1);
      expect(result.skippedByDnd).toBe(1);
      expect(mockedChannelService.deliverToChannels).not.toHaveBeenCalled();
      // In-app row is still persisted — DND only gates external channels.
      expect(result.deliveredInApp).toBe(1);
    });

    it('counts users with email disabled as skipped-by-prefs', async () => {
      const cohorts = await seedCohorts();
      mockedChannelService.getDeliveryChannels.mockResolvedValue([]);

      const result = await BroadcastService.broadcast({
        audience: 'all-staff',
        title: 'Memo',
        body: 'Body',
        channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
        initiatedBy: cohorts.staffId,
      });

      expect(result.skippedByPrefs).toBe(1);
      expect(mockedChannelService.deliverToChannels).not.toHaveBeenCalled();
    });
  });

  describe('persistence', () => {
    it('writes one in-app Notification per recipient', async () => {
      const cohorts = await seedCohorts();

      await BroadcastService.broadcast({
        audience: 'all-rescues',
        title: 'Hi',
        body: 'Body',
        channels: [NotificationChannel.IN_APP],
        initiatedBy: cohorts.staffId,
      });

      const rows = await Notification.findAll();
      expect(rows).toHaveLength(2);
      for (const row of rows) {
        expect(row.title).toBe('Hi');
        expect(row.channel).toBe(NotificationChannel.IN_APP);
      }
    });
  });

  describe('previewAudienceCount', () => {
    it('returns the active user count without writing anything', async () => {
      const cohorts = await seedCohorts();

      const count = await BroadcastService.previewAudienceCount('all');
      expect(count).toBe(4);
      const after = await Notification.count();
      expect(after).toBe(0);
      // and previewing doesn't change the seeded data
      expect(cohorts.adopterId).toBeDefined();
    });
  });
});
