// OpenAPI spec wiring smoke test.
//
// Scope-limited by design: we prove the @fastify/swagger plugin is
// registered, /openapi.json is reachable, the document carries the
// gateway's title, and the three routes we hand-annotated in this PR
// appear in `paths`. We deliberately DON'T deep-validate the schema —
// reviewers want signal that the wiring works, not a brittle snapshot
// that breaks every time a route picks up a new field.

import type { FastifyInstance } from 'fastify';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { GatewayConfig } from './config.js';
import { createServer } from './server.js';

// Same quiet logger pattern as server.test.ts — winston logger surface
// is irrelevant to this suite.
const quietLogger = {
  info: () => undefined,
  error: () => undefined,
  warn: () => undefined,
  debug: () => undefined,
  silly: () => undefined,
} as unknown as ReturnType<typeof import('@adopt-dont-shop/observability').createLogger>;

const baseConfig: GatewayConfig = {
  port: 0,
  host: '127.0.0.1',
  environment: 'test',
  storage: {
    provider: 'local',
    local: { directory: 'uploads', publicPath: '/uploads' },
    s3: {},
    maxFileSize: 1_000_000,
  },
  legal: { enabled: false, docsDir: 'docs/legal' },
  config: { publicEnabled: false },
} as GatewayConfig;

// Minimal stubs — we only need the route to register so its `schema`
// block lands in the OpenAPI document. The handlers are never invoked.
const stubAuthClient = {
  login: () => Promise.resolve({}),
  logout: () => Promise.resolve({}),
  refreshToken: () => Promise.resolve({}),
  getMe: () => Promise.resolve({}),
  assignRole: () => Promise.resolve({}),
  register: () => Promise.resolve({}),
  verifyEmail: () => Promise.resolve({}),
  resendVerification: () => Promise.resolve({}),
  forgotPassword: () => Promise.resolve({}),
  resetPassword: () => Promise.resolve({}),
  changePassword: () => Promise.resolve({}),
  updateAccount: () => Promise.resolve({}),
} as unknown as Parameters<typeof createServer>[0]['authClient'];

const stubPetsClient = {
  list: () => Promise.resolve({ pets: [] }),
  get: () => Promise.resolve({}),
  create: () => Promise.resolve({}),
  update: () => Promise.resolve({}),
  updateStatus: () => Promise.resolve({}),
  delete: () => Promise.resolve({}),
  getStats: () => Promise.resolve({}),
} as unknown as Parameters<typeof createServer>[0]['petsClient'];

const allCutover = {
  auth: true,
  notifications: false,
  pets: true,
  rescue: false,
  applications: false,
  moderation: false,
  matching: false,
  audit: false,
  chat: false,
  cms: false,
} as const;

describe('createServer — OpenAPI spec endpoint', () => {
  let server: FastifyInstance;

  beforeEach(async () => {
    server = await createServer({
      config: { ...baseConfig, cutover: { ...allCutover } } as GatewayConfig,
      logger: quietLogger,
      authClient: stubAuthClient,
      petsClient: stubPetsClient,
    });
  });

  afterEach(async () => {
    await server.close();
  });

  it('serves the OpenAPI document at /openapi.json with the gateway title', async () => {
    const res = await server.inject({ method: 'GET', url: '/openapi.json' });
    expect(res.statusCode).toBe(200);
    const body = res.json() as {
      info: { title: string; version: string };
      paths: Record<string, unknown>;
    };
    expect(body.info.title).toBe('adopt-dont-shop gateway API');
    expect(body.info.version).toBe('1.0.0');
  });

  it('includes the representative annotated routes in paths', async () => {
    const res = await server.inject({ method: 'GET', url: '/openapi.json' });
    const body = res.json() as { paths: Record<string, unknown> };
    expect(body.paths).toHaveProperty('/api/v1/auth/login');
    expect(body.paths).toHaveProperty('/api/v1/auth/me');
    expect(body.paths).toHaveProperty('/api/v1/pets');
  });

  it('declares the bearerAuth security scheme', async () => {
    const res = await server.inject({ method: 'GET', url: '/openapi.json' });
    const body = res.json() as {
      components?: { securitySchemes?: Record<string, { type?: string; scheme?: string }> };
    };
    expect(body.components?.securitySchemes?.bearerAuth).toMatchObject({
      type: 'http',
      scheme: 'bearer',
    });
  });
});
