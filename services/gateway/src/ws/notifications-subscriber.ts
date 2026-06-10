// NATS → Socket.IO fan-out for notifications.* domain events.
//
// service.notifications publishes notifications.created /
// notifications.dismissed on the bus after every committed write. This
// subscriber sits at the gateway edge, looks up which sockets on THIS
// replica belong to the event's recipient, and emits the SPA-facing
// event shape:
//
//   socket.emit('notification:created',  { notificationId, type, channel })
//   socket.emit('notification:dismissed', { notificationId })
//
// Fan-out, not load-shared: each gateway replica binds its OWN durable
// consumer (unique name per process) so every replica sees every event. The
// replica that holds the user's socket emits; the rest no-op via the empty
// registry lookup. See socket-registry.ts for the trade-off discussion.
//
// deliverNew: these are realtime pings — a replica that was down should pick
// up from "now", not replay hours of stale notification events on reconnect.

import { randomUUID } from 'node:crypto';

import type { NatsConnection } from 'nats';
import type { Logger } from 'winston';

import { subscribe, type SubscriptionHandle } from '@adopt-dont-shop/events';

import type { SocketRegistry } from './socket-registry.js';

// Unique per gateway process so replicas don't load-share the fan-out.
const REPLICA_ID = randomUUID();

export type RegisterNotificationSubscribersOptions = {
  nats: NatsConnection;
  registry: SocketRegistry;
  logger: Logger;
};

// Payload shapes mirror what service.notifications publishes (handlers.ts).
// Lives consumer-side until the producing service ships a typed event
// namespace via @adopt-dont-shop/proto.
type NotificationCreatedPayload = {
  notificationId: string;
  userId: string;
  type: string;
  channel: string;
};

type NotificationDismissedPayload = {
  notificationId: string;
  userId: string;
};

export const registerNotificationSubscribers = (
  opts: RegisterNotificationSubscribersOptions
): SubscriptionHandle[] => {
  const { nats, registry, logger } = opts;

  const onError = (err: unknown, ctx: { subject: string }): void => {
    logger.error('ws subscriber failed', {
      subject: ctx.subject,
      err: (err as Error)?.message ?? String(err),
    });
  };

  const subs: SubscriptionHandle[] = [];

  subs.push(
    subscribe<NotificationCreatedPayload>(
      nats,
      {
        subject: 'notifications.created',
        durable: `gw-ws-notifications-created-${REPLICA_ID}`,
        deliverNew: true,
        onError,
      },
      payload => {
        const sockets = registry.socketsFor(payload.userId);
        for (const socket of sockets) {
          socket.emit('notification:created', payload);
        }
      }
    )
  );

  subs.push(
    subscribe<NotificationDismissedPayload>(
      nats,
      {
        subject: 'notifications.dismissed',
        durable: `gw-ws-notifications-dismissed-${REPLICA_ID}`,
        deliverNew: true,
        onError,
      },
      payload => {
        const sockets = registry.socketsFor(payload.userId);
        for (const socket of sockets) {
          socket.emit('notification:dismissed', payload);
        }
      }
    )
  );

  logger.info('gateway WS subscribers registered', {
    subjects: ['notifications.created', 'notifications.dismissed'],
  });

  return subs;
};
