import type { Logger } from 'winston';

import {
  UNLOCK_DEFAULT_TTL_MINUTES,
  type CreateUnlockRequest,
  type OpsEnv,
  type Unlock,
} from '@adopt-dont-shop/ops-contract';

import type { AuthContext } from './auth.js';
import { OpsError } from './errors.js';
import { unlockCreatedEvent } from './events.js';
import type { OpsStore, UnlockRecord } from './store.js';

const MINUTE_MS = 60_000;

export type UnlocksDeps = {
  env: OpsEnv;
  store: OpsStore;
  discordWebhookUrl: string | undefined;
  fetchFn: typeof fetch;
  now: () => Date;
  logger: Logger;
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

  // With a webhook configured, the alert is the gate: it is posted before the
  // unlock is recorded, and a failed alert (network error or non-2xx) means no
  // unlock. Without one (dev only; other envs are refused earlier) there is
  // nothing to send.
  const alert = async (ctx: AuthContext, record: UnlockRecord): Promise<void> => {
    if (deps.discordWebhookUrl === undefined) {
      return;
    }
    const subject = record.subjectId === null ? 'any' : `${record.subjectType}:${record.subjectId}`;
    const content = [
      `**ops break-glass unlock** (${deps.env})`,
      `operator: ${ctx.operator.login}`,
      `subject: ${subject}`,
      `ticket: ${record.ticket}`,
      `reason: ${record.reason}`,
      `expires: ${record.expiresAt.toISOString()}`,
    ].join('\n');
    // Never log the webhook URL: it is a credential.
    const delivered = await deps
      .fetchFn(deps.discordWebhookUrl, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ content, allowed_mentions: { parse: [] } }),
      })
      .then(res => {
        if (!res.ok) {
          deps.logger.warn('discord alert rejected', { status: res.status });
        }
        return res.ok;
      })
      .catch(() => {
        deps.logger.warn('discord alert failed to send');
        return false;
      });
    if (!delivered) {
      throw new OpsError(
        'UNLOCKS_DISABLED',
        'Could not alert #ops, so the unlock was not granted',
        'Retry, or check that OPS_DISCORD_WEBHOOK_URL is valid.'
      );
    }
  };

  const create = async (ctx: AuthContext, req: CreateUnlockRequest): Promise<Unlock> => {
    // Fail closed: outside dev, an unlock nobody is alerted about is refused.
    if (deps.env !== 'dev' && deps.discordWebhookUrl === undefined) {
      throw new OpsError(
        'UNLOCKS_DISABLED',
        `Unlocks are disabled on ${deps.env}: break-glass alerting is not configured`,
        'Set OPS_DISCORD_WEBHOOK_URL (or _FILE) for service.ops and restart it.'
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
      operator: ctx.operator.login,
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
