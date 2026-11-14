import { createHmac } from 'node:crypto';

import { type ServiceLogger } from './logger.js';

// ideasquared-bot's POST /alert: it posts to the project's github channel and pings
// @everyone. The body is signed with the secret shared with the bot (ALERT_SECRET).
const ALERT_PROJECT = 'ads';
const ALERT_SIGNATURE_HEADER = 'X-Alert-Signature-256';

export type Alert = {
  severity: 'critical' | 'warning';
  title: string;
  details?: string;
  source?: string;
};

export type AlertDeps = {
  url: string | undefined;
  secret: string | undefined;
  fetchFn: typeof fetch;
  logger: ServiceLogger;
};

export const sign = (secret: string, body: string): string =>
  `sha256=${createHmac('sha256', secret).update(body).digest('hex')}`;

// True when the bot accepted the alert. Unconfigured (no url or no secret) sends
// nothing and returns false. Failures log a fixed message and the status only:
// never the URL, the secret or the body.
export const sendAlert = async (deps: AlertDeps, alert: Alert): Promise<boolean> => {
  if (deps.url === undefined || deps.secret === undefined) {
    return false;
  }
  const body = JSON.stringify({ project: ALERT_PROJECT, ...alert });
  try {
    const res = await deps.fetchFn(deps.url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        [ALERT_SIGNATURE_HEADER]: sign(deps.secret, body),
      },
      body,
    });
    if (!res.ok) {
      deps.logger.warn('alert rejected', { status: res.status });
    }
    return res.ok;
  } catch {
    deps.logger.warn('alert failed to send');
    return false;
  }
};
