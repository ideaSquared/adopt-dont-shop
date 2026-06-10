import type { NatsConnection } from 'nats';
import Fastify, { type FastifyInstance } from 'fastify';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { status as grpcStatus } from '@grpc/grpc-js';

import { GDPR_ERASURE_REQUESTED } from '@adopt-dont-shop/events';

import type { AuditClient } from '../grpc-clients/audit-client.js';

import { registerGdprRoutes } from './gdpr.js';

function fakeNats() {
  const published: Array<{ subject: string; data: string }> = [];
  // The route publishes the request through JetStream now. The fake decodes
  // the Uint8Array back to a string so the existing payload assertions hold,
  // and returns a PubAck so the awaited publish resolves.
  const jsPublish = vi.fn(async (subject: string, data: Uint8Array) => {
    published.push({ subject, data: new TextDecoder().decode(data) });
    return { stream: 'DOMAIN_EVENTS', seq: published.length, duplicate: false };
  });
  const nats = {
    jetstream: () => ({ publish: jsPublish }),
  } as unknown as NatsConnection;
  return { nats, published };
}

function fakeAuditClient(): { client: AuditClient; getGdpr: ReturnType<typeof vi.fn> } {
  const getGdpr = vi.fn();
  const client = { getGdprErasureRequest: getGdpr } as unknown as AuditClient;
  return { client, getGdpr };
}

describe('POST /api/v1/users/me/erasure-request', () => {
  let app: FastifyInstance;
  let published: Array<{ subject: string; data: string }>;

  beforeEach(async () => {
    app = Fastify({ logger: false });
    const { nats, published: p } = fakeNats();
    published = p;
    await registerGdprRoutes(app, { nats });
  });

  afterEach(async () => {
    await app.close();
  });

  it('publishes gdpr.erasureRequested and returns 202 + correlationId', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/users/me/erasure-request',
      headers: { 'x-user-id': 'usr-1' },
      payload: { reason: 'closing account' },
    });
    expect(res.statusCode).toBe(202);
    const body = res.json() as { success: boolean; correlationId: string };
    expect(body.success).toBe(true);
    expect(body.correlationId).toMatch(/^[0-9a-f-]{36}$/);

    expect(published).toHaveLength(1);
    expect(published[0].subject).toBe(GDPR_ERASURE_REQUESTED);
    const envelope = JSON.parse(published[0].data) as {
      payload: { userId: string; reason: string; correlationId: string };
    };
    expect(envelope.payload.userId).toBe('usr-1');
    expect(envelope.payload.reason).toBe('closing account');
    expect(envelope.payload.correlationId).toBe(body.correlationId);
  });

  it('refuses without an x-user-id header', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/users/me/erasure-request',
      payload: {},
    });
    expect(res.statusCode).toBe(401);
    expect(published).toHaveLength(0);
  });

  it('does not require a reason', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/users/me/erasure-request',
      headers: { 'x-user-id': 'usr-1' },
      payload: {},
    });
    expect(res.statusCode).toBe(202);
    const envelope = JSON.parse(published[0].data) as {
      payload: { reason?: string };
    };
    expect(envelope.payload.reason).toBeUndefined();
  });
});

describe('GET /api/v1/users/me/erasure-request/:correlationId', () => {
  let app: FastifyInstance;
  let getGdpr: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    app = Fastify({ logger: false });
    const { nats } = fakeNats();
    const { client, getGdpr: g } = fakeAuditClient();
    getGdpr = g;
    await registerGdprRoutes(app, { nats, auditClient: client });
  });

  afterEach(async () => {
    await app.close();
  });

  it('returns the saga row + parses completionsJson into a real object', async () => {
    getGdpr.mockResolvedValue({
      request: {
        correlationId: 'corr-1',
        userId: 'usr-1',
        reason: 'leaving',
        requestedAt: '2026-06-09T12:00:00Z',
        completionsJson: '{"auth":{"recordsErased":7,"completedAt":"2026-06-09T12:01:00Z"}}',
        completedAt: undefined,
        createdAt: '2026-06-09T12:00:00Z',
        updatedAt: '2026-06-09T12:01:00Z',
      },
    });
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/users/me/erasure-request/corr-1',
      headers: { 'x-user-id': 'usr-1' },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as {
      data: { completions: Record<string, unknown>; correlationId: string };
    };
    expect(body.data.correlationId).toBe('corr-1');
    expect(body.data.completions).toEqual({
      auth: { recordsErased: 7, completedAt: '2026-06-09T12:01:00Z' },
    });
  });

  it('maps gRPC NOT_FOUND → 404', async () => {
    getGdpr.mockRejectedValue({ code: grpcStatus.NOT_FOUND, details: 'no row' });
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/users/me/erasure-request/corr-x',
      headers: { 'x-user-id': 'usr-1' },
    });
    expect(res.statusCode).toBe(404);
  });

  it('maps gRPC PERMISSION_DENIED → 403', async () => {
    getGdpr.mockRejectedValue({ code: grpcStatus.PERMISSION_DENIED, details: 'no' });
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/users/me/erasure-request/corr-1',
      headers: { 'x-user-id': 'usr-2' },
    });
    expect(res.statusCode).toBe(403);
  });
});
