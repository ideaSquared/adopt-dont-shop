import { z } from 'zod';
import {
  EXPECTED_ENV_HEADER,
  ErrorResponseSchema,
  type OpsEnv,
  CatalogResponseSchema,
  CreateUnlockResponseSchema,
  HistoryResponseSchema,
  InvokeResponseSchema,
  ListUnlocksResponseSchema,
  LocalLoginResponseSchema,
  LoginPollResponseSchema,
  LoginStartResponseSchema,
  WhoamiResponseSchema,
  type CreateUnlockRequest,
  type InvokeRequest,
} from '@adopt-dont-shop/ops-contract';
import { ApiError, CliError, NetworkError } from './errors.js';

export type FetchFn = typeof fetch;

export type Reply<T> = { readonly data: T; readonly headers: Headers };

export type ClientOptions = {
  readonly fetch: FetchFn;
  readonly baseUrl: string;
  readonly env: OpsEnv;
  readonly token?: string;
  readonly timeoutMs?: number;
};

const DEFAULT_TIMEOUT_MS = 60_000;

// Defence in depth behind the server's own X-Ops-Expected-Env check: a
// response that names another environment is never trusted or cached.
const assertSameEnv = <T extends { readonly env: OpsEnv }>(selected: OpsEnv, data: T): T => {
  if (data.env === selected) {
    return data;
  }
  throw new CliError(
    `The server answered for ${data.env}, but you selected ${selected}.`,
    1,
    'The SSH tunnel or base URL points at the wrong stack. Run `pnpm ops tunnel stop all` and try again.'
  );
};

export const createClient = (options: ClientOptions) => {
  const send = async <T>(
    method: string,
    path: string,
    schema: z.ZodType<T> | undefined,
    body?: unknown
  ): Promise<Reply<T>> => {
    const response = await options
      .fetch(`${options.baseUrl}${path}`, {
        method,
        headers: {
          accept: 'application/json',
          [EXPECTED_ENV_HEADER]: options.env,
          ...(body === undefined ? {} : { 'content-type': 'application/json' }),
          ...(options.token ? { authorization: `Bearer ${options.token}` } : {}),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(options.timeoutMs ?? DEFAULT_TIMEOUT_MS),
      })
      .catch(() => {
        throw new NetworkError(options.env);
      });
    const payload: unknown = await response.json().catch(() => undefined);
    if (!response.ok) {
      throw toApiError(response.status, payload);
    }
    if (!schema) {
      return { data: undefined as T, headers: response.headers };
    }
    const parsed = schema.safeParse(payload);
    if (parsed.success) {
      return { data: parsed.data, headers: response.headers };
    }
    throw new CliError(
      `The server sent a response this CLI does not understand (${method} ${path}).`,
      1,
      'Pull the latest changes and try again.'
    );
  };

  const get = async <T>(path: string, schema: z.ZodType<T>) =>
    (await send('GET', path, schema)).data;
  // Catalog and whoami say which environment answered; refuse a different one.
  const getSameEnv = async <T extends { readonly env: OpsEnv }>(
    path: string,
    schema: z.ZodType<T>
  ) => assertSameEnv(options.env, (await send('GET', path, schema)).data);
  const post = async <T>(path: string, body: unknown, schema: z.ZodType<T>) =>
    (await send('POST', path, schema, body)).data;

  return {
    env: options.env,
    withToken: (token: string) => createClient({ ...options, token }),
    whoami: () => getSameEnv('/v1/whoami', WhoamiResponseSchema),
    catalog: () => getSameEnv('/v1/catalog', CatalogResponseSchema),
    invoke: (request: InvokeRequest) => post('/v1/invoke', request, InvokeResponseSchema),
    history: (limit: number) => get(`/v1/history?limit=${limit}`, HistoryResponseSchema),
    listUnlocks: () => get('/v1/unlocks', ListUnlocksResponseSchema),
    createUnlock: (request: CreateUnlockRequest) =>
      post('/v1/unlocks', request, CreateUnlockResponseSchema),
    revokeUnlocks: async () => {
      await send('DELETE', '/v1/unlocks', undefined);
    },
    loginLocal: (login: string) => post('/v1/login/local', { login }, LocalLoginResponseSchema),
    loginStart: () => post('/v1/login/start', undefined, LoginStartResponseSchema),
    loginPoll: (deviceCode: string) =>
      post('/v1/login/poll', { deviceCode }, LoginPollResponseSchema),
    logout: async () => {
      await send('POST', '/v1/logout', undefined);
    },
  };
};

export type Client = ReturnType<typeof createClient>;

export const toApiError = (status: number, payload: unknown): CliError => {
  const parsed = ErrorResponseSchema.safeParse(payload);
  if (parsed.success) {
    const { code, message, hint } = parsed.data.error;
    return new ApiError(code, message, status, hint);
  }
  return new ApiError('INTERNAL', `The server answered with HTTP ${status}.`, status);
};

export type HealthResult = { readonly ok: boolean; readonly serverDate?: string };

export const checkHealth = async (
  fetchFn: FetchFn,
  baseUrl: string,
  timeoutMs = 3000
): Promise<HealthResult> => {
  const response = await fetchFn(`${baseUrl}/health/ready`, {
    signal: AbortSignal.timeout(timeoutMs),
  }).catch(() => undefined);
  if (!response) {
    return { ok: false };
  }
  return { ok: response.ok, serverDate: response.headers.get('date') ?? undefined };
};
