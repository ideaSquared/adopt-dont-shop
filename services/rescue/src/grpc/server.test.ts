import type { NatsConnection } from 'nats';
import type { Pool } from 'pg';
import { describe, expect, it } from 'vitest';

import { RescueV1 } from '@adopt-dont-shop/proto';

import type { RescueConfig } from '../config.js';

import { createGrpcServer } from './server.js';

const quietLogger = {
  info: () => undefined,
  error: () => undefined,
  warn: () => undefined,
  debug: () => undefined,
  silly: () => undefined,
} as unknown as ReturnType<typeof import('@adopt-dont-shop/observability').createLogger>;

const config: RescueConfig = {
  port: 5004,
  grpcPort: 6004,
  host: '127.0.0.1',
  environment: 'test',
  databaseUrl: 'postgres://test',
  schema: 'rescue',
  natsUrl: 'nats://localhost:4222',
  petsGrpcUrl: 'service-pets:6003',
  applicationsGrpcUrl: 'service-applications:6005',
};

const pool = {} as unknown as Pool;
const nats = {} as unknown as NatsConnection;
const petsClient = { getPet: async () => ({}), close: () => undefined } as unknown as Parameters<
  typeof createGrpcServer
>[0]['petsClient'];
const applicationsClient = {
  countAdoptedAdopters: async () => ({ count: 0 }),
  close: () => undefined,
} as unknown as Parameters<typeof createGrpcServer>[0]['applicationsClient'];

describe('createGrpcServer', () => {
  it('registers all six RescueService methods on the grpc.Server', () => {
    const server = createGrpcServer({
      config,
      pool,
      nats,
      logger: quietLogger,
      petsClient,
      applicationsClient,
    });
    const handlers = (server as unknown as { handlers: Map<string, unknown> }).handlers;

    expect(handlers.has('/adopt_dont_shop.rescue.v1.RescueService/Create')).toBe(true);
    expect(handlers.has('/adopt_dont_shop.rescue.v1.RescueService/Get')).toBe(true);
    expect(handlers.has('/adopt_dont_shop.rescue.v1.RescueService/List')).toBe(true);
    expect(handlers.has('/adopt_dont_shop.rescue.v1.RescueService/Update')).toBe(true);
    expect(handlers.has('/adopt_dont_shop.rescue.v1.RescueService/Verify')).toBe(true);
    expect(handlers.has('/adopt_dont_shop.rescue.v1.RescueService/InviteStaff')).toBe(true);
  });

  it('matches every path from the canonical RescueServiceService Definition table', () => {
    const definition = RescueV1.RescueServiceService;
    const expectedPaths = Object.values(definition).map(d => (d as { path: string }).path);

    const server = createGrpcServer({
      config,
      pool,
      nats,
      logger: quietLogger,
      petsClient,
      applicationsClient,
    });
    const handlers = (server as unknown as { handlers: Map<string, unknown> }).handlers;

    for (const p of expectedPaths) {
      expect(handlers.has(p)).toBe(true);
    }
  });
});
