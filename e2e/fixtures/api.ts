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
  const response = await ctx.post('/api/v1/auth/login', {
    data: { email: role.email, password: role.password },
  });
  if (!response.ok()) {
    await ctx.dispose();
    throw new Error(
      `API login failed for ${role.email}: ${response.status()} ${await response.text()}`
    );
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
