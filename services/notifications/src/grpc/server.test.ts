import type { NatsConnection } from 'nats';
import type { Pool } from 'pg';
import { describe, expect, it } from 'vitest';

import { NotificationsV1 } from '@adopt-dont-shop/proto';

import type { NotificationsConfig } from '../config.js';

import { createGrpcServer } from './server.js';

const quietLogger = {
  info: () => undefined,
  error: () => undefined,
  warn: () => undefined,
  debug: () => undefined,
  silly: () => undefined,
} as unknown as ReturnType<typeof import('@adopt-dont-shop/observability').createLogger>;

const config: NotificationsConfig = {
  port: 5001,
  grpcPort: 6001,
  host: '127.0.0.1',
  environment: 'test',
  databaseUrl: 'postgres://test',
  schema: 'notifications',
  natsUrl: 'nats://localhost:4222',
};

// Stubs — we don't bind a port in these tests, just inspect the
// Server's internal handler registry (grpc-js stores them on a `handlers`
// Map keyed by full path `/<package>.<Service>/<Method>`).
const pool = {} as unknown as Pool;
const nats = {} as unknown as NatsConnection;

describe('createGrpcServer', () => {
  it('registers the three NotificationService methods on the grpc.Server', () => {
    const server = createGrpcServer({ config, pool, nats, logger: quietLogger });

    // Grab the private handlers map. grpc-js v1 keys handlers by full
    // RPC path; we assert all three method paths are present, which
    // is the same wiring the runtime requests.
    const handlers = (server as unknown as { handlers: Map<string, unknown> }).handlers;

    expect(handlers.has('/adopt_dont_shop.notifications.v1.NotificationService/Create')).toBe(true);
    expect(handlers.has('/adopt_dont_shop.notifications.v1.NotificationService/List')).toBe(true);
    expect(handlers.has('/adopt_dont_shop.notifications.v1.NotificationService/Dismiss')).toBe(
      true
    );
  });

  it('uses the canonical NotificationServiceService Definition table (paths match the proto package)', () => {
    // Cross-check the Definition table's exported method paths against
    // the server's bound handler keys. A future renaming of the proto
    // package would break this without anyone noticing — the runtime
    // would happily 12-UNIMPLEMENT every call.
    const definition = NotificationsV1.NotificationServiceService;
    const expectedPaths = Object.values(definition).map(d => (d as { path: string }).path);

    const server = createGrpcServer({ config, pool, nats, logger: quietLogger });
    const handlers = (server as unknown as { handlers: Map<string, unknown> }).handlers;

    for (const p of expectedPaths) {
      expect(handlers.has(p)).toBe(true);
    }
  });
});
