import { Op, WhereOptions } from 'sequelize';
import { config } from '../config';
import EmailPreference, { EmailFrequency, NotificationType } from '../models/EmailPreference';
import EmailQueue, { EmailPriority, EmailStatus, EmailType } from '../models/EmailQueue';
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

    this.startQueueProcessor();
  }

  private async initializeProvider(): Promise<void> {
    try {
      switch (config.email.provider) {
        case 'ethereal':
          const etherealProvider = new EtherealProvider();
          await etherealProvider.initialize();
          this.provider = etherealProvider;
          break;
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

  public getProviderInfo(): any {
    if (this.provider instanceof EtherealProvider) {
      return this.provider.getPreviewInfo();
    }
    return null;
  }

  public static getProviderInfo(): any {
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
        versions: [
          {
            version: 1,
            subject: templateData.subject,
            htmlContent: templateData.htmlContent,
            textContent: templateData.textContent,
            createdAt: new Date(),
            createdBy: templateData.createdBy,
          },
        ],
        currentVersion: 1,
        usageCount: 0,
        testEmailsSent: 0,
        priority: templateData.priority || 0,
        variables: templateData.variables || [],
        isDefault: templateData.isDefault || false,
      });

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

      // Create new version if content changed
      const contentChanged =
        updates.subject !== undefined ||
        updates.htmlContent !== undefined ||
        updates.textContent !== undefined;

      if (contentChanged) {
        template.addVersion(
          updates.subject || template.subject,
          updates.htmlContent || template.htmlContent,
          updates.textContent || template.textContent,
          updatedBy,
          'Template updated'
        );
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

        // Update template usage
        template.incrementUsage();
        await template.save();
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
    const batchSize = options.batchSize || 100;
    const delay = options.delayBetweenBatches || 1000;

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
      return value !== undefined ? String(value) : match;
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
  private startQueueProcessor(): void {
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

  private async processEmailQueue(): Promise<void> {
    if (this.isProcessing) {
      return;
    }

    this.isProcessing = true;

    try {
      // Get emails that are ready to send
      const emails = await EmailQueue.findAll({
        where: {
          status: EmailStatus.QUEUED,
          [Op.or]: [{ scheduledFor: null }, { scheduledFor: { [Op.lte]: new Date() } }],
        } as WhereOptions,
        order: [
          ['priority', 'DESC'],
          ['createdAt', 'ASC'],
        ],
        limit: 10, // Process in batches
      });

      for (const email of emails) {
        await this.processEmail(email);
      }
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
    } catch (error: any) {
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
        unsubscribeToken: this.generateUnsubscribeToken(userId),
      });

      logger.info(`Email preferences created for user: ${userId}`);
      return preference;
    } catch (error: any) {
      logger.error('Failed to create email preferences:', error);
      throw new Error(
        `Failed to create email preferences: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  private generateUnsubscribeToken(userId: string): string {
    // Generate a secure unsubscribe token
    return Buffer.from(`${userId}:${Date.now()}:${Math.random()}`).toString('base64');
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
      // Decode token to get userId
      const decoded = Buffer.from(token, 'base64').toString();
      const [userId] = decoded.split(':');

      const preference = await EmailPreference.findOne({ where: { userId } });
      if (!preference) {
        throw new Error('Email preferences not found');
      }

      if (type) {
        // Unsubscribe from specific type - disable the specific notification type
        preference.disableType(type);
        await preference.save();
      } else {
        // Global unsubscribe
        await preference.update({ globalUnsubscribe: true });
      }

      logger.info(`User unsubscribed: ${userId} ${type ? `from ${type}` : 'globally'}`);
    } catch (error: unknown) {
      logger.error('Failed to unsubscribe user:', error);
      throw new Error(
        `Failed to unsubscribe user: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
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
        logger.warn(`Email not found for webhook: ${data.messageId}`);
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
              preference.recordBounce();
              await preference.save();
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

export default new EmailService();
