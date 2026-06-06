import type { NatsConnection } from 'nats';
import type { Pool } from 'pg';
import { describe, expect, it } from 'vitest';

import { AuditV1 } from '@adopt-dont-shop/proto';

import type { AuditConfig } from '../config.js';

import { createGrpcServer } from './server.js';

const quietLogger = {
  info: () => undefined,
  error: () => undefined,
  warn: () => undefined,
  debug: () => undefined,
  silly: () => undefined,
} as unknown as ReturnType<typeof import('@adopt-dont-shop/observability').createLogger>;

const config: AuditConfig = {
  port: 5009,
  grpcPort: 6009,
  host: '127.0.0.1',
  environment: 'test',
  databaseUrl: 'postgres://test',
  schema: 'audit',
  natsUrl: 'nats://localhost:4222',
};

const pool = {} as unknown as Pool;
const nats = {} as unknown as NatsConnection;

describe('createGrpcServer', () => {
  it('registers both AuditQueryService methods on the grpc.Server', () => {
    const server = createGrpcServer({ config, pool, nats, logger: quietLogger });
    const handlers = (server as unknown as { handlers: Map<string, unknown> }).handlers;

    expect(handlers.has('/adopt_dont_shop.audit.v1.AuditQueryService/Query')).toBe(true);
    expect(handlers.has('/adopt_dont_shop.audit.v1.AuditQueryService/GetByTarget')).toBe(true);
  });

  it('matches every path from the canonical AuditQueryServiceService Definition table', () => {
    const definition = AuditV1.AuditQueryServiceService;
    const expectedPaths = Object.values(definition).map(d => (d as { path: string }).path);

    const server = createGrpcServer({ config, pool, nats, logger: quietLogger });
    const handlers = (server as unknown as { handlers: Map<string, unknown> }).handlers;

    for (const p of expectedPaths) {
      expect(handlers.has(p)).toBe(true);
    }
  });
});
