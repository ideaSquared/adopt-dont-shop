import type { NatsConnection } from 'nats';
import type { Pool } from 'pg';
import { describe, expect, it } from 'vitest';

import { PetsV1 } from '@adopt-dont-shop/proto';

import type { PetsConfig } from '../config.js';

import { createGrpcServer } from './server.js';

const quietLogger = {
  info: () => undefined,
  error: () => undefined,
  warn: () => undefined,
  debug: () => undefined,
  silly: () => undefined,
} as unknown as ReturnType<typeof import('@adopt-dont-shop/observability').createLogger>;

const config: PetsConfig = {
  port: 5003,
  grpcPort: 6003,
  host: '127.0.0.1',
  environment: 'test',
  databaseUrl: 'postgres://test',
  schema: 'pets',
  natsUrl: 'nats://localhost:4222',
};

const pool = {} as unknown as Pool;
const nats = {} as unknown as NatsConnection;

describe('createGrpcServer', () => {
  it('registers all PetService methods on the grpc.Server', () => {
    const server = createGrpcServer({ config, pool, nats, logger: quietLogger });
    const handlers = (server as unknown as { handlers: Map<string, unknown> }).handlers;

    expect(handlers.has('/adopt_dont_shop.pets.v1.PetService/Create')).toBe(true);
    expect(handlers.has('/adopt_dont_shop.pets.v1.PetService/Get')).toBe(true);
    expect(handlers.has('/adopt_dont_shop.pets.v1.PetService/List')).toBe(true);
    expect(handlers.has('/adopt_dont_shop.pets.v1.PetService/Update')).toBe(true);
    expect(handlers.has('/adopt_dont_shop.pets.v1.PetService/UpdateStatus')).toBe(true);
    expect(handlers.has('/adopt_dont_shop.pets.v1.PetService/Delete')).toBe(true);
    expect(handlers.has('/adopt_dont_shop.pets.v1.PetService/ListFavoriters')).toBe(true);
  });

  it('matches every path from the canonical PetServiceService Definition table', () => {
    const definition = PetsV1.PetServiceService;
    const expectedPaths = Object.values(definition).map(d => (d as { path: string }).path);

    const server = createGrpcServer({ config, pool, nats, logger: quietLogger });
    const handlers = (server as unknown as { handlers: Map<string, unknown> }).handlers;

    for (const p of expectedPaths) {
      expect(handlers.has(p)).toBe(true);
    }
  });
});
