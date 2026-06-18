// Test-only token-read seam (ADS-871).
//
// Password-reset / email-verification / staff-invitation tokens are normally
// only delivered by email, so the suite can't read them to drive the FULL
// auth round-trips. The gateway exposes a test-gated peek endpoint
// (services/gateway/src/routes/test-token-peek.ts) — OFF unless
// E2E_TOKEN_PEEK=true, and impossible to enable in production — that reads the
// tokens straight from the shared Postgres. These helpers wrap it.

import { request as playwrightRequest, type APIRequestContext } from '@playwright/test';

import { URLS } from '../playwright.config';

type AuthTokens = {
  verificationToken: string | null;
  verificationTokenExpiresAt: string | null;
  resetToken: string | null;
  resetTokenExpiration: string | null;
};

async function withAnonApi<T>(fn: (ctx: APIRequestContext) => Promise<T>): Promise<T> {
  const ctx = await playwrightRequest.newContext({ baseURL: URLS.api });
  try {
    return await fn(ctx);
  } finally {
    await ctx.dispose();
  }
}

/**
 * Read the current verification + reset tokens for an email straight from the
 * gateway's test-token-peek seam. Throws if the seam isn't enabled (404 on the
 * route) or the user is unknown — surfacing the misconfiguration loudly.
 */
export async function peekAuthTokens(email: string): Promise<AuthTokens> {
  return withAnonApi(async ctx => {
    const res = await ctx.get('/api/v1/test/auth-token', { params: { email } });
    if (!res.ok()) {
      throw new Error(
        `token-peek auth-token failed for ${email}: ${res.status()} ${(await res.text()).slice(0, 200)}`
      );
    }
    return (await res.json()) as AuthTokens;
  });
}

/**
 * Read the most recent pending staff-invitation token for an email from the
 * test-token-peek seam. Returns null when no pending invitation exists.
 */
export async function peekInvitationToken(
  email: string,
  rescueId?: string
): Promise<string | null> {
  return withAnonApi(async ctx => {
    const res = await ctx.get('/api/v1/test/invitation-token', {
      params: rescueId ? { email, rescueId } : { email },
    });
    if (res.status() === 404) {
      return null;
    }
    if (!res.ok()) {
      throw new Error(
        `token-peek invitation-token failed for ${email}: ${res.status()} ${(await res.text()).slice(0, 200)}`
      );
    }
    const body = (await res.json()) as { token?: string };
    return body.token ?? null;
  });
}
