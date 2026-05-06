/**
 * Production first-run bootstrap.
 *
 * NOT a seeder — invoked once after the initial deploy as a one-shot job
 * (k8s Job, ECS task, or GitHub Action with prod credentials). Idempotent:
 * if any user with the admin role already exists, the call is a no-op.
 *
 * Reference data (roles, permissions, etc.) must already exist via
 * migrations or the reference-seed step before this runs.
 *
 * Forces password reset on first login by setting resetTokenForceFlag.
 * Reads credentials from environment — never hard-coded, never logged.
 */

import Role from '../../models/Role';
import User, { UserStatus, UserType } from '../../models/User';
import UserRole from '../../models/UserRole';
import { assertSeedAllowed } from '../lib/env-guard';

const ADMIN_ROLE_NAME = 'admin';

const requireEnv = (name: string): string => {
  const value = process.env[name];
  if (!value || value.trim() === '') {
    throw new Error(`Bootstrap requires env var ${name}`);
  }
  return value;
};

export async function createInitialAdmin(): Promise<{ created: boolean }> {
  assertSeedAllowed('bootstrap');

  const adminRole = await Role.findOne({ where: { name: ADMIN_ROLE_NAME } });
  if (!adminRole) {
    throw new Error(
      `Cannot bootstrap: role "${ADMIN_ROLE_NAME}" not found. ` +
        `Run reference seeders / migrations first.`
    );
  }

  const existingAdminCount = await UserRole.count({ where: { roleId: adminRole.roleId } });
  if (existingAdminCount > 0) {
    // eslint-disable-next-line no-console
    console.log('Admin already exists — bootstrap skipped (no-op).');
    return { created: false };
  }

  const email = requireEnv('ADMIN_EMAIL');
  const tempPassword = requireEnv('ADMIN_INITIAL_PASSWORD');

  // Password is hashed by User.beforeCreate hook.
  const user = await User.create({
    email,
    password: tempPassword,
    firstName: 'Admin',
    lastName: 'User',
    userType: UserType.ADMIN,
    status: UserStatus.ACTIVE,
    emailVerified: false,
    resetTokenForceFlag: true,
    termsAcceptedAt: new Date(),
    privacyPolicyAcceptedAt: new Date(),
  } as never);

  await UserRole.create({
    userId: user.userId,
    roleId: adminRole.roleId,
  } as never);

  // eslint-disable-next-line no-console
  console.log(`Initial admin created (${email}). Password reset required on first login.`);
  return { created: true };
}
