import {
  UNLOCK_DEFAULT_TTL_MINUTES,
  type CreateUnlockRequest,
  type OpsEnv,
  type Unlock,
} from '@adopt-dont-shop/ops-contract';

import { sendAlert } from './alert.js';
import type { AuthContext } from './auth.js';
import { OpsError } from './errors.js';
import { unlockCreatedEvent } from './events.js';
import type { OpsStore, UnlockRecord } from './store.js';
import { type ServiceLogger } from './logger.js';

const MINUTE_MS = 60_000;

export type UnlocksDeps = {
  env: OpsEnv;
  store: OpsStore;
  alertUrl: string | undefined;
  alertSecret: string | undefined;
  fetchFn: typeof fetch;
  now: () => Date;
  logger: ServiceLogger;
  newId: () => string;
};

export const toUnlock = (record: UnlockRecord): Unlock => ({
  unlockId: record.unlockId,
  subjectType: record.subjectType,
  subjectId: record.subjectId,
  reason: record.reason,
  ticket: record.ticket,
  createdAt: record.createdAt.toISOString(),
  expiresAt: record.expiresAt.toISOString(),
});

export const createUnlocksService = (deps: UnlocksDeps) => {
  const { store, now } = deps;
  const alertingConfigured = deps.alertUrl !== undefined && deps.alertSecret !== undefined;

  // With alerting configured, the alert is the gate: it is sent before the unlock
  // is recorded, and a failed alert (network error or non-2xx) means no unlock.
  // Without it (dev only; other envs are refused earlier) there is nothing to send.
  const alert = async (ctx: AuthContext, record: UnlockRecord): Promise<void> => {
    if (!alertingConfigured) {
      return;
    }
    const subject = record.subjectId === null ? 'any' : `${record.subjectType}:${record.subjectId}`;
    const details = [
      `operator: ${ctx.operator.login}`,
      `subject: ${subject}`,
      `ticket: ${record.ticket}`,
      `reason: ${record.reason}`,
      `expires: ${record.expiresAt.toISOString()}`,
    ].join('\n');
    const delivered = await sendAlert(
      { url: deps.alertUrl, secret: deps.alertSecret, fetchFn: deps.fetchFn, logger: deps.logger },
      {
        severity: 'warning',
        title: `ops break-glass unlock (${deps.env})`,
        details,
        source: `service-ops-${deps.env}`,
      }
    );
    if (!delivered) {
      throw new OpsError(
        'UNLOCKS_DISABLED',
        'Could not send the break-glass alert, so the unlock was not granted',
        'Retry, or check that ALERT_URL and ALERT_SECRET are valid.'
      );
    }
  };

  const create = async (ctx: AuthContext, req: CreateUnlockRequest): Promise<Unlock> => {
    // Fail closed: outside dev, an unlock nobody is alerted about is refused.
    if (deps.env !== 'dev' && !alertingConfigured) {
      throw new OpsError(
        'UNLOCKS_DISABLED',
        `Unlocks are disabled on ${deps.env}: break-glass alerting is not configured`,
        'Set ALERT_URL and ALERT_SECRET (or ALERT_SECRET_FILE) for service.ops and restart it.'
      );
    }
    const at = now();
    const ttlMinutes = req.ttlMinutes ?? UNLOCK_DEFAULT_TTL_MINUTES;
    const record: UnlockRecord = {
      unlockId: deps.newId(),
      operatorId: ctx.operator.operatorId,
      subjectType: req.subjectType,
      subjectId: req.subjectId,
      reason: req.reason,
      ticket: req.ticket,
      createdAt: at,
      expiresAt: new Date(at.getTime() + ttlMinutes * MINUTE_MS),
    };
    await alert(ctx, record);
    await store.createUnlock(
      record,
      unlockCreatedEvent({
        operatorId: record.operatorId,
        unlockId: record.unlockId,
        subjectType: record.subjectType,
        subjectId: record.subjectId,
        ticket: record.ticket,
        ttlMinutes,
        reason: record.reason,
        now: at,
      })
    );
    deps.logger.info('unlock created', {
      operatorId: ctx.operator.operatorId,
      subjectType: record.subjectType,
      ticket: record.ticket,
    });
    return toUnlock(record);
  };

  const list = async (ctx: AuthContext): Promise<Unlock[]> =>
    (await store.listActiveUnlocks(ctx.operator.operatorId, now())).map(toUnlock);

  const revoke = async (ctx: AuthContext, unlockId: string): Promise<void> => {
    if (!(await store.revokeUnlock(ctx.operator.operatorId, unlockId, now()))) {
      throw new OpsError(
        'NOT_FOUND',
        'No active unlock with that id',
        'See yours with `pnpm ops whoami`.'
      );
    }
  };

  const revokeAll = (ctx: AuthContext): Promise<void> =>
    store.revokeAllUnlocks(ctx.operator.operatorId, now());

  return { create, list, revoke, revokeAll };
};

export type UnlocksService = ReturnType<typeof createUnlocksService>;
