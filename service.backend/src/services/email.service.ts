import { Op, WhereOptions } from 'sequelize';
import { config } from '../config';
import EmailPreference, { EmailFrequency, NotificationType } from '../models/EmailPreference';
import EmailQueue, { EmailPriority, EmailStatus, EmailType } from '../models/EmailQueue';
import EmailTemplateVersion from '../models/EmailTemplateVersion';
import EmailTemplate, {
  TemplateCategory,
  TemplateStatus,
  TemplateType,
} from '../models/EmailTemplate';
import { JsonObject, JsonValue, TemplateData, TemplateVariable } from '../types/common';
import { BulkEmailOptions, EmailAnalytics, SendEmailOptions } from '../types/email';
import logger, { loggerHelpers } from '../utils/logger';
import { AuditLogService } from './auditLog.service';
import { EmailProvider } from './email-providers/base-provider';
import { ConsoleEmailProvider } from './email-providers/console-provider';
import { EtherealProvider } from './email-providers/ethereal-provider';
import { ResendProvider } from './email-providers/resend-provider';

// Type for provider info (Ethereal test account)
type ProviderInfo = {
  user: string;
  password: string;
  webUrl: string;
  inboxUrl: string;
} | null;

class EmailService {
  private provider: EmailProvider;
  private isProcessing = false;
  private processingInterval?: NodeJS.Timeout;

  constructor() {
    // Initialize with console provider as default
    this.provider = new ConsoleEmailProvider();

    // Initialize the appropriate provider asynchronously
    this.initializeProvider().catch(error => {
      logger.error('Failed to initialize email provider:', error);
    });

    // Don't start queue processor in constructor - wait for database to be ready
  }

  private async initializeProvider(): Promise<void> {
    try {
      switch (config.email.provider) {
        case 'ethereal': {
          const etherealProvider = new EtherealProvider();
          await etherealProvider.initialize();
          this.provider = etherealProvider;
          break;
        }
        case 'resend': {
          const resendProvider = new ResendProvider({
            apiKey: config.email.resend.apiKey ?? '',
            fromEmail: config.email.resend.fromEmail ?? config.email.from,
            fromName: config.email.resend.fromName,
            replyTo: config.email.resend.replyTo,
          });
          if (!resendProvider.validateConfiguration()) {
            throw new Error(
              'Resend provider misconfigured: RESEND_API_KEY and RESEND_FROM_EMAIL are required'
            );
          }
          this.provider = resendProvider;
          break;
        }
        default:
          // Fallback to console provider
          this.provider = new ConsoleEmailProvider();
      }

      loggerHelpers.logExternalService('Email Provider', 'Provider Initialized', {
        provider: config.email.provider,
        environment: process.env.NODE_ENV,
      });
    } catch (error) {
      logger.error('Failed to initialize email provider, falling back to console:', error);
      this.provider = new ConsoleEmailProvider();
    }
  }

  // Provider Management
  public setProvider(provider: EmailProvider): void {
    this.provider = provider;
    loggerHelpers.logExternalService('Email Provider', 'Provider Changed', {
      provider: provider.getName(),
      environment: process.env.NODE_ENV,
    });
  }

  public getProvider(): EmailProvider {
    return this.provider;
  }

  public getProviderInfo(): ProviderInfo {
    if (this.provider instanceof EtherealProvider) {
      return this.provider.getPreviewInfo();
    }
    return null;
  }

  public static getProviderInfo(): ProviderInfo {
    const emailService = new EmailService();
    return emailService.getProviderInfo();
  }

  // Template Management
  public async createTemplate(templateData: {
    name: string;
    description?: string;
    type: TemplateType;
    category: TemplateCategory;
    subject: string;
    htmlContent: string;
    textContent?: string;
    variables?: TemplateVariable[];
    locale?: string;
    parentTemplateId?: string;
    isDefault?: boolean;
    priority?: number;
    tags?: string[];
    createdBy: string;
  }): Promise<EmailTemplate> {
    const startTime = Date.now();

    try {
      const template = await EmailTemplate.create({
        ...templateData,
        locale: templateData.locale || 'en',
        status: TemplateStatus.DRAFT,
        currentVersion: 1,
        usageCount: 0,
        testEmailsSent: 0,
        priority: templateData.priority || 0,
        variables: templateData.variables || [],
        isDefault: templateData.isDefault || false,
      });

      // Seed the version history with the initial state (plan 5.4 —
      // typed table replaces the old JSONB array).
      await EmailTemplateVersion.create({
        template_id: template.templateId,
        version: 1,
        subject: templateData.subject,
        html_content: templateData.htmlContent,
        text_content: templateData.textContent ?? null,
        change_notes: 'Initial version',
        created_by: templateData.createdBy,
      } as never);

      await AuditLogService.log({
        action: 'CREATE',
        entity: 'EmailTemplate',
        entityId: template.templateId,
        details: JSON.parse(JSON.stringify(templateData)),
        userId: templateData.createdBy,
      });

      loggerHelpers.logBusiness(
        'Email Template Created',
        {
          templateId: template.templateId,
          name: template.name,
          createdBy: templateData.createdBy,
          duration: Date.now() - startTime,
        },
        templateData.createdBy
      );

      logger.info(`Email template created: ${template.templateId}`);
      return template;
    } catch (error: unknown) {
      logger.error('Failed to create email template:', {
        error: error instanceof Error ? error.message : String(error),
        templateName: templateData.name,
        createdBy: templateData.createdBy,
        duration: Date.now() - startTime,
      });
      throw new Error(
        `Failed to create email template: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  public async updateTemplate(
    templateId: string,
    updates: {
      name?: string;
      description?: string;
      subject?: string;
      htmlContent?: string;
      textContent?: string;
      variables?: TemplateVariable[];
      status?: TemplateStatus;
      tags?: string[];
    },
    updatedBy: string
  ): Promise<EmailTemplate> {
    const startTime = Date.now();

    try {
      const template = await EmailTemplate.findByPk(templateId);
      if (!template) {
        throw new Error('Template not found');
      }

      // Create new version if content changed (plan 5.4 — version
      // history lives in the email_template_versions table now). The
      // version row is inserted before the parent update so the
      // history captures the pre-change state via the next bumped
      // version number.
      const contentChanged =
        updates.subject !== undefined ||
        updates.htmlContent !== undefined ||
        updates.textContent !== undefined;

      if (contentChanged) {
        const nextVersion = template.currentVersion + 1;
        // created_by is set by the auditColumns hook from the
        // request-context userId, but for explicit attribution (the
        // updatedBy parameter is already known here) we cast it
        // through. Audit columns aren't part of the typed attributes
        // interface — they're bolted on at the model level — hence
        // the `as never` to satisfy the typed create signature.
        await EmailTemplateVersion.create({
          template_id: template.templateId,
          version: nextVersion,
          subject: updates.subject || template.subject,
          html_content: updates.htmlContent || template.htmlContent,
          text_content: updates.textContent ?? template.textContent ?? null,
          change_notes: 'Template updated',
          created_by: updatedBy,
        } as never);
        template.currentVersion = nextVersion;
      }

      // Update other fields
      Object.assign(template, updates);
      template.lastModifiedBy = updatedBy;

      await template.save();

      await AuditLogService.log({
        action: 'UPDATE',
        entity: 'EmailTemplate',
        entityId: templateId,
        details: JSON.parse(JSON.stringify(updates)),
        userId: updatedBy,
      });

      loggerHelpers.logBusiness(
        'Email Template Updated',
        {
          templateId,
          updatedBy,
          duration: Date.now() - startTime,
        },
        updatedBy
      );

      logger.info(`Email template updated: ${templateId}`);
      return template;
    } catch (error: unknown) {
      logger.error('Failed to update email template:', {
        error: error instanceof Error ? error.message : String(error),
        templateId,
        updatedBy,
        duration: Date.now() - startTime,
      });
      throw new Error(
        `Failed to update email template: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  public async getTemplate(templateId: string): Promise<EmailTemplate | null> {
    return await EmailTemplate.findByPk(templateId);
  }

  public async getTemplateByName(name: string): Promise<EmailTemplate | null> {
    return await EmailTemplate.findOne({ where: { name } });
  }

  public async getTemplates(
    filters: {
      type?: TemplateType;
      category?: TemplateCategory;
      status?: TemplateStatus;
      locale?: string;
      isDefault?: boolean;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ templates: EmailTemplate[]; total: number }> {
    const where: WhereOptions = {};

    if (filters.type) {
      where.type = filters.type;
    }
    if (filters.category) {
      where.category = filters.category;
    }
    if (filters.status) {
      where.status = filters.status;
    }
    if (filters.locale) {
      where.locale = filters.locale;
    }
    if (filters.isDefault !== undefined) {
      where.isDefault = filters.isDefault;
    }

    const { count, rows } = await EmailTemplate.findAndCountAll({
      where,
      limit: filters.limit || 50,
      offset: filters.offset || 0,
      order: [
        ['priority', 'DESC'],
        ['usageCount', 'DESC'],
        ['createdAt', 'DESC'],
      ],
    });

    return { templates: rows, total: count };
  }

  public async deleteTemplate(templateId: string, deletedBy: string): Promise<void> {
    const startTime = Date.now();

    try {
      const template = await EmailTemplate.findByPk(templateId);
      if (!template) {
        throw new Error('Template not found');
      }

      await template.destroy();

      await AuditLogService.log({
        action: 'DELETE',
        entity: 'EmailTemplate',
        entityId: templateId,
        details: { deletedBy },
        userId: deletedBy,
      });

      loggerHelpers.logBusiness(
        'Email Template Deleted',
        {
          templateId,
          deletedBy,
          duration: Date.now() - startTime,
        },
        deletedBy
      );

      logger.info(`Email template deleted: ${templateId}`);
    } catch (error: unknown) {
      logger.error('Failed to delete email template:', {
        error: error instanceof Error ? error.message : String(error),
        templateId,
        deletedBy,
        duration: Date.now() - startTime,
      });
      throw new Error(
        `Failed to delete email template: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  // Email Sending
  public async sendEmail(options: SendEmailOptions): Promise<string> {
    const startTime = Date.now();

    try {
      let { subject, htmlContent, textContent } = options;

      // Process template if templateId provided
      if (options.templateId) {
        const template = await this.getTemplate(options.templateId);
        if (!template) {
          throw new Error('Template not found');
        }

        if (!template.isActive()) {
          throw new Error('Template is not active');
        }

        // Validate template data
        if (options.templateData) {
          const validation = template.validateVariables(options.templateData);
          if (!validation.valid) {
            throw new Error(`Template validation failed: ${validation.errors.join(', ')}`);
          }
        }

        // Process template content
        const processedContent = await this.processTemplate(template, options.templateData || {});
        subject = processedContent.subject;
        htmlContent = processedContent.htmlContent;
        textContent = processedContent.textContent;

        // Update template usage — atomic via Model.increment inside the method.
        await template.incrementUsage();
      }

      if (!subject || !htmlContent) {
        throw new Error('Subject and HTML content are required');
      }

      // Check user email preferences
      if (options.userId) {
        const canSend = await this.checkEmailPreferences(options.userId, options.type as EmailType);
        if (!canSend) {
          logger.info(`Email blocked by user preferences: ${options.userId}`);
          throw new Error('User has disabled this type of email');
        }
      }

      // Create email queue entry
      const email = await EmailQueue.create({
        templateId: options.templateId,
        fromEmail:
          options.fromEmail || process.env.DEFAULT_FROM_EMAIL || 'noreply@adoptdontshop.com',
        fromName: options.fromName || "Adopt Don't Shop",
        toEmail: options.toEmail,
        toName: options.toName,
        ccEmails: options.ccEmails || [],
        bccEmails: options.bccEmails || [],
        replyToEmail: options.replyToEmail,
        subject,
        htmlContent,
        textContent,
        templateData: options.templateData || {},
        attachments: options.attachments || [],
        status: EmailStatus.QUEUED,
        type: (options.type as EmailType) || EmailType.SYSTEM,
        priority: (options.priority as EmailPriority) || EmailPriority.NORMAL,
        scheduledFor: options.scheduledFor,
        maxRetries: 3,
        currentRetries: 0,
        userId: options.userId,
        campaignId: options.campaignId,
        tags: options.tags || [],
        metadata: options.metadata || {},
      });

      await AuditLogService.log({
        action: 'EMAIL_QUEUED',
        entity: 'EmailQueue',
        entityId: email.emailId,
        details: {
          toEmail: email.toEmail,
          subject: email.subject,
          templateId: email.templateId || null,
          userId: options.userId || null,
        },
        userId: options.userId || 'system',
      });

      loggerHelpers.logExternalService('Email Provider', 'Email Queued', {
        emailId: email.emailId,
        toEmail: email.toEmail,
        templateId: email.templateId,
        duration: Date.now() - startTime,
      });

      // Start processing if not already running
      if (!this.isProcessing) {
        this.startQueueProcessor();
      }

      return email.emailId;
    } catch (error: unknown) {
      logger.error('Failed to send email:', {
        error: error instanceof Error ? error.message : String(error),
        toEmail: options.toEmail,
        templateId: options.templateId,
        duration: Date.now() - startTime,
      });
      throw new Error(
        `Failed to send email: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  public async sendBulkEmail(options: BulkEmailOptions): Promise<string[]> {
    const startTime = Date.now();

    const emailIds: string[] = [];
    // CodeQL js/loop-bound-injection: batchSize and the inter-batch delay
    // both control loop / setTimeout cost. The express-validator chain on
    // /v1/email/bulk caps recipients at 1000 but doesn't validate either
    // pacing knob — and a clamp pattern (`Math.min(MAX, Number(x))`) wasn't
    // a recognised sanitizer in CodeQL's data-flow on the previous attempt.
    // Both knobs are pacing internals that callers don't actually pass, so
    // pin them to constants and stop accepting a user-controlled value.
    const batchSize = 100;
    const delay = 1000;

    logger.info(`Starting bulk email send: ${options.recipients.length} recipients`);

    for (let i = 0; i < options.recipients.length; i += batchSize) {
      const batch = options.recipients.slice(i, i + batchSize);

      const batchPromises = batch.map(async recipient => {
        try {
          const emailId = await this.sendEmail({
            ...options,
            toEmail: recipient.toEmail,
            toName: recipient.toName,
            userId: recipient.userId,
            templateData: { ...options.templateData, ...recipient.templateData },
          });
          return emailId;
        } catch (error) {
          logger.error(`Failed to queue email for ${recipient.toEmail}:`, error);
          return null;
        }
      });

      const batchResults = await Promise.all(batchPromises);
      emailIds.push(...(batchResults.filter(id => id !== null) as string[]));

      // Delay between batches to avoid overwhelming the system
      if (i + batchSize < options.recipients.length && delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    loggerHelpers.logExternalService('Email Provider', 'Bulk Email Completed', {
      totalRecipients: options.recipients.length,
      successful: emailIds.length,
      failed: emailIds.length - emailIds.filter(id => id !== null).length,
      duration: Date.now() - startTime,
    });

    logger.info(`Bulk email completed: ${emailIds.length} emails queued`);
    return emailIds;
  }

  // Template Processing
  /**
   * Public wrapper for processTemplate, used by preview endpoints to render
   * a template with provided data without queueing/sending.
   */
  public async renderTemplatePreview(
    template: EmailTemplate,
    data: TemplateData
  ): Promise<{
    subject: string;
    htmlContent: string;
    textContent?: string;
  }> {
    return this.processTemplate(template, data);
  }

  private async processTemplate(
    template: EmailTemplate,
    data: TemplateData
  ): Promise<{
    subject: string;
    htmlContent: string;
    textContent?: string;
  }> {
    const context = {
      ...data,
      system: {
        appName: "Adopt Don't Shop",
        baseUrl: process.env.FRONTEND_URL || 'https://adoptdontshop.com',
        supportEmail: process.env.SUPPORT_EMAIL || 'support@adoptdontshop.com',
        year: new Date().getFullYear(),
        ...(data.system && typeof data.system === 'object' ? data.system : {}),
      },
    };

    return {
      subject: this.processTemplateString(template.subject, context),
      htmlContent: this.processTemplateString(template.htmlContent, context),
      textContent: template.textContent
        ? this.processTemplateString(template.textContent, context)
        : undefined,
    };
  }

  private processTemplateString(template: string, data: JsonObject): string {
    return template.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
      const value = this.getNestedProperty(data, key.trim());
      if (value === undefined) {
        return match;
      }
      return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;');
    });
  }

  private getNestedProperty(obj: JsonObject, path: string): JsonValue | undefined {
    return path
      .split('.')
      .reduce((current: JsonValue | undefined, key: string): JsonValue | undefined => {
        if (current && typeof current === 'object' && current !== null && !Array.isArray(current)) {
          const objCurrent = current as JsonObject;
          return objCurrent[key];
        }
        return undefined;
      }, obj);
  }

  // Queue Processing
  public startQueueProcessor(): void {
    if (this.processingInterval) {
      logger.warn('Email queue processor already running');
      return;
    }

    this.processingInterval = setInterval(async () => {
      if (!this.isProcessing) {
        await this.processEmailQueue();
      }
    }, 5000); // Process every 5 seconds

    logger.info('Email queue processor started');
  }

  public stopQueueProcessor(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = undefined;
      logger.info('Email queue processor stopped');
    }
  }

  /**
   * ADS-477: previously processed each batch with a sequential
   * `for...of await`. With a 500ms SMTP round-trip a batch of 10
   * already pegged the worker for 5 seconds, so the queue would
   * never catch up under load.
   *
   * Now we run a bounded `Promise.all` across the batch — up to
   * `EMAIL_QUEUE_CONCURRENCY` (default 5) concurrent sends. Failures
   * are isolated per email so one bad send can't poison the batch.
   */
  private getQueueConcurrency(): number {
    const raw = process.env.EMAIL_QUEUE_CONCURRENCY;
    const parsed = raw ? parseInt(raw, 10) : NaN;
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return 5;
    }
    return Math.min(parsed, 50);
  }

  private async processEmailQueue(): Promise<void> {
    if (this.isProcessing) {
      return;
    }

    this.isProcessing = true;

    try {
      const concurrency = this.getQueueConcurrency();
      // Pull a batch sized to the concurrency window so we don't
      // hold rows in QUEUED state any longer than necessary.
      const batchSize = Math.max(concurrency * 2, 10);

      const emails = await EmailQueue.findAll({
        where: {
          status: EmailStatus.QUEUED,
          [Op.or]: [{ scheduledFor: null }, { scheduledFor: { [Op.lte]: new Date() } }],
        } as WhereOptions,
        order: [
          ['priority', 'DESC'],
          ['createdAt', 'ASC'],
        ],
        limit: batchSize,
      });

      // Bounded parallel: `concurrency` workers pull from a shared
      // queue. Each worker awaits its current send before pulling
      // the next, so we never exceed `concurrency` in-flight calls.
      const queue = [...emails];
      const workers = Array.from({ length: Math.min(concurrency, queue.length) }, async () => {
        while (queue.length > 0) {
          const email = queue.shift();
          if (!email) {
            return;
          }
          try {
            await this.processEmail(email);
          } catch (error) {
            // processEmail already records failure on the row; this
            // catch keeps a single send from killing the worker.
            logger.error('Email worker caught unhandled error', {
              emailId: email.emailId,
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }
      });
      await Promise.all(workers);
    } catch (error) {
      logger.error('Error processing email queue:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  private async processEmail(email: EmailQueue): Promise<void> {
    try {
      email.markAsSending();
      await email.save();

      const result = await this.provider.send(email);

      if (result.success) {
        email.markAsSent(this.provider.getName(), result.messageId);
        logger.info(`Email sent successfully: ${email.emailId}`);
      } else {
        email.markAsFailed(result.error || 'Unknown error');
        logger.error(`Email failed: ${email.emailId} - ${result.error}`);
      }

      await email.save();
    } catch (error: unknown) {
      logger.error(`Error processing email ${email.emailId}:`, error);
      email.markAsFailed(error instanceof Error ? error.message : 'Unknown error');
      await email.save();
    }
  }

  // Email Preferences
  private async checkEmailPreferences(userId: string, emailType?: EmailType): Promise<boolean> {
    try {
      const preference = await EmailPreference.findOne({ where: { userId } });
      if (!preference) {
        return true; // Default to allow if no preferences set
      }

      if (!preference.canReceiveEmails()) {
        return false;
      }

      // Check specific notification type based on email type
      if (emailType) {
        const notificationType = this.mapEmailTypeToNotificationType(emailType);
        if (notificationType && !preference.canReceiveType(notificationType)) {
          return false;
        }
      }

      return true;
    } catch (error) {
      logger.error('Error checking email preferences:', error);
      return true; // Default to allow on error
    }
  }

  private mapEmailTypeToNotificationType(emailType: EmailType): NotificationType | null {
    switch (emailType) {
      case EmailType.TRANSACTIONAL:
        return NotificationType.APPLICATION_UPDATES;
      case EmailType.NOTIFICATION:
        return NotificationType.MESSAGES;
      case EmailType.MARKETING:
        return NotificationType.MARKETING;
      case EmailType.SYSTEM:
        return NotificationType.SYSTEM_ANNOUNCEMENTS;
      default:
        return null;
    }
  }

  // User Preference Management
  public async createUserPreferences(userId: string): Promise<EmailPreference> {
    try {
      const preference = await EmailPreference.create({
        userId,
        isEmailEnabled: true,
        globalUnsubscribe: false,
        preferences: [],
        language: 'en',
        timezone: 'UTC',
        emailFormat: 'html',
        digestFrequency: EmailFrequency.WEEKLY,
        digestTime: '09:00',
        bounceCount: 0,
        isBlacklisted: false,
        unsubscribeToken: EmailPreference.generateUnsubscribeToken(),
      });

      logger.info(`Email preferences created for user: ${userId}`);
      return preference;
    } catch (error: unknown) {
      logger.error('Failed to create email preferences:', error);
      throw new Error(
        `Failed to create email preferences: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  public async updateUserPreferences(
    userId: string,
    updates: {
      isEmailEnabled?: boolean;
      language?: string;
      timezone?: string;
      emailFormat?: 'html' | 'text' | 'both';
      digestFrequency?: EmailFrequency;
      digestTime?: string;
    }
  ): Promise<EmailPreference> {
    try {
      const preference = await EmailPreference.findOne({ where: { userId } });
      if (!preference) {
        throw new Error('Email preferences not found');
      }

      await preference.update(updates);
      return preference;
    } catch (error: unknown) {
      logger.error('Failed to update email preferences:', error);
      throw new Error(
        `Failed to update email preferences: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  public async getUserPreferences(userId: string): Promise<EmailPreference | null> {
    return await EmailPreference.findOne({ where: { userId } });
  }

  public async unsubscribeUser(token: string, type?: NotificationType): Promise<void> {
    try {
      // Look up the preference row by the token's exact value. The token is
      // a 32-byte random string (see EmailPreference.generateUnsubscribeToken)
      // and the column has a unique index, so the lookup is O(1) and a single
      // valid token can only ever address one user.
      const preference = await EmailPreference.findOne({
        where: { unsubscribeToken: token },
      });
      if (!preference) {
        throw new Error('Invalid or expired unsubscribe token');
      }

      if (type) {
        // Unsubscribe from specific type - disable the specific notification type
        preference.disableType(type);
        await preference.save();
      } else {
        // Global unsubscribe
        await preference.update({ globalUnsubscribe: true });
      }

      logger.info(`User unsubscribed: ${preference.userId} ${type ? `from ${type}` : 'globally'}`);
    } catch (error: unknown) {
      logger.error('Failed to unsubscribe user:', error);
      throw new Error(
        `Failed to unsubscribe user: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Rotate a user's unsubscribe token. Use cases:
   *
   *   - Operator response to suspected token compromise (e.g. mailbox
   *     breach, accidental forwarding to a wide list).
   *   - Routine periodic rotation as part of a hygiene policy.
   *
   * After rotation:
   *   - Old token immediately stops working (the column has a unique
   *     index; the old plaintext value no longer matches any row).
   *   - All previously-sent emails carrying the old token in their
   *     unsubscribe footer will produce 'Invalid or expired unsubscribe
   *     token' until they're re-sent or the user finds a recent email.
   *
   * This is the explicit revocation path for ADS-301 — `unsubscribeToken`
   * is intentionally not auto-expired (links must keep working in
   * archived emails for CAN-SPAM / consumer-trust reasons), but the
   * operator must be able to invalidate one on demand.
   */
  public async rotateUnsubscribeToken(userId: string): Promise<string> {
    const preference = await EmailPreference.findOne({ where: { userId } });
    if (!preference) {
      throw new Error('Email preferences not found');
    }
    const fresh = EmailPreference.generateUnsubscribeToken();
    await preference.update({ unsubscribeToken: fresh });
    logger.info(`Unsubscribe token rotated for user: ${userId}`);
    return fresh;
  }

  // Analytics and Reporting
  public async getEmailAnalytics(
    filters: {
      templateId?: string;
      campaignId?: string;
      dateFrom?: Date;
      dateTo?: Date;
      type?: EmailType;
    } = {}
  ): Promise<EmailAnalytics> {
    try {
      const where: WhereOptions = {};

      if (filters.templateId) {
        where.templateId = filters.templateId;
      }
      if (filters.campaignId) {
        where.campaignId = filters.campaignId;
      }
      if (filters.type) {
        where.type = filters.type;
      }
      if (filters.dateFrom || filters.dateTo) {
        const dateFilter: Record<symbol, Date> = {};
        if (filters.dateFrom) {
          dateFilter[Op.gte] = filters.dateFrom;
        }
        if (filters.dateTo) {
          dateFilter[Op.lte] = filters.dateTo;
        }
        where.createdAt = dateFilter;
      }

      const [totalSent, totalDelivered, totalOpened, totalClicked, totalBounced, totalFailed] =
        await Promise.all([
          EmailQueue.count({ where: { ...where, status: EmailStatus.SENT } }),
          EmailQueue.count({ where: { ...where, status: EmailStatus.DELIVERED } }),
          EmailQueue.count({ where: { ...where, status: EmailStatus.OPENED } }),
          EmailQueue.count({ where: { ...where, status: EmailStatus.CLICKED } }),
          EmailQueue.count({ where: { ...where, status: EmailStatus.BOUNCED } }),
          EmailQueue.count({ where: { ...where, status: EmailStatus.FAILED } }),
        ]);

      const deliveryRate = totalSent > 0 ? (totalDelivered / totalSent) * 100 : 0;
      const openRate = totalDelivered > 0 ? (totalOpened / totalDelivered) * 100 : 0;
      const clickRate = totalOpened > 0 ? (totalClicked / totalOpened) * 100 : 0;
      const bounceRate = totalSent > 0 ? (totalBounced / totalSent) * 100 : 0;

      const recentActivity = await this.getRecentEmailActivity(7, where);

      return {
        totalSent,
        totalDelivered,
        totalOpened,
        totalClicked,
        totalBounced,
        totalFailed,
        deliveryRate,
        openRate,
        clickRate,
        bounceRate,
        recentActivity,
      };
    } catch (error: unknown) {
      logger.error('Failed to get email analytics:', error);
      throw new Error(
        `Failed to get email analytics: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  private async getRecentEmailActivity(
    days: number,
    where: WhereOptions
  ): Promise<
    Array<{
      date: string;
      sent: number;
      delivered: number;
      opened: number;
      clicked: number;
    }>
  > {
    const activity = [];
    const now = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);

      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const dayWhere = {
        ...where,
        createdAt: {
          [Op.gte]: date,
          [Op.lt]: nextDate,
        },
      };

      const emails = await EmailQueue.findAll({ where: dayWhere });

      activity.push({
        date: date.toISOString().split('T')[0],
        sent: emails.filter(e => e.isSent()).length,
        delivered: emails.filter(e => e.status === EmailStatus.DELIVERED).length,
        opened: emails.filter(e => e.hasBeenOpened()).length,
        clicked: emails.filter(e => e.hasBeenClicked()).length,
      });
    }

    return activity;
  }

  // Queue Management
  public async getQueueStatus(): Promise<{
    queued: number;
    sending: number;
    sent: number;
    failed: number;
    scheduled: number;
  }> {
    const [queued, sending, sent, failed, scheduled] = await Promise.all([
      EmailQueue.count({ where: { status: EmailStatus.QUEUED } }),
      EmailQueue.count({ where: { status: EmailStatus.SENDING } }),
      EmailQueue.count({ where: { status: EmailStatus.SENT } }),
      EmailQueue.count({ where: { status: EmailStatus.FAILED } }),
      EmailQueue.count({
        where: {
          status: EmailStatus.QUEUED,
          scheduledFor: { [Op.gt]: new Date() },
        },
      }),
    ]);

    return { queued, sending, sent, failed, scheduled };
  }

  public async retryFailedEmails(emailIds?: string[]): Promise<number> {
    try {
      const where: WhereOptions = { status: EmailStatus.FAILED };
      if (emailIds && emailIds.length > 0) {
        where.emailId = { [Op.in]: emailIds };
      }

      const failedEmails = await EmailQueue.findAll({ where });

      for (const email of failedEmails) {
        if (email.canRetry()) {
          email.status = EmailStatus.QUEUED;
          email.failureReason = undefined;
          await email.save();
        }
      }

      logger.info(`Reset ${failedEmails.length} failed emails for retry`);

      // Restart processor if not running
      if (!this.isProcessing) {
        this.startQueueProcessor();
      }

      return failedEmails.length;
    } catch (error: unknown) {
      logger.error('Failed to retry emails:', error);
      throw new Error(
        `Failed to retry emails: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  // Webhook Handlers
  public async handleDeliveryWebhook(data: {
    messageId: string;
    status: 'delivered' | 'bounced' | 'opened' | 'clicked';
    timestamp: Date;
    bounceReason?: string;
    clickUrl?: string;
    userAgent?: string;
    ipAddress?: string;
  }): Promise<void> {
    try {
      const email = await EmailQueue.findOne({
        where: { providerMessageId: data.messageId },
      });

      if (!email) {
        // Strip CR/LF before logging to prevent log-injection from a
        // crafted `messageId`. Truncate to keep log lines tidy.
        const safeMessageId =
          typeof data.messageId === 'string'
            ? data.messageId.replace(/[\r\n]/g, '').slice(0, 128)
            : '';
        logger.warn('Email not found for webhook', { messageId: safeMessageId });
        return;
      }

      switch (data.status) {
        case 'delivered':
          email.markAsDelivered();
          break;
        case 'bounced':
          email.markAsBounced(data.bounceReason);
          // Update user preferences
          if (email.userId) {
            const preference = await EmailPreference.findOne({ where: { userId: email.userId } });
            if (preference) {
              await preference.recordBounce();
            }
          }
          break;
        case 'opened':
          email.recordOpen(data.userAgent, data.ipAddress);
          break;
        case 'clicked':
          if (data.clickUrl) {
            email.recordClick(data.clickUrl, data.userAgent, data.ipAddress);
          }
          break;
      }

      await email.save();
      logger.info(`Webhook processed for email: ${email.emailId}`);
    } catch (error) {
      logger.error('Failed to process delivery webhook:', error);
    }
  }
}

// Export the class for testing (allows creating fresh instances)
export { EmailService };
export default new EmailService();
