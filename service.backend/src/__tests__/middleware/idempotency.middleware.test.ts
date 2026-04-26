import { describe, expect, it, beforeEach, vi } from 'vitest';
import { NextFunction, Response } from 'express';
import sequelize from '../../sequelize';
import '../../models/index';
import IdempotencyKey from '../../models/IdempotencyKey';
import { idempotency, IDEMPOTENCY_RETENTION_MS } from '../../middleware/idempotency';
import { hashToken } from '../../utils/secrets';
import { AuthenticatedRequest } from '../../types/auth';

type MockRes = Partial<Response> & {
  status: ReturnType<typeof vi.fn>;
  json: ReturnType<typeof vi.fn>;
  statusCode: number;
};

const buildReq = (key: string | undefined, userId?: string): AuthenticatedRequest =>
  ({
    method: 'POST',
    baseUrl: '/api/v1/applications',
    path: '/',
    header: vi.fn((name: string) => (name === 'Idempotency-Key' ? key : undefined)),
    user: userId ? ({ userId } as AuthenticatedRequest['user']) : undefined,
  }) as unknown as AuthenticatedRequest;

const buildRes = (): MockRes => {
  const res: MockRes = {
    statusCode: 200,
    status: vi.fn().mockImplementation(function (this: MockRes, code: number) {
      this.statusCode = code;
      return this;
    }),
    json: vi.fn().mockReturnThis(),
  };
  return res;
};

describe('idempotency middleware', () => {
  beforeEach(async () => {
    await sequelize.sync({ force: true });
  });

  it('passes through when no Idempotency-Key header is set', async () => {
    const req = buildReq(undefined);
    const res = buildRes();
    const next: NextFunction = vi.fn();

    await idempotency(req, res as unknown as Response, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(await IdempotencyKey.count()).toBe(0);
  });

  it('caches a successful response keyed by sha256(client-key) + endpoint', async () => {
    const req = buildReq('client-key-1');
    const res = buildRes();
    const next: NextFunction = vi.fn();

    await idempotency(req, res as unknown as Response, next);

    expect(next).toHaveBeenCalledTimes(1);
    res.status(201);
    res.json({ applicationId: 'app-1' });

    // Wait for the fire-and-forget create() to settle.
    await new Promise(resolve => setImmediate(resolve));

    const stored = await IdempotencyKey.findByPk(hashToken('client-key-1'));
    expect(stored).not.toBeNull();
    expect(stored?.endpoint).toBe('POST /api/v1/applications/');
    expect(stored?.response_status).toBe(201);
    expect(stored?.response_body).toEqual({ applicationId: 'app-1' });
    expect(stored?.expires_at.getTime()).toBeGreaterThan(Date.now());
  });

  it('replays a cached response on retry without invoking next()', async () => {
    await IdempotencyKey.create({
      key_hash: hashToken('replay-key'),
      endpoint: 'POST /api/v1/applications/',
      user_id: null,
      response_status: 201,
      response_body: { applicationId: 'cached-app' },
      expires_at: new Date(Date.now() + IDEMPOTENCY_RETENTION_MS),
    });

    const req = buildReq('replay-key');
    const res = buildRes();
    const next: NextFunction = vi.fn();

    await idempotency(req, res as unknown as Response, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ applicationId: 'cached-app' });
  });

  it('does not cache 4xx/5xx responses', async () => {
    const req = buildReq('error-key');
    const res = buildRes();
    const next: NextFunction = vi.fn();

    await idempotency(req, res as unknown as Response, next);
    res.status(400);
    res.json({ error: 'bad input' });

    await new Promise(resolve => setImmediate(resolve));

    expect(await IdempotencyKey.count()).toBe(0);
  });

  it('treats expired entries as cache misses', async () => {
    await IdempotencyKey.create({
      key_hash: hashToken('expired-key'),
      endpoint: 'POST /api/v1/applications/',
      user_id: null,
      response_status: 201,
      response_body: { applicationId: 'old' },
      expires_at: new Date(Date.now() - 1_000),
    });

    const req = buildReq('expired-key');
    const res = buildRes();
    const next: NextFunction = vi.fn();

    await idempotency(req, res as unknown as Response, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
    expect(await IdempotencyKey.count()).toBe(0);
  });

  it('scopes cache by endpoint — same key against different paths is a different entry', async () => {
    await IdempotencyKey.create({
      key_hash: hashToken('shared-key'),
      endpoint: 'POST /api/v1/messages/',
      user_id: null,
      response_status: 201,
      response_body: { messageId: 'msg-1' },
      expires_at: new Date(Date.now() + IDEMPOTENCY_RETENTION_MS),
    });

    const req = buildReq('shared-key');
    const res = buildRes();
    const next: NextFunction = vi.fn();

    await idempotency(req, res as unknown as Response, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });
});
