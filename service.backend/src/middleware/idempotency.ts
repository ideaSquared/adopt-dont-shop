import { NextFunction, Response } from 'express';
import { UniqueConstraintError } from 'sequelize';
import IdempotencyKey from '../models/IdempotencyKey';
import { AuthenticatedRequest } from '../types/auth';
import { hashToken } from '../utils/secrets';
import logger from '../utils/logger';

export const IDEMPOTENCY_RETENTION_MS = 24 * 60 * 60 * 1000;

/**
 * Idempotency-Key middleware (plan 5.5.13). On a mutating endpoint
 * (POST/PATCH/PUT/DELETE), a client can include an `Idempotency-Key`
 * header with a stable random ID; a retry of the same request returns
 * the cached response instead of triggering a second
 * insert/update/email/etc. Prevents the "double-submitted application"
 * bug after a flaky network.
 *
 * Contract:
 *   - Header is optional. Without it the middleware passes through —
 *     existing clients keep working unchanged.
 *   - Cache key is (sha256(client-key), method + path). Same client key
 *     against a different endpoint is a different cache entry.
 *   - Only successful responses (2xx) are cached. A 4xx/5xx is a
 *     transient failure the client should be free to retry without the
 *     cached error replaying.
 *   - 24h retention. A cleanup job (out of scope for this slice) will
 *     drop expired rows; meanwhile we just ignore them and overwrite.
 *   - Concurrency: two retries that race past the SELECT both run the
 *     handler, but only one INSERT wins. The losing INSERT gets a PK
 *     conflict which we swallow — the cached row is whichever response
 *     finished writing first.
 */
export const idempotency = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const rawKey = req.header('Idempotency-Key');
  if (!rawKey) {
    next();
    return;
  }

  const keyHash = hashToken(rawKey);
  const endpoint = `${req.method} ${req.baseUrl}${req.path}`;
  const userId = req.user?.userId ?? null;

  try {
    const cached = await IdempotencyKey.findOne({ where: { key_hash: keyHash, endpoint } });
    if (cached) {
      if (cached.expires_at.getTime() > Date.now()) {
        res.status(cached.response_status).json(cached.response_body);
        return;
      }
      await cached.destroy();
    }
  } catch (err) {
    // A lookup failure shouldn't block the request — the worst case is
    // the handler runs again on retry, which is the pre-idempotency
    // status quo. Log so we can see if the table is misbehaving.
    logger.error('[idempotency] cache lookup failed', { err, endpoint });
  }

  const originalJson = res.json.bind(res);
  res.json = (body: unknown): Response => {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      void IdempotencyKey.create({
        key_hash: keyHash,
        endpoint,
        user_id: userId,
        response_status: res.statusCode,
        response_body: body,
        expires_at: new Date(Date.now() + IDEMPOTENCY_RETENTION_MS),
      }).catch(err => {
        if (err instanceof UniqueConstraintError) {
          // Another retry got there first — both responses converge on
          // the same logical outcome. Drop our copy.
          return;
        }
        logger.error('[idempotency] cache write failed', { err, endpoint });
      });
    }
    return originalJson(body);
  };

  next();
};
