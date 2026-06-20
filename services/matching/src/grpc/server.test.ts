import type { NatsConnection } from 'nats';
import type { Pool } from 'pg';
import { describe, expect, it } from 'vitest';

import { MatchingV1 } from '@adopt-dont-shop/proto';

import type { MatchingConfig } from '../config.js';

import { createGrpcServer } from './server.js';

const quietLogger = {
  info: () => undefined,
  error: () => undefined,
  warn: () => undefined,
  debug: () => undefined,
  silly: () => undefined,
} as unknown as ReturnType<typeof import('@adopt-dont-shop/observability').createLogger>;

const config: MatchingConfig = {
  port: 5008,
  grpcPort: 6008,
  host: '127.0.0.1',
  environment: 'test',
  databaseUrl: 'postgres://test',
  schema: 'matching',
  natsUrl: 'nats://localhost:4222',
  petsGrpcUrl: 'service-pets:6003',
  rescueGrpcUrl: 'service-rescue:6004',
};

const pool = {} as unknown as Pool;
const nats = {} as unknown as NatsConnection;
// Inject stub downstream clients so the test doesn't construct real gRPC
// channels just to assert handler registration.
const petsClient = {
  listPets: () => Promise.reject(new Error('not used')),
  close: () => undefined,
} as unknown as Parameters<typeof createGrpcServer>[0]['petsClient'];
const rescueClient = {
  getRescueName: () => Promise.reject(new Error('not used')),
  close: () => undefined,
} as unknown as Parameters<typeof createGrpcServer>[0]['rescueClient'];

describe('createGrpcServer', () => {
  it('registers all six MatchingService methods on the grpc.Server', () => {
    const server = createGrpcServer({
      config,
      pool,
      nats,
      logger: quietLogger,
      petsClient,
      rescueClient,
    });
    const handlers = (server as unknown as { handlers: Map<string, unknown> }).handlers;

    expect(handlers.has('/adopt_dont_shop.matching.v1.MatchingService/StartSession')).toBe(true);
    expect(handlers.has('/adopt_dont_shop.matching.v1.MatchingService/EndSession')).toBe(true);
    expect(handlers.has('/adopt_dont_shop.matching.v1.MatchingService/RecordSwipe')).toBe(true);
    expect(handlers.has('/adopt_dont_shop.matching.v1.MatchingService/ListSwipeHistory')).toBe(
      true
    );
    expect(handlers.has('/adopt_dont_shop.matching.v1.MatchingService/Recommend')).toBe(true);
    expect(handlers.has('/adopt_dont_shop.matching.v1.MatchingService/SearchPets')).toBe(true);
  });

  it('matches every path from the canonical MatchingServiceService Definition table', () => {
    const definition = MatchingV1.MatchingServiceService;
    const expectedPaths = Object.values(definition).map(d => (d as { path: string }).path);

    const server = createGrpcServer({
      config,
      pool,
      nats,
      logger: quietLogger,
      petsClient,
      rescueClient,
    });
    const handlers = (server as unknown as { handlers: Map<string, unknown> }).handlers;

    for (const p of expectedPaths) {
      expect(handlers.has(p)).toBe(true);
    }
  });
});
