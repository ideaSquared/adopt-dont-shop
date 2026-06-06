import type { NatsConnection } from 'nats';
import type { Pool } from 'pg';
import { describe, expect, it } from 'vitest';

import { ApplicationsV1 } from '@adopt-dont-shop/proto';

import type { ApplicationsConfig } from '../config.js';

import { createGrpcServer } from './server.js';

const quietLogger = {
  info: () => undefined,
  error: () => undefined,
  warn: () => undefined,
  debug: () => undefined,
  silly: () => undefined,
} as unknown as ReturnType<typeof import('@adopt-dont-shop/observability').createLogger>;

const config: ApplicationsConfig = {
  port: 5005,
  grpcPort: 6005,
  host: '127.0.0.1',
  environment: 'test',
  databaseUrl: 'postgres://test',
  schema: 'applications',
  natsUrl: 'nats://localhost:4222',
};

const pool = {} as unknown as Pool;
const nats = {} as unknown as NatsConnection;

describe('createGrpcServer', () => {
  it('registers all 12 ApplicationService methods on the grpc.Server', () => {
    const server = createGrpcServer({ config, pool, nats, logger: quietLogger });
    const handlers = (server as unknown as { handlers: Map<string, unknown> }).handlers;

    const base = '/adopt_dont_shop.applications.v1.ApplicationService';
    for (const method of [
      'StartDraft',
      'SaveDraftAnswers',
      'SubmitDraft',
      'StartReview',
      'ScheduleHomeVisit',
      'CompleteHomeVisit',
      'Approve',
      'Reject',
      'Withdraw',
      'MarkAdopted',
      'Get',
      'List',
    ]) {
      expect(handlers.has(`${base}/${method}`)).toBe(true);
    }
  });

  it('matches every path from the canonical ApplicationServiceService Definition table', () => {
    const definition = ApplicationsV1.ApplicationServiceService;
    const expectedPaths = Object.values(definition).map(d => (d as { path: string }).path);

    const server = createGrpcServer({ config, pool, nats, logger: quietLogger });
    const handlers = (server as unknown as { handlers: Map<string, unknown> }).handlers;

    for (const p of expectedPaths) {
      expect(handlers.has(p)).toBe(true);
    }
  });
});
