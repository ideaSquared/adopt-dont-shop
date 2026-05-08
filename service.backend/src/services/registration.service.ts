import {
  recordConsent,
  type ConsentInput,
  type ConsentContext,
  type ConsentRecord,
} from './consent.service';

/**
 * ADS-496 / ADS-497: thin wrapper over consent capture, owned by the
 * registration flow. Kept separate from auth.service so the locked-down
 * authentication path doesn't grow consent responsibilities.
 *
 * The frontend RegisterPage is expected to call:
 *   1. POST /api/v1/auth/register   (creates account + issues tokens)
 *   2. POST /api/v1/privacy/consent (records ToS/Privacy/marketing
 *                                    decisions tied to the new userId)
 *
 * Splitting (2) out of (1) keeps the auth surface minimal and lets
 * profile-update flows reuse the same consent endpoint when ToS/Privacy
 * versions roll forward.
 */

export const captureRegistrationConsent = async (
  input: ConsentInput,
  context: ConsentContext
): Promise<ConsentRecord> => recordConsent(input, context);
