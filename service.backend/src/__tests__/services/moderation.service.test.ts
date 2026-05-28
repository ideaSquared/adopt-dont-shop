import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import sequelize from '../../sequelize';
import User, { UserStatus, UserType } from '../../models/User';
import Report, { ReportStatus, ReportCategory, ReportSeverity } from '../../models/Report';
import ModeratorAction, { ActionType, ActionSeverity } from '../../models/ModeratorAction';
import { AuditLog } from '../../models/AuditLog';
import moderationService from '../../services/moderation.service';
import { NotificationService } from '../../services/notification.service';
import { NotificationType } from '../../models/Notification';
import { NotFoundError } from '../../middleware/error-handler';

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

  // EntityInspector activity tab — Phase 2. Moderation audit writers emit
  // category='Report' with metadata.entityId set to the reportId, matching
  // the contract `AuditLogService.getEntityActivityLog` queries against.
  describe('getReportActivityLog', () => {
    const seedReportWithAudit = async () => {
      const reporter = await User.create({
        email: 'reporter-activity@example.com',
        password: 'hashedpassword',
        firstName: 'Reporter',
        lastName: 'User',
        userType: UserType.ADOPTER,
        status: UserStatus.ACTIVE,
      });
      const reported = await User.create({
        email: 'reported-activity@example.com',
        password: 'hashedpassword',
        firstName: 'Reported',
        lastName: 'User',
        userType: UserType.ADOPTER,
        status: UserStatus.ACTIVE,
      });
      const report = await Report.create({
        reporterId: reporter.userId,
        reportedEntityType: 'user',
        reportedEntityId: reported.userId,
        reportedUserId: reported.userId,
        category: ReportCategory.SPAM,
        severity: ReportSeverity.LOW,
        title: 'Activity-log seed',
        description: 'seed',
        evidence: [],
        status: ReportStatus.PENDING,
      });

      await AuditLog.create({
        service: 'adopt-dont-shop-backend',
        user: reporter.userId,
        action: 'REPORT_SUBMITTED',
        level: 'INFO',
        timestamp: new Date('2024-03-01T10:00:00Z'),
        metadata: { entityId: report.reportId, details: { title: report.title } },
        category: 'Report',
      });

      await AuditLog.create({
        service: 'adopt-dont-shop-backend',
        user: reporter.userId,
        action: 'REPORT_ASSIGNED',
        level: 'INFO',
        timestamp: new Date('2024-03-02T10:00:00Z'),
        metadata: { entityId: report.reportId },
        category: 'Report',
      });

      // Noise — wrong entity, must not appear in results.
      await AuditLog.create({
        service: 'adopt-dont-shop-backend',
        user: reporter.userId,
        action: 'REPORT_SUBMITTED',
        level: 'INFO',
        timestamp: new Date('2024-03-03T10:00:00Z'),
        metadata: { entityId: 'some-other-report' },
        category: 'Report',
      });

      return { report };
    };

    it('returns audit-log rows scoped to the given reportId in reverse chronological order', async () => {
      const { report } = await seedReportWithAudit();

      const activity = await moderationService.getReportActivityLog(report.reportId);

      expect(activity).toHaveLength(2);
      expect(activity.map(a => a.action)).toEqual(['REPORT_ASSIGNED', 'REPORT_SUBMITTED']);
      // Verifies the formatter is being invoked (category preserved verbatim).
      expect(activity[0].category).toBe('Report');
    });

    it('throws NotFoundError when the report does not exist', async () => {
      await expect(
        moderationService.getReportActivityLog('00000000-0000-4000-a000-000000000000')
      ).rejects.toThrow(NotFoundError);
    });

    it('respects limit and offset pagination', async () => {
      const { report } = await seedReportWithAudit();

      const firstPage = await moderationService.getReportActivityLog(report.reportId, {
        limit: 1,
      });
      expect(firstPage).toHaveLength(1);
      expect(firstPage[0].action).toBe('REPORT_ASSIGNED');

      const secondPage = await moderationService.getReportActivityLog(report.reportId, {
        limit: 1,
        offset: 1,
      });
      expect(secondPage).toHaveLength(1);
      expect(secondPage[0].action).toBe('REPORT_SUBMITTED');
    });
  });

  // ADS C4-2: when a moderator resolves / dismisses / escalates a report, the
  // reporter who filed it must receive an in-app notification documenting the
  // outcome. The notification side-effect runs after the moderation
  // transaction commits — failures here must not affect the action itself.
  describe('Reporter notifications on report resolution (C4-2)', () => {
    const seedUsers = async () => {
      const reporter = await User.create({
        email: 'reporter-c42@example.com',
        password: 'hashedpassword',
        firstName: 'Reporter',
        lastName: 'User',
        userType: UserType.ADOPTER,
        status: UserStatus.ACTIVE,
      });
      const reportedUser = await User.create({
        email: 'reported-c42@example.com',
        password: 'hashedpassword',
        firstName: 'Reported',
        lastName: 'User',
        userType: UserType.ADOPTER,
        status: UserStatus.ACTIVE,
      });
      const moderator = await User.create({
        email: 'mod-c42@example.com',
        password: 'hashedpassword',
        firstName: 'Mod',
        lastName: 'User',
        userType: UserType.ADMIN,
        status: UserStatus.ACTIVE,
      });
      return { reporter, reportedUser, moderator };
    };

    const seedReport = async (
      reporterId: string,
      reportedUserId: string,
      status: ReportStatus = ReportStatus.UNDER_REVIEW
    ) =>
      Report.create({
        reporterId,
        reportedEntityType: 'user',
        reportedEntityId: reportedUserId,
        reportedUserId,
        category: ReportCategory.INAPPROPRIATE_CONTENT,
        severity: ReportSeverity.MEDIUM,
        title: 'Test report',
        description: 'Test description',
        evidence: [],
        status,
      });

    it('notifies the reporter when their report is resolved via bulk update', async () => {
      const { reporter, reportedUser, moderator } = await seedUsers();
      const report = await seedReport(reporter.userId, reportedUser.userId);

      const spy = vi
        .spyOn(NotificationService, 'createNotification')
        .mockResolvedValue({} as never);

      const result = await moderationService.bulkUpdateReports({
        reportIds: [report.reportId],
        action: 'resolve',
        moderatorId: moderator.userId,
        resolutionNotes: 'Resolved via test',
      });

      expect(result.updated).toBe(1);
      expect(spy).toHaveBeenCalledTimes(1);
      const args = spy.mock.calls[0][0];
      expect(args.userId).toBe(reporter.userId);
      expect(args.type).toBe(NotificationType.MODERATION_REPORT_RESOLVED);
      expect(args.data).toMatchObject({ reportId: report.reportId, resolution: 'resolved' });

      const refreshed = await Report.findByPk(report.reportId);
      expect(refreshed?.resolvedAt).toBeTruthy();

      spy.mockRestore();
    });

    it('notifies the reporter when their report is dismissed via bulk update', async () => {
      const { reporter, reportedUser, moderator } = await seedUsers();
      const report = await seedReport(reporter.userId, reportedUser.userId, ReportStatus.PENDING);

      const spy = vi
        .spyOn(NotificationService, 'createNotification')
        .mockResolvedValue({} as never);

      await moderationService.bulkUpdateReports({
        reportIds: [report.reportId],
        action: 'dismiss',
        moderatorId: moderator.userId,
        resolutionNotes: 'No action needed',
      });

      expect(spy).toHaveBeenCalledTimes(1);
      const args = spy.mock.calls[0][0];
      expect(args.userId).toBe(reporter.userId);
      expect(args.type).toBe(NotificationType.MODERATION_REPORT_RESOLVED);
      expect(args.data).toMatchObject({ resolution: 'dismissed' });

      spy.mockRestore();
    });

    it('notifies the reporter when their report is escalated via escalateReport', async () => {
      const { reporter, reportedUser, moderator } = await seedUsers();
      const report = await seedReport(reporter.userId, reportedUser.userId, ReportStatus.PENDING);

      const spy = vi
        .spyOn(NotificationService, 'createNotification')
        .mockResolvedValue({} as never);

      await moderationService.escalateReport(
        report.reportId,
        moderator.userId,
        moderator.userId,
        'Needs senior review'
      );

      expect(spy).toHaveBeenCalledTimes(1);
      const args = spy.mock.calls[0][0];
      expect(args.userId).toBe(reporter.userId);
      expect(args.type).toBe(NotificationType.MODERATION_REPORT_RESOLVED);
      expect(args.data).toMatchObject({ reportId: report.reportId, resolution: 'escalated' });

      spy.mockRestore();
    });

    // ADS C4-4: when a moderator applies a sanction to a user (warning,
    // suspension, ban, restriction), the targeted user must receive an
    // in-app notification documenting it so they have a record once
    // they're next online. The notification is best-effort and never
    // affects the sanction itself.
    it('notifies the sanctioned user when a moderator applies a warning', async () => {
      const { reporter, reportedUser, moderator } = await seedUsers();
      const report = await seedReport(reporter.userId, reportedUser.userId);

      const spy = vi
        .spyOn(NotificationService, 'createNotification')
        .mockResolvedValue({} as never);

      await moderationService.takeModerationAction(moderator.userId, {
        reportId: report.reportId,
        targetEntityType: 'user',
        targetEntityId: reportedUser.userId,
        targetUserId: reportedUser.userId,
        actionType: ActionType.WARNING_ISSUED,
        severity: ActionSeverity.LOW,
        reason: 'Inappropriate content',
        description: 'Please review the community guidelines.',
      });

      // Two notifications: one to the reporter (C4-2), one to the sanctioned user (C4-4)
      expect(spy).toHaveBeenCalledTimes(2);
      const sanctionedCall = spy.mock.calls.find(c => c[0].userId === reportedUser.userId);
      expect(sanctionedCall).toBeDefined();
      expect(sanctionedCall?.[0].type).toBe(NotificationType.USER_SANCTIONED);
      expect(sanctionedCall?.[0].data).toMatchObject({
        actionType: ActionType.WARNING_ISSUED,
        reason: 'Inappropriate content',
      });

      spy.mockRestore();
    });

    it('does not notify the target user for NO_ACTION outcomes (not a sanction)', async () => {
      const { reporter, reportedUser, moderator } = await seedUsers();
      const report = await seedReport(reporter.userId, reportedUser.userId);

      const spy = vi
        .spyOn(NotificationService, 'createNotification')
        .mockResolvedValue({} as never);

      await moderationService.takeModerationAction(moderator.userId, {
        reportId: report.reportId,
        targetEntityType: 'user',
        targetEntityId: reportedUser.userId,
        targetUserId: reportedUser.userId,
        actionType: ActionType.NO_ACTION,
        severity: ActionSeverity.LOW,
        reason: 'No violation',
      });

      // Only the reporter is notified (dismissal); the target user is not.
      const sanctionedCalls = spy.mock.calls.filter(c => c[0].userId === reportedUser.userId);
      expect(sanctionedCalls).toHaveLength(0);

      spy.mockRestore();
    });

    it('completes the moderation action even when notifying the reporter fails', async () => {
      const { reporter, reportedUser, moderator } = await seedUsers();
      const report = await seedReport(reporter.userId, reportedUser.userId);

      const spy = vi
        .spyOn(NotificationService, 'createNotification')
        .mockRejectedValue(new Error('notification provider down'));

      const result = await moderationService.bulkUpdateReports({
        reportIds: [report.reportId],
        action: 'resolve',
        moderatorId: moderator.userId,
      });

      expect(result.updated).toBe(1);
      const refreshed = await Report.findByPk(report.reportId);
      expect(refreshed?.resolvedAt).toBeTruthy();

      spy.mockRestore();
    });
  });
});
