/**
 * Regression test for ADS-531 Express 5 upgrade (per
 * docs/upgrades/express-5-migration.md §3.2). Express 5 changed how
 * body-parser surfaces JSON-parse errors — they now propagate through
 * the standard async-catch path instead of being collapsed at the
 * parser. We assert the public contract: a malformed JSON body returns
 * 400 with a structured error envelope, never 500 or a leaked stack.
 */
import { vi } from 'vitest';

vi.mock('../../utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
  loggerHelpers: { logSecurity: vi.fn() },
}));

import express from 'express';
import request from 'supertest';
import { errorHandler } from '../../middleware/error-handler';

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.post('/echo', (req, res) => {
    res.json(req.body);
  });
  app.use(errorHandler);
  return app;
};

describe('Express JSON body parser — malformed body', () => {
  it('returns 400, not 500, when the request body is unparseable JSON', async () => {
    const res = await request(buildApp())
      .post('/echo')
      .set('Content-Type', 'application/json')
      .send('{ this is not valid json');

    expect(res.status).toBe(400);
  });

  it('emits the central error-handler envelope shape, not a leaked stack', async () => {
    const res = await request(buildApp())
      .post('/echo')
      .set('Content-Type', 'application/json')
      .send('{');

    expect(res.body).toMatchObject({ status: 'error' });
    expect(res.body).not.toHaveProperty('stack');
  });

  it('still parses well-formed JSON bodies (sanity check)', async () => {
    const res = await request(buildApp())
      .post('/echo')
      .set('Content-Type', 'application/json')
      .send({ hello: 'world' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ hello: 'world' });
  });
});
