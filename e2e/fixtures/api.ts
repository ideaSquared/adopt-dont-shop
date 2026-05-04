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
};

function readUserId(body: LoginResponse): string {
  return body.user?.userId ?? body.user?.id ?? body.data?.user?.userId ?? body.data?.user?.id ?? '';
}

export async function loginViaApi(roleKey: RoleKey): Promise<ApiClient> {
  const role = ROLES[roleKey];
  // The backend's login endpoint sets the access + refresh tokens as
  // httpOnly cookies and only returns { user, expiresIn } in the body —
  // there is no Bearer token to extract.  Keep the same APIRequestContext
  // for subsequent calls so the cookies travel with each request, and
  // drive CSRF the same way the React app does (token endpoint seeds the
  // cookie, value goes into the x-csrf-token header).
  const ctx = await playwrightRequest.newContext({ baseURL: URLS.api });
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
    const status = response.status();
    const text = await response.text();
    await ctx.dispose();
    throw new Error(`API login failed for ${role.email}: ${status} ${text.slice(0, 500)}`);
  }
  const body = (await response.json()) as LoginResponse;
  const userId = readUserId(body);

  return {
    context: ctx,
    userId,
    dispose: () => ctx.dispose(),
  };
}

export async function unauthenticatedApi(): Promise<APIRequestContext> {
  return playwrightRequest.newContext({ baseURL: URLS.api });
}
