import { Request, Response } from 'express';
import { NotificationType } from '../models/EmailPreference';
import { EmailPriority, EmailType } from '../models/EmailQueue';
import emailService from '../services/email.service';
import { AuthenticatedRequest } from '../types/auth';
import { logger } from '../utils/logger';

// Template Management
export const getTemplates = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { type, category, status, locale, limit, offset } = req.query;

    const result = await emailService.getTemplates({
      type: type as any,
      category: category as any,
      status: status as any,
      locale: locale as string,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
    });

    res.json({
      message: 'Templates retrieved successfully',
      data: result,
    });
  } catch (error) {
    logger.error('Failed to get templates:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to get templates',
    });
  }
};

export const getTemplate = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
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
  } catch (error) {
    logger.error('Failed to get template:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to get template',
    });
  }
};

export const createTemplate = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const template = await emailService.createTemplate({
      ...req.body,
      createdBy: req.user!.userId,
    });

    res.status(201).json({
      message: 'Email template created successfully',
      data: template,
    });
  } catch (error) {
    logger.error('Failed to create email template:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to create email template',
    });
  }
};

export const updateTemplate = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { templateId } = req.params;
    const template = await emailService.updateTemplate(templateId, req.body, req.user!.userId);

    res.json({
      message: 'Email template updated successfully',
      data: template,
    });
  } catch (error) {
    logger.error('Failed to update email template:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to update email template',
    });
  }
};

export const deleteTemplate = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { templateId } = req.params;
    await emailService.deleteTemplate(templateId, req.user!.userId);

    res.json({
      message: 'Email template deleted successfully',
    });
  } catch (error) {
    logger.error('Failed to delete email template:', {
      error: error instanceof Error ? error.message : String(error),
      templateId: req.params.templateId,
      userId: req.user?.userId,
    });
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to delete email template',
    });
  }
};

export const previewTemplate = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
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
    const processedContent = await (emailService as any).processTemplate(
      template,
      templateData || {}
    );

    res.json({
      message: 'Template preview generated successfully',
      data: processedContent,
    });
  } catch (error) {
    logger.error('Failed to preview template:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to preview template',
    });
  }
};

export const sendTestEmail = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
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
  } catch (error) {
    logger.error('Failed to send test email:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to send test email',
    });
  }
};

// Email sending
export const sendEmail = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const emailId = await emailService.sendEmail({
      ...req.body,
      userId: req.user!.userId,
    });

    res.json({
      message: 'Email sent successfully',
      data: { emailId },
    });
  } catch (error) {
    logger.error('Failed to send email:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to send email',
    });
  }
};

export const sendBulkEmail = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const emailIds = await emailService.sendBulkEmail({
      ...req.body,
      createdBy: req.user!.userId,
    });

    res.json({
      message: 'Bulk email sent successfully',
      data: { emailIds, count: emailIds.length },
    });
  } catch (error) {
    logger.error('Failed to send bulk email:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to send bulk email',
    });
  }
};

// Queue management
export const getQueueStatus = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const status = await emailService.getQueueStatus();

    res.json({
      message: 'Queue status retrieved successfully',
      data: status,
    });
  } catch (error) {
    logger.error('Failed to get queue status:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to get queue status',
    });
  }
};

export const processQueue = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    // Start queue processing
    (emailService as any).startQueueProcessor();

    res.json({
      message: 'Queue processing started successfully',
    });
  } catch (error) {
    logger.error('Failed to process queue:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to process queue',
    });
  }
};

export const retryFailedEmails = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { emailIds } = req.body;
    const retryCount = await emailService.retryFailedEmails(emailIds);

    res.json({
      message: 'Failed emails queued for retry',
      data: { retryCount },
    });
  } catch (error) {
    logger.error('Failed to retry emails:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to retry emails',
    });
  }
};

// Analytics
export const getEmailAnalytics = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { templateId, campaignId, dateFrom, dateTo, type } = req.query;

    const analytics = await emailService.getEmailAnalytics({
      templateId: templateId as string,
      campaignId: campaignId as string,
      dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
      dateTo: dateTo ? new Date(dateTo as string) : undefined,
      type: type as any,
    });

    res.json({
      message: 'Email analytics retrieved successfully',
      data: analytics,
    });
  } catch (error) {
    logger.error('Failed to get email analytics:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to get email analytics',
    });
  }
};

export const getTemplateAnalytics = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
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
  } catch (error) {
    logger.error('Failed to get template analytics:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to get template analytics',
    });
  }
};

// User preferences
export const getUserPreferences = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
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
  } catch (error) {
    logger.error('Failed to get user preferences:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to get user preferences',
    });
  }
};

export const updateUserPreferences = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { userId } = req.params;
    const preferences = await emailService.updateUserPreferences(userId, req.body);

    res.json({
      message: 'Email preferences updated successfully',
      data: preferences,
    });
  } catch (error) {
    logger.error('Failed to update user preferences:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to update user preferences',
    });
  }
};

// Public endpoints
export const unsubscribeUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.params;
    const { type } = req.query;

    await emailService.unsubscribeUser(token, type as NotificationType);

    res.json({
      message: 'Successfully unsubscribed',
    });
  } catch (error) {
    logger.error('Failed to unsubscribe user:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to unsubscribe user',
    });
  }
};

export const handleDeliveryWebhook = async (req: Request, res: Response): Promise<void> => {
  try {
    const webhookData = req.body;

    // Handle delivery webhook
    await emailService.handleDeliveryWebhook(webhookData);

    res.status(200).json({
      message: 'Webhook processed successfully',
    });
  } catch (error) {
    logger.error('Failed to handle delivery webhook:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to handle delivery webhook',
    });
  }
};
