import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import sequelize from '../../sequelize';
import User, { UserStatus, UserType } from '../../models/User';
import Report, { ReportStatus, ReportCategory, ReportSeverity } from '../../models/Report';
import ModeratorAction, { ActionType, ActionSeverity } from '../../models/ModeratorAction';

describe('ModerationService', () => {
  beforeEach(async () => {
    await sequelize.sync({ force: true });
  });

  afterEach(async () => {
    await ModeratorAction.destroy({ where: {}, truncate: true, cascade: true });
    await Report.destroy({ where: {}, truncate: true, cascade: true });
    await User.destroy({ where: {}, truncate: true, cascade: true });
  });

  describe('Report Management', () => {
    it('should create a new report with all required fields', async () => {
      const reporter = await User.create({
        email: 'reporter@example.com',
        password: 'hashedpassword',
        firstName: 'Reporter',
        lastName: 'User',
        userType: UserType.ADOPTER,
        status: UserStatus.ACTIVE,
      });

      const reportedUser = await User.create({
        email: 'reported@example.com',
        password: 'hashedpassword',
        firstName: 'Reported',
        lastName: 'User',
        userType: UserType.ADOPTER,
        status: UserStatus.ACTIVE,
      });

      const report = await Report.create({
        reporterId: reporter.userId,
        reportedEntityType: 'user',
        reportedEntityId: reportedUser.userId,
        reportedUserId: reportedUser.userId,
        category: ReportCategory.INAPPROPRIATE_CONTENT,
        severity: ReportSeverity.HIGH,
        title: 'Test Report',
        description: 'Test description',
        evidence: [],
        status: ReportStatus.PENDING,
      });

      expect(report).toBeDefined();
      expect(report.reporterId).toBe(reporter.userId);
      expect(report.category).toBe(ReportCategory.INAPPROPRIATE_CONTENT);
    });

    it('should get reports with filters', async () => {
      const reporter = await User.create({
        email: 'reporter@example.com',
        password: 'hashedpassword',
        firstName: 'Reporter',
        lastName: 'User',
        userType: UserType.ADOPTER,
        status: UserStatus.ACTIVE,
      });

      const reportedUser = await User.create({
        email: 'reported@example.com',
        password: 'hashedpassword',
        firstName: 'Reported',
        lastName: 'User',
        userType: UserType.ADOPTER,
        status: UserStatus.ACTIVE,
      });

      await Report.create({
        reporterId: reporter.userId,
        reportedEntityType: 'user',
        reportedEntityId: reportedUser.userId,
        reportedUserId: reportedUser.userId,
        category: ReportCategory.INAPPROPRIATE_CONTENT,
        severity: ReportSeverity.HIGH,
        title: 'Test Report',
        description: 'Test description',
        evidence: [],
        status: ReportStatus.PENDING,
      });

      const reports = await Report.findAll({
        where: { status: ReportStatus.PENDING },
      });

      expect(reports).toHaveLength(1);
      expect(reports[0].category).toBe(ReportCategory.INAPPROPRIATE_CONTENT);
    });
  });

  describe('Moderator Actions', () => {
    it('should record moderator action', async () => {
      const moderator = await User.create({
        email: 'moderator@example.com',
        password: 'hashedpassword',
        firstName: 'Moderator',
        lastName: 'User',
        userType: UserType.ADMIN,
        status: UserStatus.ACTIVE,
      });

      const targetUser = await User.create({
        email: 'target@example.com',
        password: 'hashedpassword',
        firstName: 'Target',
        lastName: 'User',
        userType: UserType.ADOPTER,
        status: UserStatus.ACTIVE,
      });

      const action = await ModeratorAction.create({
        moderatorId: moderator.userId,
        targetEntityType: 'user',
        targetEntityId: targetUser.userId,
        actionType: ActionType.WARNING_ISSUED,
        severity: ActionSeverity.LOW,
        reason: 'Test warning',
        evidence: [],
      });

      expect(action).toBeDefined();
      expect(action.actionType).toBe(ActionType.WARNING_ISSUED);
      expect(action.moderatorId).toBe(moderator.userId);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid report data gracefully', async () => {
      await expect(
        Report.create({
          reporterId: 'invalid-user-id',
          reportedEntityType: 'user',
          reportedEntityId: 'invalid-entity-id',
          category: ReportCategory.SPAM,
          severity: ReportSeverity.LOW,
          title: '',
          description: 'Test',
          evidence: [],
          status: ReportStatus.PENDING,
        })
      ).rejects.toThrow();
    });

    it('should handle empty report queries gracefully', async () => {
      const reports = await Report.findAll();
      expect(reports).toHaveLength(0);
    });
  });
});
