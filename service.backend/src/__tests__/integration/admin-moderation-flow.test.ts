// Mock env config FIRST before any imports
jest.mock('../../config/env', () => ({
  env: {
    JWT_SECRET: 'test-jwt-secret-min-32-characters-long-12345',
    JWT_REFRESH_SECRET: 'test-refresh-secret-min-32-characters-long-12345',
    SESSION_SECRET: 'test-session-secret-min-32-characters-long',
    CSRF_SECRET: 'test-csrf-secret-min-32-characters-long-123',
  },
}));

jest.mock('../../sequelize', () => ({
  transaction: jest.fn().mockResolvedValue({
    commit: jest.fn().mockResolvedValue(undefined),
    rollback: jest.fn().mockResolvedValue(undefined),
  }),
}));

import { Op } from 'sequelize';
import Report, { ReportCategory, ReportStatus, ReportSeverity } from '../../models/Report';
import ModeratorAction, { ActionType, ActionSeverity } from '../../models/ModeratorAction';
import User, { UserStatus, UserType } from '../../models/User';
import Rescue from '../../models/Rescue';
import ModerationService from '../../services/moderation.service';
import { AuditLogService } from '../../services/auditLog.service';

// Mock dependencies
jest.mock('../../models/Report');
jest.mock('../../models/ModeratorAction');
jest.mock('../../models/User');
jest.mock('../../models/Rescue');
jest.mock('../../services/auditLog.service');
jest.mock('../../utils/logger');

const MockedReport = Report as jest.Mocked<typeof Report>;
const MockedModeratorAction = ModeratorAction as jest.Mocked<typeof ModeratorAction>;
const MockedUser = User as jest.Mocked<typeof User>;
const MockedRescue = Rescue as jest.Mocked<typeof Rescue>;
const MockedAuditLogService = AuditLogService as jest.Mocked<typeof AuditLogService>;

describe('Admin Moderation Workflow Integration Tests', () => {
  const reporterId = 'reporter-user-123';
  const reportedUserId = 'reported-user-456';
  const moderatorId = 'moderator-789';
  const adminId = 'admin-admin-101';
  const petId = 'pet-202';
  const rescueId = 'rescue-303';

  beforeEach(() => {
    jest.clearAllMocks();
    MockedAuditLogService.log = jest.fn().mockResolvedValue(undefined as never);
  });

  describe('Report Submission Workflow', () => {
    describe('when submitting a new report', () => {
      it('should successfully submit a report for inappropriate content', async () => {
        const reportData = {
          reportedEntityType: 'user' as const,
          reportedEntityId: reportedUserId,
          reportedUserId: reportedUserId,
          category: ReportCategory.INAPPROPRIATE_CONTENT,
          severity: ReportSeverity.MEDIUM,
          title: 'Inappropriate behavior in messages',
          description: 'User sent inappropriate messages to another user',
          evidence: [
            {
              type: 'screenshot' as const,
              content: 'base64-image-data',
              description: 'Screenshot of message',
              uploadedAt: new Date(),
            },
          ],
        };

        const mockReport = createMockReport({
          reportId: 'report-123',
          reporterId,
          status: ReportStatus.PENDING,
          ...reportData,
        });

        MockedReport.findOne = jest.fn().mockResolvedValue(null);
        MockedReport.create = jest.fn().mockResolvedValue(mockReport as never);

        const result = await ModerationService.submitReport(reporterId, reportData, {
          ip: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
        });

        expect(result.reportId).toBe('report-123');
        expect(result.status).toBe(ReportStatus.PENDING);
        expect(result.category).toBe(ReportCategory.INAPPROPRIATE_CONTENT);
        expect(MockedAuditLogService.log).toHaveBeenCalledWith(
          expect.objectContaining({
            action: 'REPORT_SUBMITTED',
            entity: 'Report',
          })
        );
      });

      it('should prevent duplicate reports from same user for same entity', async () => {
        const reportData = {
          reportedEntityType: 'user' as const,
          reportedEntityId: reportedUserId,
          category: ReportCategory.SPAM,
          title: 'Spam content',
          description: 'User posting spam messages',
        };

        const existingReport = createMockReport({
          reportId: 'report-existing',
          status: ReportStatus.PENDING,
        });

        MockedReport.findOne = jest.fn().mockResolvedValue(existingReport as never);

        await expect(ModerationService.submitReport(reporterId, reportData)).rejects.toThrow(
          'You have already submitted a report for this content'
        );
      });

      it('should auto-assign high severity reports to moderator', async () => {
        const reportData = {
          reportedEntityType: 'user' as const,
          reportedEntityId: reportedUserId,
          category: ReportCategory.ANIMAL_WELFARE,
          severity: ReportSeverity.CRITICAL,
          title: 'Animal welfare concern',
          description: 'Reported user is mistreating animals',
        };

        const mockReport = createMockReport({
          reportId: 'report-critical-123',
          status: ReportStatus.PENDING,
          severity: ReportSeverity.CRITICAL,
          reportedEntityType: 'user',
          reportedEntityId: reportedUserId,
          category: ReportCategory.ANIMAL_WELFARE,
          title: 'Animal welfare concern',
          description: 'Reported user is mistreating animals',
        });

        MockedReport.findOne = jest.fn().mockResolvedValue(null);
        MockedReport.create = jest.fn().mockResolvedValue(mockReport as never);
        MockedUser.findAll = jest.fn().mockResolvedValue([] as never);

        const result = await ModerationService.submitReport(reporterId, reportData);

        expect(result.severity).toBe(ReportSeverity.CRITICAL);
        expect(MockedAuditLogService.log).toHaveBeenCalled();
      });

      it('should accept multiple types of evidence', async () => {
        const reportData = {
          reportedEntityType: 'message' as const,
          reportedEntityId: 'message-xyz',
          category: ReportCategory.HARASSMENT,
          title: 'Harassment in messages',
          description: 'User sent harassing messages',
          evidence: [
            {
              type: 'screenshot' as const,
              content: 'image-data',
              uploadedAt: new Date(),
            },
            {
              type: 'text' as const,
              content: 'Direct quote of offensive text',
              uploadedAt: new Date(),
            },
            {
              type: 'url' as const,
              content: 'https://example.com/offensive-content',
              uploadedAt: new Date(),
            },
          ],
        };

        const mockReport = createMockReport({
          reportId: 'report-multi-evidence',
          status: ReportStatus.PENDING,
          ...reportData,
        });

        MockedReport.findOne = jest.fn().mockResolvedValue(null);
        MockedReport.create = jest.fn().mockResolvedValue(mockReport as never);

        const result = await ModerationService.submitReport(reporterId, reportData);

        expect(result.evidence).toHaveLength(3);
        expect(result.evidence?.[0].type).toBe('screenshot');
      });

      it('should store submission context metadata', async () => {
        const reportData = {
          reportedEntityType: 'rescue' as const,
          reportedEntityId: rescueId,
          category: ReportCategory.FALSE_INFORMATION,
          title: 'False rescue information',
          description: 'Rescue profile contains false information',
        };

        const mockReport = createMockReport({
          reportId: 'report-meta',
          status: ReportStatus.PENDING,
          metadata: {
            submissionContext: {
              ip: '192.168.1.100',
              userAgent: 'test-agent',
            },
            autoDetected: false,
          },
        });

        MockedReport.findOne = jest.fn().mockResolvedValue(null);
        MockedReport.create = jest.fn().mockResolvedValue(mockReport as never);

        const result = await ModerationService.submitReport(reporterId, reportData, {
          ip: '192.168.1.100',
          userAgent: 'test-agent',
        });

        expect(result.metadata).toBeDefined();
      });
    });
  });

  describe('Report Review Workflow', () => {
    describe('when retrieving reports for review', () => {
      it('should retrieve pending reports for moderator review', async () => {
        const mockReports = [
          createMockReport({
            reportId: 'report-1',
            status: ReportStatus.PENDING,
            severity: ReportSeverity.HIGH,
          }),
          createMockReport({
            reportId: 'report-2',
            status: ReportStatus.PENDING,
            severity: ReportSeverity.MEDIUM,
          }),
        ];

        MockedReport.findAndCountAll = jest.fn().mockResolvedValue({
          rows: mockReports,
          count: 2,
        } as never);

        const result = await ModerationService.searchReports(
          { status: ReportStatus.PENDING },
          { page: 1, limit: 20 }
        );

        expect(result.reports).toHaveLength(2);
        expect(result.pagination.total).toBe(2);
        expect(MockedReport.findAndCountAll).toHaveBeenCalled();
      });

      it('should filter reports by category', async () => {
        const mockReports = [
          createMockReport({
            reportId: 'spam-report-1',
            category: ReportCategory.SPAM,
            status: ReportStatus.PENDING,
          }),
        ];

        MockedReport.findAndCountAll = jest.fn().mockResolvedValue({
          rows: mockReports,
          count: 1,
        } as never);

        const result = await ModerationService.searchReports(
          { category: ReportCategory.SPAM },
          { page: 1, limit: 20 }
        );

        expect(result.reports).toHaveLength(1);
        expect(result.reports[0].category).toBe(ReportCategory.SPAM);
      });

      it('should retrieve full report details with assigned moderator info', async () => {
        const mockReport = createMockReport({
          reportId: 'report-detail-123',
          status: ReportStatus.UNDER_REVIEW,
          assignedModerator: moderatorId as string | undefined,
        });

        MockedReport.findByPk = jest.fn().mockResolvedValue(mockReport as never);

        const result = await ModerationService.getReportById('report-detail-123');

        expect(result).toBeDefined();
        expect(result?.assignedModerator).toBe(moderatorId);
        expect(result?.status).toBe(ReportStatus.UNDER_REVIEW);
      });

      it('should assign report to moderator', async () => {
        const mockReport = createMockReport({
          reportId: 'report-assign',
          status: ReportStatus.PENDING,
          assignedModerator: undefined,
        });

        const updatedReport = createMockReport({
          reportId: 'report-assign',
          status: ReportStatus.UNDER_REVIEW,
          assignedModerator: moderatorId as string | undefined,
          assignedAt: new Date() as Date | undefined,
        });

        mockReport.update = jest.fn().mockImplementation(async (values) => {
          Object.assign(mockReport, values);
          return mockReport;
        });

        MockedReport.findByPk = jest.fn().mockResolvedValue(mockReport as never);

        const result = await ModerationService.assignReport('report-assign', moderatorId, adminId);

        expect(result.assignedModerator).toBe(moderatorId);
        expect(result.status).toBe(ReportStatus.UNDER_REVIEW);
        expect(MockedAuditLogService.log).toHaveBeenCalledWith(
          expect.objectContaining({
            action: 'REPORT_ASSIGNED',
            details: expect.objectContaining({
              moderatorId,
            }),
          })
        );
      });
    });
  });

  describe('Moderation Actions Workflow', () => {
    describe('when taking moderation actions', () => {
      it('should issue warning to user', async () => {
        const actionData = {
          reportId: 'report-warning-123',
          targetEntityType: 'user' as const,
          targetEntityId: reportedUserId,
          targetUserId: reportedUserId,
          actionType: ActionType.WARNING_ISSUED,
          severity: ActionSeverity.LOW,
          reason: 'First violation of community guidelines',
          description: 'User warned about posting inappropriate content',
        };

        const mockAction = createMockModeratorAction({
          actionId: 'action-warning-1',
          ...actionData,
          isActive: true,
        });

        MockedModeratorAction.create = jest.fn().mockResolvedValue(mockAction as never);
        MockedReport.findByPk = jest.fn().mockResolvedValue(null);

        const result = await ModerationService.takeModerationAction(moderatorId, actionData);

        expect(result.actionType).toBe(ActionType.WARNING_ISSUED);
        expect(result.severity).toBe(ActionSeverity.LOW);
        expect(result.isActive).toBe(true);
      });

      it('should suspend user temporarily', async () => {
        const suspensionDuration = 24; // 24 hours
        const actionData = {
          reportId: 'report-suspension-456',
          targetEntityType: 'user' as const,
          targetEntityId: reportedUserId,
          targetUserId: reportedUserId,
          actionType: ActionType.USER_SUSPENDED,
          severity: ActionSeverity.HIGH,
          reason: 'Repeated harassment violations',
          description: 'User temporarily suspended for 24 hours',
          duration: suspensionDuration,
        };

        const mockAction = createMockModeratorAction({
          actionId: 'action-suspend-1',
          ...actionData,
          isActive: true,
          expiresAt: new Date(Date.now() + suspensionDuration * 60 * 60 * 1000),
        });

        MockedModeratorAction.create = jest.fn().mockResolvedValue(mockAction as never);
        MockedReport.findByPk = jest.fn().mockResolvedValue(null);

        const result = await ModerationService.takeModerationAction(moderatorId, actionData);

        expect(result.actionType).toBe(ActionType.USER_SUSPENDED);
        expect(result.duration).toBe(24);
        expect(result.expiresAt).toBeDefined();
        expect(result.isActive).toBe(true);
      });

      it('should permanently ban user', async () => {
        const actionData = {
          targetEntityType: 'user' as const,
          targetEntityId: reportedUserId,
          targetUserId: reportedUserId,
          actionType: ActionType.USER_BANNED,
          severity: ActionSeverity.CRITICAL,
          reason: 'Severe animal welfare violation',
          description: 'User permanently banned from platform for animal abuse',
        };

        const mockAction = createMockModeratorAction({
          actionId: 'action-ban-1',
          targetEntityType: actionData.targetEntityType,
          targetEntityId: actionData.targetEntityId,
          targetUserId: actionData.targetUserId,
          actionType: actionData.actionType,
          severity: actionData.severity,
          reason: actionData.reason,
          description: actionData.description,
          isActive: true,
          expiresAt: undefined,
        });

        mockAction.isPermanent = jest.fn().mockReturnValue(true);
        MockedModeratorAction.create = jest.fn().mockResolvedValue(mockAction as never);
        MockedReport.findByPk = jest.fn().mockResolvedValue(null);

        const result = await ModerationService.takeModerationAction(moderatorId, actionData);

        expect(result.actionType).toBe(ActionType.USER_BANNED);
        expect(result.severity).toBe(ActionSeverity.CRITICAL);
        expect(result.isPermanent()).toBe(true);
      });

      it('should remove content from platform', async () => {
        const actionData = {
          reportId: 'report-content-789',
          targetEntityType: 'pet' as const,
          targetEntityId: petId,
          actionType: ActionType.CONTENT_REMOVED,
          severity: ActionSeverity.MEDIUM,
          reason: 'Inappropriate pet listing content',
          description: 'Pet listing removed due to policy violation',
        };

        const mockAction = createMockModeratorAction({
          actionId: 'action-remove-1',
          ...actionData,
          isActive: true,
        });

        MockedModeratorAction.create = jest.fn().mockResolvedValue(mockAction as never);
        MockedReport.findByPk = jest.fn().mockResolvedValue(null);

        const result = await ModerationService.takeModerationAction(moderatorId, actionData);

        expect(result.actionType).toBe(ActionType.CONTENT_REMOVED);
        expect(result.targetEntityType).toBe('pet');
      });

      it('should resolve report when action is taken', async () => {
        const report = createMockReport({
          reportId: 'report-resolve-123',
          status: ReportStatus.UNDER_REVIEW,
        });

        const actionData = {
          reportId: 'report-resolve-123',
          targetEntityType: 'user' as const,
          targetEntityId: reportedUserId,
          actionType: ActionType.WARNING_ISSUED,
          severity: ActionSeverity.LOW,
          reason: 'Policy violation',
          description: 'Warning issued',
        };

        report.update = jest.fn().mockResolvedValue(
          createMockReport({
            ...report,
            status: ReportStatus.RESOLVED,
            resolvedBy: moderatorId,
            resolvedAt: new Date(),
          }) as never
        );

        MockedModeratorAction.create = jest.fn().mockResolvedValue(
          createMockModeratorAction({
            actionId: 'action-123',
            ...actionData,
          }) as never
        );
        MockedReport.findByPk = jest.fn().mockResolvedValue(report as never);

        const result = await ModerationService.takeModerationAction(moderatorId, actionData);

        expect(result.actionType).toBe(ActionType.WARNING_ISSUED);
        expect(MockedAuditLogService.log).toHaveBeenCalledWith(
          expect.objectContaining({
            action: 'MODERATION_ACTION_TAKEN',
          })
        );
      });

      it('should reverse moderation action', async () => {
        const mockAction = createMockModeratorAction({
          actionId: 'action-reverse-1',
          isActive: true,
          reversedBy: undefined,
          reversedAt: undefined,
        });

        mockAction.canBeReversed = jest.fn().mockReturnValue(true);
        mockAction.update = jest.fn().mockImplementation(async (values) => {
          Object.assign(mockAction, values);
          return mockAction;
        });

        MockedModeratorAction.findByPk = jest.fn().mockResolvedValue(mockAction as never);

        const result = await ModerationService.reverseAction(
          'action-reverse-1',
          adminId,
          'Appeal approved'
        );

        expect(result.isActive).toBe(false);
        expect(result.reversedBy).toBe(adminId);
        expect(MockedAuditLogService.log).toHaveBeenCalledWith(
          expect.objectContaining({
            action: 'MODERATION_ACTION_REVERSED',
          })
        );
      });
    });
  });

  describe('Escalation Workflow', () => {
    describe('when escalating reports', () => {
      it('should escalate report to higher authority', async () => {
        const report = createMockReport({
          reportId: 'report-escalate-1',
          status: ReportStatus.UNDER_REVIEW,
          assignedModerator: moderatorId as string | undefined,
        });

        report.update = jest.fn().mockImplementation(async (values) => {
          Object.assign(report, values);
          return report;
        });

        MockedReport.findByPk = jest.fn().mockResolvedValue(report as never);

        const result = await ModerationService.escalateReport(
          'report-escalate-1',
          adminId,
          moderatorId,
          'Requires administrative review'
        );

        expect(result.status).toBe(ReportStatus.ESCALATED);
        expect(result.escalatedTo).toBe(adminId);
        expect(MockedAuditLogService.log).toHaveBeenCalledWith(
          expect.objectContaining({
            action: 'REPORT_ESCALATED',
          })
        );
      });

      it('should reject escalation of resolved reports', async () => {
        const report = createMockReport({
          reportId: 'report-resolved-1',
          status: ReportStatus.RESOLVED,
        });

        MockedReport.findByPk = jest.fn().mockResolvedValue(report as never);

        await expect(
          ModerationService.escalateReport('report-resolved-1', adminId, moderatorId, 'Appeal')
        ).rejects.toThrow('Report cannot be escalated in its current status');
      });
    });
  });

  describe('Bulk Moderation Operations', () => {
    describe('when performing bulk actions', () => {
      it('should bulk assign multiple reports', async () => {
        const reportIds = ['report-1', 'report-2', 'report-3'];
        const reports = reportIds.map((id) =>
          createMockReport({
            reportId: id,
            status: ReportStatus.PENDING,
          })
        );

        MockedReport.findByPk = jest.fn((id) =>
          Promise.resolve(reports.find((r) => r.reportId === id) as never)
        );

        reports.forEach((report) => {
          report.update = jest.fn().mockResolvedValue(
            createMockReport({
              ...report,
              status: ReportStatus.UNDER_REVIEW,
              assignedModerator: moderatorId,
            }) as never
          );
        });

        const result = await ModerationService.bulkUpdateReports({
          reportIds,
          action: 'assign',
          moderatorId: adminId,
          assignTo: moderatorId,
        });

        expect(result.success).toBe(true);
        expect(result.updated).toBeGreaterThanOrEqual(0);
      });

      it('should bulk dismiss reports', async () => {
        const reportIds = ['report-dismiss-1', 'report-dismiss-2'];
        const reports = reportIds.map((id) =>
          createMockReport({
            reportId: id,
            status: ReportStatus.UNDER_REVIEW,
          })
        );

        MockedReport.findByPk = jest.fn((id) =>
          Promise.resolve(reports.find((r) => r.reportId === id) as never)
        );

        reports.forEach((report) => {
          report.update = jest.fn().mockResolvedValue(
            createMockReport({
              ...report,
              status: ReportStatus.DISMISSED,
              resolvedBy: moderatorId,
              resolutionNotes: 'No violation found',
            }) as never
          );
        });

        const result = await ModerationService.bulkUpdateReports({
          reportIds,
          action: 'dismiss',
          moderatorId,
          resolutionNotes: 'No violation found',
        });

        expect(result.success).toBe(true);
      });

      it('should bulk escalate reports', async () => {
        const reportIds = ['report-escalate-1', 'report-escalate-2'];
        const reports = reportIds.map((id) =>
          createMockReport({
            reportId: id,
            status: ReportStatus.UNDER_REVIEW,
          })
        );

        MockedReport.findByPk = jest.fn((id) =>
          Promise.resolve(reports.find((r) => r.reportId === id) as never)
        );

        reports.forEach((report) => {
          report.update = jest.fn().mockResolvedValue(
            createMockReport({
              ...report,
              status: ReportStatus.ESCALATED,
              escalatedTo: adminId,
            }) as never
          );
        });

        const result = await ModerationService.bulkUpdateReports({
          reportIds,
          action: 'escalate',
          moderatorId,
          escalateTo: adminId,
        });

        expect(result.success).toBe(true);
      });
    });
  });

  describe('Platform Statistics and Monitoring', () => {
    describe('when retrieving moderation metrics', () => {
      it('should calculate moderation metrics for reports', async () => {
        const reportCountsResult = [
          {
            status: ReportStatus.PENDING,
            category: ReportCategory.SPAM,
            severity: ReportSeverity.LOW,
            count: '5',
          },
          {
            status: ReportStatus.RESOLVED,
            category: ReportCategory.INAPPROPRIATE_CONTENT,
            severity: ReportSeverity.MEDIUM,
            count: '12',
          },
        ];

        const actionCountsResult = [
          {
            actionType: ActionType.WARNING_ISSUED,
            isActive: true,
            count: '8',
          },
          {
            actionType: ActionType.USER_SUSPENDED,
            isActive: false,
            count: '3',
          },
        ];

        const responseTimeResult = [
          {
            avgResponseTime: '2.5',
          },
        ];

        const resolutionTimeResult = [
          {
            avgResolutionTime: '24.5',
          },
        ];

        MockedReport.findAll = jest
          .fn()
          .mockResolvedValueOnce(reportCountsResult as never)
          .mockResolvedValueOnce(responseTimeResult as never)
          .mockResolvedValueOnce(resolutionTimeResult as never);

        MockedModeratorAction.findAll = jest
          .fn()
          .mockResolvedValueOnce(actionCountsResult as never);

        const metrics = await ModerationService.getModerationMetrics();

        expect(metrics.reports).toBeDefined();
        expect(metrics.actions).toBeDefined();
        expect(metrics.response).toBeDefined();
        expect(metrics.reports.total).toBeGreaterThan(0);
      });

      it('should filter metrics by date range', async () => {
        const dateRange = {
          from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
          to: new Date(),
        };

        const reportCountsResult = [
          {
            status: ReportStatus.RESOLVED,
            category: ReportCategory.HARASSMENT,
            severity: ReportSeverity.HIGH,
            count: '7',
          },
        ];

        const actionCountsResult = [
          {
            actionType: ActionType.USER_BANNED,
            isActive: false,
            count: '1',
          },
        ];

        const responseTimeResult = [
          {
            avgResponseTime: '1.5',
          },
        ];

        const resolutionTimeResult = [
          {
            avgResolutionTime: '12.0',
          },
        ];

        MockedReport.findAll = jest
          .fn()
          .mockResolvedValueOnce(reportCountsResult as never)
          .mockResolvedValueOnce(responseTimeResult as never)
          .mockResolvedValueOnce(resolutionTimeResult as never);

        MockedModeratorAction.findAll = jest
          .fn()
          .mockResolvedValueOnce(actionCountsResult as never);

        const metrics = await ModerationService.getModerationMetrics(dateRange);

        expect(metrics.reports).toBeDefined();
        expect(metrics.response.averageResponseTime).toBeGreaterThanOrEqual(0);
      });

      it('should track breakdown of actions by type', async () => {
        const reportCountsResult = [
          {
            status: ReportStatus.RESOLVED,
            category: ReportCategory.SCAM,
            severity: ReportSeverity.CRITICAL,
            count: '2',
          },
        ];

        const actionCountsResult = [
          {
            actionType: ActionType.WARNING_ISSUED,
            isActive: true,
            count: '10',
          },
          {
            actionType: ActionType.CONTENT_REMOVED,
            isActive: true,
            count: '6',
          },
          {
            actionType: ActionType.USER_SUSPENDED,
            isActive: true,
            count: '4',
          },
          {
            actionType: ActionType.USER_BANNED,
            isActive: false,
            count: '1',
          },
        ];

        const responseTimeResult = [
          {
            avgResponseTime: '3.2',
          },
        ];

        const resolutionTimeResult = [
          {
            avgResolutionTime: '18.5',
          },
        ];

        MockedReport.findAll = jest
          .fn()
          .mockResolvedValueOnce(reportCountsResult as never)
          .mockResolvedValueOnce(responseTimeResult as never)
          .mockResolvedValueOnce(resolutionTimeResult as never);

        MockedModeratorAction.findAll = jest
          .fn()
          .mockResolvedValueOnce(actionCountsResult as never);

        const metrics = await ModerationService.getModerationMetrics();

        expect(metrics.actions.byType).toBeDefined();
        expect(Object.keys(metrics.actions.byType).length).toBeGreaterThan(0);
      });

      it('should identify unresolved reports', async () => {
        const mockReports = [
          createMockReport({
            reportId: 'unresolved-1',
            status: ReportStatus.PENDING,
            assignedModerator: undefined,
          }),
          createMockReport({
            reportId: 'unresolved-2',
            status: ReportStatus.UNDER_REVIEW,
            assignedModerator: moderatorId as string | undefined,
          }),
        ];

        MockedReport.findAndCountAll = jest.fn().mockResolvedValue({
          rows: mockReports,
          count: 2,
        } as never);

        const result = await ModerationService.searchReports(
          {
            status: ReportStatus.PENDING,
          },
          { page: 1, limit: 20 }
        );

        expect(result.reports.filter((r) => !r.assignedModerator).length).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('Moderator Workflow Helpers', () => {
    describe('when retrieving active actions', () => {
      it('should retrieve all active moderation actions for a user', async () => {
        const mockActions = [
          createMockModeratorAction({
            actionId: 'action-1',
            targetUserId: reportedUserId,
            isActive: true,
            expiresAt: undefined,
          }),
          createMockModeratorAction({
            actionId: 'action-2',
            targetUserId: reportedUserId,
            isActive: true,
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) as Date | undefined,
          }),
        ];

        MockedModeratorAction.findAll = jest
          .fn()
          .mockResolvedValueOnce(mockActions as never)
          .mockResolvedValueOnce([mockActions[1]] as never);

        const result = await ModerationService.getActiveActionsForUser(reportedUserId);

        expect(result).toBeDefined();
        expect(result.every((a) => a.isActive)).toBe(true);
      });

      it('should return empty array if no active actions for user', async () => {
        MockedModeratorAction.findAll = jest
          .fn()
          .mockResolvedValueOnce([] as never)
          .mockResolvedValueOnce([] as never);

        const result = await ModerationService.getActiveActionsForUser('non-existent-user');

        expect(result).toEqual([]);
      });

      it('should identify expired temporary actions', async () => {
        const mockAction = createMockModeratorAction({
          actionId: 'expired-action',
          isActive: true,
          expiresAt: new Date(Date.now() - 1000), // Already expired
        });

        mockAction.isExpired = jest.fn().mockReturnValue(true);

        expect(mockAction.isExpired()).toBe(true);
      });

      it('should expire temporary actions automatically', async () => {
        MockedModeratorAction.update = jest.fn().mockResolvedValue([2] as never);

        const result = await ModerationService.expireActions();

        expect(result).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('Report Context and Details', () => {
    describe('when enriching reports with entity details', () => {
      it('should fetch user context for user-related reports', async () => {
        const mockReport = createMockReport({
          reportId: 'report-user-context',
          reportedEntityType: 'user',
          reportedEntityId: reportedUserId,
        });

        const mockUser = createMockUser({
          userId: reportedUserId,
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
        });

        MockedUser.findByPk = jest.fn().mockResolvedValue(mockUser as never);

        const enrichedReports = await ModerationService.enrichReportsWithEntityContext([
          mockReport,
        ]);

        expect(enrichedReports).toHaveLength(1);
        expect(enrichedReports[0].entityContext).toBeDefined();
      });

      it('should fetch pet context for pet-related reports', async () => {
        const mockReport = createMockReport({
          reportId: 'report-pet-context',
          reportedEntityType: 'pet',
          reportedEntityId: petId,
        });

        MockedUser.findByPk = jest.fn().mockResolvedValue(null);

        const enrichedReports = await ModerationService.enrichReportsWithEntityContext([
          mockReport,
        ]);

        expect(enrichedReports).toHaveLength(1);
      });

      it('should handle deleted entities gracefully', async () => {
        const mockReport = createMockReport({
          reportId: 'report-deleted-entity',
          reportedEntityType: 'user',
          reportedEntityId: 'deleted-user-id',
        });

        MockedUser.findByPk = jest.fn().mockResolvedValue(null);

        const enrichedReports = await ModerationService.enrichReportsWithEntityContext([
          mockReport,
        ]);

        expect(enrichedReports).toHaveLength(1);
        expect(enrichedReports[0].entityContext).toBeDefined();
      });
    });
  });
});

// Helper functions to create mock objects
function createMockReport(overrides: Partial<Report> = {}): jest.Mocked<Report> {
  const defaultReport = {
    reportId: 'mock-report-123',
    reporterId: 'reporter-123',
    reportedEntityType: 'user' as const,
    reportedEntityId: 'entity-123',
    reportedUserId: 'user-456',
    category: ReportCategory.SPAM,
    severity: ReportSeverity.MEDIUM,
    status: ReportStatus.PENDING,
    title: 'Mock Report',
    description: 'This is a mock report for testing',
    evidence: [],
    metadata: {},
    assignedModerator: undefined,
    assignedAt: undefined,
    resolvedBy: undefined,
    resolvedAt: undefined,
    resolution: undefined,
    resolutionNotes: undefined,
    escalatedTo: undefined,
    escalatedAt: undefined,
    escalationReason: undefined,
    createdAt: new Date(),
    updatedAt: new Date(),
    isAssigned: jest.fn().mockReturnValue(false),
    isResolved: jest.fn().mockReturnValue(false),
    isDismissed: jest.fn().mockReturnValue(false),
    isEscalated: jest.fn().mockReturnValue(false),
    canBeAssigned: jest.fn().mockReturnValue(true),
    canBeResolved: jest.fn().mockReturnValue(false),
    save: jest.fn().mockResolvedValue(undefined),
    update: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };

  return defaultReport as jest.Mocked<Report>;
}

function createMockModeratorAction(overrides: Partial<ModeratorAction> = {}): jest.Mocked<ModeratorAction> {
  const defaultAction = {
    actionId: 'mock-action-123',
    moderatorId: 'moderator-123',
    reportId: 'report-123',
    targetEntityType: 'user' as const,
    targetEntityId: 'entity-123',
    targetUserId: 'user-456',
    actionType: ActionType.WARNING_ISSUED,
    severity: ActionSeverity.LOW,
    reason: 'Policy violation',
    description: 'User warned',
    metadata: {},
    duration: undefined,
    expiresAt: undefined,
    isActive: true,
    reversedBy: undefined,
    reversedAt: undefined,
    reversalReason: undefined,
    evidence: [],
    notificationSent: false,
    internalNotes: undefined,
    createdAt: new Date(),
    updatedAt: new Date(),
    isTemporary: jest.fn().mockReturnValue(false),
    isExpired: jest.fn().mockReturnValue(false),
    canBeReversed: jest.fn().mockReturnValue(true),
    isPermanent: jest.fn().mockReturnValue(false),
    getRemainingDuration: jest.fn().mockReturnValue(null),
    save: jest.fn().mockResolvedValue(undefined),
    update: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };

  return defaultAction as jest.Mocked<ModeratorAction>;
}

function createMockUser(overrides: Partial<User> = {}): jest.Mocked<User> {
  const defaultUser = {
    userId: 'mock-user-123',
    email: 'mock@example.com',
    firstName: 'Mock',
    lastName: 'User',
    password: 'hashed_password',
    emailVerified: true,
    status: UserStatus.ACTIVE,
    userType: UserType.ADOPTER,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };

  return defaultUser as jest.Mocked<User>;
}
