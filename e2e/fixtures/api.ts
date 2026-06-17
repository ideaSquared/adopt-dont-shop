import { request as playwrightRequest, type APIRequestContext } from '@playwright/test';

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
  // The Fastify gateway authenticates with Bearer tokens, not the deleted
  // monolith's httpOnly-cookie + CSRF model: login returns
  // `{ user, tokens: { accessToken, refreshToken } }` in the body.
  const loginCtx = await playwrightRequest.newContext({ baseURL: URLS.api });
  try {
    const response = await loginCtx.post('/api/v1/auth/login', {
      data: { email: role.email, password: role.password },
      timeout: 15_000,
    });
    if (!response.ok()) {
      const status = response.status();
      const text = await response.text();
      throw new Error(`API login failed for ${role.email}: ${status} ${text.slice(0, 500)}`);
    }
    const body = (await response.json()) as LoginResponse;
    const accessToken = body.tokens?.accessToken ?? body.tokens?.access_token;
    if (!accessToken) {
      throw new Error(`API login for ${role.email} returned no access token`);
    }
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
