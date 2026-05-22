import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import sequelize from '../../sequelize';
import EmailQueue, { EmailStatus, EmailPriority, EmailType } from '../../models/EmailQueue';
import Notification, {
  NotificationChannel,
  NotificationPriority,
  NotificationStatus,
  NotificationType,
} from '../../models/Notification';
import User, { UserStatus, UserType } from '../../models/User';
import { AuditLogService } from '../../services/auditLog.service';
import { NotificationService } from '../../services/notification.service';

describe('NotificationService', () => {
  beforeEach(async () => {
    await sequelize.sync({ force: true });
  });

  afterEach(async () => {
    await EmailQueue.destroy({ where: {}, truncate: true, cascade: true });
  });

  describe('Email Notifications', () => {
    it('should queue email notification', async () => {
      const email = await EmailQueue.create({
        fromEmail: 'noreply@adopt-dont-shop.com',
        toEmail: 'test@example.com',
        toName: 'Test User',
        subject: 'Test Email',
        htmlContent: '<p>Test</p>',
        textContent: 'Test',
        type: EmailType.TRANSACTIONAL,
        status: EmailStatus.QUEUED,
        priority: EmailPriority.NORMAL,
        attachments: [],
      });

      expect(email).toBeDefined();
      expect(email.toEmail).toBe('test@example.com');
      expect(email.status).toBe(EmailStatus.QUEUED);
    });

    it('should handle high priority emails', async () => {
      const email = await EmailQueue.create({
        fromEmail: 'noreply@adopt-dont-shop.com',
        toEmail: 'urgent@example.com',
        toName: 'Urgent User',
        subject: 'Urgent Email',
        htmlContent: '<p>Urgent</p>',
        type: EmailType.TRANSACTIONAL,
        status: EmailStatus.QUEUED,
        priority: EmailPriority.HIGH,
        attachments: [],
      });

      expect(email.priority).toBe(EmailPriority.HIGH);
    });

    it('should get queued emails', async () => {
      await EmailQueue.create({
        fromEmail: 'noreply@adopt-dont-shop.com',
        toEmail: 'test@example.com',
        toName: 'Test User',
        subject: 'Test Email',
        htmlContent: '<p>Test</p>',
        type: EmailType.TRANSACTIONAL,
        status: EmailStatus.QUEUED,
        priority: EmailPriority.NORMAL,
        attachments: [],
      });

      const queuedEmails = await EmailQueue.findAll({
        where: { status: EmailStatus.QUEUED },
      });

      expect(queuedEmails).toHaveLength(1);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid email addresses gracefully', async () => {
      await expect(
        EmailQueue.create({
          fromEmail: 'invalid-email',
          toEmail: 'test@example.com',
          subject: 'Test',
          htmlContent: '<p>Test</p>',
          type: EmailType.TRANSACTIONAL,
          attachments: [],
        })
      ).rejects.toThrow();
    });

    it('should handle empty email queue gracefully', async () => {
      const emails = await EmailQueue.findAll();
      expect(emails).toHaveLength(0);
    });
  });

  describe('Audit attribution (actor vs subject)', () => {
    it('records the notification owner as subjectId in the audit details on markAllAsRead', async () => {
      // The audit row's top-level user column carries the actor (the
      // caller of markAllAsRead). The details payload now uses
      // `subjectId` for the notification owner so on-behalf-of writes by
      // an admin can be told apart from self-service writes. The two
      // collapse to the same id in the self-service case below.
      const user = await User.create({
        email: 'audit-1@test.dev',
        password: 'Hash$ed1234',
        firstName: 'Audit',
        lastName: 'User',
        status: UserStatus.ACTIVE,
        userType: UserType.ADOPTER,
      });
      const userId = user.userId;
      await Notification.create({
        user_id: userId,
        type: NotificationType.SYSTEM_ANNOUNCEMENT,
        channel: NotificationChannel.IN_APP,
        priority: NotificationPriority.NORMAL,
        status: NotificationStatus.PENDING,
        title: 't',
        message: 'm',
      });

      const logSpy = vi.spyOn(AuditLogService, 'log').mockResolvedValue(undefined as never);

      await NotificationService.markAllAsRead(userId);

      const call = logSpy.mock.calls.find(([data]) => data.action === 'MARK_ALL_READ');
      expect(call).toBeDefined();
      const data = call![0];
      expect(data.userId).toBe(userId); // actor on the audit row
      expect(data.details).toMatchObject({ subjectId: userId, updatedCount: 1 });
      // Stale `userId` key in details (the ambiguous one) is removed —
      // future on-behalf-of paths must use subjectId instead.
      expect(data.details).not.toHaveProperty('userId');

      logSpy.mockRestore();
    });
  });
});
