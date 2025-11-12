import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import sequelize from '../../sequelize';

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

import User, { UserStatus, UserType } from '../../models/User';
import EmailQueue, { EmailStatus, EmailPriority } from '../../models/EmailQueue';
import notificationService from '../../services/notification.service';

describe('NotificationService', () => {
  beforeEach(async () => {
    await sequelize.sync({ force: true });
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await EmailQueue.destroy({ where: {}, truncate: true, cascade: true });
    await User.destroy({ where: {}, truncate: true, cascade: true });
  });

  describe('Email Notifications', () => {
    it('should queue email notification', async () => {
      const user = await User.create({
        userId: 'user-123',
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        password: 'hashedPassword123!',
        status: UserStatus.ACTIVE,
        userType: UserType.ADOPTER,
        emailVerified: true,
      });

      const result = await notificationService.sendEmail({
        to: user.email,
        subject: 'Test Email',
        templateName: 'test-template',
        templateData: { name: user.firstName },
      });

      expect(result).toBeDefined();

      const queuedEmails = await EmailQueue.findAll();
      expect(queuedEmails).toHaveLength(1);
      expect(queuedEmails[0].recipientEmail).toBe(user.email);
      expect(queuedEmails[0].status).toBe(EmailStatus.QUEUED);
    });

    it('should handle high priority emails', async () => {
      const user = await User.create({
        userId: 'user-123',
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        password: 'hashedPassword123!',
        status: UserStatus.ACTIVE,
        userType: UserType.ADOPTER,
        emailVerified: true,
      });

      await notificationService.sendEmail({
        to: user.email,
        subject: 'Urgent Email',
        templateName: 'urgent-template',
        templateData: { name: user.firstName },
        priority: EmailPriority.HIGH,
      });

      const queuedEmails = await EmailQueue.findAll();
      expect(queuedEmails[0].priority).toBe(EmailPriority.HIGH);
    });

    it('should get queued emails', async () => {
      const user = await User.create({
        userId: 'user-123',
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        password: 'hashedPassword123!',
        status: UserStatus.ACTIVE,
        userType: UserType.ADOPTER,
        emailVerified: true,
      });

      await notificationService.sendEmail({
        to: user.email,
        subject: 'Test Email',
        templateName: 'test-template',
        templateData: { name: user.firstName },
      });

      const result = await notificationService.getQueuedEmails({ limit: 10 });

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe(EmailStatus.QUEUED);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid email addresses gracefully', async () => {
      await expect(
        notificationService.sendEmail({
          to: 'invalid-email',
          subject: 'Test',
          templateName: 'test',
          templateData: {},
        })
      ).rejects.toThrow();
    });

    it('should handle empty email queue gracefully', async () => {
      const result = await notificationService.getQueuedEmails({ limit: 10 });
      expect(result).toHaveLength(0);
    });
  });
});
