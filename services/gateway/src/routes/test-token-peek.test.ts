import Fastify, { type FastifyInstance } from 'fastify';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the pg Pool so the seam's SQL is exercised against a fake DB. We assert
// on the query text + params (the behaviour that matters: which row it reads
// and how it's filtered) and on the HTTP response shaping.
const queryMock = vi.fn();
const endMock = vi.fn().mockResolvedValue(undefined);
vi.mock('pg', () => ({
  Pool: class {
    query = queryMock;
    end = endMock;
  },
}));

import { registerTestTokenPeekRoutes } from './test-token-peek.js';

async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });
  await registerTestTokenPeekRoutes(app, { databaseUrl: 'postgresql://u:p@db:5432/x' });
  return app;
}

describe('GET /api/v1/test/auth-token', () => {
  let app: FastifyInstance;
  beforeEach(async () => {
    queryMock.mockReset();
    endMock.mockClear();
    app = await buildApp();
  });
  afterEach(async () => {
    await app.close();
  });

  it('returns the verification + reset tokens for a known email', async () => {
    queryMock.mockResolvedValueOnce({
      rows: [
        {
          verification_token: 'verify-abc',
          verification_token_expires_at: new Date('2026-06-19T00:00:00Z'),
          reset_token: 'reset-xyz',
          reset_token_expiration: new Date('2026-06-18T01:00:00Z'),
        },
      ],
    });

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/test/auth-token?email=user@example.com',
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({
      verificationToken: 'verify-abc',
      verificationTokenExpiresAt: '2026-06-19T00:00:00.000Z',
      resetToken: 'reset-xyz',
      resetTokenExpiration: '2026-06-18T01:00:00.000Z',
    });
    // Reads auth.users filtered by email + not-deleted.
    const [sql, params] = queryMock.mock.calls[0] as [string, unknown[]];
    expect(sql).toMatch(/FROM auth\.users/);
    expect(sql).toMatch(/deleted_at IS NULL/);
    expect(params).toEqual(['user@example.com']);
  });

  it('returns null tokens when none are outstanding', async () => {
    queryMock.mockResolvedValueOnce({
      rows: [
        {
          verification_token: null,
          verification_token_expires_at: null,
          reset_token: null,
          reset_token_expiration: null,
        },
      ],
    });

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/test/auth-token?email=user@example.com',
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({
      verificationToken: null,
      verificationTokenExpiresAt: null,
      resetToken: null,
      resetTokenExpiration: null,
    });
  });

  it('404s when the user does not exist', async () => {
    queryMock.mockResolvedValueOnce({ rows: [] });
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/test/auth-token?email=nobody@example.com',
    });
    expect(res.statusCode).toBe(404);
  });

  it('400s when no email is given', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/test/auth-token' });
    expect(res.statusCode).toBe(400);
    expect(queryMock).not.toHaveBeenCalled();
  });
});

describe('GET /api/v1/test/invitation-token', () => {
  let app: FastifyInstance;
  beforeEach(async () => {
    queryMock.mockReset();
    endMock.mockClear();
    app = await buildApp();
  });
  afterEach(async () => {
    await app.close();
  });

  it('returns the latest pending invitation token for an email', async () => {
    queryMock.mockResolvedValueOnce({ rows: [{ token: 'invite-123' }] });

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/test/invitation-token?email=invitee@example.com',
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ token: 'invite-123' });
    // Reads rescue.invitations, only unused + unexpired rows, newest first.
    const [sql, params] = queryMock.mock.calls[0] as [string, unknown[]];
    expect(sql).toMatch(/FROM rescue\.invitations/);
    expect(sql).toMatch(/used = false/);
    expect(sql).toMatch(/expiration > now\(\)/);
    expect(sql).toMatch(/ORDER BY created_at DESC/);
    expect(params).toEqual(['invitee@example.com', null]);
  });

  it('scopes by rescueId when supplied', async () => {
    queryMock.mockResolvedValueOnce({ rows: [{ token: 'invite-456' }] });

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/test/invitation-token?email=invitee@example.com&rescueId=11111111-1111-4111-8111-111111111111',
    });

    expect(res.statusCode).toBe(200);
    const [, params] = queryMock.mock.calls[0] as [string, unknown[]];
    expect(params).toEqual(['invitee@example.com', '11111111-1111-4111-8111-111111111111']);
  });

  it('404s when there is no pending invitation', async () => {
    queryMock.mockResolvedValueOnce({ rows: [] });
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/test/invitation-token?email=invitee@example.com',
    });
    expect(res.statusCode).toBe(404);
  });

  it('400s when no email is given', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/test/invitation-token' });
    expect(res.statusCode).toBe(400);
    expect(queryMock).not.toHaveBeenCalled();
  });

  it('closes the pool when the app shuts down', async () => {
    await app.close();
    expect(endMock).toHaveBeenCalled();
  });
});
