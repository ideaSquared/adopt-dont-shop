import { z } from 'zod';
import EmailPreference, { EmailFrequency, NotificationType } from '../models/EmailPreference';
import { AuditLogService } from './auditLog.service';
import { COOKIES_VERSION, PRIVACY_VERSION, TERMS_VERSION } from './legal-content.service';
import { logger } from '../utils/logger';

/**
 * ADS-496 / ADS-497: consent capture.
 *
 * Records the consent decisions taken at registration and through the
 * on-page cookie banner (slice 5):
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
 *   3. Cookies / analytics — the on-page cookie banner posts the user's
 *      `cookiesVersion` + `analyticsConsent` choice here. The cookies
 *      version is recorded in the same audit row so `getPendingReacceptance`
 *      can compare it to the currently published COOKIES_VERSION. Analytics
 *      consent is opt-in only (default false).
 *
 * The ToS/Privacy/Cookies versions are pulled from `legal-content.service`
 * so a version bump in one place propagates to consent records, the public
 * /legal endpoints, and the user-facing copy in lockstep.
 */

export const ConsentInputSchema = z.object({
  tosAccepted: z.boolean(),
  privacyAccepted: z.boolean(),
  marketingConsent: z.boolean().default(false),
  // ADS-497 (slice 5): cookies + analytics consent captured by the
  // on-page cookie banner. `cookiesVersion` defaults to the currently
  // published COOKIES_VERSION when omitted (the normal path from the
  // banner). `analyticsConsent` defaults to false — opt-in only.
  cookiesVersion: z.string().optional(),
  analyticsConsent: z.boolean().optional(),
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
  cookiesVersion: string;
  marketingConsent: boolean;
  analyticsConsent: boolean;
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
  const cookiesVersion = input.cookiesVersion ?? COOKIES_VERSION;
  const analyticsConsent = input.analyticsConsent ?? false;
  const acceptedAt = new Date();

  await AuditLogService.log({
    userId: context.userId,
    action: 'CONSENT_RECORDED',
    entity: 'User',
    entityId: context.userId,
    details: {
      tosVersion,
      privacyVersion,
      cookiesVersion,
      marketingConsent: input.marketingConsent,
      analyticsConsent,
      acceptedAt: acceptedAt.toISOString(),
    },
    ipAddress: context.ip ?? undefined,
    userAgent: context.userAgent ?? undefined,
  });

  await setMarketingPreference(context.userId, input.marketingConsent);

  return {
    tosVersion,
    privacyVersion,
    cookiesVersion,
    marketingConsent: input.marketingConsent,
    analyticsConsent,
    acceptedAt: acceptedAt.toISOString(),
  };
};

/**
 * ADS-550: cookies-only consent capture.
 *
 * The cookie banner triggers acceptance of the cookies policy (and an
 * optional analytics opt-in) without the user touching ToS or Privacy.
 * Routing this through `recordConsent` would write a CONSENT_RECORDED
 * audit row with the currently-published `tosVersion`/`privacyVersion`,
 * silently consuming any pending re-acceptance for those documents.
 *
 * This dedicated path writes a `CONSENT_RECORDED` row containing only
 * `cookiesVersion` + `analyticsConsent` in the details. `tosVersion` and
 * `privacyVersion` are deliberately absent so
 * `getPendingReacceptance` picks them up from the last row that
 * actually contained them.
 */
export const CookiesConsentInputSchema = z.object({
  cookiesVersion: z.string().optional(),
  analyticsConsent: z.boolean().optional(),
});
export type CookiesConsentInput = z.infer<typeof CookiesConsentInputSchema>;

export type CookiesConsentRecord = {
  cookiesVersion: string;
  analyticsConsent: boolean;
  acceptedAt: string;
};

export const recordCookiesConsent = async (
  input: CookiesConsentInput,
  context: ConsentContext
): Promise<CookiesConsentRecord> => {
  const cookiesVersion = input.cookiesVersion ?? COOKIES_VERSION;
  const analyticsConsent = input.analyticsConsent ?? false;
  const acceptedAt = new Date();

  await AuditLogService.log({
    userId: context.userId,
    action: 'CONSENT_RECORDED',
    entity: 'User',
    entityId: context.userId,
    details: {
      cookiesVersion,
      analyticsConsent,
      acceptedAt: acceptedAt.toISOString(),
    },
    ipAddress: context.ip ?? undefined,
    userAgent: context.userAgent ?? undefined,
  });

  return {
    cookiesVersion,
    analyticsConsent,
    acceptedAt: acceptedAt.toISOString(),
  };
};
