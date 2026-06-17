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

export async function loginViaApi(roleKey: RoleKey): Promise<ApiClient> {
  const role = ROLES[roleKey];
  // The Fastify gateway authenticates with Bearer tokens, not the deleted
  // monolith's httpOnly-cookie + CSRF model: login returns
  // `{ user, tokens: { accessToken, refreshToken } }` in the body and there
  // is no /csrf-token endpoint. Mint a context whose Authorization header
  // carries the access token so every subsequent request from this client
  // is authenticated.
  const loginCtx = await playwrightRequest.newContext({ baseURL: URLS.api });
  let accessToken: string | undefined;
  let userId = '';
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
    accessToken = body.tokens?.accessToken ?? body.tokens?.access_token;
    userId = readUserId(body);
  } finally {
    await loginCtx.dispose();
  }
  if (!accessToken) {
    throw new Error(`API login for ${role.email} returned no access token`);
  }

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
