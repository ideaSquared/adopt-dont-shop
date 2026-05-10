import { Op } from 'sequelize';
import { z } from 'zod';
import AuditLog from '../models/AuditLog';
import User from '../models/User';
import { AuditLogService } from './auditLog.service';
import emailService from './email.service';
import { PendingReacceptanceItem, getPendingReacceptance } from './legal-content.service';
import { logger } from '../utils/logger';

/**
 * ADS-497 (slice 3): admin-triggered re-acceptance reminder email.
 *
 * SCOPE — single user, manually triggered. There is intentionally no
 * cron, no bulk-send, and no UI hook. The only entry point is the
 * admin route `POST /api/v1/admin/legal/send-reacceptance-reminder`
 * (see `admin.routes.ts`). Bulk fan-out is deferred to slice 4.
 *
 * Behaviour:
 *   1. Look up which legal documents the user still has to re-accept
 *      (`legal-content.service#getPendingReacceptance`). If nothing is
 *      pending, return `{ sent: false, reason: 'no_pending_versions' }`
 *      without emailing — version bumps shouldn't surprise users who
 *      already accepted the latest copy.
 *   2. Per-user-per-version dedupe via the audit log: if a
 *      `TERMS_REACCEPTANCE_REMINDER` row (or a legacy
 *      `LEGAL_REMINDER_SENT` row, see below) exists for this user with
 *      the same pending-version fingerprint inside the rate-limit
 *      window, return `{ sent: false, reason: 'rate_limited' }`. No new
 *      email, no new audit row.
 *   3. Otherwise, send a transactional email with subject + body that
 *      lists the docs to review and links back to the app. Append a
 *      `TERMS_REACCEPTANCE_REMINDER` audit row capturing the version
 *      fingerprint so subsequent calls can dedupe.
 *
 * Dedupe storage: reusing `audit_logs` (matches consent capture in
 * `consent.service.ts`). Avoids a new table for what is effectively an
 * append-only audit trail.
 *
 * Action-name transition: this service originally wrote
 * `LEGAL_REMINDER_SENT`. It now writes `TERMS_REACCEPTANCE_REMINDER`.
 * Existing audit rows are immutable (PR #344's trigger), so the dedupe
 * query has to recognise both names until every legacy row is older
 * than the rate-limit window.
 */

export const REMINDER_RATE_LIMIT_DAYS = 7;
export const TERMS_REACCEPTANCE_REMINDER_ACTION = 'TERMS_REACCEPTANCE_REMINDER';
/**
 * Legacy action name used by writes prior to the rename. NEW writes
 * MUST use `TERMS_REACCEPTANCE_REMINDER_ACTION`; this constant exists
 * only so the dedupe read-path can `Op.in` across both names. Audit
 * rows are immutable, so we cannot backfill — instead we tolerate the
 * legacy name until every `LEGAL_REMINDER_SENT` row predates the
 * rate-limit window. After that point this constant and its use in
 * `wasRecentlyReminded` / the cron candidate query can be removed.
 */
export const LEGACY_LEGAL_REMINDER_SENT_ACTION = 'LEGAL_REMINDER_SENT';

export const ReminderResultSchema = z.discriminatedUnion('sent', [
  z.object({
    sent: z.literal(true),
    versions: z.array(
      z.object({
        documentType: z.enum(['terms', 'privacy']),
        currentVersion: z.string(),
      })
    ),
  }),
  z.object({
    sent: z.literal(false),
    reason: z.enum(['no_pending_versions', 'rate_limited']),
  }),
]);
export type ReminderResult = z.infer<typeof ReminderResultSchema>;

const ReminderAuditDetailsSchema = z.object({
  versionFingerprint: z.string(),
  versions: z.array(
    z.object({
      documentType: z.enum(['terms', 'privacy']),
      currentVersion: z.string(),
    })
  ),
  triggeredBy: z.string().nullable(),
});
export type ReminderAuditDetails = z.infer<typeof ReminderAuditDetailsSchema>;

/**
 * Documents this email reminder can cover. Narrower than
 * `PendingReacceptanceItem` (which includes `'cookies'`) because cookies
 * acceptance is captured via the in-app banner, not email — see the
 * filter on the `getPendingReacceptance` result inside
 * `sendReacceptanceReminder`.
 */
type ReminderableDocument = Omit<PendingReacceptanceItem, 'documentType'> & {
  documentType: 'terms' | 'privacy';
};

/**
 * Stable identifier for "the set of documents this reminder is about".
 * Sorted so that {terms, privacy} and {privacy, terms} produce the
 * same fingerprint regardless of upstream ordering.
 */
const buildVersionFingerprint = (pending: ReadonlyArray<ReminderableDocument>): string => {
  return pending
    .map(p => `${p.documentType}:${p.currentVersion}`)
    .sort()
    .join('|');
};

const wasRecentlyReminded = async (userId: string, fingerprint: string): Promise<boolean> => {
  const cutoff = new Date(Date.now() - REMINDER_RATE_LIMIT_DAYS * 24 * 60 * 60 * 1000);
  // Audit rows are append-only (PR #344's trigger), so we can't rename
  // legacy `LEGAL_REMINDER_SENT` rows in place. Match on either name
  // until every legacy row is older than `REMINDER_RATE_LIMIT_DAYS`,
  // at which point `LEGACY_LEGAL_REMINDER_SENT_ACTION` can be dropped
  // from this query.
  const recent = await AuditLog.findOne({
    where: {
      user: userId,
      action: {
        [Op.in]: [TERMS_REACCEPTANCE_REMINDER_ACTION, LEGACY_LEGAL_REMINDER_SENT_ACTION],
      },
      timestamp: { [Op.gte]: cutoff },
    },
    order: [['timestamp', 'DESC']],
  });
  if (!recent) {
    return false;
  }
  const parsed = ReminderAuditDetailsSchema.safeParse(
    (recent.metadata as { details?: unknown } | null | undefined)?.details
  );
  if (!parsed.success) {
    // Malformed metadata — treat as no record, but log so we notice.
    logger.warn('Reacceptance reminder audit row had unparseable details', {
      userId,
    });
    return false;
  }
  return parsed.data.versionFingerprint === fingerprint;
};

const documentLabel = (documentType: 'terms' | 'privacy'): string =>
  documentType === 'terms' ? 'Terms of Service' : 'Privacy Policy';

const renderReminderHtml = (
  firstName: string | null,
  pending: ReadonlyArray<ReminderableDocument>
): string => {
  const baseUrl = process.env.FRONTEND_URL || 'https://adoptdontshop.com';
  const supportEmail = process.env.SUPPORT_EMAIL || 'support@adoptdontshop.com';
  const greeting = firstName ? `Hi ${firstName},` : 'Hi there,';
  const items = pending
    .map(p => `<li>${documentLabel(p.documentType)} (version ${p.currentVersion})</li>`)
    .join('\n          ');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Action required: review updated legal documents</title>
</head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2>Please review our updated legal documents</h2>
  <p>${greeting}</p>
  <p>We've updated the following document(s) and need you to review and re-accept them the next time you sign in:</p>
  <ul>
          ${items}
  </ul>
  <p>
    <a href="${baseUrl}" style="display: inline-block; background-color: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">
      Open Adopt Don't Shop
    </a>
  </p>
  <p>You won't be able to continue using your account until you've accepted the latest versions. If you have any questions, contact us at ${supportEmail}.</p>
  <p>Thanks,<br>The Adopt Don't Shop team</p>
</body>
</html>`;
};

const renderReminderText = (
  firstName: string | null,
  pending: ReadonlyArray<ReminderableDocument>
): string => {
  const baseUrl = process.env.FRONTEND_URL || 'https://adoptdontshop.com';
  const supportEmail = process.env.SUPPORT_EMAIL || 'support@adoptdontshop.com';
  const greeting = firstName ? `Hi ${firstName},` : 'Hi there,';
  const items = pending
    .map(p => `- ${documentLabel(p.documentType)} (version ${p.currentVersion})`)
    .join('\n');

  return `Please review our updated legal documents

${greeting}

We've updated the following document(s) and need you to review and re-accept them the next time you sign in:

${items}

Open Adopt Don't Shop: ${baseUrl}

You won't be able to continue using your account until you've accepted the latest versions. If you have any questions, contact us at ${supportEmail}.

Thanks,
The Adopt Don't Shop team`;
};

const buildSubject = (pending: ReadonlyArray<ReminderableDocument>): string => {
  if (pending.length === 1) {
    return `Action required: please review our updated ${documentLabel(pending[0].documentType)}`;
  }
  return 'Action required: please review our updated legal documents';
};

export type SendReminderOptions = {
  userId: string;
  triggeredBy?: string | null;
};

/**
 * Send a legal-reacceptance reminder email to a single user.
 *
 * Throws when the user does not exist or has no email on file — the
 * caller (admin route) translates these into 404 / 422. Returns a
 * structured `{ sent }` result for the normal cases (already current
 * or rate-limited) so the admin sees why nothing was sent.
 */
export const sendReacceptanceReminder = async (
  options: SendReminderOptions
): Promise<ReminderResult> => {
  const { userId, triggeredBy = null } = options;

  const user = await User.findByPk(userId, {
    attributes: ['userId', 'email', 'firstName'],
  });
  if (!user) {
    throw new Error('User not found');
  }
  if (!user.email) {
    throw new Error('User has no email address on file');
  }

  const { pending: allPending } = await getPendingReacceptance(userId);
  // Email reminders cover terms/privacy only. Cookies acceptance is
  // captured via the in-app banner (anonymous → localStorage → attach
  // on sign-in), not email — emailing "you need to accept cookies"
  // doesn't match the banner UX users expect. Filter narrows the
  // documentType union from `'terms' | 'privacy' | 'cookies'` (returned
  // by getPendingReacceptance after PR #419 widened it) back to the
  // `'terms' | 'privacy'` shape this service was designed around.
  const pending = allPending.filter((p): p is ReminderableDocument => p.documentType !== 'cookies');
  if (pending.length === 0) {
    return { sent: false, reason: 'no_pending_versions' };
  }

  const fingerprint = buildVersionFingerprint(pending);

  if (await wasRecentlyReminded(userId, fingerprint)) {
    return { sent: false, reason: 'rate_limited' };
  }

  const versions = pending.map(p => ({
    documentType: p.documentType,
    currentVersion: p.currentVersion,
  }));

  await emailService.sendEmail({
    toEmail: user.email,
    toName: user.firstName ?? undefined,
    userId,
    subject: buildSubject(pending),
    htmlContent: renderReminderHtml(user.firstName ?? null, pending),
    textContent: renderReminderText(user.firstName ?? null, pending),
    type: 'transactional',
    priority: 'normal',
    metadata: {
      legalReminder: {
        versionFingerprint: fingerprint,
      },
    },
  });

  const auditDetails: ReminderAuditDetails = {
    versionFingerprint: fingerprint,
    versions,
    triggeredBy,
  };

  await AuditLogService.log({
    userId,
    action: TERMS_REACCEPTANCE_REMINDER_ACTION,
    entity: 'User',
    entityId: userId,
    details: auditDetails,
  });

  return { sent: true, versions };
};
