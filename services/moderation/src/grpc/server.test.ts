import type { NatsConnection } from 'nats';
import type { Pool } from 'pg';
import { describe, expect, it } from 'vitest';

import { ModerationV1 } from '@adopt-dont-shop/proto';

import type { ModerationConfig } from '../config.js';

import { createGrpcServer } from './server.js';

const quietLogger = {
  info: () => undefined,
  error: () => undefined,
  warn: () => undefined,
  debug: () => undefined,
  silly: () => undefined,
} as unknown as ReturnType<typeof import('@adopt-dont-shop/observability').createLogger>;

const config: ModerationConfig = {
  port: 5007,
  grpcPort: 6007,
  host: '127.0.0.1',
  environment: 'test',
  databaseUrl: 'postgres://test',
  schema: 'moderation',
  natsUrl: 'nats://localhost:4222',
};

const pool = {} as unknown as Pool;
const nats = {} as unknown as NatsConnection;

describe('createGrpcServer', () => {
  it('registers all 16 ModerationService methods on the grpc.Server', () => {
    const server = createGrpcServer({ config, pool, nats, logger: quietLogger });
    const handlers = (server as unknown as { handlers: Map<string, unknown> }).handlers;

    const base = '/adopt_dont_shop.moderation.v1.ModerationService';
    for (const method of [
      'FileReport',
      'GetReport',
      'ListReports',
      'AssignReport',
      'ResolveReport',
      'LogModeratorAction',
      'ListModeratorActions',
      'AddEvidence',
      'IssueSanction',
      'ListUserSanctions',
      'AppealSanction',
      'OpenSupportTicket',
      'GetSupportTicket',
      'ListSupportTickets',
      'RespondToTicket',
      'AssignSupportTicket',
    ]) {
      expect(handlers.has(`${base}/${method}`)).toBe(true);
    }
  });

  it('matches every path from the canonical ModerationServiceService Definition table', () => {
    const definition = ModerationV1.ModerationServiceService;
    const expectedPaths = Object.values(definition).map(d => (d as { path: string }).path);

    const server = createGrpcServer({ config, pool, nats, logger: quietLogger });
    const handlers = (server as unknown as { handlers: Map<string, unknown> }).handlers;

    for (const p of expectedPaths) {
      expect(handlers.has(p)).toBe(true);
    }
  });
});
