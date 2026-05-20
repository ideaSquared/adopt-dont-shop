/**
 * ADS-596: any persisted change to a cached User field must drop the
 * in-process auth cache entry so the next authenticated request can't
 * ride a stale entry through the status / role / emailVerified checks
 * in `authenticateRequest`.
 */

import User, { UserStatus, UserType } from '../../models/User';
import { getCachedUser, setCachedUser, resetAuthCacheForTests } from '../../lib/auth-cache';
import { UserService } from '../../services/user.service';
import AdminService from '../../services/admin.service';
import { AuthService } from '../../services/auth.service';

describe('auth-cache invalidation [ADS-596]', () => {
  beforeEach(() => {
    resetAuthCacheForTests();
  });

  const createCachedUser = async (
    overrides: Partial<{
      email: string;
      status: UserStatus;
      emailVerified: boolean;
    }> = {}
  ) => {
    const user = await User.create({
      email: overrides.email ?? `cache-${Date.now()}-${Math.random()}@example.com`,
      password: 'hashedpassword',
      firstName: 'Cache',
      lastName: 'User',
      userType: UserType.ADOPTER,
      status: overrides.status ?? UserStatus.ACTIVE,
      emailVerified: overrides.emailVerified ?? true,
    });
    setCachedUser(user.userId, user);
    return user;
  };

  it('busts the cache when the User row is saved', async () => {
    const user = await createCachedUser();
    expect(getCachedUser(user.userId)).not.toBeNull();

    const fresh = await User.findByPk(user.userId);
    fresh!.status = UserStatus.INACTIVE;
    await fresh!.save();

    expect(getCachedUser(user.userId)).toBeNull();
  });

  it('busts the cache when the User row is destroyed', async () => {
    const user = await createCachedUser();
    expect(getCachedUser(user.userId)).not.toBeNull();

    const fresh = await User.findByPk(user.userId);
    await fresh!.destroy();

    expect(getCachedUser(user.userId)).toBeNull();
  });

  it('busts the cache on UserService.deactivateUser', async () => {
    const user = await createCachedUser();
    expect(getCachedUser(user.userId)).not.toBeNull();

    await UserService.deactivateUser(user.userId, 'admin-id');

    expect(getCachedUser(user.userId)).toBeNull();
  });

  it('busts the cache on UserService.reactivateUser', async () => {
    const user = await createCachedUser({ status: UserStatus.INACTIVE });
    expect(getCachedUser(user.userId)).not.toBeNull();

    await UserService.reactivateUser(user.userId, 'admin-id');

    expect(getCachedUser(user.userId)).toBeNull();
  });

  it('busts the cache on AdminService.suspendUser / unsuspendUser', async () => {
    const user = await createCachedUser();
    expect(getCachedUser(user.userId)).not.toBeNull();

    await AdminService.suspendUser(user.userId, 'admin-id');
    expect(getCachedUser(user.userId)).toBeNull();

    setCachedUser(user.userId, (await User.findByPk(user.userId)) as User);
    await AdminService.unsuspendUser(user.userId, 'admin-id');
    expect(getCachedUser(user.userId)).toBeNull();
  });

  it('busts the cache for every userId touched by bulkUpdateUsers', async () => {
    const a = await createCachedUser({ email: 'bulk-a@example.com' });
    const b = await createCachedUser({ email: 'bulk-b@example.com' });
    expect(getCachedUser(a.userId)).not.toBeNull();
    expect(getCachedUser(b.userId)).not.toBeNull();

    await UserService.bulkUpdateUsers(
      [{ userIds: [a.userId, b.userId], updates: { status: UserStatus.INACTIVE } }],
      'admin-id'
    );

    expect(getCachedUser(a.userId)).toBeNull();
    expect(getCachedUser(b.userId)).toBeNull();
  });

  it('busts the cache on email verification', async () => {
    const user = await User.create({
      email: 'verify@example.com',
      password: 'hashedpassword',
      firstName: 'Verify',
      lastName: 'User',
      userType: UserType.ADOPTER,
      status: UserStatus.PENDING_VERIFICATION,
      emailVerified: false,
      verificationToken: 'plain-token',
      verificationTokenExpiresAt: new Date(Date.now() + 60_000),
    });
    setCachedUser(user.userId, user);
    expect(getCachedUser(user.userId)).not.toBeNull();

    const authService = new AuthService();
    await authService.verifyEmail('plain-token');

    expect(getCachedUser(user.userId)).toBeNull();
  });

  it('busts the cache on logout when the caller userId is known', async () => {
    const user = await createCachedUser();
    expect(getCachedUser(user.userId)).not.toBeNull();

    await AuthService.logout(undefined, undefined, user.userId);

    expect(getCachedUser(user.userId)).toBeNull();
  });
});
