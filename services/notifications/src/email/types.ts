// Email module — provider-facing types.
//
// The DB row shape (snake_case columns from `email_queue`) is converted
// to this plain `QueuedEmail` type before being handed to a provider.
// Providers depend only on this shape, not on pg/Sequelize models,
// so they can be swapped + unit-tested independently of storage.

export type EmailType = 'transactional' | 'notification' | 'marketing' | 'system';
export type EmailPriority = 'low' | 'normal' | 'high' | 'urgent';
export type EmailStatus =
  | 'queued'
  | 'sending'
  | 'sent'
  | 'delivered'
  | 'opened'
  | 'clicked'
  | 'failed'
  | 'bounced'
  | 'unsubscribed';

export type EmailAttachment = {
  filename: string;
  // Base64-encoded payload. Providers either decode and embed (Resend,
  // SES) or stream from a stored URL (S3); the queue keeps the encoded
  // form for simplicity.
  content: string;
  contentType: string;
  size: number;
  inline?: boolean;
  cid?: string;
};

export type QueuedEmail = {
  emailId: string;
  templateId?: string | null;
  fromEmail: string;
  fromName?: string | null;
  toEmail: string;
  toName?: string | null;
  ccEmails: string[];
  bccEmails: string[];
  replyToEmail?: string | null;
  subject: string;
  htmlContent: string;
  textContent?: string | null;
  templateData: Record<string, unknown>;
  attachments: EmailAttachment[];
  type: EmailType;
  priority: EmailPriority;
  status: EmailStatus;
  scheduledFor?: Date | null;
  maxRetries: number;
  currentRetries: number;
  lastAttemptAt?: Date | null;
  sentAt?: Date | null;
  failureReason?: string | null;
  providerId?: string | null;
  providerMessageId?: string | null;
  tracking?: Record<string, unknown> | null;
  metadata: Record<string, unknown>;
  campaignId?: string | null;
  userId?: string | null;
  tags: string[];
  idempotencyKey?: string | null;
};

export type ProviderSendResult = {
  success: boolean;
  messageId?: string;
  error?: string;
};

export type EmailProvider = {
  send(email: QueuedEmail): Promise<ProviderSendResult>;
  getName(): string;
  validateConfiguration(): boolean;
};
