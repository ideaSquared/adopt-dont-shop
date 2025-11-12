import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import sequelize from '../../sequelize';

// Mock audit log service
vi.mock('../../services/auditLog.service', () => ({
  AuditLogService: {
    log: vi.fn().mockResolvedValue(undefined),
  },
}));

// Mock logger
vi.mock('../../utils/logger', () => ({
  __esModule: true,
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

import Report, { ReportStatus, ReportCategory, ReportSeverity } from '../../models/Report';
import ModeratorAction, { ActionType, ActionSeverity } from '../../models/ModeratorAction';
import User, { UserStatus, UserType } from '../../models/User';
import Pet from '../../models/Pet';
import Rescue from '../../models/Rescue';
import moderationService from '../../services/moderation.service';

describe('ModerationService', () => {
  beforeEach(async () => {
    await sequelize.sync({ force: true });
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await Report.destroy({ where: {}, truncate: true, cascade: true });
    await ModeratorAction.destroy({ where: {}, truncate: true, cascade: true });
    await User.destroy({ where: {}, truncate: true, cascade: true });
    await Pet.destroy({ where: {}, truncate: true, cascade: true });
    await Rescue.destroy({ where: {}, truncate: true, cascade: true });
  });

  describe('Report Management', () => {
    it('should create a new report with all required fields', async () => {
      const reporter = await User.create({
        userId: 'reporter-123',
        firstName: 'Reporter',
        lastName: 'User',
        email: 'reporter@example.com',
        password: 'hashedPassword123!',
        status: UserStatus.ACTIVE,
        userType: UserType.ADOPTER,
        emailVerified: true,
      });

      const reportedUser = await User.create({
        userId: 'reported-456',
        firstName: 'Reported',
        lastName: 'User',
        email: 'reported@example.com',
        password: 'hashedPassword123!',
        status: UserStatus.ACTIVE,
        userType: UserType.ADOPTER,
        emailVerified: true,
      });

      const reportData = {
        reportedEntityType: 'user' as const,
        reportedEntityId: reportedUser.userId,
        reportedUserId: reportedUser.userId,
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

      const result = await moderationService.submitReport(reporter.userId, reportData);

      expect(result).toBeDefined();
      expect(result.reporterId).toBe(reporter.userId);
      expect(result.category).toBe(ReportCategory.INAPPROPRIATE_CONTENT);
      expect(result.status).toBe(ReportStatus.PENDING);
    });

    it('should get reports with filters', async () => {
      const reporter = await User.create({
        userId: 'reporter-123',
        firstName: 'Reporter',
        lastName: 'User',
        email: 'reporter@example.com',
        password: 'hashedPassword123!',
        status: UserStatus.ACTIVE,
        userType: UserType.ADOPTER,
        emailVerified: true,
      });

      const reportedUser = await User.create({
        userId: 'reported-456',
        firstName: 'Reported',
        lastName: 'User',
        email: 'reported@example.com',
        password: 'hashedPassword123!',
        status: UserStatus.ACTIVE,
        userType: UserType.ADOPTER,
        emailVerified: true,
      });

      await moderationService.submitReport(reporter.userId, {
        reportedEntityType: 'user',
        reportedEntityId: reportedUser.userId,
        reportedUserId: reportedUser.userId,
        category: ReportCategory.INAPPROPRIATE_CONTENT,
        severity: ReportSeverity.HIGH,
        title: 'Test Report',
        description: 'Test description',
      });

      const result = await moderationService.getReports({ page: 1, limit: 10 });

      expect(result.reports).toHaveLength(1);
      expect(result.total).toBe(1);
    });
  });

  describe('Moderator Actions', () => {
    it('should record moderator action', async () => {
      const moderator = await User.create({
        userId: 'mod-123',
        firstName: 'Moderator',
        lastName: 'User',
        email: 'mod@example.com',
        password: 'hashedPassword123!',
        status: UserStatus.ACTIVE,
        userType: UserType.ADMIN,
        emailVerified: true,
      });

      const targetUser = await User.create({
        userId: 'target-456',
        firstName: 'Target',
        lastName: 'User',
        email: 'target@example.com',
        password: 'hashedPassword123!',
        status: UserStatus.ACTIVE,
        userType: UserType.ADOPTER,
        emailVerified: true,
      });

      const action = await ModeratorAction.create({
        moderatorId: moderator.userId,
        targetEntityType: 'user',
        targetEntityId: targetUser.userId,
        actionType: ActionType.WARN,
        severity: ActionSeverity.LOW,
        reason: 'Test warning',
      });

      expect(action).toBeDefined();
      expect(action.moderatorId).toBe(moderator.userId);
      expect(action.actionType).toBe(ActionType.WARN);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid report data gracefully', async () => {
      await expect(
        moderationService.submitReport('invalid-user', {
          reportedEntityType: 'user',
          reportedEntityId: 'invalid',
          category: ReportCategory.SPAM,
          severity: ReportSeverity.LOW,
          title: 'Test',
          description: 'Test description',
        })
      ).rejects.toThrow();
    });

    it('should handle empty report queries gracefully', async () => {
      const result = await moderationService.getReports({ page: 1, limit: 10 });
      expect(result.reports).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });
});
