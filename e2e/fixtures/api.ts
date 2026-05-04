import { request as playwrightRequest, type APIRequestContext } from '@playwright/test';

import { URLS } from '../playwright.config';
import { ROLES, type RoleKey } from './roles';

export type ApiClient = {
  context: APIRequestContext;
  token: string;
  userId: string;
  dispose: () => Promise<void>;
};

type LoginResponse = {
  data?: {
    accessToken?: string;
    token?: string;
    user?: { userId?: string; id?: string };
  };
  accessToken?: string;
  token?: string;
  user?: { userId?: string; id?: string };
};

function readToken(body: LoginResponse): string {
  return body.data?.accessToken ?? body.accessToken ?? body.data?.token ?? body.token ?? '';
}

function readUserId(body: LoginResponse): string {
  return body.data?.user?.userId ?? body.data?.user?.id ?? body.user?.userId ?? body.user?.id ?? '';
}

export async function loginViaApi(roleKey: RoleKey): Promise<ApiClient> {
  const role = ROLES[roleKey];
  const ctx = await playwrightRequest.newContext({ baseURL: URLS.api });
  // Backend requires a paired token+cookie for any state-changing request.
  // Fetch the token first so the cookie is seeded on this context, then
  // include the value in x-csrf-token on the login POST.
  const csrfRes = await ctx.get('/api/v1/csrf-token');
  if (!csrfRes.ok()) {
    const status = csrfRes.status();
    const text = await csrfRes.text();
    await ctx.dispose();
    throw new Error(`CSRF token fetch failed for ${role.email}: ${status} ${text.slice(0, 300)}`);
  }
  const { csrfToken } = (await csrfRes.json()) as { csrfToken?: string };
  if (!csrfToken) {
    await ctx.dispose();
    throw new Error(`CSRF token endpoint returned no token for ${role.email}`);
  }
  const response = await ctx.post('/api/v1/auth/login', {
    data: { email: role.email, password: role.password },
    headers: { 'x-csrf-token': csrfToken },
  });
  if (!response.ok()) {
    // Read the body BEFORE disposing the context — disposing invalidates
    // every response tied to it and turns the error into "Response has
    // been disposed", masking the real status code and message.
    const status = response.status();
    const text = await response.text();
    await ctx.dispose();
    throw new Error(`API login failed for ${role.email}: ${status} ${text.slice(0, 500)}`);
  }
  const body = (await response.json()) as LoginResponse;
  const token = readToken(body);
  const userId = readUserId(body);
  if (!token) {
    await ctx.dispose();
    throw new Error(`Login response did not contain a token: ${JSON.stringify(body)}`);
  }

  const authed = await playwrightRequest.newContext({
    baseURL: URLS.api,
    extraHTTPHeaders: { Authorization: `Bearer ${token}` },
  });
  await ctx.dispose();

  return {
    context: authed,
    token,
    userId,
    dispose: () => authed.dispose(),
  };
}

export async function unauthenticatedApi(): Promise<APIRequestContext> {
  return playwrightRequest.newContext({ baseURL: URLS.api });
}
