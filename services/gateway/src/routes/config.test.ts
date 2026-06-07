import Fastify, { type FastifyInstance } from 'fastify';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { registerConfigRoutes } from './config.js';

describe('GET /api/v1/config — gateway-folded public config', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = Fastify({ logger: false });
    await registerConfigRoutes(app);
  });

  afterEach(async () => {
    await app.close();
  });

  it('returns a flat map of public-only keys', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/config' });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body) as Record<string, unknown>;
    // Must include the public defaults the monolith exposes.
    expect(body['app.name']).toBe("Adopt Don't Shop");
    expect(body['app.version']).toBe('1.0.0');
    expect(body['security.password_min_length']).toBe(8);
    expect(body['ui.theme']).toBe('light');
    // Internal-only flags MUST NOT leak.
    expect(body['features.chat.enabled']).toBeUndefined();
    expect(body['email.from_address']).toBeUndefined();
  });
});
