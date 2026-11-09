import { apiService } from '@adopt-dont-shop/lib.api';

/**
 * Verified email change (gateway routes in services/gateway/src/routes/auth.ts).
 *
 * Request: step-up re-auth, then a confirmation link goes to the NEW address
 * and a notice to the old one. The answer is the same whether or not the new
 * address already has an account, so it can't be used to discover accounts.
 * Refusals arrive as the thrown Error's message: `invalid_email`,
 * `email_unchanged`, `credential_verification_failed`, `two_factor_required`.
 *
 * Confirm: public; the token is the credential. Refusals:
 * `invalid_or_expired_token`, `email_in_use`. Success ends every session.
 */

export type EmailChangeRequest = {
  newEmail: string;
  password: string;
  twoFactorToken?: string;
};

export const requestEmailChange = async ({
  newEmail,
  password,
  twoFactorToken,
}: EmailChangeRequest): Promise<void> => {
  await apiService.post(
    '/api/v1/users/me/email-change',
    { newEmail, password, ...(twoFactorToken ? { twoFactorToken } : {}) },
    // A wrong password answers 401. Opt out of the global 401 handling so it
    // shows as a form error instead of signing the user out.
    { skipAuthHandling: true }
  );
};

export const confirmEmailChange = async (token: string): Promise<void> => {
  await apiService.post('/api/v1/auth/confirm-email-change', { token });
};
