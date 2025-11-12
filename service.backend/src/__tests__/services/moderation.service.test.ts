// Mock sequelize first
const mockTransaction = {
  commit: jest.fn().mockResolvedValue(undefined),
  rollback: jest.fn().mockResolvedValue(undefined),
};

const mockSequelize = {
  transaction: jest.fn().mockResolvedValue(mockTransaction),
};

jest.mock('../../sequelize', () => ({
  __esModule: true,
  default: mockSequelize,
}));

// Mock models
jest.mock('../../models/Report');
jest.mock('../../models/ModeratorAction');
jest.mock('../../models/User');
jest.mock('../../models/Pet');
jest.mock('../../models/Rescue');

// Mock audit log service
const mockAuditLogAction = jest.fn().mockResolvedValue(undefined);
jest.mock('../../services/auditLog.service', () => ({
  AuditLogService: {
    log: mockAuditLogAction,
  },
}));

// Mock logger
const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
};

jest.mock('../../utils/logger', () => ({
  __esModule: true,
  default: mockLogger,
}));

import Report, { ReportStatus, ReportCategory, ReportSeverity } from '../../models/Report';
import ModeratorAction, { ActionType, ActionSeverity } from '../../models/ModeratorAction';
import User from '../../models/User';
import Pet from '../../models/Pet';
import Rescue from '../../models/Rescue';
import moderationService from '../../services/moderation.service';

const MockedReport = Report as jest.Mocked<typeof Report>;
const MockedModeratorAction = ModeratorAction as jest.Mocked<typeof ModeratorAction>;
const MockedUser = User as jest.Mocked<typeof User>;
const MockedPet = Pet as jest.Mocked<typeof Pet>;
const MockedRescue = Rescue as jest.Mocked<typeof Rescue>;

describe('ModerationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Report Management', () => {
    describe('when submitting a report', () => {
      it('should create a new report with all required fields', async () => {
        const reporterId = 'user-123';
        const reportData = {
          reportedEntityType: 'user' as const,
          reportedEntityId: 'reported-user-456',
          reportedUserId: 'reported-user-456',
          category: ReportCategory.INAPPROPRIATE_CONTENT,
          severity: ReportSeverity.MEDIUM,
          title: 'Inappropriate Messages',
          description: 'User is sending inappropriate messages',
          evidence: [
            {
              type: 'screenshot' as const,
              content: 'https://example.com/screenshot.png',
              description: 'Screenshot of inappropriate message',
              uploadedAt: new Date(),
            },
          ],
        };

        const mockReport = {
          reportId: 'report-123',
          reporterId,
          ...reportData,
          status: ReportStatus.PENDING,
          createdAt: new Date(),
        };

        (MockedReport.findOne as jest.Mock).mockResolvedValue(null); // No duplicate
        (MockedReport.create as jest.Mock).mockResolvedValue(mockReport);

        const result = await moderationService.submitReport(reporterId, reportData);

        expect(MockedReport.findOne).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              reporterId,
              reportedEntityType: reportData.reportedEntityType,
              reportedEntityId: reportData.reportedEntityId,
            }),
          })
        );

        expect(MockedReport.create).toHaveBeenCalledWith(
          expect.objectContaining({
            reporterId,
            reportedEntityType: reportData.reportedEntityType,
            reportedEntityId: reportData.reportedEntityId,
            category: reportData.category,
            severity: reportData.severity,
            title: reportData.title,
            description: reportData.description,
            status: ReportStatus.PENDING,
          }),
          expect.any(Object) // transaction
        );

        expect(mockAuditLogAction).toHaveBeenCalledWith(
          expect.objectContaining({
            userId: reporterId,
            action: 'REPORT_SUBMITTED',
            entity: 'Report',
          })
        );

        expect(result).toEqual(mockReport);
      });

      it('should prevent duplicate reports from same user for same entity', async () => {
        const reporterId = 'user-123';
        const reportData = {
          reportedEntityType: 'user' as const,
          reportedEntityId: 'reported-user-456',
          category: ReportCategory.SPAM,
          title: 'Spam',
          description: 'This is spam',
        };

        const existingReport = {
          reportId: 'existing-report-789',
          reporterId,
          status: ReportStatus.PENDING,
        };

        (MockedReport.findOne as jest.Mock).mockResolvedValue(existingReport);

        await expect(moderationService.submitReport(reporterId, reportData)).rejects.toThrow(
          'You have already submitted a report for this content'
        );

        expect(MockedReport.create).not.toHaveBeenCalled();
      });

      it('should use default severity if not provided', async () => {
        const reporterId = 'user-123';
        const reportData = {
          reportedEntityType: 'pet' as const,
          reportedEntityId: 'pet-456',
          category: ReportCategory.FALSE_INFORMATION,
          title: 'Misleading pet information',
          description: 'Pet description is misleading',
        };

        (MockedReport.findOne as jest.Mock).mockResolvedValue(null);
        (MockedReport.create as jest.Mock).mockResolvedValue({
          reportId: 'report-123',
          ...reportData,
          severity: ReportSeverity.MEDIUM,
        });

        await moderationService.submitReport(reporterId, reportData);

        expect(MockedReport.create).toHaveBeenCalledWith(
          expect.objectContaining({
            severity: ReportSeverity.MEDIUM,
          }),
          expect.any(Object)
        );
      });
    });

    describe('when searching reports', () => {
      it('should return paginated reports with filters', async () => {
        const filters = {
          status: ReportStatus.PENDING,
          category: ReportCategory.INAPPROPRIATE_CONTENT,
          page: 1,
          limit: 20,
        };

        const mockReports = [
          {
            reportId: 'report-1',
            reporterId: 'user-123',
            category: ReportCategory.INAPPROPRIATE_CONTENT,
            status: ReportStatus.PENDING,
          },
          {
            reportId: 'report-2',
            reporterId: 'user-456',
            category: ReportCategory.INAPPROPRIATE_CONTENT,
            status: ReportStatus.PENDING,
          },
        ];

        (MockedReport.findAndCountAll as jest.Mock).mockResolvedValue({
          rows: mockReports,
          count: 2,
        });

        const result = await moderationService.searchReports(filters);

        expect(result.reports).toHaveLength(2);
        expect(result.pagination.total).toBe(2);
        expect(result.pagination.page).toBe(1);
        expect(result.pagination.totalPages).toBe(1);

        expect(MockedReport.findAndCountAll).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              status: ReportStatus.PENDING,
              category: ReportCategory.INAPPROPRIATE_CONTENT,
            }),
          })
        );
      });

      it('should filter by severity', async () => {
        const filters = {
          severity: ReportSeverity.HIGH,
        };

        (MockedReport.findAndCountAll as jest.Mock).mockResolvedValue({
          rows: [],
          count: 0,
        });

        await moderationService.searchReports(filters);

        expect(MockedReport.findAndCountAll).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              severity: ReportSeverity.HIGH,
            }),
          })
        );
      });

      it('should filter by assigned moderator', async () => {
        const filters = {
          assignedModerator: 'moderator-123',
        };

        (MockedReport.findAndCountAll as jest.Mock).mockResolvedValue({
          rows: [],
          count: 0,
        });

        await moderationService.searchReports(filters);

        expect(MockedReport.findAndCountAll).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              assignedModerator: 'moderator-123',
            }),
          })
        );
      });
    });

    describe('when getting report by ID', () => {
      it('should return report with actions when includeActions is true', async () => {
        const reportId = 'report-123';

        const mockReport = {
          reportId,
          reporterId: 'user-123',
          status: ReportStatus.UNDER_REVIEW,
          Actions: [
            {
              actionId: 'action-1',
              actionType: ActionType.WARNING_ISSUED,
            },
          ],
        };

        (MockedReport.findByPk as jest.Mock).mockResolvedValue(mockReport);

        const result = await moderationService.getReportById(reportId, true);

        expect(result).toEqual(mockReport);
        expect(MockedReport.findByPk).toHaveBeenCalledWith(reportId, {
          include: expect.any(Array),
        });
      });

      it('should return null when report not found', async () => {
        (MockedReport.findByPk as jest.Mock).mockResolvedValue(null);

        const result = await moderationService.getReportById('nonexistent', false);

        expect(result).toBeNull();
      });
    });

    describe('when assigning a report', () => {
      it('should assign report to moderator', async () => {
        const reportId = 'report-123';
        const moderatorId = 'moderator-456';
        const assignedBy = 'admin-789';

        const mockReport = {
          reportId,
          status: ReportStatus.PENDING,
          update: jest.fn().mockResolvedValue(undefined),
        };

        (MockedReport.findByPk as jest.Mock).mockResolvedValue(mockReport);

        const result = await moderationService.assignReport(reportId, moderatorId, assignedBy);

        expect(mockReport.update).toHaveBeenCalledWith(
          expect.objectContaining({
            assignedModerator: moderatorId,
            status: ReportStatus.UNDER_REVIEW,
          }),
          expect.any(Object) // transaction
        );

        expect(mockAuditLogAction).toHaveBeenCalledWith(
          expect.objectContaining({
            action: 'REPORT_ASSIGNED',
            entity: 'Report',
            entityId: reportId,
          })
        );

        expect(result).toEqual(mockReport);
      });

      it('should throw error when report not found', async () => {
        (MockedReport.findByPk as jest.Mock).mockResolvedValue(null);

        await expect(
          moderationService.assignReport('nonexistent', 'mod-123', 'admin-456')
        ).rejects.toThrow('Report not found');
      });
    });
  });

  describe('Moderation Actions', () => {
    describe('when taking moderation action', () => {
      it('should create action and log it', async () => {
        const moderatorId = 'moderator-123';
        const actionRequest = {
          reportId: 'report-456',
          targetEntityType: 'user' as const,
          targetEntityId: 'user-789',
          targetUserId: 'user-789',
          actionType: ActionType.WARNING_ISSUED,
          severity: ActionSeverity.MEDIUM,
          reason: 'Inappropriate behavior',
          description: 'User violated community guidelines',
          duration: 0,
          internalNotes: 'First offense',
        };

        const mockAction = {
          actionId: 'action-123',
          moderatorId,
          ...actionRequest,
          createdAt: new Date(),
        };

        (MockedModeratorAction.create as jest.Mock).mockResolvedValue(mockAction);

        const result = await moderationService.takeModerationAction(moderatorId, actionRequest);

        expect(MockedModeratorAction.create).toHaveBeenCalledWith(
          expect.objectContaining({
            moderatorId,
            reportId: actionRequest.reportId,
            targetEntityType: actionRequest.targetEntityType,
            targetEntityId: actionRequest.targetEntityId,
            actionType: actionRequest.actionType,
            severity: actionRequest.severity,
            reason: actionRequest.reason,
          }),
          expect.any(Object) // transaction
        );

        expect(mockAuditLogAction).toHaveBeenCalledWith(
          expect.objectContaining({
            action: 'MODERATION_ACTION_TAKEN',
            entity: 'Report',
          })
        );

        expect(result).toEqual(mockAction);
      });

      it('should handle suspension with duration', async () => {
        const moderatorId = 'moderator-123';
        const actionRequest = {
          targetEntityType: 'user' as const,
          targetEntityId: 'user-789',
          actionType: ActionType.USER_SUSPENDED,
          severity: ActionSeverity.HIGH,
          reason: 'Repeated violations',
          duration: 7, // 7 days
        };

        (MockedModeratorAction.create as jest.Mock).mockResolvedValue({
          actionId: 'action-123',
          ...actionRequest,
        });

        await moderationService.takeModerationAction(moderatorId, actionRequest);

        expect(MockedModeratorAction.create).toHaveBeenCalledWith(
          expect.objectContaining({
            duration: 7,
            expiresAt: expect.any(Date),
          }),
          expect.any(Object) // transaction
        );
      });

      it('should handle ban action (permanent)', async () => {
        const moderatorId = 'moderator-123';
        const actionRequest = {
          targetEntityType: 'user' as const,
          targetEntityId: 'user-789',
          actionType: ActionType.USER_BANNED,
          severity: ActionSeverity.CRITICAL,
          reason: 'Severe policy violation',
        };

        (MockedModeratorAction.create as jest.Mock).mockResolvedValue({
          actionId: 'action-123',
          ...actionRequest,
        });

        await moderationService.takeModerationAction(moderatorId, actionRequest);

        expect(MockedModeratorAction.create).toHaveBeenCalledWith(
          expect.objectContaining({
            actionType: ActionType.USER_BANNED,
            severity: ActionSeverity.CRITICAL,
          }),
          expect.any(Object) // transaction
        );
      });
    });

    describe('when reversing an action', () => {
      it('should mark action as reversed', async () => {
        const actionId = 'action-123';
        const moderatorId = 'moderator-456';
        const reason = 'Action taken in error';

        const mockAction = {
          actionId,
          isActive: true,
          canBeReversed: jest.fn().mockReturnValue(true),
          update: jest.fn().mockResolvedValue(undefined),
        };

        (MockedModeratorAction.findByPk as jest.Mock).mockResolvedValue(mockAction);

        const result = await moderationService.reverseAction(actionId, moderatorId, reason);

        expect(mockAction.canBeReversed).toHaveBeenCalled();
        expect(mockAction.update).toHaveBeenCalledWith(
          expect.objectContaining({
            isActive: false,
            reversedBy: moderatorId,
            reversalReason: reason,
          }),
          expect.any(Object) // transaction
        );

        expect(mockAuditLogAction).toHaveBeenCalledWith(
          expect.objectContaining({
            action: 'MODERATION_ACTION_REVERSED',
            entity: 'ModerationAction',
            entityId: actionId,
          })
        );

        expect(result).toEqual(mockAction);
      });

      it('should throw error when action not found', async () => {
        (MockedModeratorAction.findByPk as jest.Mock).mockResolvedValue(null);

        await expect(
          moderationService.reverseAction('nonexistent', 'mod-123', 'reason')
        ).rejects.toThrow('Moderation action not found');
      });

      it('should throw error when action already reversed', async () => {
        const mockAction = {
          actionId: 'action-123',
          isActive: false,
          canBeReversed: jest.fn().mockReturnValue(false),
        };

        (MockedModeratorAction.findByPk as jest.Mock).mockResolvedValue(mockAction);

        await expect(
          moderationService.reverseAction('action-123', 'mod-456', 'reason')
        ).rejects.toThrow('This action cannot be reversed');
      });
    });

    describe('when getting active actions for user', () => {
      it('should return all active actions for a user', async () => {
        const userId = 'user-123';

        const neverExpiringActions = [
          {
            actionId: 'action-1',
            targetUserId: userId,
            actionType: ActionType.WARNING_ISSUED,
            isActive: true,
            expiresAt: null,
            createdAt: new Date(),
          },
        ];

        const futureExpiringActions = [
          {
            actionId: 'action-2',
            targetUserId: userId,
            actionType: ActionType.USER_SUSPENDED,
            isActive: true,
            expiresAt: new Date(Date.now() + 86400000), // Tomorrow
            createdAt: new Date(),
          },
        ];

        // Mock both findAll calls - first for never-expiring, second for future-expiring
        (MockedModeratorAction.findAll as jest.Mock)
          .mockResolvedValueOnce(neverExpiringActions)
          .mockResolvedValueOnce(futureExpiringActions);

        const result = await moderationService.getActiveActionsForUser(userId);

        expect(result).toHaveLength(2);
        expect(MockedModeratorAction.findAll).toHaveBeenCalledTimes(2);
        expect(result[0].actionId).toBe('action-1');
        expect(result[1].actionId).toBe('action-2');
      });
    });

    describe('when expiring actions', () => {
      it('should mark expired actions as inactive', async () => {
        (MockedModeratorAction.update as jest.Mock).mockResolvedValue([2]); // 2 rows updated

        const count = await moderationService.expireActions();

        expect(count).toBe(2);
        expect(MockedModeratorAction.update).toHaveBeenCalledWith(
          { isActive: false },
          expect.objectContaining({
            where: expect.objectContaining({
              isActive: true,
            }),
          })
        );
      });

      it('should return zero when no actions to expire', async () => {
        (MockedModeratorAction.update as jest.Mock).mockResolvedValue([0]); // 0 rows updated

        const count = await moderationService.expireActions();

        expect(count).toBe(0);
      });
    });
  });

  describe('Moderation Metrics', () => {
    describe('when getting moderation metrics', () => {
      it('should return comprehensive metrics', async () => {
        // Mock Report.findAll for grouped counts
        (MockedReport.findAll as jest.Mock).mockResolvedValueOnce([
          { status: 'pending', category: 'spam', severity: 'low', count: '10' },
          { status: 'under_review', category: 'spam', severity: 'medium', count: '15' },
          { status: 'resolved', category: 'harassment', severity: 'high', count: '5' },
        ]);

        // Mock ModeratorAction.findAll for grouped counts
        (MockedModeratorAction.findAll as jest.Mock).mockResolvedValueOnce([
          { actionType: 'warning_issued', isActive: true, count: '20' },
          { actionType: 'user_suspended', isActive: true, count: '10' },
        ]);

        // Mock response time calculations
        (MockedReport.findAll as jest.Mock)
          .mockResolvedValueOnce([]) // assignedAt data
          .mockResolvedValueOnce([]); // resolvedAt data

        const result = await moderationService.getModerationMetrics();

        expect(result).toHaveProperty('reports');
        expect(result).toHaveProperty('actions');
        expect(result).toHaveProperty('response');
        expect(result.reports).toHaveProperty('total');
        expect(result.actions).toHaveProperty('total');
      });

      it('should filter metrics by date range', async () => {
        const dateRange = {
          from: new Date('2025-01-01'),
          to: new Date('2025-01-31'),
        };

        // Mock Report.findAll
        (MockedReport.findAll as jest.Mock)
          .mockResolvedValueOnce([]) // grouped counts
          .mockResolvedValueOnce([]) // assignedAt
          .mockResolvedValueOnce([]); // resolvedAt

        // Mock ModeratorAction.findAll
        (MockedModeratorAction.findAll as jest.Mock).mockResolvedValueOnce([]);

        await moderationService.getModerationMetrics(dateRange);

        expect(MockedReport.findAll).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              createdAt: expect.any(Object),
            }),
          })
        );
      });
    });
  });

  describe('Report Escalation', () => {
    describe('when escalating a report', () => {
      it('should escalate report and update severity', async () => {
        const reportId = 'report-123';
        const escalatedTo = 'senior-moderator-789';
        const escalatedBy = 'moderator-456';
        const reason = 'Requires senior moderator review';

        const mockReport = {
          reportId,
          severity: ReportSeverity.MEDIUM,
          status: ReportStatus.UNDER_REVIEW,
          update: jest.fn().mockResolvedValue(undefined),
        };

        (MockedReport.findByPk as jest.Mock).mockResolvedValue(mockReport);

        const result = await moderationService.escalateReport(
          reportId,
          escalatedTo,
          escalatedBy,
          reason
        );

        expect(mockReport.update).toHaveBeenCalledWith(
          {
            status: ReportStatus.ESCALATED,
            escalatedTo,
            escalatedAt: expect.any(Date),
            escalationReason: reason,
          },
          expect.any(Object) // transaction
        );

        expect(mockAuditLogAction).toHaveBeenCalledWith(
          expect.objectContaining({
            action: 'REPORT_ESCALATED',
            entity: 'Report',
            entityId: reportId,
          })
        );

        expect(result).toEqual(mockReport);
      });

      it('should throw error when report not found', async () => {
        (MockedReport.findByPk as jest.Mock).mockResolvedValue(null);

        await expect(
          moderationService.escalateReport('nonexistent', 'senior-mod-789', 'mod-123', 'reason')
        ).rejects.toThrow('Report not found');
      });
    });
  });

  describe('Bulk Operations', () => {
    describe('when bulk updating reports', () => {
      it('should resolve multiple reports', async () => {
        const reportIds = ['report-1', 'report-2', 'report-3'];

        const mockReports = reportIds.map(id => ({
          reportId: id,
          status: ReportStatus.UNDER_REVIEW,
          update: jest.fn().mockResolvedValue(undefined),
        }));

        (MockedReport.findByPk as jest.Mock)
          .mockResolvedValueOnce(mockReports[0])
          .mockResolvedValueOnce(mockReports[1])
          .mockResolvedValueOnce(mockReports[2]);

        const result = await moderationService.bulkUpdateReports({
          reportIds,
          action: 'resolve',
          moderatorId: 'admin-456',
          resolutionNotes: 'All resolved after review',
        });

        expect(result.updated).toBe(3);
        expect(result.success).toBe(true);
        expect(mockReports[0].update).toHaveBeenCalledWith(
          expect.objectContaining({
            status: ReportStatus.RESOLVED,
            resolvedBy: 'admin-456',
            resolutionNotes: 'All resolved after review',
          }),
          expect.any(Object)
        );
      });

      it('should throw error if report not found', async () => {
        const reportIds = ['report-1', 'report-2'];

        (MockedReport.findByPk as jest.Mock)
          .mockResolvedValueOnce({
            reportId: 'report-1',
            status: ReportStatus.UNDER_REVIEW,
            update: jest.fn().mockResolvedValue(undefined),
          })
          .mockResolvedValueOnce(null); // Second report not found

        await expect(
          moderationService.bulkUpdateReports({
            reportIds,
            action: 'resolve',
            moderatorId: 'admin-456',
          })
        ).rejects.toThrow('Report report-2 not found');
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors when creating report', async () => {
      (MockedReport.findOne as vi.Mock).mockRejectedValue(
        new Error('Database connection error')
      );

      await expect(
        moderationService.submitReport('user-123', {
          reportedEntityType: 'user',
          reportedEntityId: 'user-456',
          category: ReportCategory.SPAM,
          title: 'Spam',
          description: 'This is spam',
        })
      ).rejects.toThrow('Database connection error');

      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should handle errors when taking moderation action', async () => {
      (MockedModeratorAction.create as jest.Mock).mockRejectedValue(
        new Error('Failed to create action')
      );

      await expect(
        moderationService.takeModerationAction('mod-123', {
          targetEntityType: 'user',
          targetEntityId: 'user-456',
          actionType: ActionType.WARNING_ISSUED,
          severity: ActionSeverity.MEDIUM,
          reason: 'Test',
        })
      ).rejects.toThrow('Failed to create action');
    });
  });
});
