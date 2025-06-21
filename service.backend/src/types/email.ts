import { FileAttachment, JsonObject, JsonValue, TemplateData } from './common';

// Email template types
export interface EmailTemplateVariable {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'object';
  description: string;
  required: boolean;
  defaultValue?: JsonValue;
}

export interface EmailTemplateVersion {
  version: number;
  subject: string;
  htmlContent: string;
  textContent?: string;
  createdAt: Date;
  createdBy: string;
  changeLog?: string;
}

export interface EmailTemplateData extends TemplateData {
  [key: string]: JsonValue;
}

// Email sending types
export interface SendEmailOptions {
  templateId?: string;
  fromEmail?: string;
  fromName?: string;
  toEmail: string;
  toName?: string;
  ccEmails?: string[];
  bccEmails?: string[];
  replyToEmail?: string;
  subject?: string;
  htmlContent?: string;
  textContent?: string;
  templateData?: EmailTemplateData;
  attachments?: FileAttachment[];
  type?: string; // EmailType from model
  priority?: string; // EmailPriority from model
  scheduledFor?: Date;
  userId?: string;
  campaignId?: string;
  tags?: string[];
  metadata?: JsonObject;
}

export interface BulkEmailRecipient {
  toEmail: string;
  toName?: string;
  userId?: string;
  templateData?: EmailTemplateData;
}

export interface BulkEmailOptions extends Omit<SendEmailOptions, 'toEmail' | 'toName' | 'userId'> {
  recipients: BulkEmailRecipient[];
  batchSize?: number;
  delayBetweenBatches?: number; // milliseconds
}

// Email analytics types
export interface EmailActivityPoint {
  date: string;
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
}

export interface EmailAnalytics {
  totalSent: number;
  totalDelivered: number;
  totalOpened: number;
  totalClicked: number;
  totalBounced: number;
  totalFailed: number;
  deliveryRate: number;
  openRate: number;
  clickRate: number;
  bounceRate: number;
  recentActivity: EmailActivityPoint[];
}

// Email preferences types
export interface EmailPreferenceUpdate {
  isEmailEnabled?: boolean;
  preferences?: EmailNotificationPreference[];
  language?: string;
  timezone?: string;
  emailFormat?: 'html' | 'text' | 'both';
  digestFrequency?: string; // EmailFrequency from model
  digestTime?: string;
}

export interface EmailNotificationPreference {
  type: string; // NotificationType from model
  enabled: boolean;
  frequency?: string; // EmailFrequency from model
  channels?: string[];
}

// Email provider types
export interface EmailProviderConfig {
  [key: string]: any;
}

export interface EmailSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
  details?: JsonObject;
}

// Webhook types
export interface EmailWebhookData {
  messageId: string;
  status: 'delivered' | 'bounced' | 'opened' | 'clicked';
  timestamp: Date;
  bounceReason?: string;
  clickUrl?: string;
  userAgent?: string;
  ipAddress?: string;
}

// Queue management types
export interface EmailQueueStatus {
  queued: number;
  sending: number;
  sent: number;
  failed: number;
  scheduled: number;
}

export interface EmailQueueFilters {
  status?: string; // EmailStatus from model
  type?: string; // EmailType from model
  templateId?: string;
  campaignId?: string;
  userId?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

// Template management types
export interface EmailTemplateFilters {
  type?: string; // TemplateType from model
  category?: string; // TemplateCategory from model
  status?: string; // TemplateStatus from model
  locale?: string;
  isDefault?: boolean;
  search?: string;
}

export interface EmailTemplateCreateData {
  name: string;
  description?: string;
  type: string; // TemplateType from model
  category: string; // TemplateCategory from model
  subject: string;
  htmlContent: string;
  textContent?: string;
  variables?: EmailTemplateVariable[];
  locale?: string;
  parentTemplateId?: string;
  isDefault?: boolean;
  priority?: number;
  tags?: string[];
  createdBy: string;
}

export interface EmailTemplateUpdateData {
  name?: string;
  description?: string;
  subject?: string;
  htmlContent?: string;
  textContent?: string;
  variables?: EmailTemplateVariable[];
  status?: string; // TemplateStatus from model
  tags?: string[];
}

export interface TemplateValidationResult {
  valid: boolean;
  errors: string[];
  warnings?: string[];
}

// Campaign types
export interface EmailCampaign {
  campaignId: string;
  name: string;
  description?: string;
  templateId: string;
  targetAudience: {
    userIds?: string[];
    filters?: JsonObject;
    segmentId?: string;
  };
  scheduledFor?: Date;
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'paused' | 'cancelled';
  createdBy: string;
  createdAt: Date;
  sentAt?: Date;
  stats?: {
    totalRecipients: number;
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
    unsubscribed: number;
  };
}

// Unsubscribe types
export interface UnsubscribeRequest {
  token: string;
  type?: string; // NotificationType from model
  reason?: string;
  feedback?: string;
}

export interface UnsubscribeResult {
  success: boolean;
  message: string;
  userId?: string;
  type?: string;
}
