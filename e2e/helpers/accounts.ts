import { request as playwrightRequest } from '@playwright/test';

import { URLS } from '../playwright.config';
import { uniqueEmail } from './factories';
import { expectOk, postWithCsrf } from './seeds';
import { verifyEmailViaPeek } from './token-peek';

export type Account = { email: string; password: string; firstName: string };

/**
 * Register a throwaway adopter and verify their email through the token-peek
 * seam, so it can log in. Use it when a journey changes per-user state (saved
 * application answers, 2FA, a suspension) that would leak into the shared
 * seeded personas other specs rely on.
 */
export async function createVerifiedAdopter(label = 'adopter'): Promise<Account> {
  const account = { email: uniqueEmail(label), password: 'BehaviourTest123!', firstName: 'E2E' };
  const ctx = await playwrightRequest.newContext({ baseURL: URLS.api });
  try {
    const res = await postWithCsrf(ctx, '/api/v1/auth/register', {
      email: account.email,
      password: account.password,
      firstName: account.firstName,
      lastName: 'Adopter',
      termsAccepted: true,
      privacyPolicyAccepted: true,
    });
    await expectOk(res, `register ${account.email}`);
  } finally {
    await ctx.dispose();
  }
  await verifyEmailViaPeek(account.email);
  return account;
}
