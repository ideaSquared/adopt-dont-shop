import { request as playwrightRequest } from '@playwright/test';

import type { ApiClient } from '../fixtures/api';
import { URLS } from '../playwright.config';
import { fetchCsrfToken } from './csrf';
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

/**
 * Log a throwaway account in through the API. The returned context keeps the
 * session cookies, so later requests on it (postWithCsrf included) act as
 * that user.
 */
export async function loginAccountViaApi(account: Account): Promise<ApiClient> {
  const context = await playwrightRequest.newContext({ baseURL: URLS.api });
  const res = await context.post('/api/v1/auth/login', {
    data: { email: account.email, password: account.password },
    headers: { 'x-csrf-token': await fetchCsrfToken(context) },
  });
  await expectOk(res, `login ${account.email}`);
  const body = (await res.json()) as { user?: { userId?: string } };
  return { context, userId: body.user?.userId ?? '', dispose: () => context.dispose() };
}
