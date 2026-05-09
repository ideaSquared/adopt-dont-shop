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
  documentType: z.enum(['terms', 'privacy']),
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
};

export const recordReacceptance = async (input: RecordReacceptanceInput): Promise<void> => {
  await api.post('/api/v1/privacy/consent', input);
};
