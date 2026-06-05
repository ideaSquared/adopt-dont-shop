import { type FastifyInstance } from 'fastify';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { PetsConfig } from './config.js';
import { createServer } from './server.js';

const quietLogger = {
  info: () => undefined,
  error: () => undefined,
  warn: () => undefined,
  debug: () => undefined,
  silly: () => undefined,
} as unknown as ReturnType<typeof import('@adopt-dont-shop/observability').createLogger>;

const baseConfig: PetsConfig = {
  port: 0,
  grpcPort: 0,
  host: '127.0.0.1',
  environment: 'test',
  databaseUrl: 'postgres://test',
  schema: 'pets',
  natsUrl: 'nats://localhost:4222',
};

describe('createServer — health endpoint', () => {
  let server: FastifyInstance;

  beforeEach(() => {
    server = createServer({ config: baseConfig, logger: quietLogger });
  });

  afterEach(async () => {
    await server.close();
  });

  it('responds to GET /health/simple with status ok', async () => {
    const res = await server.inject({ method: 'GET', url: '/health/simple' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({
      status: 'ok',
      service: 'service.pets',
      environment: 'test',
    });
  });

  it('surfaces the configured environment in the health payload', async () => {
    const stagingServer = createServer({
      config: { ...baseConfig, environment: 'staging' },
      logger: quietLogger,
    });
    try {
      const res = await stagingServer.inject({ method: 'GET', url: '/health/simple' });
      expect(res.json()).toMatchObject({ environment: 'staging' });
    } finally {
      await stagingServer.close();
    }
  });

  it('returns a 500 when a route handler throws (custom error handler)', async () => {
    server.get('/boom', async () => {
      throw new Error('boom');
    });
    const res = await server.inject({ method: 'GET', url: '/boom' });
    expect(res.statusCode).toBe(500);
    expect(res.json()).toEqual({ error: 'internal_error' });
  });
});
