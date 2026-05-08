import { z } from 'zod';
import EmailPreference, { EmailFrequency, NotificationType } from '../models/EmailPreference';
import { AuditLogService } from './auditLog.service';
import { PRIVACY_VERSION, TERMS_VERSION } from './legal-content.service';
import { logger } from '../utils/logger';

/**
 * ADS-496 / ADS-497: consent capture.
 *
 * Records two distinct consent decisions taken at registration:
 *
 *   1. ToS + Privacy Policy acceptance — required to create the account.
 *      Persisted as an immutable `CONSENT_RECORDED` AuditLog row capturing
 *      the version strings each user accepted plus the originating IP and
 *      user-agent. Reusing AuditLog avoids creating a new table for what
 *      is fundamentally an append-only audit trail.
 *
 *   2. Marketing email opt-in — separate, default-OFF (PECR/GDPR). When
 *      true, flips the `marketing` and `newsletter` rows in the user's
 *      EmailPreference.preferences. When false (the default), no
 *      preference rows are touched — the User.afterCreate hook leaves
 *      both types disabled by absence.
 *
 * The ToS/Privacy versions are pulled from `legal-content.service` so a
 * version bump in one place propagates to consent records, the public
 * /legal endpoints, and the user-facing copy in lockstep.
 */

export const ConsentInputSchema = z.object({
  tosAccepted: z.boolean(),
  privacyAccepted: z.boolean(),
  marketingConsent: z.boolean().default(false),
  // Versions are normally inferred from the active legal-content
  // service; callers may override only when replaying historical
  // consent (e.g. data backfill scripts). Optional in the schema for
  // forward compatibility.
  tosVersion: z.string().optional(),
  privacyVersion: z.string().optional(),
});
export type ConsentInput = z.infer<typeof ConsentInputSchema>;

export type ConsentContext = {
  userId: string;
  ip: string | null;
  userAgent: string | null;
};

export type ConsentRecord = {
  tosVersion: string;
  privacyVersion: string;
  marketingConsent: boolean;
  acceptedAt: string;
};

const setMarketingPreference = async (userId: string, enabled: boolean): Promise<void> => {
  const pref = await EmailPreference.findOne({ where: { userId } });
  if (!pref) {
    // EmailPreference is created on demand by other call sites; the
    // User.afterCreate hook only initializes notification/privacy
    // /application prefs. If absent at registration, do nothing —
    // marketing rows can be added later when the user lands on the
    // notification settings page.
    logger.debug('No EmailPreference row found at consent capture; skipping', { userId });
    return;
  }

  pref.setPreference(
    NotificationType.MARKETING,
    enabled,
    enabled ? EmailFrequency.IMMEDIATE : EmailFrequency.NEVER
  );
  pref.setPreference(
    NotificationType.NEWSLETTER,
    enabled,
    enabled ? EmailFrequency.WEEKLY : EmailFrequency.NEVER
  );
  pref.changed('preferences', true);
  await pref.save();
};

export const recordConsent = async (
  input: ConsentInput,
  context: ConsentContext
): Promise<ConsentRecord> => {
  if (!input.tosAccepted || !input.privacyAccepted) {
    throw new Error('Terms of Service and Privacy Policy must be accepted');
  }

  const tosVersion = input.tosVersion ?? TERMS_VERSION;
  const privacyVersion = input.privacyVersion ?? PRIVACY_VERSION;
  const acceptedAt = new Date();

  await AuditLogService.log({
    userId: context.userId,
    action: 'CONSENT_RECORDED',
    entity: 'User',
    entityId: context.userId,
    details: {
      tosVersion,
      privacyVersion,
      marketingConsent: input.marketingConsent,
      acceptedAt: acceptedAt.toISOString(),
    },
    ipAddress: context.ip ?? undefined,
    userAgent: context.userAgent ?? undefined,
  });

  await setMarketingPreference(context.userId, input.marketingConsent);

  return {
    tosVersion,
    privacyVersion,
    marketingConsent: input.marketingConsent,
    acceptedAt: acceptedAt.toISOString(),
  };
};
