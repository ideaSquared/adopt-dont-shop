// In-stack maintenance-mode switch (ADS-1325).
//
// docs/runbooks/maintenance-mode.md previously documented a single kill
// switch: the Statsig dynamic config `application_settings.maintenance_mode`.
// That flag is frontend-only — the SPAs read it and render a banner, but a
// determined client can still hit the API directly, and Statsig being
// unreachable leaves no fallback at all. This is the second, server-side
// layer: an onRequest hook that checks for a file on disk (MAINTENANCE_MODE_FILE,
// e.g. /run/maintenance) and, when present, rejects every /api/* request with
// 503 + Retry-After — except /health/* (so the container healthcheck and
// readiness probe keep passing) and the allowlisted operator IP / bypass
// token below. The Statsig flag is unchanged and still drives the UI banner;
// this hook is the hard backstop when Statsig itself is the thing that's
// down, or when a direct API hit needs to be blocked too.

import { existsSync } from 'node:fs';

import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { Logger } from 'winston';

import { redactUrl } from '@adopt-dont-shop/observability';

export const MAINTENANCE_BYPASS_HEADER = 'x-maintenance-bypass';

export type MaintenanceOptions = {
  // Path checked on every request. Maintenance mode is "on" iff this file
  // exists — flip it on/off with `touch` / `rm`, no restart needed.
  filePath: string;
  // Client IPs (matched against the trust-proxy-resolved req.ip) exempt
  // from the 503 — e.g. an on-call operator diagnosing the outage.
  allowlistIps: string[];
  // Shared-secret bypass via the x-maintenance-bypass header. Undefined
  // disables the token bypass entirely (no header value can match).
  bypassToken?: string;
  logger: Logger;
  // Injectable for tests — defaults to node:fs existsSync. Avoids every
  // test needing a real file on disk.
  fileExists?: (path: string) => boolean;
};

function isExempt(req: FastifyRequest, opts: MaintenanceOptions): boolean {
  if (req.url.startsWith('/health/')) {
    return true;
  }
  if (opts.allowlistIps.includes(req.ip)) {
    return true;
  }
  const bypassHeader = req.headers[MAINTENANCE_BYPASS_HEADER];
  if (opts.bypassToken && typeof bypassHeader === 'string' && bypassHeader === opts.bypassToken) {
    return true;
  }
  return false;
}

// Registers the onRequest hook. Only gates /api/* — static assets, /docs,
// /health/* etc. are unaffected, matching the "the gateway continues to
// serve /health/simple and read endpoints" line the runbook otherwise
// documents as best-effort; this hook makes the health exemption exact.
export const registerMaintenanceMode = (app: FastifyInstance, opts: MaintenanceOptions): void => {
  const fileExists = opts.fileExists ?? existsSync;

  app.addHook('onRequest', async (req, reply) => {
    if (!req.url.startsWith('/api/')) {
      return;
    }
    if (isExempt(req, opts)) {
      return;
    }
    if (!fileExists(opts.filePath)) {
      return;
    }

    opts.logger.info('maintenance mode active — rejecting request', {
      url: redactUrl(req.url),
    });
    reply.header('Retry-After', '60');
    return reply.code(503).send({
      success: false,
      error: 'maintenance_mode',
      message: 'The service is temporarily down for maintenance. Please try again shortly.',
    });
  });
};
