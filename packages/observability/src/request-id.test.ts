import Fastify from 'fastify';
import { describe, expect, it } from 'vitest';

import {
  getRequestId,
  REQUEST_ID_HEADER_NAME,
  registerRequestId,
  runWithRequestId,
} from './request-id.js';

describe('registerRequestId — inbound header', () => {
  it('uses the inbound x-request-id header verbatim and echoes it back', async () => {
    const app = Fastify();
    registerRequestId(app);
    app.get('/x', async req => ({ id: req.requestId }));
    try {
      const res = await app.inject({
        method: 'GET',
        url: '/x',
        headers: { [REQUEST_ID_HEADER_NAME]: 'caller-supplied-id' },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual({ id: 'caller-supplied-id' });
      expect(res.headers[REQUEST_ID_HEADER_NAME]).toBe('caller-supplied-id');
    } finally {
      await app.close();
    }
  });

  it('mints a UUID when the inbound header is absent and echoes it back', async () => {
    const app = Fastify();
    registerRequestId(app);
    app.get('/x', async req => ({ id: req.requestId }));
    try {
      const res = await app.inject({ method: 'GET', url: '/x' });
      expect(res.statusCode).toBe(200);
      const { id } = res.json() as { id: string };
      // randomUUID v4 shape.
      expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
      expect(res.headers[REQUEST_ID_HEADER_NAME]).toBe(id);
    } finally {
      await app.close();
    }
  });
});

describe('AsyncLocalStorage — getRequestId() inside a request', () => {
  it('returns the active request id from inside an HTTP handler', async () => {
    const app = Fastify();
    registerRequestId(app);
    app.get('/x', async () => ({ id: getRequestId() }));
    try {
      const res = await app.inject({
        method: 'GET',
        url: '/x',
        headers: { [REQUEST_ID_HEADER_NAME]: 'als-test-id' },
      });
      expect(res.json()).toEqual({ id: 'als-test-id' });
    } finally {
      await app.close();
    }
  });

  it('returns undefined outside any request context', () => {
    expect(getRequestId()).toBeUndefined();
  });
});

describe('runWithRequestId', () => {
  it('runs a function inside a synthetic request-id context', async () => {
    const observed: Array<string | undefined> = [];
    await runWithRequestId('worker-job-123', async () => {
      observed.push(getRequestId());
    });
    expect(observed).toEqual(['worker-job-123']);
    // After exiting, the id is gone.
    expect(getRequestId()).toBeUndefined();
  });
});
