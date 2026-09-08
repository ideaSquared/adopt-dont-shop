import Fastify, { type FastifyInstance } from 'fastify';
import { describe, expect, it } from 'vitest';

import { MAINTENANCE_BYPASS_HEADER, registerMaintenanceMode } from './maintenance.js';

const quietLogger = {
  info: () => undefined,
  error: () => undefined,
  warn: () => undefined,
  debug: () => undefined,
  silly: () => undefined,
} as unknown as Parameters<typeof registerMaintenanceMode>[1]['logger'];

type Options = Partial<Parameters<typeof registerMaintenanceMode>[1]> & { maintenanceOn: boolean };

async function makeApp(opts: Options): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });
  registerMaintenanceMode(app, {
    filePath: '/run/maintenance',
    allowlistIps: [],
    bypassToken: undefined,
    logger: quietLogger,
    fileExists: () => opts.maintenanceOn,
    ...opts,
  });
  app.get('/api/v1/things', async () => ({ ok: true }));
  app.get('/health/simple', async () => ({ status: 'ok' }));
  return app;
}

describe('maintenance mode (ADS-1325)', () => {
  it('lets /api/* requests through when the maintenance file is absent', async () => {
    const app = await makeApp({ maintenanceOn: false });
    const res = await app.inject({ method: 'GET', url: '/api/v1/things' });
    expect(res.statusCode).toBe(200);
    await app.close();
  });

  it('rejects /api/* requests with 503 + Retry-After when the maintenance file is present', async () => {
    const app = await makeApp({ maintenanceOn: true });
    const res = await app.inject({ method: 'GET', url: '/api/v1/things' });
    expect(res.statusCode).toBe(503);
    expect(res.headers['retry-after']).toBeDefined();
    expect(res.json()).toMatchObject({ success: false, error: 'maintenance_mode' });
    await app.close();
  });

  it('never gates /health/* even when the maintenance file is present', async () => {
    const app = await makeApp({ maintenanceOn: true });
    const res = await app.inject({ method: 'GET', url: '/health/simple' });
    expect(res.statusCode).toBe(200);
    await app.close();
  });

  it('exempts an allowlisted IP from the 503', async () => {
    const app = await makeApp({ maintenanceOn: true, allowlistIps: ['203.0.113.9'] });
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/things',
      remoteAddress: '203.0.113.9',
    });
    expect(res.statusCode).toBe(200);
    await app.close();
  });

  it('does not exempt an IP outside the allowlist', async () => {
    const app = await makeApp({ maintenanceOn: true, allowlistIps: ['203.0.113.9'] });
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/things',
      remoteAddress: '198.51.100.1',
    });
    expect(res.statusCode).toBe(503);
    await app.close();
  });

  it('exempts a request carrying the correct bypass token header', async () => {
    const app = await makeApp({ maintenanceOn: true, bypassToken: 'super-secret-token' });
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/things',
      headers: { [MAINTENANCE_BYPASS_HEADER]: 'super-secret-token' },
    });
    expect(res.statusCode).toBe(200);
    await app.close();
  });

  it('rejects a request carrying the wrong bypass token', async () => {
    const app = await makeApp({ maintenanceOn: true, bypassToken: 'super-secret-token' });
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/things',
      headers: { [MAINTENANCE_BYPASS_HEADER]: 'wrong-token' },
    });
    expect(res.statusCode).toBe(503);
    await app.close();
  });

  it('does not gate non-/api/* routes at all', async () => {
    const app = Fastify({ logger: false });
    registerMaintenanceMode(app, {
      filePath: '/run/maintenance',
      allowlistIps: [],
      bypassToken: undefined,
      logger: quietLogger,
      fileExists: () => true,
    });
    app.get('/docs', async () => ({ ok: true }));
    const res = await app.inject({ method: 'GET', url: '/docs' });
    expect(res.statusCode).toBe(200);
    await app.close();
  });
});
