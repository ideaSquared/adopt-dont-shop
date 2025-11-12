// Mock sequelize first
jest.mock('../../sequelize', () => ({
  __esModule: true,
  default: {
    define: jest.fn(),
    transaction: jest.fn(),
  },
}));

// Mock models
jest.mock('../../models/EmailTemplate', () => {
  const mockEmailTemplate = {
    create: jest.fn(),
    findByPk: jest.fn(),
    findOne: jest.fn(),
    findAndCountAll: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
    destroy: jest.fn(),
  };
  return {
    __esModule: true,
    default: mockEmailTemplate,
    TemplateType: {
      TRANSACTIONAL: 'transactional',
      NOTIFICATION: 'notification',
      MARKETING: 'marketing',
      SYSTEM: 'system',
      ADMINISTRATIVE: 'administrative',
    },
    TemplateCategory: {
      WELCOME: 'welcome',
      PASSWORD_RESET: 'password_reset',
      EMAIL_VERIFICATION: 'email_verification',
      APPLICATION_UPDATE: 'application_update',
      ADOPTION_CONFIRMATION: 'adoption_confirmation',
      RESCUE_VERIFICATION: 'rescue_verification',
      STAFF_INVITATION: 'staff_invitation',
      NOTIFICATION_DIGEST: 'notification_digest',
      REMINDER: 'reminder',
      ANNOUNCEMENT: 'announcement',
      NEWSLETTER: 'newsletter',
      SYSTEM_ALERT: 'system_alert',
    },
    TemplateStatus: {
      DRAFT: 'draft',
      ACTIVE: 'active',
      INACTIVE: 'inactive',
      ARCHIVED: 'archived',
    },
  };
});

jest.mock('../../models/EmailQueue', () => {
  const mockEmailQueue = {
    create: jest.fn(),
    findByPk: jest.fn(),
    findOne: jest.fn(),
    findAll: jest.fn(),
    findAndCountAll: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
  };
  return {
    __esModule: true,
    default: mockEmailQueue,
    EmailType: {
      TRANSACTIONAL: 'transactional',
      NOTIFICATION: 'notification',
      MARKETING: 'marketing',
      SYSTEM: 'system',
    },
    EmailPriority: {
      LOW: 'low',
      NORMAL: 'normal',
      HIGH: 'high',
      URGENT: 'urgent',
    },
    EmailStatus: {
      QUEUED: 'queued',
      SENDING: 'sending',
      SENT: 'sent',
      FAILED: 'failed',
      BOUNCED: 'bounced',
      DELIVERED: 'delivered',
    },
  };
});

jest.mock('../../models/EmailPreference', () => {
  const mockEmailPreference = {
    findOne: jest.fn(),
    create: jest.fn(),
    findAll: jest.fn(),
  };
  return {
    __esModule: true,
    default: mockEmailPreference,
  };
});

// Mock config
jest.mock('../../config', () => ({
  config: {
    email: {
      provider: 'console',
      from: {
        email: 'noreply@adoptdontshop.com',
        name: "Adopt Don't Shop",
      },
    },
  },
}));

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
  logger: mockLogger,
  loggerHelpers: {
    logBusiness: jest.fn(),
    logDatabase: jest.fn(),
    logPerformance: jest.fn(),
    logExternalService: jest.fn(),
  },
}));

// Mock email providers
jest.mock('../../services/email-providers/console-provider');
jest.mock('../../services/email-providers/ethereal-provider');

import EmailTemplate, {
  TemplateType,
  TemplateCategory,
  TemplateStatus,
} from '../../models/EmailTemplate';
import EmailQueue, { EmailType, EmailPriority, EmailStatus } from '../../models/EmailQueue';
import EmailPreference from '../../models/EmailPreference';
import emailService from '../../services/email.service';

const MockedEmailTemplate = EmailTemplate as jest.Mocked<typeof EmailTemplate>;
const MockedEmailQueue = EmailQueue as jest.Mocked<typeof EmailQueue>;
const MockedEmailPreference = EmailPreference as jest.Mocked<typeof EmailPreference>;

describe('EmailService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Template management', () => {
    describe('when creating a template', () => {
      it('should create a template with all required fields', async () => {
        const templateData = {
          name: 'Welcome Email',
          description: 'Welcome new users',
          type: TemplateType.TRANSACTIONAL,
          category: TemplateCategory.WELCOME,
          subject: "Welcome to Adopt Don't Shop!",
          htmlContent: '<h1>Welcome {{firstName}}!</h1>',
          textContent: 'Welcome {{firstName}}!',
          variables: [
            {
              name: 'firstName',
              type: 'string' as const,
              required: true,
              description: 'User first name',
            },
          ],
          createdBy: 'admin-123',
        };

        const mockTemplate = {
          templateId: 'template-123',
          ...templateData,
          status: TemplateStatus.ACTIVE,
          createdAt: new Date(),
        };

        (MockedEmailTemplate.create as jest.Mock).mockResolvedValue(mockTemplate);

        const result = await emailService.createTemplate(templateData);

        expect(MockedEmailTemplate.create).toHaveBeenCalledWith(
          expect.objectContaining({
            name: templateData.name,
            type: templateData.type,
            category: templateData.category,
            subject: templateData.subject,
          })
        );

        expect(mockAuditLogAction).toHaveBeenCalledWith(
          expect.objectContaining({
            action: 'CREATE',
            entity: 'EmailTemplate',
          })
        );

        expect(result).toEqual(mockTemplate);
      });

      it('should create a template with default status DRAFT', async () => {
        const templateData = {
          name: 'Draft Template',
          type: TemplateType.TRANSACTIONAL,
          category: TemplateCategory.WELCOME,
          subject: 'Test',
          htmlContent: '<p>Test</p>',
          createdBy: 'admin-123',
        };

        const mockTemplate = {
          templateId: 'template-456',
          ...templateData,
          status: TemplateStatus.DRAFT,
          createdAt: new Date(),
        };

        (MockedEmailTemplate.create as jest.Mock).mockResolvedValue(mockTemplate);

        const result = await emailService.createTemplate(templateData);

        expect(MockedEmailTemplate.create).toHaveBeenCalledWith(
          expect.objectContaining({
            name: templateData.name,
            status: TemplateStatus.DRAFT,
          })
        );

        expect(result.status).toBe(TemplateStatus.DRAFT);
      });
    });

    describe('when getting templates', () => {
      it('should return filtered templates', async () => {
        const mockTemplates = [
          {
            templateId: 'template-1',
            name: 'Welcome Email',
            type: TemplateType.TRANSACTIONAL,
            category: TemplateCategory.WELCOME,
          },
          {
            templateId: 'template-2',
            name: 'Newsletter',
            type: TemplateType.MARKETING,
            category: TemplateCategory.NEWSLETTER,
          },
        ];

        (MockedEmailTemplate.findAndCountAll as jest.Mock).mockResolvedValue({
          rows: mockTemplates,
          count: 2,
        });

        const result = await emailService.getTemplates({
          type: TemplateType.TRANSACTIONAL,
          limit: 10,
        });

        expect(result.templates).toHaveLength(2);
        expect(result.total).toBe(2);
        expect(MockedEmailTemplate.findAndCountAll).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { type: TemplateType.TRANSACTIONAL },
            limit: 10,
          })
        );
      });
    });
  });

  describe('Email queuing', () => {
    describe('when sending an email', () => {
      it('should queue email with correct priority', async () => {
        const options = {
          toEmail: 'user@example.com',
          toName: 'John Doe',
          subject: 'Test Email',
          htmlContent: '<p>Test content</p>',
          textContent: 'Test content',
          type: EmailType.TRANSACTIONAL,
          priority: EmailPriority.HIGH,
          userId: 'user-123',
        };

        const mockEmail = {
          emailId: 'email-123',
          ...options,
          status: EmailStatus.QUEUED,
          currentRetries: 0,
          maxRetries: 3,
        };

        (MockedEmailQueue.create as jest.Mock).mockResolvedValue(mockEmail);
        (MockedEmailPreference.findOne as jest.Mock).mockResolvedValue(null); // No preferences = allowed

        const emailId = await emailService.sendEmail(options);

        expect(MockedEmailQueue.create).toHaveBeenCalledWith(
          expect.objectContaining({
            toEmail: options.toEmail,
            subject: options.subject,
            priority: EmailPriority.HIGH,
            status: EmailStatus.QUEUED,
          })
        );

        expect(mockAuditLogAction).toHaveBeenCalledWith(
          expect.objectContaining({
            action: 'EMAIL_QUEUED',
            entity: 'EmailQueue',
            entityId: mockEmail.emailId,
          })
        );

        expect(emailId).toBe('email-123');
      });

      it('should use template when templateId is provided', async () => {
        const mockTemplate = {
          templateId: 'template-123',
          subject: 'Welcome {{firstName}}!',
          htmlContent: '<h1>Welcome {{firstName}}!</h1>',
          textContent: 'Welcome {{firstName}}!',
          isActive: jest.fn().mockReturnValue(true),
          validateVariables: jest.fn().mockReturnValue({ valid: true, errors: [] }),
          incrementUsage: jest.fn(),
          save: jest.fn().mockResolvedValue(undefined),
        };

        (MockedEmailTemplate.findByPk as jest.Mock).mockResolvedValue(mockTemplate);
        (MockedEmailQueue.create as jest.Mock).mockResolvedValue({
          emailId: 'email-123',
          status: EmailStatus.QUEUED,
        });
        (MockedEmailPreference.findOne as jest.Mock).mockResolvedValue(null);

        await emailService.sendEmail({
          toEmail: 'user@example.com',
          templateId: 'template-123',
          templateData: { firstName: 'John' },
          type: EmailType.TRANSACTIONAL,
        });

        expect(MockedEmailTemplate.findByPk).toHaveBeenCalledWith('template-123');
        expect(mockTemplate.validateVariables).toHaveBeenCalled();
        expect(mockTemplate.incrementUsage).toHaveBeenCalled();
      });

      it('should throw error when template is inactive', async () => {
        const mockTemplate = {
          templateId: 'template-123',
          isActive: jest.fn().mockReturnValue(false),
        };

        (MockedEmailTemplate.findByPk as jest.Mock).mockResolvedValue(mockTemplate);

        await expect(
          emailService.sendEmail({
            toEmail: 'user@example.com',
            templateId: 'template-123',
            type: EmailType.TRANSACTIONAL,
          })
        ).rejects.toThrow('Template is not active');
      });
    });
  });

  describe('User email preferences', () => {
    describe('when user has disabled email type', () => {
      it('should block email and throw error', async () => {
        const mockPreference = {
          userId: 'user-123',
          emailEnabled: false,
          marketingEnabled: false,
          canReceiveEmails: jest.fn().mockReturnValue(false),
          canReceiveType: jest.fn().mockReturnValue(false),
        };

        (MockedEmailPreference.findOne as jest.Mock).mockResolvedValue(mockPreference);

        await expect(
          emailService.sendEmail({
            toEmail: 'user@example.com',
            subject: 'Marketing Email',
            htmlContent: '<p>Buy now!</p>',
            type: EmailType.MARKETING,
            userId: 'user-123',
          })
        ).rejects.toThrow('User has disabled this type of email');

        expect(MockedEmailQueue.create).not.toHaveBeenCalled();
      });
    });

    describe('when user has no preferences set', () => {
      it('should allow email to be sent', async () => {
        (MockedEmailPreference.findOne as jest.Mock).mockResolvedValue(null);
        (MockedEmailQueue.create as jest.Mock).mockResolvedValue({
          emailId: 'email-123',
          status: EmailStatus.QUEUED,
        });

        const emailId = await emailService.sendEmail({
          toEmail: 'user@example.com',
          subject: 'Test',
          htmlContent: '<p>Test</p>',
          type: EmailType.TRANSACTIONAL,
          userId: 'user-123',
        });

        expect(emailId).toBe('email-123');
        expect(MockedEmailQueue.create).toHaveBeenCalled();
      });
    });
  });

  describe('Bulk email sending', () => {
    describe('when sending to multiple recipients', () => {
      it('should batch emails and add delays', async () => {
        const recipients = [
          { toEmail: 'user1@example.com', toName: 'User 1', userId: 'user-1' },
          { toEmail: 'user2@example.com', toName: 'User 2', userId: 'user-2' },
          { toEmail: 'user3@example.com', toName: 'User 3', userId: 'user-3' },
        ];

        (MockedEmailQueue.create as jest.Mock).mockResolvedValue({
          emailId: 'email-123',
          status: EmailStatus.QUEUED,
        });
        (MockedEmailPreference.findOne as jest.Mock).mockResolvedValue(null);

        const emailIds = await emailService.sendBulkEmail({
          recipients,
          subject: 'Bulk Email',
          htmlContent: '<p>Hello!</p>',
          type: EmailType.MARKETING,
          batchSize: 2,
          delayBetweenBatches: 100,
        });

        expect(emailIds).toHaveLength(3);
        expect(MockedEmailQueue.create).toHaveBeenCalledTimes(3);
      });

      it('should handle partial failures in bulk send', async () => {
        const recipients = [
          { toEmail: 'user1@example.com', toName: 'User 1' },
          { toEmail: 'user2@example.com', toName: 'User 2' },
        ];

        (MockedEmailQueue.create as jest.Mock)
          .mockResolvedValueOnce({ emailId: 'email-1', status: EmailStatus.QUEUED })
          .mockRejectedValueOnce(new Error('Queue full'));
        (MockedEmailPreference.findOne as jest.Mock).mockResolvedValue(null);

        const emailIds = await emailService.sendBulkEmail({
          recipients,
          subject: 'Bulk Email',
          htmlContent: '<p>Hello!</p>',
          type: EmailType.MARKETING,
        });

        // Should return only successful email IDs
        expect(emailIds).toHaveLength(1);
        expect(emailIds[0]).toBe('email-1');
      });
    });
  });
});
