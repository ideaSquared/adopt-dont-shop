// gRPC handlers for the email-channel surface: SendEmail,
// GetEmailPreferences, UpdateEmailPreferences.
//
// SendEmail composes template lookup → render → insert into email_queue
// → publish `notifications.email.queued` via withTransaction (publish-
// after-commit). The worker (see ../email/worker.ts) drains the queue.

import { randomUUID } from 'node:crypto';

import { hasPermission, type Principal } from '@adopt-dont-shop/authz';
import { withTransaction, type WithTransactionDeps } from '@adopt-dont-shop/events';
import type { Permission, UserId } from '@adopt-dont-shop/lib.types';
import {
  NotificationsV1,
  type EmailPreferences as EmailPreferencesProto,
  type GetEmailPreferencesRequest,
  type GetEmailPreferencesResponse,
  type SendEmailRequest,
  type SendEmailResponse,
  type UpdateEmailPreferencesRequest,
  type UpdateEmailPreferencesResponse,
} from '@adopt-dont-shop/proto';

import {
  findOrCreatePreferences,
  updatePreferences,
  type EmailPreferencesRow,
  type PreferencesPatch,
} from '../email/preferences.js';
import { findByIdempotencyKey, insertEmail } from '../email/queue.js';
import { renderEmailTemplate } from '../email/renderer.js';
import { findActiveTemplate, incrementTemplateUsage } from '../email/templates.js';
import type { EmailPriority, EmailType } from '../email/types.js';

import { HandlerError } from './handlers.js';

// --- Defaults --------------------------------------------------------

const DEFAULT_FROM_EMAIL = process.env.DEFAULT_FROM_EMAIL ?? 'noreply@adoptdontshop.com';
const DEFAULT_FROM_NAME = "Adopt Don't Shop";

// --- Permissions -----------------------------------------------------

const EMAIL_SEND: Permission = 'notifications.email.send' as Permission;
const EMAIL_PREFS_READ_SELF: Permission = 'notifications.email-prefs.read' as Permission;
const EMAIL_PREFS_READ_ANY: Permission = 'notifications.email-prefs.read:any' as Permission;
const EMAIL_PREFS_WRITE_SELF: Permission = 'notifications.email-prefs.update' as Permission;
const EMAIL_PREFS_WRITE_ANY: Permission = 'notifications.email-prefs.update:any' as Permission;

// --- Enum maps --------------------------------------------------------

const protoTypeToDb: Record<NotificationsV1.EmailType, EmailType> = {
  [NotificationsV1.EmailType.EMAIL_TYPE_UNSPECIFIED]: 'system',
  [NotificationsV1.EmailType.EMAIL_TYPE_TRANSACTIONAL]: 'transactional',
  [NotificationsV1.EmailType.EMAIL_TYPE_NOTIFICATION]: 'notification',
  [NotificationsV1.EmailType.EMAIL_TYPE_MARKETING]: 'marketing',
  [NotificationsV1.EmailType.EMAIL_TYPE_SYSTEM]: 'system',
  [NotificationsV1.EmailType.UNRECOGNIZED]: 'system',
};

const protoPriorityToDb: Record<NotificationsV1.EmailPriority, EmailPriority> = {
  [NotificationsV1.EmailPriority.EMAIL_PRIORITY_UNSPECIFIED]: 'normal',
  [NotificationsV1.EmailPriority.EMAIL_PRIORITY_LOW]: 'low',
  [NotificationsV1.EmailPriority.EMAIL_PRIORITY_NORMAL]: 'normal',
  [NotificationsV1.EmailPriority.EMAIL_PRIORITY_HIGH]: 'high',
  [NotificationsV1.EmailPriority.EMAIL_PRIORITY_URGENT]: 'urgent',
  [NotificationsV1.EmailPriority.UNRECOGNIZED]: 'normal',
};

const dbFormatToProto = (v: 'html' | 'text' | 'both'): NotificationsV1.EmailFormat => {
  switch (v) {
    case 'html':
      return NotificationsV1.EmailFormat.EMAIL_FORMAT_HTML;
    case 'text':
      return NotificationsV1.EmailFormat.EMAIL_FORMAT_TEXT;
    case 'both':
      return NotificationsV1.EmailFormat.EMAIL_FORMAT_BOTH;
  }
};

const protoFormatToDb = (v: NotificationsV1.EmailFormat): 'html' | 'text' | 'both' | null => {
  switch (v) {
    case NotificationsV1.EmailFormat.EMAIL_FORMAT_HTML:
      return 'html';
    case NotificationsV1.EmailFormat.EMAIL_FORMAT_TEXT:
      return 'text';
    case NotificationsV1.EmailFormat.EMAIL_FORMAT_BOTH:
      return 'both';
    default:
      return null;
  }
};

const dbFrequencyToProto = (
  v: 'immediate' | 'daily' | 'weekly' | 'monthly' | 'never'
): NotificationsV1.EmailDigestFrequency => {
  switch (v) {
    case 'immediate':
      return NotificationsV1.EmailDigestFrequency.EMAIL_DIGEST_FREQUENCY_IMMEDIATE;
    case 'daily':
      return NotificationsV1.EmailDigestFrequency.EMAIL_DIGEST_FREQUENCY_DAILY;
    case 'weekly':
      return NotificationsV1.EmailDigestFrequency.EMAIL_DIGEST_FREQUENCY_WEEKLY;
    case 'monthly':
      return NotificationsV1.EmailDigestFrequency.EMAIL_DIGEST_FREQUENCY_MONTHLY;
    case 'never':
      return NotificationsV1.EmailDigestFrequency.EMAIL_DIGEST_FREQUENCY_NEVER;
  }
};

const protoFrequencyToDb = (
  v: NotificationsV1.EmailDigestFrequency
): 'immediate' | 'daily' | 'weekly' | 'monthly' | 'never' | null => {
  switch (v) {
    case NotificationsV1.EmailDigestFrequency.EMAIL_DIGEST_FREQUENCY_IMMEDIATE:
      return 'immediate';
    case NotificationsV1.EmailDigestFrequency.EMAIL_DIGEST_FREQUENCY_DAILY:
      return 'daily';
    case NotificationsV1.EmailDigestFrequency.EMAIL_DIGEST_FREQUENCY_WEEKLY:
      return 'weekly';
    case NotificationsV1.EmailDigestFrequency.EMAIL_DIGEST_FREQUENCY_MONTHLY:
      return 'monthly';
    case NotificationsV1.EmailDigestFrequency.EMAIL_DIGEST_FREQUENCY_NEVER:
      return 'never';
    default:
      return null;
  }
};

// --- Header sanitization ---------------------------------------------

// Same defense-in-depth strip the providers do, applied at the boundary
// so the row in `email_queue` never holds CRLF in a header position.
const stripHeader = (s: string): string => s.replace(/[\r\n]/g, '');
const stripHeaderOpt = (s: string | undefined): string | undefined =>
  s === undefined ? undefined : stripHeader(s);

// --- SendEmail -------------------------------------------------------

export type SendEmailDeps = WithTransactionDeps;

const parseJson = (input: string | undefined, fallback: object): Record<string, unknown> => {
  if (!input) {
    return fallback as Record<string, unknown>;
  }
  try {
    const parsed = JSON.parse(input) as unknown;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    throw new HandlerError('INVALID_ARGUMENT', 'json field must encode an object');
  } catch (err) {
    if (err instanceof HandlerError) {
      throw err;
    }
    throw new HandlerError('INVALID_ARGUMENT', 'json field could not be parsed');
  }
};

export async function sendEmail(
  deps: SendEmailDeps,
  principal: Principal,
  req: SendEmailRequest
): Promise<SendEmailResponse> {
  // Permission gate — only system services / admins enqueue email.
  if (!hasPermission(principal, EMAIL_SEND)) {
    throw new HandlerError('PERMISSION_DENIED', `'${EMAIL_SEND}' required to enqueue email`);
  }

  // Input validation.
  if (!req.toEmail) {
    throw new HandlerError('INVALID_ARGUMENT', 'to_email is required');
  }
  const hasInline = Boolean(req.subject) && Boolean(req.htmlContent);
  const hasTemplate = Boolean(req.templateId);
  if (!hasInline && !hasTemplate) {
    throw new HandlerError(
      'INVALID_ARGUMENT',
      'either template_id or (subject + html_content) is required'
    );
  }

  const templateData = parseJson(req.templateDataJson, {});
  const metadata = parseJson(req.metadataJson, {});

  const type = protoTypeToDb[req.type] ?? 'system';
  const priority = protoPriorityToDb[req.priority] ?? 'normal';

  // Resolve subject / html / text — template wins when present.
  let subject: string;
  let htmlContent: string;
  let textContent: string | null;
  let templateId: string | null = null;

  // Idempotency short-circuit (outside the transaction — read-only).
  if (req.idempotencyKey) {
    const existing = await findByIdempotencyKey(deps.pool, req.idempotencyKey);
    if (existing) {
      return { emailId: existing.email_id, alreadyQueued: true };
    }
  }

  if (hasTemplate) {
    const tpl = await findActiveTemplate(deps.pool, req.templateId!);
    if (!tpl) {
      throw new HandlerError('NOT_FOUND', `template '${req.templateId}' not found or not active`);
    }
    const rendered = renderEmailTemplate(tpl, templateData);
    subject = rendered.subject;
    htmlContent = rendered.htmlContent;
    textContent = rendered.textContent;
    templateId = tpl.templateId;
  } else {
    subject = req.subject ?? '';
    htmlContent = req.htmlContent ?? '';
    textContent = req.textContent ?? null;
  }

  const emailId = randomUUID();
  let alreadyQueued = false;

  await withTransaction(deps, async ({ client, publish }) => {
    try {
      await insertEmail(client, {
        emailId,
        templateId,
        fromEmail: stripHeader(req.fromEmail ?? DEFAULT_FROM_EMAIL),
        fromName: stripHeaderOpt(req.fromName ?? DEFAULT_FROM_NAME),
        toEmail: stripHeader(req.toEmail),
        toName: stripHeaderOpt(req.toName),
        ccEmails: (req.ccEmails ?? []).map(stripHeader),
        bccEmails: (req.bccEmails ?? []).map(stripHeader),
        replyToEmail: stripHeaderOpt(req.replyToEmail),
        subject: stripHeader(subject),
        htmlContent,
        textContent,
        templateData,
        attachments: [],
        type,
        priority,
        scheduledFor: req.scheduledFor ? new Date(req.scheduledFor) : null,
        metadata,
        campaignId: req.campaignId ?? null,
        userId: req.userId ?? null,
        tags: req.tags ?? [],
        idempotencyKey: req.idempotencyKey ?? null,
        createdBy: principal.userId as UserId,
      });
    } catch (err) {
      // Unique-violation on idempotency_key — another caller raced us.
      // Re-query and return the existing row.
      const pgErr = err as { code?: string; constraint?: string };
      if (
        pgErr.code === '23505' &&
        pgErr.constraint === 'email_queue_idempotency_key_unique' &&
        req.idempotencyKey
      ) {
        const existing = await findByIdempotencyKey(client, req.idempotencyKey);
        if (existing) {
          alreadyQueued = true;
          return;
        }
      }
      throw err;
    }

    if (templateId) {
      await incrementTemplateUsage(client, templateId);
    }

    publish({
      type: 'notifications.email.queued',
      id: `notifications.email.queued.${emailId}`,
      payload: { emailId, userId: req.userId ?? null, type, priority },
    });
  });

  if (alreadyQueued) {
    // The race-loser case: a concurrent insert with the same idempotency
    // key won. Re-resolve emailId by looking up the existing row.
    const existing = await findByIdempotencyKey(deps.pool, req.idempotencyKey!);
    return { emailId: existing?.email_id ?? emailId, alreadyQueued: true };
  }

  return { emailId, alreadyQueued: false };
}

// --- GetEmailPreferences ---------------------------------------------

// Same deps shape as the rest of the service — keeps the grpc adapter's
// type signature uniform even though preferences handlers don't publish
// NATS events.
export type EmailPrefsDeps = WithTransactionDeps;

const rowToProto = (row: EmailPreferencesRow): EmailPreferencesProto => ({
  preferenceId: row.preference_id,
  userId: row.user_id,
  isEmailEnabled: row.is_email_enabled,
  globalUnsubscribe: row.global_unsubscribe,
  preferencesJson: JSON.stringify(row.preferences),
  language: row.language,
  timezone: row.timezone,
  emailFormat: dbFormatToProto(row.email_format),
  digestFrequency: dbFrequencyToProto(row.digest_frequency),
  digestTime: row.digest_time,
  unsubscribeToken: row.unsubscribe_token,
  lastDigestSent: row.last_digest_sent?.toISOString(),
  bounceCount: row.bounce_count,
  lastBounceAt: row.last_bounce_at?.toISOString(),
  isBlacklisted: row.is_blacklisted,
  blacklistReason: row.blacklist_reason ?? undefined,
  blacklistedAt: row.blacklisted_at?.toISOString(),
  metadataJson: JSON.stringify(row.metadata),
  createdAt: row.created_at.toISOString(),
  updatedAt: row.updated_at.toISOString(),
});

const resolveTargetUserId = (
  principal: Principal,
  requested: string | undefined,
  readAny: Permission,
  writeAny?: Permission
): string => {
  const target = requested || (principal.userId as string);
  if (target === principal.userId) {
    return target;
  }
  // Cross-user — must have the :any variant.
  const perm = writeAny ?? readAny;
  if (!hasPermission(principal, perm)) {
    throw new HandlerError(
      'PERMISSION_DENIED',
      `'${perm}' required to access another user's email preferences`
    );
  }
  return target;
};

export async function getEmailPreferences(
  deps: EmailPrefsDeps,
  principal: Principal,
  req: GetEmailPreferencesRequest
): Promise<GetEmailPreferencesResponse> {
  // Self-read: gate on EMAIL_PREFS_READ_SELF (any authenticated user).
  if (!hasPermission(principal, EMAIL_PREFS_READ_SELF)) {
    throw new HandlerError('PERMISSION_DENIED', `'${EMAIL_PREFS_READ_SELF}' required`);
  }
  const userId = resolveTargetUserId(principal, req.userId, EMAIL_PREFS_READ_ANY);
  const row = await findOrCreatePreferences(deps.pool, userId);
  return { preferences: rowToProto(row) };
}

// --- UpdateEmailPreferences ------------------------------------------

export async function updateEmailPreferences(
  deps: EmailPrefsDeps,
  principal: Principal,
  req: UpdateEmailPreferencesRequest
): Promise<UpdateEmailPreferencesResponse> {
  if (!hasPermission(principal, EMAIL_PREFS_WRITE_SELF)) {
    throw new HandlerError('PERMISSION_DENIED', `'${EMAIL_PREFS_WRITE_SELF}' required`);
  }
  const userId = resolveTargetUserId(
    principal,
    req.userId,
    EMAIL_PREFS_READ_ANY,
    EMAIL_PREFS_WRITE_ANY
  );

  const patch: PreferencesPatch = {};
  if (req.isEmailEnabled !== undefined) {
    patch.isEmailEnabled = req.isEmailEnabled;
  }
  if (req.globalUnsubscribe !== undefined) {
    patch.globalUnsubscribe = req.globalUnsubscribe;
  }
  if (req.preferencesJson !== undefined) {
    try {
      const parsed = JSON.parse(req.preferencesJson) as unknown;
      if (!Array.isArray(parsed)) {
        throw new HandlerError('INVALID_ARGUMENT', 'preferences_json must encode an array');
      }
      patch.preferences = parsed as Array<Record<string, unknown>>;
    } catch (err) {
      if (err instanceof HandlerError) {
        throw err;
      }
      throw new HandlerError('INVALID_ARGUMENT', 'preferences_json could not be parsed');
    }
  }
  if (req.language !== undefined) {
    patch.language = req.language;
  }
  if (req.timezone !== undefined) {
    patch.timezone = req.timezone;
  }
  const fmt = protoFormatToDb(req.emailFormat);
  if (fmt) {
    patch.emailFormat = fmt;
  }
  const freq = protoFrequencyToDb(req.digestFrequency);
  if (freq) {
    patch.digestFrequency = freq;
  }
  if (req.digestTime !== undefined) {
    patch.digestTime = req.digestTime;
  }

  const updated = await updatePreferences(deps.pool, userId, patch);
  return { preferences: rowToProto(updated) };
}
