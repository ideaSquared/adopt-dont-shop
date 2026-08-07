// CSRF double-submit handshake for the e2e suite (ADS-919).
//
// The gateway enforces a double-submit CSRF check on state-changing requests
// (POST/PUT/PATCH/DELETE) whenever the request carries an accessToken or
// csrfToken cookie (services/gateway/src/middleware/csrf.ts). Its SPA client
// satisfies this by first calling GET /api/v1/csrf-token — which sets a
// non-httpOnly `csrfToken` cookie AND returns the same value in the body — then
// echoing that value back in the `x-csrf-token` header on every mutation.
//
// These helpers give the e2e suite the same handshake. Fetching once per
// APIRequestContext (cached below) also makes the whole thing robust: a context
// that has already accrued auth cookies still carries a matching csrfToken
// cookie + header, so login/logout/mutations never trip the CSRF gate.

import type { APIRequestContext } from '@playwright/test';

export const CSRF_HEADER_NAME = 'x-csrf-token';

// One handshake per context — the returned promise is cached so concurrent
// callers share a single GET /api/v1/csrf-token round-trip.
const csrfTokenByContext = new WeakMap<APIRequestContext, Promise<string>>();

export async function fetchCsrfToken(ctx: APIRequestContext): Promise<string> {
  let pending = csrfTokenByContext.get(ctx);
  if (!pending) {
    pending = ctx.get('/api/v1/csrf-token', { timeout: 15_000 }).then(async res => {
      if (!res.ok()) {
        throw new Error(
          `csrf-token fetch failed: ${res.status()} ${(await res.text()).slice(0, 200)}`
        );
      }
      const body = (await res.json()) as { csrfToken?: string };
      if (!body.csrfToken) {
        throw new Error('csrf-token response did not include a csrfToken');
      }
      return body.csrfToken;
    });
    csrfTokenByContext.set(ctx, pending);
  }
  return pending;
}

/** Merge the double-submit header into an existing header map. */
export async function withCsrfHeader(
  ctx: APIRequestContext,
  headers: Record<string, string> = {}
): Promise<Record<string, string>> {
  return { ...headers, [CSRF_HEADER_NAME]: await fetchCsrfToken(ctx) };
}
