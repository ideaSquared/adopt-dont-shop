/**
 * ADS-397: HMAC signature verification for inbound provider webhooks.
 *
 * Each provider signs its webhook differently — this module supports the
 * three we plausibly target (SendGrid, AWS SES via SNS, Postmark) plus a
 * generic HMAC mode for tests/internal staging. The active mode is selected
 * by `EMAIL_WEBHOOK_PROVIDER`. If no signing secret is configured the
 * middleware fails closed in production and logs/passes-through in
 * development so dev tooling (Ethereal) keeps working.
 *
 * Implementation notes:
 * - We require the raw request body to verify HMAC. This middleware MUST be
 *   mounted with `express.raw({ type: '*\/*' })` (or `application/json`) so
 *   `req.body` arrives as a Buffer; we then JSON.parse it ourselves and
 *   re-attach the parsed value before downstream validators run.
 * - Replay protection: we accept a +/- 5 minute timestamp tolerance. Older
 *   payloads are rejected even if the signature checks out.
 */
import crypto from 'crypto';
import { NextFunction, Request, Response } from 'express';
import { logger } from '../utils/logger';

const FIVE_MINUTES_MS = 5 * 60 * 1000;

export type WebhookProvider = 'sendgrid' | 'ses' | 'postmark' | 'generic' | 'none';

const getProvider = (): WebhookProvider => {
  const raw = (process.env.EMAIL_WEBHOOK_PROVIDER || '').trim().toLowerCase();
  if (raw === 'sendgrid' || raw === 'ses' || raw === 'postmark' || raw === 'generic') {
    return raw;
  }
  return 'none';
};

const timingSafeEqualHex = (expected: string, provided: string): boolean => {
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(provided, 'utf8');
  if (a.length !== b.length) {
    return false;
  }
  return crypto.timingSafeEqual(a, b);
};

const reject = (res: Response, reason: string, status = 401): void => {
  logger.warn('Webhook signature verification rejected request', { reason });
  res.status(status).json({ error: 'Webhook verification failed' });
};

const parseBody = (raw: Buffer | string | undefined): unknown => {
  if (!raw) {
    return {};
  }
  const text = Buffer.isBuffer(raw) ? raw.toString('utf8') : raw;
  if (text.length === 0) {
    return {};
  }
  return JSON.parse(text) as unknown;
};

/**
 * SendGrid Event Webhook signature: ECDSA over `timestamp + payload`.
 * Header: `X-Twilio-Email-Event-Webhook-Signature` (base64),
 * Timestamp: `X-Twilio-Email-Event-Webhook-Timestamp`.
 *
 * Public key is provided by SendGrid (PEM, base64-DER). Verifying ECDSA
 * needs `crypto.createVerify`.
 */
const verifySendGrid = (req: Request, raw: Buffer): boolean => {
  const publicKey = process.env.SENDGRID_WEBHOOK_PUBLIC_KEY;
  if (!publicKey) {
    return false;
  }
  const signature = req.header('x-twilio-email-event-webhook-signature');
  const timestamp = req.header('x-twilio-email-event-webhook-timestamp');
  if (!signature || !timestamp) {
    return false;
  }
  const ts = Number.parseInt(timestamp, 10);
  if (!Number.isFinite(ts) || Math.abs(Date.now() - ts * 1000) > FIVE_MINUTES_MS) {
    return false;
  }
  try {
    const verifier = crypto.createVerify('sha256');
    verifier.update(timestamp + raw.toString('utf8'));
    verifier.end();
    return verifier.verify(publicKey, signature, 'base64');
  } catch (err) {
    logger.warn('SendGrid webhook verify error', {
      error: err instanceof Error ? err.message : String(err),
    });
    return false;
  }
};

/**
 * Postmark webhook auth: HMAC-SHA256 over the raw body, hex-encoded,
 * with the secret being the Postmark "Webhook Secret".
 */
const verifyPostmark = (req: Request, raw: Buffer): boolean => {
  const secret = process.env.POSTMARK_WEBHOOK_SECRET;
  if (!secret) {
    return false;
  }
  const provided = req.header('x-postmark-signature');
  if (!provided) {
    return false;
  }
  const expected = crypto.createHmac('sha256', secret).update(raw).digest('hex');
  return timingSafeEqualHex(expected, provided);
};

/**
 * AWS SES via SNS: SNS posts a JSON envelope with `Type`, `MessageId`,
 * `Timestamp`, `Signature`, `SigningCertURL`. Verifying SNS signatures
 * needs the X.509 cert from `SigningCertURL` — that's a separate library.
 *
 * For now we require `SES_WEBHOOK_SHARED_SECRET` in a custom header so
 * deployment can put SNS behind an API-gateway-injected shared secret.
 * Replace with full SNS verification when we actually adopt SES.
 */
const verifySes = (req: Request, _raw: Buffer): boolean => {
  const secret = process.env.SES_WEBHOOK_SHARED_SECRET;
  if (!secret) {
    return false;
  }
  const provided = req.header('x-ses-shared-secret');
  if (!provided) {
    return false;
  }
  return timingSafeEqualHex(secret, provided);
};

/**
 * Generic mode: HMAC-SHA256 over `timestamp.rawBody`, hex.
 * Header: `x-webhook-signature: t=<unix-ms>,v1=<hex>`.
 */
const verifyGeneric = (req: Request, raw: Buffer): boolean => {
  const secret = process.env.EMAIL_WEBHOOK_SECRET;
  if (!secret) {
    return false;
  }
  const header = req.header('x-webhook-signature');
  if (!header) {
    return false;
  }
  const parts = header.split(',').reduce<Record<string, string>>(
    (acc, part) => {
      const [k, v] = part.split('=');
      if (!k || !v) {
        return acc;
      }
      const key = k.trim();
      // CodeQL js/prototype-polluting-assignment: refuse keys that touch the
      // Object prototype chain. We only ever consume `t` and `v1` further down;
      // anything outside a strict allowlist would be ignored anyway.
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
        return acc;
      }
      acc[key] = v.trim();
      return acc;
    },
    Object.create(null) as Record<string, string>
  );
  const timestamp = parts.t;
  const signature = parts.v1;
  if (!timestamp || !signature) {
    return false;
  }
  const ts = Number.parseInt(timestamp, 10);
  if (!Number.isFinite(ts) || Math.abs(Date.now() - ts) > FIVE_MINUTES_MS) {
    return false;
  }
  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${timestamp}.${raw.toString('utf8')}`)
    .digest('hex');
  return timingSafeEqualHex(expected, signature);
};

/**
 * Express middleware. Mount with `express.raw({ type: '*\/*' })` upstream so
 * `req.body` is a Buffer at this point.
 */
export const verifyEmailDeliveryWebhook = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const provider = getProvider();
  const raw = req.body as Buffer | undefined;
  const rawBuffer = Buffer.isBuffer(raw) ? raw : Buffer.from('');

  if (provider === 'none') {
    // Fail closed in production. In development/test, log and continue
    // so local provider stubs (Ethereal, console) can post webhooks freely.
    if (process.env.NODE_ENV === 'production') {
      reject(res, 'EMAIL_WEBHOOK_PROVIDER not configured');
      return;
    }
    logger.warn(
      'EMAIL_WEBHOOK_PROVIDER not configured — webhook signature check skipped (non-prod only)'
    );
    try {
      req.body = parseBody(rawBuffer);
    } catch (err) {
      reject(res, `invalid json body: ${err instanceof Error ? err.message : String(err)}`, 400);
      return;
    }
    next();
    return;
  }

  let valid = false;
  switch (provider) {
    case 'sendgrid':
      valid = verifySendGrid(req, rawBuffer);
      break;
    case 'postmark':
      valid = verifyPostmark(req, rawBuffer);
      break;
    case 'ses':
      valid = verifySes(req, rawBuffer);
      break;
    case 'generic':
      valid = verifyGeneric(req, rawBuffer);
      break;
  }

  if (!valid) {
    reject(res, `${provider} signature mismatch`);
    return;
  }

  try {
    req.body = parseBody(rawBuffer);
  } catch (err) {
    reject(res, `invalid json body: ${err instanceof Error ? err.message : String(err)}`, 400);
    return;
  }

  next();
};
