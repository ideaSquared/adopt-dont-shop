import { generateSync } from 'otplib';

import { expect, request as playwrightRequest } from '@playwright/test';

import { URLS } from '../playwright.config';
import { loginAccountViaApi, type Account } from './accounts';
import { expectOk, postWithCsrf } from './seeds';

/**
 * Turn TOTP 2FA on for a throwaway account through the API (setup → enable
 * with a current code). Returns the secret, to generate later codes from, and
 * the code enable consumed. Never call it on a seeded persona: every later
 * login of the account then asks for a code.
 */
export async function enableTwoFactorViaApi(
  account: Account
): Promise<{ secret: string; usedCode: string }> {
  const api = await loginAccountViaApi(account);
  try {
    const setup = await postWithCsrf(api.context, '/api/v1/auth/2fa/setup');
    await expectOk(setup, `2fa setup for ${account.email}`);
    const { secret } = (await setup.json()) as { secret?: string };
    if (!secret) {
      throw new Error(`2fa setup for ${account.email} returned no secret`);
    }
    const usedCode = generateSync({ secret });
    const enabled = await postWithCsrf(api.context, '/api/v1/auth/2fa/enable', {
      secret,
      token: usedCode,
    });
    await expectOk(enabled, `2fa enable for ${account.email}`);
    return { secret, usedCode };
  } finally {
    await api.dispose();
  }
}

/**
 * A TOTP code from a later 30-second step than `usedCode`. The server refuses
 * a code it already accepted (ADS-976), and two steps of one journey often
 * land in the same window, so wait (up to ~35s) for the code to roll over.
 * Callers should mark their test `test.slow()`.
 */
export async function nextTotpCode(secret: string, usedCode: string): Promise<string> {
  await expect
    .poll(() => generateSync({ secret }), { timeout: 35_000, intervals: [1_000] })
    .not.toBe(usedCode);
  return generateSync({ secret });
}

/**
 * Whether a password-only login of the account is answered with the 2FA
 * challenge (twoFactorRequired, no session) — i.e. 2FA is on.
 */
export async function loginAsksForTwoFactor(account: Account): Promise<boolean> {
  const ctx = await playwrightRequest.newContext({ baseURL: URLS.api });
  try {
    const res = await postWithCsrf(ctx, '/api/v1/auth/login', {
      email: account.email,
      password: account.password,
    });
    await expectOk(res, `login ${account.email}`);
    const body = (await res.json()) as { twoFactorRequired?: boolean };
    return body.twoFactorRequired === true;
  } finally {
    await ctx.dispose();
  }
}
