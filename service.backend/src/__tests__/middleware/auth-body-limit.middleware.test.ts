/**
 * Behaviour test for the per-route body-parser size limit on
 * /api/v1/auth/*. Auth endpoints accept only a few hundred bytes of
 * JSON; the global 1 MB limit was a DoS amplifier. Asserting via the
 * same wiring used in src/index.ts: a tight parser mounted on
 * /api/v1/auth BEFORE the global parser so an oversized auth body is
 * rejected with 413 without ever burning a 1 MB JSON parse.
 */
import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';

const buildApp = () => {
  const app = express();
  // Mirror the production middleware order: tight parser for /auth*
  // first, then the broader 1 MB global parser.
  app.use('/api/v1/auth', express.json({ limit: '32kb' }));
  app.use(express.json({ limit: '1mb' }));

  app.post('/api/v1/auth/login', (_req, res) => {
    res.status(200).json({ ok: true });
  });

  app.post('/api/v1/other', (_req, res) => {
    res.status(200).json({ ok: true });
  });

  // Centralised error handler so the 413 from body-parser surfaces as
  // a clean status code rather than a default-error HTML response.
  app.use(
    (
      err: Error & { status?: number },
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction
    ) => {
      if (err.status) {
        res.status(err.status).json({ error: err.message });
        return;
      }
      res.status(500).json({ error: 'internal' });
    }
  );

  return app;
};

describe('Auth route body size limit', () => {
  it('rejects a 33 KB body to /api/v1/auth/login with 413', async () => {
    const oversized = { padding: 'a'.repeat(33 * 1024) };
    const res = await request(buildApp()).post('/api/v1/auth/login').send(oversized);

    expect(res.status).toBe(413);
  });

  it('accepts a small body to /api/v1/auth/login', async () => {
    const res = await request(buildApp())
      .post('/api/v1/auth/login')
      .send({ email: 'u@example.com', password: 'pw' });

    expect(res.status).toBe(200);
  });

  it('still accepts larger bodies on non-auth routes (global 1 MB limit)', async () => {
    const moderate = { padding: 'a'.repeat(100 * 1024) };
    const res = await request(buildApp()).post('/api/v1/other').send(moderate);

    expect(res.status).toBe(200);
  });
});
