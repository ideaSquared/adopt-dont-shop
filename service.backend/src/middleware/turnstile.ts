/**
 * Cloudflare Turnstile CAPTCHA verification (A9).
 *
 * Validates `req.body.turnstileToken` against Cloudflare's siteverify
 * endpoint before downstream handlers run. Mounted in front of the
 * registration rate limiter so scripted spam is rejected before it
 * consumes any rate-limit budget.
 *
 * Dev/test bypass — mirrors the METRICS_AUTH_TOKEN pattern. If
 * `TURNSTILE_SECRET_KEY` is unset:
 *
 *   - In production-like envs the middleware refuses every request
 *     (fail-closed; misconfigured prod must NOT silently disable a
 *     spam control).
 *   - Outside production-like envs the middleware bypasses entirely
 *     so local dev / CI don't need to plumb a real Cloudflare token.
 */
import type { NextFunction, Request, Response } from 'express';
import { isProductionLike } from '../config/env';
import { logger } from '../utils/logger';

const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

type SiteVerifyResponse = {
  success: boolean;
  'error-codes'?: string[];
};

const verifyToken = async (token: string, secret: string, clientIp?: string): Promise<boolean> => {
  const params = new URLSearchParams({ secret, response: token });
  if (clientIp) {
    params.set('remoteip', clientIp);
  }
  try {
    const response = await fetch(SITEVERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });
    if (!response.ok) {
      logger.warn('Turnstile siteverify non-2xx response', { status: response.status });
      return false;
    }
    const data = (await response.json()) as SiteVerifyResponse;
    if (!data.success) {
      logger.warn('Turnstile token rejected by Cloudflare', {
        errorCodes: data['error-codes'],
      });
    }
    return data.success === true;
  } catch (err) {
    logger.warn('Turnstile siteverify call failed', {
      error: err instanceof Error ? err.message : String(err),
    });
    return false;
  }
};

export const verifyTurnstileToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const secret = process.env.TURNSTILE_SECRET_KEY;

  if (!secret) {
    if (isProductionLike(process.env.NODE_ENV)) {
      logger.error('TURNSTILE_SECRET_KEY missing in production — registration disabled');
      res.status(503).json({
        error: 'Registration temporarily unavailable.',
      });
      return;
    }
    // Dev/test convenience: no secret configured -> middleware no-ops.
    next();
    return;
  }

  const body = req.body as Record<string, unknown> | undefined;
  const token = typeof body?.turnstileToken === 'string' ? body.turnstileToken : '';
  if (!token) {
    res.status(400).json({ error: 'Invalid CAPTCHA token' });
    return;
  }

  const ok = await verifyToken(token, secret, req.ip);
  if (!ok) {
    res.status(400).json({ error: 'Invalid CAPTCHA token' });
    return;
  }
  next();
};
