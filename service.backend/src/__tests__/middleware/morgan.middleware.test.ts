import { describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import { httpAccessLog } from '../../middleware/morgan';
import { loggerHelpers } from '../../utils/logger';

describe('httpAccessLog (ADS-448 / ADS-462)', () => {
  it('emits a structured access-log line via loggerHelpers.logRequest', async () => {
    const spy = vi.spyOn(loggerHelpers, 'logRequest');

    const app = express();
    app.use(httpAccessLog);
    app.get('/r', (_req, res) => res.json({ ok: true }));

    await request(app).get('/r');

    expect(spy).toHaveBeenCalledTimes(1);
    const [req, res, duration] = spy.mock.calls[0];
    expect(req.method).toBe('GET');
    expect(res.statusCode).toBe(200);
    expect(typeof duration).toBe('number');
  });
});
