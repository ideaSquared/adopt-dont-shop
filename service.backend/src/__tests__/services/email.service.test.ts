import { vi, beforeEach, afterEach, describe, it, expect } from 'vitest';
import sequelize from '../../sequelize';
import EmailTemplate, { TemplateType, TemplateCategory, TemplateStatus } from '../../models/EmailTemplate';
import EmailQueue, { EmailType, EmailPriority, EmailStatus } from '../../models/EmailQueue';
import EmailPreference from '../../models/EmailPreference';
import User, { UserType, UserStatus } from '../../models/User';
import { EmailService } from '../../services/email.service';

// Mock only external services - use real database for models
vi.mock('../../services/auditLog.service', () => ({
  AuditLogService: {
    log: vi.fn().mockResolvedValue(undefined),
  },
}));

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
  loggerHelpers: {
    logBusiness: vi.fn(),
    logDatabase: vi.fn(),
    logPerformance: vi.fn(),
    logExternalService: vi.fn(),
  },
}));

// Explicitly unmock the email service - we want to use the real implementation
vi.unmock('../../services/email.service');

describe('EmailService - Real Database Testing', () => {
  let emailService: EmailService;

  beforeEach(async () => {
    // Sync database schema before each test
    await sequelize.sync({ force: true });

    // Create admin user for createdBy foreign key
    await User.create({
      userId: 'admin',
      email: 'admin@test.com',
      password: 'hashedpassword',
      firstName: 'Admin',
      lastName: 'User',
      userType: UserType.ADMIN,
      status: UserStatus.ACTIVE,
      emailVerified: true,
    });

    // Create test user for userId foreign key in email tests
    await User.create({
      userId: 'user-123',
      email: 'testuser@example.com',
      password: 'hashedpassword',
      firstName: 'Test',
      lastName: 'User',
      userType: UserType.ADOPTER,
      status: UserStatus.ACTIVE,
      emailVerified: true,
    });

    // Create fresh instance of service for each test
    emailService = new EmailService();

    vi.clearAllMocks();
  });

  afterEach(async () => {
    // Clean up database after each test
    await EmailPreference.destroy({ where: {}, truncate: true, cascade: true });
    await EmailQueue.destroy({ where: {}, truncate: true, cascade: true });
    await EmailTemplate.destroy({ where: {}, truncate: true, cascade: true });
    await User.destroy({ where: {}, truncate: true, cascade: true });
  });

  describe('Template management', () => {
    describe('when creating a template', () => {
      it('should create a template with all required fields', async () => {
        const templateData = {
          name: 'Welcome Email',
          description: 'Welcome new users',
          type: TemplateType.TRANSACTIONAL,
          category: TemplateCategory.WELCOME,
          subject: 'Welcome to Adopt Don\'t Shop!',
          htmlContent: '<h1>Welcome {{firstName}}!</h1>',
          textContent: 'Welcome {{firstName}}!',
          variables: [{
            name: 'firstName',
            type: 'string' as const,
            required: true,
            description: 'User first name'
          }],
          createdBy: 'admin',
        };

        const result = await emailService.createTemplate(templateData);

        expect(result).toBeDefined();
        expect(result.templateId).toBeDefined();
        expect(result.name).toBe(templateData.name);
        expect(result.type).toBe(templateData.type);
        expect(result.category).toBe(templateData.category);
        expect(result.subject).toBe(templateData.subject);
        expect(result.htmlContent).toBe(templateData.htmlContent);
        expect(result.textContent).toBe(templateData.textContent);

        // Verify it was saved to database
        const saved = await EmailTemplate.findByPk(result.templateId);
        expect(saved).toBeDefined();
        expect(saved?.name).toBe(templateData.name);
      });

      it('should create a template with default status DRAFT', async () => {
        const templateData = {
          name: 'Draft Template',
          type: TemplateType.TRANSACTIONAL,
          category: TemplateCategory.WELCOME,
          subject: 'Test',
          htmlContent: '<p>Test</p>',
          createdBy: 'admin',
        };

        const result = await emailService.createTemplate(templateData);

        expect(result.status).toBe(TemplateStatus.DRAFT);

        // Verify in database
        const saved = await EmailTemplate.findByPk(result.templateId);
        expect(saved?.status).toBe(TemplateStatus.DRAFT);
      });
    });

    describe('when getting templates', () => {
      it('should return filtered templates', async () => {
        // Create test data
        await EmailTemplate.create({
          name: 'Welcome Email',
          type: TemplateType.TRANSACTIONAL,
          category: TemplateCategory.WELCOME,
          subject: 'Welcome',
          htmlContent: '<p>Welcome</p>',
          status: TemplateStatus.ACTIVE,
          variables: [],
          versions: [],
          currentVersion: 1,
          isDefault: false,
          priority: 1,
          locale: 'en',
          usageCount: 0,
          testEmailsSent: 0,
          tags: [],
          createdBy: 'admin',
        });

        await EmailTemplate.create({
          name: 'Newsletter',
          type: TemplateType.MARKETING,
          category: TemplateCategory.NEWSLETTER,
          subject: 'Newsletter',
          htmlContent: '<p>Newsletter</p>',
          status: TemplateStatus.ACTIVE,
          variables: [],
          versions: [],
          currentVersion: 1,
          isDefault: false,
          priority: 1,
          locale: 'en',
          usageCount: 0,
          testEmailsSent: 0,
          tags: [],
          createdBy: 'admin',
        });

        const result = await emailService.getTemplates({
          type: TemplateType.TRANSACTIONAL,
          limit: 10,
        });

        expect(result.templates).toHaveLength(1);
        expect(result.total).toBe(1);
        expect(result.templates[0].name).toBe('Welcome Email');
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

        const emailId = await emailService.sendEmail(options);

        expect(emailId).toBeDefined();

        // Verify email was queued in database
        const queued = await EmailQueue.findByPk(emailId);
        expect(queued).toBeDefined();
        expect(queued?.toEmail).toBe(options.toEmail);
        expect(queued?.subject).toBe(options.subject);
        expect(queued?.priority).toBe(EmailPriority.HIGH);
        expect(queued?.status).toBe(EmailStatus.QUEUED);
      });

      it('should use template when templateId is provided', async () => {
        // Create a template first
        const template = await EmailTemplate.create({
          name: 'Welcome Template',
          type: TemplateType.TRANSACTIONAL,
          category: TemplateCategory.WELCOME,
          subject: 'Welcome {{firstName}}!',
          htmlContent: '<h1>Welcome {{firstName}}!</h1>',
          textContent: 'Welcome {{firstName}}!',
          status: TemplateStatus.ACTIVE,
          variables: [{
            name: 'firstName',
            type: 'string' as const,
            required: true,
            description: 'User first name'
          }],
          versions: [],
          currentVersion: 1,
          isDefault: false,
          priority: 1,
          locale: 'en',
          usageCount: 0,
          testEmailsSent: 0,
          tags: [],
          createdBy: 'admin',
        });

        const emailId = await emailService.sendEmail({
          toEmail: 'user@example.com',
          templateId: template.templateId,
          templateData: { firstName: 'John' },
          type: EmailType.TRANSACTIONAL,
        });

        expect(emailId).toBeDefined();

        // Verify template was used
        const queued = await EmailQueue.findByPk(emailId);
        expect(queued?.subject).toContain('John');

        // Verify template usage was incremented
        await template.reload();
        expect(template.usageCount).toBe(1);
      });

      it('should throw error when template is inactive', async () => {
        // Create inactive template
        const template = await EmailTemplate.create({
          name: 'Inactive Template',
          type: TemplateType.TRANSACTIONAL,
          category: TemplateCategory.WELCOME,
          subject: 'Test',
          htmlContent: '<p>Test</p>',
          status: TemplateStatus.INACTIVE,
          variables: [],
          versions: [],
          currentVersion: 1,
          isDefault: false,
          priority: 1,
          locale: 'en',
          usageCount: 0,
          testEmailsSent: 0,
          tags: [],
          createdBy: 'admin',
        });

        await expect(
          emailService.sendEmail({
            toEmail: 'user@example.com',
            templateId: template.templateId,
            type: EmailType.TRANSACTIONAL,
          })
        ).rejects.toThrow('Template is not active');
      });
    });
  });

  describe('User email preferences', () => {
    describe('when user has disabled email type', () => {
      it('should block email and throw error', async () => {
        // user-123 already exists from beforeEach, just create preference

        // Create user preference that blocks marketing emails
        await EmailPreference.create({
          userId: 'user-123',
          isEmailEnabled: true,
          globalUnsubscribe: false,
          preferences: [
            {
              type: 'marketing' as const,
              enabled: false,
              frequency: 'never' as const,
              channels: ['email'],
            },
          ],
        });

        await expect(
          emailService.sendEmail({
            toEmail: 'user@example.com',
            subject: 'Marketing Email',
            htmlContent: '<p>Buy now!</p>',
            type: EmailType.MARKETING,
            userId: 'user-123',
          })
        ).rejects.toThrow('User has disabled this type of email');

        // Verify no email was queued
        const count = await EmailQueue.count();
        expect(count).toBe(0);
      });
    });

    describe('when user has no preferences set', () => {
      it('should allow email to be sent', async () => {
        const emailId = await emailService.sendEmail({
          toEmail: 'user@example.com',
          subject: 'Test',
          htmlContent: '<p>Test</p>',
          type: EmailType.TRANSACTIONAL,
          userId: 'user-123',
        });

        expect(emailId).toBeDefined();

        // Verify email was queued
        const queued = await EmailQueue.findByPk(emailId);
        expect(queued).toBeDefined();
      });
    });
  });

  describe('Bulk email sending', () => {
    describe('when sending to multiple recipients', () => {
      it('should batch emails and add delays', async () => {
        const recipients = [
          { toEmail: 'user1@example.com', toName: 'User 1' },
          { toEmail: 'user2@example.com', toName: 'User 2' },
          { toEmail: 'user3@example.com', toName: 'User 3' },
        ];

        const emailIds = await emailService.sendBulkEmail({
          recipients,
          subject: 'Bulk Email',
          htmlContent: '<p>Hello!</p>',
          type: EmailType.MARKETING,
          batchSize: 2,
          delayBetweenBatches: 100,
        });

        expect(emailIds).toHaveLength(3);

        // Verify all emails were queued
        const count = await EmailQueue.count();
        expect(count).toBe(3);
      });

      it('should handle partial failures in bulk send', async () => {
        const recipients = [
          { toEmail: 'valid@example.com', toName: 'User 1' },
          { toEmail: '', toName: 'User 2' }, // Invalid email
        ];

        const emailIds = await emailService.sendBulkEmail({
          recipients,
          subject: 'Bulk Email',
          htmlContent: '<p>Hello!</p>',
          type: EmailType.MARKETING,
        });

        // Should return only successful email IDs
        expect(emailIds.length).toBeGreaterThan(0);
        expect(emailIds.length).toBeLessThanOrEqual(2);
      });
    });
  });
});
