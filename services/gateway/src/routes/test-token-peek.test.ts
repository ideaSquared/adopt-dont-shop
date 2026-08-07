import { createHash } from 'node:crypto';

import Fastify, { type FastifyInstance } from 'fastify';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const sha256Hex = (value: string): string => createHash('sha256').update(value).digest('hex');

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

  it('mints + returns a fresh token for whichever flow is outstanding, storing its hash', async () => {
    queryMock.mockResolvedValueOnce({
      rows: [
        {
          minted_verification: true,
          verification_token_expires_at: new Date('2026-06-19T00:00:00Z'),
          minted_reset: true,
          reset_token_expiration: new Date('2026-06-18T01:00:00Z'),
        },
      ],
    });

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/test/auth-token?email=user@example.com',
    });

    expect(res.statusCode).toBe(200);
    const body = res.json() as {
      verificationToken: string;
      verificationTokenExpiresAt: string;
      resetToken: string;
      resetTokenExpiration: string;
    };
    // The raw token is freshly minted (random), but its expiry passes through.
    expect(typeof body.verificationToken).toBe('string');
    expect(body.verificationToken.length).toBeGreaterThan(0);
    expect(body.verificationTokenExpiresAt).toBe('2026-06-19T00:00:00.000Z');
    expect(typeof body.resetToken).toBe('string');
    expect(body.resetToken.length).toBeGreaterThan(0);
    expect(body.resetTokenExpiration).toBe('2026-06-18T01:00:00.000Z');

    // Re-arms auth.users, filtered by email + not-deleted, and stores the
    // sha256 of the raw token it returned (so verify/reset validate later).
    const [sql, params] = queryMock.mock.calls[0] as [string, unknown[]];
    expect(sql).toMatch(/UPDATE auth\.users/);
    expect(sql).toMatch(/deleted_at IS NULL/);
    expect(sql).toMatch(/RETURNING/);
    expect(params[0]).toBe('user@example.com');
    expect(params[1]).toBe(sha256Hex(body.verificationToken));
    expect(params[3]).toBe(sha256Hex(body.resetToken));
  });

  it('returns null for a flow whose hash is not outstanding', async () => {
    queryMock.mockResolvedValueOnce({
      rows: [
        {
          minted_verification: null,
          verification_token_expires_at: null,
          minted_reset: null,
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
