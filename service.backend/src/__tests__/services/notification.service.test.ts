import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import sequelize from '../../sequelize';
import EmailQueue, { EmailStatus, EmailPriority, EmailType } from '../../models/EmailQueue';

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
});
