/**
 * Behaviour tests for the Cloudflare Turnstile verification middleware (A9).
 */
import { vi, beforeEach, afterEach, describe, it, expect } from 'vitest';
import express from 'express';
import request from 'supertest';

vi.mock('../../utils/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

import { verifyTurnstileToken } from '../../middleware/turnstile';

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.post('/register', verifyTurnstileToken, (_req, res) => {
    res.status(204).end();
  });
  return app;
};

describe('verifyTurnstileToken', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    process.env.NODE_ENV = 'test';
    delete process.env.TURNSTILE_SECRET_KEY;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('bypasses when the secret is unset outside production', async () => {
    const res = await request(buildApp()).post('/register').send({});
    expect(res.status).toBe(204);
  });

  it('refuses every request when the secret is unset in production', async () => {
    process.env.NODE_ENV = 'production';
    const res = await request(buildApp()).post('/register').send({});
    expect(res.status).toBe(503);
  });

  it('rejects requests with no turnstileToken when secret is configured', async () => {
    process.env.TURNSTILE_SECRET_KEY = 'fake-secret';
    const res = await request(buildApp()).post('/register').send({});
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'Invalid CAPTCHA token' });
  });

  it('rejects when Cloudflare reports failure', async () => {
    process.env.TURNSTILE_SECRET_KEY = 'fake-secret';
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: false, 'error-codes': ['invalid-input-response'] }),
    }) as unknown as typeof fetch;

    const res = await request(buildApp()).post('/register').send({ turnstileToken: 'bad' });
    expect(res.status).toBe(400);
  });

  it('passes through when Cloudflare reports success', async () => {
    process.env.TURNSTILE_SECRET_KEY = 'fake-secret';
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    }) as unknown as typeof fetch;

    const res = await request(buildApp()).post('/register').send({ turnstileToken: 'good' });
    expect(res.status).toBe(204);
  });

  it('rejects when the siteverify call itself fails', async () => {
    process.env.TURNSTILE_SECRET_KEY = 'fake-secret';
    globalThis.fetch = vi
      .fn()
      .mockRejectedValue(new Error('network down')) as unknown as typeof fetch;

    const res = await request(buildApp()).post('/register').send({ turnstileToken: 'good' });
    expect(res.status).toBe(400);
  });
});
