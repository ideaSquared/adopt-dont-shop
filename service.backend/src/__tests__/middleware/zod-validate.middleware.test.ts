import { describe, it, expect, vi } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { validateBody, validateQuery, validateParams } from '../../middleware/zod-validate';

const buildRes = () => {
  const res: Partial<Response> = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
  return res as Response;
};

describe('zod-validate middleware', () => {
  describe('ADS-455: returns 422 for schema-validation failures', () => {
    it('responds with 422 when body fails the schema', () => {
      const middleware = validateBody(z.object({ email: z.string().email() }));
      const req = { body: { email: 'not-an-email' } } as Request;
      const res = buildRes();
      const next: NextFunction = vi.fn();

      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(422);
      expect(next).not.toHaveBeenCalled();
    });

    it('responds with 422 for invalid query', () => {
      const middleware = validateQuery(z.object({ page: z.coerce.number().int().min(1) }));
      const req = { query: { page: '0' } } as unknown as Request;
      const res = buildRes();
      const next: NextFunction = vi.fn();

      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(422);
    });

    it('responds with 422 for invalid params', () => {
      const middleware = validateParams(z.object({ id: z.string().uuid() }));
      const req = { params: { id: 'not-a-uuid' } } as unknown as Request;
      const res = buildRes();
      const next: NextFunction = vi.fn();

      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(422);
    });
  });

  describe('ADS-456: strips unknown keys before passing to handlers', () => {
    it('removes unknown keys from req.body even if a future schema forgets .strip()', () => {
      const middleware = validateBody(z.object({ name: z.string() }));
      const req = {
        body: { name: 'ok', isAdmin: true, __proto__: { malicious: true } },
      } as unknown as Request;
      const res = buildRes();
      const next: NextFunction = vi.fn();

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.body).toEqual({ name: 'ok' });
      expect((req.body as Record<string, unknown>).isAdmin).toBeUndefined();
    });
  });
});
