import type { NatsConnection } from 'nats';
import type { Pool } from 'pg';
import { describe, expect, it, vi } from 'vitest';

import { AuthV1 } from '@adopt-dont-shop/proto';

import type { AuthConfig } from '../config.js';

import type { HandlerDeps } from './handlers.js';
import { createGrpcServer } from './server.js';

const quietLogger = {
  info: () => undefined,
  error: () => undefined,
  warn: () => undefined,
  debug: () => undefined,
  silly: () => undefined,
} as unknown as ReturnType<typeof import('@adopt-dont-shop/observability').createLogger>;

const config: AuthConfig = {
  port: 5002,
  grpcPort: 6002,
  host: '127.0.0.1',
  environment: 'test',
  databaseUrl: 'postgres://test',
  schema: 'auth',
  natsUrl: 'nats://localhost:4222',
  jwtSecret: 'access-secret',
  jwtRefreshSecret: 'refresh-secret',
};

const pool = {} as unknown as Pool;
const nats = {} as unknown as NatsConnection;
const passwordHasher: HandlerDeps['passwordHasher'] = { compare: vi.fn() };
const tokenIssuer: HandlerDeps['tokenIssuer'] = {
  mint: vi.fn(),
  verifyAccess: vi.fn(),
  verifyRefresh: vi.fn(),
};

describe('createGrpcServer', () => {
  it('registers all six AuthService methods on the grpc.Server', () => {
    const server = createGrpcServer({
      config,
      pool,
      nats,
      passwordHasher,
      tokenIssuer,
      logger: quietLogger,
    });

    const handlers = (server as unknown as { handlers: Map<string, unknown> }).handlers;

    expect(handlers.has('/adopt_dont_shop.auth.v1.AuthService/Login')).toBe(true);
    expect(handlers.has('/adopt_dont_shop.auth.v1.AuthService/Logout')).toBe(true);
    expect(handlers.has('/adopt_dont_shop.auth.v1.AuthService/RefreshToken')).toBe(true);
    expect(handlers.has('/adopt_dont_shop.auth.v1.AuthService/ValidateToken')).toBe(true);
    expect(handlers.has('/adopt_dont_shop.auth.v1.AuthService/GetMe')).toBe(true);
    expect(handlers.has('/adopt_dont_shop.auth.v1.AuthService/AssignRole')).toBe(true);
  });

  it('matches every path from the canonical AuthServiceService Definition table', () => {
    const definition = AuthV1.AuthServiceService;
    const expectedPaths = Object.values(definition).map(d => (d as { path: string }).path);

    const server = createGrpcServer({
      config,
      pool,
      nats,
      passwordHasher,
      tokenIssuer,
      logger: quietLogger,
    });
    const handlers = (server as unknown as { handlers: Map<string, unknown> }).handlers;

    for (const p of expectedPaths) {
      expect(handlers.has(p)).toBe(true);
    }
  });
});
