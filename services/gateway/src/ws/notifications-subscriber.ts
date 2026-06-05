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
// No queue group: each gateway replica subscribes independently so
// every replica sees every event. The replica that holds the user's
// socket emits; the rest no-op via the empty registry lookup. See
// socket-registry.ts for the trade-off discussion.

import type { NatsConnection, Subscription } from 'nats';
import type { Logger } from 'winston';

import { subscribe } from '@adopt-dont-shop/events';

import type { SocketRegistry } from './socket-registry.js';

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
): Subscription[] => {
  const { nats, registry, logger } = opts;

  const onError = (err: unknown, ctx: { subject: string }): void => {
    logger.error('ws subscriber failed', {
      subject: ctx.subject,
      err: (err as Error)?.message ?? String(err),
    });
  };

  const subs: Subscription[] = [];

  subs.push(
    subscribe<NotificationCreatedPayload>(
      nats,
      { subject: 'notifications.created', onError },
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
      { subject: 'notifications.dismissed', onError },
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
