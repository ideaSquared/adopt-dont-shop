import { request as playwrightRequest } from '@playwright/test';

import type { ApiClient } from '../fixtures/api';
import { URLS } from '../playwright.config';
import { fetchCsrfToken } from './csrf';
import { uniqueEmail } from './factories';
import { expectOk, postWithCsrf } from './seeds';
import { peekUserInvitationToken, verifyEmailViaPeek } from './token-peek';

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

/**
 * Whether an email + password pair signs in right now, through the API. Use it
 * to check that a changed password, email or erased account took effect
 * without driving the login form again.
 */
export async function canSignIn(email: string, password: string): Promise<boolean> {
  const ctx = await playwrightRequest.newContext({ baseURL: URLS.api });
  try {
    const res = await postWithCsrf(ctx, '/api/v1/auth/login', { email, password });
    return res.ok();
  } finally {
    await ctx.dispose();
  }
}

/**
 * Create a throwaway platform admin the way the dev seed does
 * (scripts/lib/seed-generate.mjs ensureAdmin): the super admin creates the
 * user without emailing the invitation, the invitation token is read through
 * the peek seam, and redeeming it sets the password. Use it for journeys that
 * change an admin's password, email, 2FA or existence — never the seeded super
 * admin the admin project signs in as.
 */
export async function createThrowawayAdmin(
  superAdminApi: ApiClient,
  label = 'admin'
): Promise<Account> {
  const account = { email: uniqueEmail(label), password: 'BehaviourTest123!', firstName: 'Ada' };
  const created = await postWithCsrf(superAdminApi.context, '/api/v1/admin/users', {
    email: account.email,
    firstName: account.firstName,
    lastName: 'Admin',
    role: 'admin',
    sendInvitation: false,
  });
  await expectOk(created, `create admin ${account.email}`);
  const invitationToken = await peekUserInvitationToken(account.email);
  const ctx = await playwrightRequest.newContext({ baseURL: URLS.api });
  try {
    const redeemed = await postWithCsrf(ctx, '/api/v1/auth/redeem-invitation', {
      invitationToken,
      newPassword: account.password,
    });
    await expectOk(redeemed, `redeem invitation for ${account.email}`);
  } finally {
    await ctx.dispose();
  }
  return account;
}
