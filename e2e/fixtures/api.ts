import { request as playwrightRequest, type APIRequestContext } from '@playwright/test';

import { fetchCsrfToken } from '../helpers/csrf';
import { URLS } from '../playwright.config';
import { ROLES, type RoleKey } from './roles';

export type ApiClient = {
  context: APIRequestContext;
  userId: string;
  dispose: () => Promise<void>;
};

type LoginResponse = {
  user?: { userId?: string; id?: string };
  data?: { user?: { userId?: string; id?: string } };
  tokens?: { accessToken?: string; access_token?: string };
};

function readUserId(body: LoginResponse): string {
  return body.user?.userId ?? body.user?.id ?? body.data?.user?.userId ?? body.data?.user?.id ?? '';
}

// Cache the access token per role for the lifetime of the worker process.
// apiAs() is called from many specs, and the gateway rate-limits
// POST /api/v1/auth/login to 10/min per IP — logging in on every call trips a
// 429 once more than a handful of authenticated specs run (all e2e traffic
// shares one docker-side IP). Access tokens are JWTs valid well beyond a suite
// run, so one login per role per worker is plenty. Each apiAs() call still gets
// its own disposable request context; only the login is shared.
const tokenCache = new Map<RoleKey, { accessToken: string; userId: string }>();

async function getRoleToken(roleKey: RoleKey): Promise<{ accessToken: string; userId: string }> {
  const cached = tokenCache.get(roleKey);
  if (cached) {
    return cached;
  }
  const role = ROLES[roleKey];
  // ADS-919: the gateway now issues httpOnly auth cookies and enforces a CSRF
  // double-submit on state-changing requests. Perform the SPA's handshake —
  // GET /api/v1/csrf-token, then POST login with the matching x-csrf-token
  // header — so login is accepted regardless of any cookie the context holds.
  const loginCtx = await playwrightRequest.newContext({ baseURL: URLS.api });
  try {
    const csrfToken = await fetchCsrfToken(loginCtx);
    const response = await loginCtx.post('/api/v1/auth/login', {
      data: { email: role.email, password: role.password },
      headers: { 'x-csrf-token': csrfToken },
      timeout: 15_000,
    });
    if (!response.ok()) {
      const status = response.status();
      const text = await response.text();
      throw new Error(`API login failed for ${role.email}: ${status} ${text.slice(0, 500)}`);
    }
    // ADS-919: the token pair rides home as httpOnly cookies, not in the JSON
    // body. Read the accessToken from the context's cookie jar (Playwright
    // captures httpOnly cookies) — the gateway's authenticate hook accepts it
    // as an `Authorization: Bearer` credential on the client context below.
    const { cookies } = await loginCtx.storageState();
    const accessToken = cookies.find(c => c.name === 'accessToken')?.value;
    if (!accessToken) {
      throw new Error(`API login for ${role.email} returned no access token cookie`);
    }
    const body = (await response.json()) as LoginResponse;
    const token = { accessToken, userId: readUserId(body) };
    tokenCache.set(roleKey, token);
    return token;
  } finally {
    await loginCtx.dispose();
  }
}

export async function loginViaApi(roleKey: RoleKey): Promise<ApiClient> {
  // Mint a context whose Authorization header carries the (cached) access
  // token so every subsequent request from this client is authenticated.
  const { accessToken, userId } = await getRoleToken(roleKey);
  const context = await playwrightRequest.newContext({
    baseURL: URLS.api,
    extraHTTPHeaders: { Authorization: `Bearer ${accessToken}` },
  });

  return {
    context,
    userId,
    dispose: () => context.dispose(),
  };
}

export async function unauthenticatedApi(): Promise<APIRequestContext> {
  return playwrightRequest.newContext({ baseURL: URLS.api });
}
