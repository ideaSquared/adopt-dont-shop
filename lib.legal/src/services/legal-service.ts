import { apiService as api } from '@adopt-dont-shop/lib.api';
import { z } from 'zod';

/**
 * ADS-497 (slice 2): client-side wrapper around the legal re-acceptance
 * endpoints introduced in slice 1 (PR #414).
 *
 *   GET  /api/v1/legal/pending-reacceptance — list documents whose current
 *                                             version differs from the
 *                                             user's last-accepted version.
 *   POST /api/v1/privacy/consent            — record acceptance of the
 *                                             current ToS / Privacy versions
 *                                             (ADS-496/497 — same endpoint
 *                                             that registration already uses).
 *
 * Schema-first: response shapes are validated with Zod so a backend drift
 * surfaces as a clear parse error rather than a runtime undefined-access.
 */

export const PendingReacceptanceItemSchema = z.object({
  documentType: z.enum(['terms', 'privacy', 'cookies']),
  currentVersion: z.string(),
  lastAcceptedVersion: z.string().nullable(),
  lastAcceptedAt: z.string().nullable(),
});

export const PendingReacceptanceResponseSchema = z.object({
  pending: z.array(PendingReacceptanceItemSchema),
});

export type PendingReacceptanceItem = z.infer<typeof PendingReacceptanceItemSchema>;
export type PendingReacceptanceResponse = z.infer<typeof PendingReacceptanceResponseSchema>;

export const fetchPendingReacceptance = async (): Promise<PendingReacceptanceResponse> => {
  const raw = await api.get<unknown>('/api/v1/legal/pending-reacceptance');
  return PendingReacceptanceResponseSchema.parse(raw);
};

export type RecordReacceptanceInput = {
  tosAccepted: boolean;
  privacyAccepted: boolean;
  /**
   * Optional explicit version overrides. Omit to let the backend stamp
   * the audit row with its currently-published versions — that's the
   * normal path for re-acceptance from this modal.
   */
  tosVersion?: string;
  privacyVersion?: string;
  /**
   * ADS-497 (slice 5): cookies + analytics consent posted by the on-page
   * cookie banner. `cookiesVersion` defaults to the backend's current
   * COOKIES_VERSION when omitted; `analyticsConsent` is opt-in only.
   */
  cookiesVersion?: string;
  analyticsConsent?: boolean;
};

export const recordReacceptance = async (input: RecordReacceptanceInput): Promise<void> => {
  await api.post('/api/v1/privacy/consent', input);
};

/**
 * ADS-550: cookies-only consent. The cookie banner and the
 * attach-stored-consent replay must NOT call `recordReacceptance` with
 * hard-coded `tosAccepted: true, privacyAccepted: true` — that path
 * silently records a ToS / Privacy re-acceptance the user never gave.
 * Use this dedicated endpoint instead; the backend writes a
 * CONSENT_RECORDED audit row that omits `tosVersion`/`privacyVersion`.
 */
export type RecordCookiesConsentInput = {
  cookiesVersion?: string;
  analyticsConsent?: boolean;
};

export const recordCookiesConsent = async (
  input: RecordCookiesConsentInput
): Promise<void> => {
  await api.post('/api/v1/privacy/cookies-consent', input);
};

/**
 * ADS-497 (slice 5): cookies-policy version snapshot for the on-page
 * banner. Returns just the version string so a banner mount can be
 * cheap; the full policy markdown is rendered on /cookies for users who
 * click through.
 */
const CookiesDocumentResponseSchema = z.object({
  data: z.object({
    version: z.string().min(1),
  }),
});

export const fetchCookiesVersion = async (): Promise<string> => {
  const raw = await api.get<unknown>('/api/v1/legal/cookies');
  return CookiesDocumentResponseSchema.parse(raw).data.version;
};
