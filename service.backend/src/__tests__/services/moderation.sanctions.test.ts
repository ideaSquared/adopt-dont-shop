/**
 * ADS C4-5: behaviour tests for the dismissible-sanction-banner backend.
 *
 * Exercises ModerationService.getActiveSanctionsForUser and
 * ModerationService.acknowledgeSanction — the two methods that power
 * GET /api/v1/auth/sanctions/active and
 * POST /api/v1/auth/sanctions/:id/acknowledge.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import sequelize from '../../sequelize';
import User, { UserStatus, UserType } from '../../models/User';
import ModeratorAction, { ActionSeverity, ActionType } from '../../models/ModeratorAction';
import moderationService from '../../services/moderation.service';

const seedUsers = async () => {
  const moderator = await User.create({
    email: 'sanction-mod@example.com',
    password: 'hashedpassword',
    firstName: 'Mod',
    lastName: 'User',
    userType: UserType.ADMIN,
    status: UserStatus.ACTIVE,
  });
  const target = await User.create({
    email: 'sanction-target@example.com',
    password: 'hashedpassword',
    firstName: 'Target',
    lastName: 'User',
    userType: UserType.ADOPTER,
    status: UserStatus.ACTIVE,
  });
  const stranger = await User.create({
    email: 'sanction-stranger@example.com',
    password: 'hashedpassword',
    firstName: 'Stranger',
    lastName: 'User',
    userType: UserType.ADOPTER,
    status: UserStatus.ACTIVE,
  });
  return { moderator, target, stranger };
};

const createSanction = async (
  moderatorId: string,
  targetUserId: string,
  overrides: Partial<{
    actionType: ActionType;
    severity: ActionSeverity;
    expiresAt: Date | null;
    acknowledgedAt: Date | null;
    isActive: boolean;
    reason: string;
  }> = {}
) =>
  ModeratorAction.create({
    moderatorId,
    targetEntityType: 'user',
    targetEntityId: targetUserId,
    targetUserId,
    actionType: overrides.actionType ?? ActionType.WARNING_ISSUED,
    severity: overrides.severity ?? ActionSeverity.MEDIUM,
    reason: overrides.reason ?? 'Test sanction',
    isActive: overrides.isActive ?? true,
    notificationSent: false,
    ...(overrides.expiresAt !== undefined && overrides.expiresAt !== null
      ? { expiresAt: overrides.expiresAt }
      : {}),
    ...(overrides.acknowledgedAt !== undefined && overrides.acknowledgedAt !== null
      ? { acknowledgedAt: overrides.acknowledgedAt }
      : {}),
  });

describe('ModerationService sanctions (C4-5)', () => {
  beforeEach(async () => {
    await sequelize.sync({ force: true });
  });

  afterEach(async () => {
    await ModeratorAction.destroy({ where: {}, truncate: true, cascade: true });
    await User.destroy({ where: {}, truncate: true, cascade: true });
  });

  describe('getActiveSanctionsForUser', () => {
    it('returns active unacknowledged sanctions targeted at the user', async () => {
      const { moderator, target } = await seedUsers();
      await createSanction(moderator.userId, target.userId, {
        actionType: ActionType.WARNING_ISSUED,
      });
      await createSanction(moderator.userId, target.userId, {
        actionType: ActionType.USER_SUSPENDED,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });

      const sanctions = await moderationService.getActiveSanctionsForUser(target.userId);

      expect(sanctions).toHaveLength(2);
      const types = sanctions.map(s => s.actionType).sort();
      expect(types).toEqual([ActionType.USER_SUSPENDED, ActionType.WARNING_ISSUED].sort());
    });

    it('excludes sanctions the user has already acknowledged', async () => {
      const { moderator, target } = await seedUsers();
      await createSanction(moderator.userId, target.userId, {
        acknowledgedAt: new Date(),
      });

      const sanctions = await moderationService.getActiveSanctionsForUser(target.userId);

      expect(sanctions).toHaveLength(0);
    });

    it('excludes sanctions whose expiresAt is in the past', async () => {
      const { moderator, target } = await seedUsers();
      await createSanction(moderator.userId, target.userId, {
        expiresAt: new Date(Date.now() - 60 * 1000),
      });

      const sanctions = await moderationService.getActiveSanctionsForUser(target.userId);

      expect(sanctions).toHaveLength(0);
    });

    it('excludes inactive (reversed) sanctions', async () => {
      const { moderator, target } = await seedUsers();
      await createSanction(moderator.userId, target.userId, {
        isActive: false,
      });

      const sanctions = await moderationService.getActiveSanctionsForUser(target.userId);

      expect(sanctions).toHaveLength(0);
    });

    it('excludes sanctions whose targetUserId is a different user', async () => {
      const { moderator, target, stranger } = await seedUsers();
      await createSanction(moderator.userId, stranger.userId);

      const sanctions = await moderationService.getActiveSanctionsForUser(target.userId);

      expect(sanctions).toHaveLength(0);
    });

    it('excludes non-sanction action types (e.g. CONTENT_REMOVED)', async () => {
      const { moderator, target } = await seedUsers();
      await createSanction(moderator.userId, target.userId, {
        actionType: ActionType.CONTENT_REMOVED,
      });

      const sanctions = await moderationService.getActiveSanctionsForUser(target.userId);

      expect(sanctions).toHaveLength(0);
    });
  });

  describe('acknowledgeSanction', () => {
    it('sets acknowledgedAt for a sanction owned by the caller', async () => {
      const { moderator, target } = await seedUsers();
      const action = await createSanction(moderator.userId, target.userId);

      await moderationService.acknowledgeSanction(target.userId, action.actionId);

      const reloaded = await ModeratorAction.findByPk(action.actionId);
      expect(reloaded?.acknowledgedAt).toBeTruthy();
    });

    it('hides the sanction from subsequent getActiveSanctionsForUser calls', async () => {
      const { moderator, target } = await seedUsers();
      const action = await createSanction(moderator.userId, target.userId);

      await moderationService.acknowledgeSanction(target.userId, action.actionId);
      const sanctions = await moderationService.getActiveSanctionsForUser(target.userId);

      expect(sanctions).toHaveLength(0);
    });

    it('rejects acknowledgement by a user who is not the target (403)', async () => {
      const { moderator, target, stranger } = await seedUsers();
      const action = await createSanction(moderator.userId, target.userId);

      await expect(
        moderationService.acknowledgeSanction(stranger.userId, action.actionId)
      ).rejects.toMatchObject({ statusCode: 403 });
    });

    it('throws 404 when the sanction does not exist', async () => {
      const { target } = await seedUsers();

      await expect(
        moderationService.acknowledgeSanction(target.userId, '0192f7b4-0000-7000-8000-000000000000')
      ).rejects.toMatchObject({ statusCode: 404 });
    });

    it('is idempotent — a second acknowledge leaves the timestamp unchanged', async () => {
      const { moderator, target } = await seedUsers();
      const action = await createSanction(moderator.userId, target.userId);

      await moderationService.acknowledgeSanction(target.userId, action.actionId);
      const first = await ModeratorAction.findByPk(action.actionId);
      const firstAck = first?.acknowledgedAt;

      await new Promise(resolve => setTimeout(resolve, 5));
      await moderationService.acknowledgeSanction(target.userId, action.actionId);
      const second = await ModeratorAction.findByPk(action.actionId);

      expect(second?.acknowledgedAt?.toISOString()).toBe(firstAck?.toISOString());
    });
  });
});
