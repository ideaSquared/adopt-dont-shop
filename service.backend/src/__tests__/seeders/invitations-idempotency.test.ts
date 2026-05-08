/**
 * ADS-441 — Demo seeders must be re-run safe.
 *
 * The invitations seeder builds rows with a unique `token`. Before the fix,
 * a re-run after a partial failure would crash on the unique constraint;
 * the bulk-insert helper now uses `ignoreDuplicates: true`. We assert here
 * that running the seeder twice in a row throws nothing and leaves the
 * table in a consistent state.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import sequelize from '../../sequelize';
import { Invitation, Rescue, User } from '../../models';
import { UserStatus, UserType } from '../../models/User';
import { seedInvitations } from '../../seeders/24-invitations';

vi.mock('../../services/auditLog.service', () => ({
  AuditLogService: { log: vi.fn().mockResolvedValue(undefined) },
}));

const NUM_RESCUES = 3;
const NUM_USERS = 2;

const seedDependencies = async (): Promise<void> => {
  for (let i = 0; i < NUM_RESCUES; i++) {
    await Rescue.create({
      name: `Rescue ${i}`,
      email: `rescue${i}@test.com`,
      address: `${i} Main St`,
      city: 'London',
      postcode: 'SW1A 1AA',
      country: 'GB',
      contactPerson: 'Contact Person',
      status: 'pending',
    });
  }

  for (let i = 0; i < NUM_USERS; i++) {
    await User.create({
      userId: `seed-user-${i}`,
      email: `seed${i}@test.com`,
      password: 'hashedpassword',
      firstName: 'Seed',
      lastName: `User${i}`,
      userType: UserType.ADOPTER,
      status: UserStatus.ACTIVE,
      emailVerified: true,
    });
  }
};

describe('invitations seeder idempotency [ADS-441]', () => {
  beforeEach(async () => {
    await sequelize.sync({ force: true });
    await seedDependencies();
  });

  it('does not throw when run a second time', async () => {
    await seedInvitations();
    await expect(seedInvitations()).resolves.not.toThrow();
  });

  it('settles to a stable, non-empty row count across repeated runs', async () => {
    await seedInvitations();
    const firstRunCount = await Invitation.count();
    expect(firstRunCount).toBeGreaterThan(0);

    await seedInvitations();
    const secondRunCount = await Invitation.count();

    // The seeder clears + reinserts on each run, so the count must match
    // exactly. The behavioural guarantee is "re-running is safe and
    // converges" — not "every re-run is a strict no-op".
    expect(secondRunCount).toBe(firstRunCount);
  });
});
