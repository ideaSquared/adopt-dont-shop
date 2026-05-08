import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import crypto from 'crypto';
import express from 'express';
import request from 'supertest';

vi.mock('../../utils/logger', () => ({
  logger: {
    warn: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  },
}));

import { verifyEmailDeliveryWebhook } from '../../middleware/webhook-signature';

const buildApp = () => {
  const app = express();
  app.post('/webhook', express.raw({ type: '*/*' }), verifyEmailDeliveryWebhook, (req, res) => {
    res.status(200).json({ ok: true, body: req.body });
  });
  return app;
};

const PAYLOAD = JSON.stringify({ event: 'bounced', email: 'a@b.test' });
const SECRET = 'test-secret-with-enough-bytes-aaaaaaa';

describe('verifyEmailDeliveryWebhook (ADS-397)', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('rejects an unsigned request when generic provider is configured', async () => {
    process.env.NODE_ENV = 'production';
    process.env.EMAIL_WEBHOOK_PROVIDER = 'generic';
    process.env.EMAIL_WEBHOOK_SECRET = SECRET;

    const res = await request(buildApp())
      .post('/webhook')
      .set('content-type', 'application/json')
      .send(PAYLOAD);

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: 'Webhook verification failed' });
  });

  it('rejects a request with a wrong signature', async () => {
    process.env.NODE_ENV = 'production';
    process.env.EMAIL_WEBHOOK_PROVIDER = 'generic';
    process.env.EMAIL_WEBHOOK_SECRET = SECRET;
    const ts = Date.now().toString();

    const res = await request(buildApp())
      .post('/webhook')
      .set('content-type', 'application/json')
      .set('x-webhook-signature', `t=${ts},v1=deadbeef`)
      .send(PAYLOAD);

    expect(res.status).toBe(401);
  });

  it('accepts a properly signed request and forwards parsed body', async () => {
    process.env.NODE_ENV = 'production';
    process.env.EMAIL_WEBHOOK_PROVIDER = 'generic';
    process.env.EMAIL_WEBHOOK_SECRET = SECRET;
    const ts = Date.now().toString();
    const sig = crypto.createHmac('sha256', SECRET).update(`${ts}.${PAYLOAD}`).digest('hex');

    const res = await request(buildApp())
      .post('/webhook')
      .set('content-type', 'application/json')
      .set('x-webhook-signature', `t=${ts},v1=${sig}`)
      .send(PAYLOAD);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.body).toEqual({ event: 'bounced', email: 'a@b.test' });
  });

  it('rejects replays older than the 5-minute tolerance window', async () => {
    process.env.NODE_ENV = 'production';
    process.env.EMAIL_WEBHOOK_PROVIDER = 'generic';
    process.env.EMAIL_WEBHOOK_SECRET = SECRET;
    const oldTs = (Date.now() - 10 * 60 * 1000).toString();
    const sig = crypto.createHmac('sha256', SECRET).update(`${oldTs}.${PAYLOAD}`).digest('hex');

    const res = await request(buildApp())
      .post('/webhook')
      .set('content-type', 'application/json')
      .set('x-webhook-signature', `t=${oldTs},v1=${sig}`)
      .send(PAYLOAD);

    expect(res.status).toBe(401);
  });

  it('fails closed in production when no provider configured', async () => {
    process.env.NODE_ENV = 'production';
    delete process.env.EMAIL_WEBHOOK_PROVIDER;

    const res = await request(buildApp())
      .post('/webhook')
      .set('content-type', 'application/json')
      .send(PAYLOAD);

    expect(res.status).toBe(401);
  });

  it('passes through in development when no provider configured', async () => {
    process.env.NODE_ENV = 'development';
    delete process.env.EMAIL_WEBHOOK_PROVIDER;

    const res = await request(buildApp())
      .post('/webhook')
      .set('content-type', 'application/json')
      .send(PAYLOAD);

    expect(res.status).toBe(200);
    expect(res.body.body).toEqual({ event: 'bounced', email: 'a@b.test' });
  });
});
