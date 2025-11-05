import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import sequelize from '../../sequelize';
import moderationService from '../moderation.service';
import Report, { ReportStatus, ReportCategory, ReportSeverity } from '../../models/Report';
import ModeratorAction, {
  ActionType,
  ActionSeverity,
} from '../../models/ModeratorAction';

describe('ModerationService', () => {
  beforeEach(async () => {
    await sequelize.sync({ force: true });
  });

  afterEach(async () => {
    await sequelize.close();
  });

  describe('getModerationMetrics', () => {
    it('should return metrics in the correct schema format', async () => {
      // Arrange: Create test data
      await Report.create({
        reportId: 'report-1',
        reporterId: 'user-1',
        reportedEntityType: 'user',
        reportedEntityId: 'user-2',
        category: ReportCategory.HARASSMENT,
        severity: ReportSeverity.HIGH,
        status: ReportStatus.PENDING,
        title: 'Test Report',
        description: 'This is a test report for metrics',
      });

      await Report.create({
        reportId: 'report-2',
        reporterId: 'user-1',
        reportedEntityType: 'user',
        reportedEntityId: 'user-3',
        category: ReportCategory.SPAM,
        severity: ReportSeverity.LOW,
        status: ReportStatus.RESOLVED,
        title: 'Test Report 2',
        description: 'This is another test report',
        resolvedAt: new Date(),
      });

      // Act
      const metrics = await moderationService.getModerationMetrics();

      // Assert: Check the structure matches the ModerationMetricsSchema
      expect(metrics).toHaveProperty('totalReports');
      expect(metrics).toHaveProperty('pendingReports');
      expect(metrics).toHaveProperty('underReviewReports');
      expect(metrics).toHaveProperty('resolvedReports');
      expect(metrics).toHaveProperty('dismissedReports');
      expect(metrics).toHaveProperty('escalatedReports');
      expect(metrics).toHaveProperty('criticalReports');
      expect(metrics).toHaveProperty('averageResolutionTime');
      expect(metrics).toHaveProperty('reportsToday');
      expect(metrics).toHaveProperty('reportsThisWeek');
      expect(metrics).toHaveProperty('reportsThisMonth');
      expect(metrics).toHaveProperty('topCategories');
      expect(metrics).toHaveProperty('moderatorActivity');

      // Verify the values are correct
      expect(metrics.totalReports).toBe(2);
      expect(metrics.pendingReports).toBe(1);
      expect(metrics.resolvedReports).toBe(1);
      expect(metrics.dismissedReports).toBe(0);
    });

    it('should calculate critical reports count correctly', async () => {
      // Arrange
      await Report.create({
        reportId: 'report-1',
        reporterId: 'user-1',
        reportedEntityType: 'user',
        reportedEntityId: 'user-2',
        category: ReportCategory.ANIMAL_WELFARE,
        severity: ReportSeverity.CRITICAL,
        status: ReportStatus.PENDING,
        title: 'Critical Report',
        description: 'This is a critical report',
      });

      await Report.create({
        reportId: 'report-2',
        reporterId: 'user-1',
        reportedEntityType: 'user',
        reportedEntityId: 'user-3',
        category: ReportCategory.SPAM,
        severity: ReportSeverity.LOW,
        status: ReportStatus.PENDING,
        title: 'Low Report',
        description: 'This is a low severity report',
      });

      // Act
      const metrics = await moderationService.getModerationMetrics();

      // Assert
      expect(metrics.criticalReports).toBe(1);
      expect(metrics.totalReports).toBe(2);
    });

    it('should return top categories sorted by count', async () => {
      // Arrange: Create reports with different categories
      await Report.create({
        reportId: 'report-1',
        reporterId: 'user-1',
        reportedEntityType: 'user',
        reportedEntityId: 'user-2',
        category: ReportCategory.SPAM,
        severity: ReportSeverity.LOW,
        status: ReportStatus.PENDING,
        title: 'Spam 1',
        description: 'Spam report 1',
      });

      await Report.create({
        reportId: 'report-2',
        reporterId: 'user-1',
        reportedEntityType: 'user',
        reportedEntityId: 'user-3',
        category: ReportCategory.SPAM,
        severity: ReportSeverity.LOW,
        status: ReportStatus.PENDING,
        title: 'Spam 2',
        description: 'Spam report 2',
      });

      await Report.create({
        reportId: 'report-3',
        reporterId: 'user-1',
        reportedEntityType: 'user',
        reportedEntityId: 'user-4',
        category: ReportCategory.HARASSMENT,
        severity: ReportSeverity.MEDIUM,
        status: ReportStatus.PENDING,
        title: 'Harassment',
        description: 'Harassment report',
      });

      // Act
      const metrics = await moderationService.getModerationMetrics();

      // Assert
      expect(metrics.topCategories).toHaveLength(2);
      expect(metrics.topCategories[0]).toEqual({
        category: 'spam',
        count: 2,
      });
      expect(metrics.topCategories[1]).toEqual({
        category: 'harassment',
        count: 1,
      });
    });

    it('should calculate average resolution time correctly', async () => {
      // Arrange: Create a report that was created and resolved with known times
      const createdAt = new Date('2025-01-01T10:00:00Z');
      const resolvedAt = new Date('2025-01-01T14:00:00Z'); // 4 hours later

      await Report.create({
        reportId: 'report-1',
        reporterId: 'user-1',
        reportedEntityType: 'user',
        reportedEntityId: 'user-2',
        category: ReportCategory.SPAM,
        severity: ReportSeverity.LOW,
        status: ReportStatus.RESOLVED,
        title: 'Test',
        description: 'Test report',
        createdAt,
        resolvedAt,
      });

      // Act
      const metrics = await moderationService.getModerationMetrics();

      // Assert
      expect(metrics.averageResolutionTime).toBeCloseTo(4, 1); // 4 hours
    });

    it('should calculate reports by time period correctly', async () => {
      // Arrange: Create reports at different times
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const lastWeek = new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000);

      await Report.create({
        reportId: 'report-1',
        reporterId: 'user-1',
        reportedEntityType: 'user',
        reportedEntityId: 'user-2',
        category: ReportCategory.SPAM,
        severity: ReportSeverity.LOW,
        status: ReportStatus.PENDING,
        title: 'Today',
        description: 'Report from today',
        createdAt: now,
      });

      await Report.create({
        reportId: 'report-2',
        reporterId: 'user-1',
        reportedEntityType: 'user',
        reportedEntityId: 'user-3',
        category: ReportCategory.SPAM,
        severity: ReportSeverity.LOW,
        status: ReportStatus.PENDING,
        title: 'Yesterday',
        description: 'Report from yesterday',
        createdAt: yesterday,
      });

      await Report.create({
        reportId: 'report-3',
        reporterId: 'user-1',
        reportedEntityType: 'user',
        reportedEntityId: 'user-4',
        category: ReportCategory.SPAM,
        severity: ReportSeverity.LOW,
        status: ReportStatus.PENDING,
        title: 'Last Week',
        description: 'Report from last week',
        createdAt: lastWeek,
      });

      // Act
      const metrics = await moderationService.getModerationMetrics();

      // Assert
      expect(metrics.reportsToday).toBeGreaterThanOrEqual(1);
      expect(metrics.reportsThisWeek).toBeGreaterThanOrEqual(2);
      expect(metrics.reportsThisMonth).toBe(3);
    });

    it('should return moderator activity data', async () => {
      // Arrange: Create reports and actions
      const moderator1 = 'mod-1';
      const moderator2 = 'mod-2';

      const report1 = await Report.create({
        reportId: 'report-1',
        reporterId: 'user-1',
        reportedEntityType: 'user',
        reportedEntityId: 'user-2',
        category: ReportCategory.SPAM,
        severity: ReportSeverity.LOW,
        status: ReportStatus.RESOLVED,
        title: 'Test 1',
        description: 'Test report 1',
        resolvedBy: moderator1,
        resolvedAt: new Date(),
      });

      const report2 = await Report.create({
        reportId: 'report-2',
        reporterId: 'user-1',
        reportedEntityType: 'user',
        reportedEntityId: 'user-3',
        category: ReportCategory.SPAM,
        severity: ReportSeverity.LOW,
        status: ReportStatus.RESOLVED,
        title: 'Test 2',
        description: 'Test report 2',
        resolvedBy: moderator1,
        resolvedAt: new Date(),
      });

      await ModeratorAction.create({
        actionId: 'action-1',
        moderatorId: moderator1,
        reportId: report1.reportId,
        targetEntityType: 'user',
        targetEntityId: 'user-2',
        actionType: ActionType.WARNING_ISSUED,
        severity: ActionSeverity.LOW,
        reason: 'First warning',
        isActive: true,
        notificationSent: false,
      });

      await ModeratorAction.create({
        actionId: 'action-2',
        moderatorId: moderator2,
        reportId: report2.reportId,
        targetEntityType: 'user',
        targetEntityId: 'user-3',
        actionType: ActionType.CONTENT_REMOVED,
        severity: ActionSeverity.MEDIUM,
        reason: 'Removed spam content',
        isActive: true,
        notificationSent: false,
      });

      // Act
      const metrics = await moderationService.getModerationMetrics();

      // Assert
      expect(metrics.moderatorActivity).toHaveLength(2);

      const mod1Activity = metrics.moderatorActivity.find(
        (m: { moderatorId: string }) => m.moderatorId === moderator1
      );
      expect(mod1Activity).toBeDefined();
      expect(mod1Activity?.actionsCount).toBe(1);
      expect(mod1Activity?.resolvedCount).toBe(2);

      const mod2Activity = metrics.moderatorActivity.find(
        (m: { moderatorId: string }) => m.moderatorId === moderator2
      );
      expect(mod2Activity).toBeDefined();
      expect(mod2Activity?.actionsCount).toBe(1);
      expect(mod2Activity?.resolvedCount).toBe(0);
    });

    it('should respect date range filters', async () => {
      // Arrange: Create reports at different times
      const oldDate = new Date('2024-01-01');
      const recentDate = new Date('2025-01-15');

      await Report.create({
        reportId: 'report-1',
        reporterId: 'user-1',
        reportedEntityType: 'user',
        reportedEntityId: 'user-2',
        category: ReportCategory.SPAM,
        severity: ReportSeverity.LOW,
        status: ReportStatus.PENDING,
        title: 'Old Report',
        description: 'Old report',
        createdAt: oldDate,
      });

      await Report.create({
        reportId: 'report-2',
        reporterId: 'user-1',
        reportedEntityType: 'user',
        reportedEntityId: 'user-3',
        category: ReportCategory.SPAM,
        severity: ReportSeverity.LOW,
        status: ReportStatus.PENDING,
        title: 'Recent Report',
        description: 'Recent report',
        createdAt: recentDate,
      });

      // Act: Get metrics for January 2025 only
      const metrics = await moderationService.getModerationMetrics({
        from: new Date('2025-01-01'),
        to: new Date('2025-01-31'),
      });

      // Assert: Should only include the recent report
      expect(metrics.totalReports).toBe(1);
    });
  });
});
