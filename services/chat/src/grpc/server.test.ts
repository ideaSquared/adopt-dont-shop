import type { NatsConnection } from 'nats';
import type { Pool } from 'pg';
import { describe, expect, it } from 'vitest';

import { ChatV1 } from '@adopt-dont-shop/proto';

import type { ChatConfig } from '../config.js';

import { createGrpcServer, startGrpcServer } from './server.js';

const quietLogger = {
  info: () => undefined,
  error: () => undefined,
  warn: () => undefined,
  debug: () => undefined,
  silly: () => undefined,
} as unknown as ReturnType<typeof import('@adopt-dont-shop/observability').createLogger>;

const config: ChatConfig = {
  port: 5006,
  grpcPort: 6006,
  host: '127.0.0.1',
  environment: 'test',
  databaseUrl: 'postgres://test',
  schema: 'chat',
  natsUrl: 'nats://localhost:4222',
  applicationsGrpcUrl: 'service-applications:6005',
  rescueGrpcUrl: 'service-rescue:6004',
};

const pool = {} as unknown as Pool;
const nats = {} as unknown as NatsConnection;
// Inject stub cross-service clients so the test doesn't construct real
// gRPC channels just to assert handler registration (ADS-918).
const applicationsClient = {
  getApplication: () => Promise.reject(new Error('not used')),
  close: () => undefined,
} as unknown as Parameters<typeof createGrpcServer>[0]['applicationsClient'];
const rescueClient = {
  listStaffMembers: () => Promise.reject(new Error('not used')),
  close: () => undefined,
} as unknown as Parameters<typeof createGrpcServer>[0]['rescueClient'];

describe('createGrpcServer', () => {
  it('registers all 11 ChatService methods on the grpc.Server', () => {
    const server = createGrpcServer({
      config,
      pool,
      nats,
      logger: quietLogger,
      applicationsClient,
      rescueClient,
    });
    const handlers = (server as unknown as { handlers: Map<string, unknown> }).handlers;

    const base = '/adopt_dont_shop.chat.v1.ChatService';
    for (const method of [
      'OpenChat',
      'SendMessage',
      'ListMessages',
      'ListChats',
      'MarkRead',
      'React',
      'SearchChats',
      'GetChatUnreadCount',
      'DeleteMessage',
      'GetChat',
      'DeleteChat',
    ]) {
      expect(handlers.has(`${base}/${method}`)).toBe(true);
    }
  });

  it('matches every path from the canonical ChatServiceService Definition table', () => {
    const definition = ChatV1.ChatServiceService;
    const expectedPaths = Object.values(definition).map(d => (d as { path: string }).path);

    const server = createGrpcServer({
      config,
      pool,
      nats,
      logger: quietLogger,
      applicationsClient,
      rescueClient,
    });
    const handlers = (server as unknown as { handlers: Map<string, unknown> }).handlers;

    for (const p of expectedPaths) {
      expect(handlers.has(p)).toBe(true);
    }
  });

  it('builds lazy cross-service clients when none are injected', () => {
    // No applicationsClient / rescueClient — createGrpcServer constructs
    // them from config. gRPC channels connect lazily, so nothing dials.
    const server = createGrpcServer({ config, pool, nats, logger: quietLogger });
    const handlers = (server as unknown as { handlers: Map<string, unknown> }).handlers;
    expect(handlers.has('/adopt_dont_shop.chat.v1.ChatService/OpenChat')).toBe(true);
  });
});

describe('startGrpcServer', () => {
  it('binds, owns the cross-service clients, and shuts down cleanly', async () => {
    const running = await startGrpcServer({
      // Port 0 → OS-assigned, so parallel test runs can't collide.
      config: { ...config, grpcPort: 0 },
      pool,
      nats,
      logger: quietLogger,
    });
    expect(running.port).toBeGreaterThan(0);
    await expect(running.shutdown()).resolves.toBeUndefined();
  });
});
