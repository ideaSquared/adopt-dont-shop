import { describe, it, expect } from 'vitest';
import User, { UserStatus, UserType } from '../../models/User';
import { RETENTION_POLICIES, runRetentionEnforcement } from '../../services/data-retention.service';
import GdprService from '../../services/gdpr.service';

const ANON_EMAIL_DOMAIN_RX = /@redacted\.local$/;

const seedUser = async (overrides: Record<string, unknown> = {}) =>
  User.create({
    email: `user-${Date.now()}-${Math.random()}@example.com`,
    password: 'password123',
    firstName: 'Jane',
    lastName: 'Doe',
    status: UserStatus.ACTIVE,
    userType: UserType.ADOPTER,
    emailVerified: true,
    loginAttempts: 0,
    ...overrides,
  });

describe('RETENTION_POLICIES', () => {
  it('declares a soft-delete grace window of 30 days', () => {
    expect(RETENTION_POLICIES.softDeletedUsersGraceDays).toBe(30);
  });

  it('declares the documented retention windows', () => {
    expect(RETENTION_POLICIES.notificationsDays).toBe(90);
    expect(RETENTION_POLICIES.emailQueueDays).toBe(365);
    expect(RETENTION_POLICIES.refreshTokensExpiredDays).toBe(30);
    expect(RETENTION_POLICIES.idempotencyKeysHours).toBe(24);
    expect(RETENTION_POLICIES.swipeActionsMonths).toBe(24);
  });

  it('all retention windows are positive', () => {
    for (const value of Object.values(RETENTION_POLICIES)) {
      expect(value).toBeGreaterThan(0);
    }
  });
});

describe('runRetentionEnforcement — GDPR phase-2 anonymization', () => {
  it('anonymises users whose pending_anonymization_at is older than the grace window', async () => {
    const user = await seedUser();
    await GdprService.requestErasure(user.userId);

    // Backdate the pending marker to before the grace window.
    const longAgo = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000);
    await User.update(
      { pendingAnonymizationAt: longAgo },
      { where: { userId: user.userId }, paranoid: false }
    );

    const result = await runRetentionEnforcement();
    expect(result.usersAnonymised).toBeGreaterThanOrEqual(1);

    const reloaded = await User.scope('withSecrets').findByPk(user.userId, { paranoid: false });
    expect(reloaded).not.toBeNull();
    expect(reloaded!.email).toMatch(ANON_EMAIL_DOMAIN_RX);
    expect(reloaded!.pendingAnonymizationAt).toBeNull();
  });

  it('does NOT anonymise users still inside the grace window', async () => {
    const user = await seedUser();
    await GdprService.requestErasure(user.userId);
    // pendingAnonymizationAt is `now()` from requestErasure — well within grace.

    await runRetentionEnforcement();

    const reloaded = await User.scope('withSecrets').findByPk(user.userId, { paranoid: false });
    expect(reloaded).not.toBeNull();
    // PII still present; the grace window hasn't elapsed.
    expect(reloaded!.email).toBe(user.email);
    expect(reloaded!.pendingAnonymizationAt).not.toBeNull();
  });
});
