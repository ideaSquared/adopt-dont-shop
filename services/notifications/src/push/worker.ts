// Push worker. Listens for `notifications.created` on NATS; when the
// notification's channel is PUSH, fan out to every active device_token
// row for the recipient. Provider success → log + done. Provider
// reports `tokenInvalid=true` → mark the row `status='invalid'` so
// future fan-outs skip it.
//
// Unlike the email worker (poll-based on a queue table), push fan-out
// is event-driven — the in-app notification row already serves as the
// durable record; the push channel is purely a side-effect dispatch.

import type { NatsConnection } from 'nats';
import type { Pool } from 'pg';
import type { Logger } from 'winston';

import { subscribe } from '@adopt-dont-shop/events';

import { listDeviceTokensForUser, markDeviceTokenInvalid } from './device-tokens.js';
import type { PushProvider, PushSendRequest } from './types.js';

const QUEUE_GROUP = 'notifications-push-workers';

export type PushWorkerEvent = {
  notificationId: string;
  userId: string;
  type: string;
  channel: string;
  title?: string;
  message?: string;
  // JSON-stringified opaque data (mirrors the notifications.notifications
  // `data` column the in-app create handler stores).
  dataJson?: string;
};

export type PushWorkerOptions = {
  pool: Pool;
  nats: NatsConnection;
  provider: PushProvider;
  logger: Logger;
};

export type RunningPushWorker = {
  // Closes the NATS subscription. The boot path drains the whole NATS
  // connection on shutdown which handles this transitively, but
  // returning a handle lets tests + the smoke script unwind cleanly.
  stop: () => Promise<void>;
};

const dispatchOne = async (
  request: PushSendRequest,
  tokenId: string,
  provider: PushProvider,
  pool: Pool,
  logger: Logger
): Promise<void> => {
  try {
    const result = await provider.send(request);
    if (result.success) {
      logger.info('push.worker.sent', {
        provider: provider.getName(),
        tokenId,
        messageId: result.messageId,
      });
      return;
    }
    logger.warn('push.worker.failed', {
      provider: provider.getName(),
      tokenId,
      error: result.error,
      tokenInvalid: result.tokenInvalid,
    });
    if (result.tokenInvalid) {
      await markDeviceTokenInvalid(pool, tokenId, result.error ?? 'token reported invalid');
    }
  } catch (err) {
    logger.error('push.worker.dispatch_error', {
      provider: provider.getName(),
      tokenId,
      err,
    });
  }
};

export const startPushWorker = (opts: PushWorkerOptions): RunningPushWorker => {
  const subscription = subscribe<PushWorkerEvent>(
    opts.nats,
    {
      subject: 'notifications.created',
      queue: QUEUE_GROUP,
      onError: err => {
        opts.logger.error('push.worker.subscriber_error', { err });
      },
    },
    async ev => {
      // Channel filter — only push-channel notifications fan out here.
      // The createNotification handler publishes the lowercase Postgres
      // value ('in_app' / 'email' / 'push' / 'sms'), not the proto enum.
      if (ev.channel !== 'push') {
        return;
      }
      if (!ev.userId) {
        return;
      }

      const tokens = await listDeviceTokensForUser(opts.pool, ev.userId, false);
      if (tokens.length === 0) {
        opts.logger.info('push.worker.no_tokens', {
          userId: ev.userId,
          notificationId: ev.notificationId,
        });
        return;
      }

      let parsedData: Record<string, unknown> | undefined;
      if (ev.dataJson) {
        try {
          const obj = JSON.parse(ev.dataJson) as unknown;
          if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
            parsedData = obj as Record<string, unknown>;
          }
        } catch {
          // Bad payload — skip data, still send the push.
        }
      }

      await Promise.all(
        tokens.map(token =>
          dispatchOne(
            {
              token: token.device_token,
              platform: token.platform,
              title: ev.title ?? "Adopt Don't Shop",
              body: ev.message ?? '',
              data: { ...parsedData, notificationId: ev.notificationId },
            },
            token.token_id,
            opts.provider,
            opts.pool,
            opts.logger
          )
        )
      );
    }
  );

  opts.logger.info('push worker started', {
    provider: opts.provider.getName(),
    subject: 'notifications.created',
  });

  return {
    stop: async () => {
      await subscription.drain().catch(() => undefined);
    },
  };
};
