import { Request, Response } from 'express';
import { NotificationType } from '../models/EmailPreference';
import { EmailPriority, EmailType } from '../models/EmailQueue';
import { TemplateType, TemplateCategory, TemplateStatus } from '../models/EmailTemplate';
import emailService from '../services/email.service';
import { RichTextProcessingService } from '../services/rich-text-processing.service';
import { AuthenticatedRequest } from '../types/auth';

// Template Management
export const getTemplates = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { type, category, status, locale, limit, offset } = req.query;

  const result = await emailService.getTemplates({
    type: typeof type === 'string' ? (type as TemplateType) : undefined,
    category: typeof category === 'string' ? (category as TemplateCategory) : undefined,
    status: typeof status === 'string' ? (status as TemplateStatus) : undefined,
    locale: typeof locale === 'string' ? locale : undefined,
    limit: typeof limit === 'string' ? parseInt(limit, 10) : undefined,
    offset: typeof offset === 'string' ? parseInt(offset, 10) : undefined,
  });

  res.json({
    message: 'Templates retrieved successfully',
    data: result,
  });
};

export const getTemplate = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { templateId } = req.params;
  const template = await emailService.getTemplate(templateId);

  if (!template) {
    res.status(404).json({
      error: 'Template not found',
    });
    return;
  }

  res.json({
    message: 'Template retrieved successfully',
    data: template,
  });
};

export const createTemplate = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (typeof req.body.htmlContent === 'string') {
    req.body.htmlContent = RichTextProcessingService.sanitize(req.body.htmlContent);
  }
  const template = await emailService.createTemplate({
    ...req.body,
    createdBy: req.user!.userId,
  });

  res.status(201).json({
    message: 'Email template created successfully',
    data: template,
  });
};

export const updateTemplate = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { templateId } = req.params;
  if (typeof req.body.htmlContent === 'string') {
    req.body.htmlContent = RichTextProcessingService.sanitize(req.body.htmlContent);
  }
  const template = await emailService.updateTemplate(templateId, req.body, req.user!.userId);

  res.json({
    message: 'Email template updated successfully',
    data: template,
  });
};

export const deleteTemplate = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { templateId } = req.params;
  await emailService.deleteTemplate(templateId, req.user!.userId);

  res.json({
    message: 'Email template deleted successfully',
  });
};

export const previewTemplate = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { templateId } = req.params;
  const { templateData } = req.body;

  const template = await emailService.getTemplate(templateId);
  if (!template) {
    res.status(404).json({
      error: 'Template not found',
    });
    return;
  }

  // Process template with provided data
  const processedContent = await emailService.renderTemplatePreview(template, templateData || {});

  res.json({
    message: 'Template preview generated successfully',
    data: processedContent,
  });
};

export const sendTestEmail = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { templateId } = req.params;
  const { toEmail, templateData } = req.body;

  const emailId = await emailService.sendEmail({
    templateId,
    toEmail,
    templateData,
    type: EmailType.SYSTEM,
    priority: EmailPriority.HIGH,
    userId: req.user!.userId,
  });

  res.json({
    message: 'Test email sent successfully',
    data: { emailId },
  });
};

// Email sending
export const sendEmail = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const emailId = await emailService.sendEmail({
    ...req.body,
    userId: req.user!.userId,
  });

  res.json({
    message: 'Email sent successfully',
    data: { emailId },
  });
};

export const sendBulkEmail = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const emailIds = await emailService.sendBulkEmail({
    ...req.body,
    createdBy: req.user!.userId,
  });

  res.json({
    message: 'Bulk email sent successfully',
    data: { emailIds, count: emailIds.length },
  });
};

// Queue management
export const getQueueStatus = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const status = await emailService.getQueueStatus();

  res.json({
    message: 'Queue status retrieved successfully',
    data: status,
  });
};

export const processQueue = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  // Start queue processing
  emailService.startQueueProcessor();

  res.json({
    message: 'Queue processing started successfully',
  });
};

export const retryFailedEmails = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const { emailIds } = req.body;
  const retryCount = await emailService.retryFailedEmails(emailIds);

  res.json({
    message: 'Failed emails queued for retry',
    data: { retryCount },
  });
};

// Analytics
export const getEmailAnalytics = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const { templateId, campaignId, dateFrom, dateTo, type } = req.query;

  const analytics = await emailService.getEmailAnalytics({
    templateId: typeof templateId === 'string' ? templateId : undefined,
    campaignId: typeof campaignId === 'string' ? campaignId : undefined,
    dateFrom: typeof dateFrom === 'string' ? new Date(dateFrom) : undefined,
    dateTo: typeof dateTo === 'string' ? new Date(dateTo) : undefined,
    type: typeof type === 'string' ? (type as EmailType) : undefined,
  });

  res.json({
    message: 'Email analytics retrieved successfully',
    data: analytics,
  });
};

export const getTemplateAnalytics = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const { templateId } = req.params;
  const { dateFrom, dateTo } = req.query;

  const analytics = await emailService.getEmailAnalytics({
    templateId,
    dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
    dateTo: dateTo ? new Date(dateTo as string) : undefined,
  });

  res.json({
    message: 'Template analytics retrieved successfully',
    data: analytics,
  });
};

// User preferences
export const getUserPreferences = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const { userId } = req.params;
  const preferences = await emailService.getUserPreferences(userId);

  if (!preferences) {
    res.status(404).json({
      error: 'User preferences not found',
    });
    return;
  }

  res.json({
    message: 'User preferences retrieved successfully',
    data: preferences,
  });
};

export const updateUserPreferences = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const { userId } = req.params;
  const preferences = await emailService.updateUserPreferences(userId, req.body);

  res.json({
    message: 'Email preferences updated successfully',
    data: preferences,
  });
};

/**
 * Rotate the authenticated user's unsubscribe token (ADS-301).
 *
 * Use cases:
 *   - User suspects their email was forwarded / their mailbox was breached.
 *   - Routine token hygiene.
 *
 * After rotation, any previously-sent email's unsubscribe link stops
 * working — the response includes the new token so the caller can
 * preview / log it if needed.
 */
export const rotateUnsubscribeToken = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const userId = req.user?.userId;
  if (!userId) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  const newToken = await emailService.rotateUnsubscribeToken(userId);
  res.json({
    message: 'Unsubscribe token rotated',
    data: { unsubscribeToken: newToken },
  });
};

// Public endpoints
export const unsubscribeUser = async (req: Request, res: Response): Promise<void> => {
  const { token } = req.params;
  const { type } = req.query;

  await emailService.unsubscribeUser(token as string, type as NotificationType);

  res.json({
    message: 'Successfully unsubscribed',
  });
};

export const handleDeliveryWebhook = async (req: Request, res: Response): Promise<void> => {
  const webhookData = req.body;

  // Handle delivery webhook
  await emailService.handleDeliveryWebhook(webhookData);

  res.status(200).json({
    message: 'Webhook processed successfully',
  });
};
