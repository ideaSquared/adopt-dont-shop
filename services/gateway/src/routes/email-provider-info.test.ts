import Fastify, { type FastifyInstance } from 'fastify';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { registerEmailProviderInfoRoute } from './email-provider-info.js';

describe('GET /api/v1/email/provider-info — dev email provider descriptor', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = Fastify({ logger: false });
    await registerEmailProviderInfoRoute(app);
  });

  afterEach(async () => {
    await app.close();
    vi.unstubAllEnvs();
  });

  it('defaults to ethereal with public login/messages URLs', async () => {
    vi.stubEnv('EMAIL_PROVIDER', '');
    const res = await app.inject({ method: 'GET', url: '/api/v1/email/provider-info' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({
      provider: 'ethereal.email',
      loginUrl: 'https://ethereal.email/login',
      messagesUrl: 'https://ethereal.email/messages',
    });
  });

  it('reports a non-ethereal provider name without preview URLs', async () => {
    vi.stubEnv('EMAIL_PROVIDER', 'resend');
    const res = await app.inject({ method: 'GET', url: '/api/v1/email/provider-info' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ provider: 'resend' });
  });

  it('is a public route (no Authorization required)', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/email/provider-info' });
    expect(res.statusCode).toBe(200);
  });
});
