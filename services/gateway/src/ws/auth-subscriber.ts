// NATS → Socket.IO forced-disconnect for auth revocation events (ADS-1036).
//
// The WS handshake (socket-server.ts) authenticates once, at connect time.
// service.auth already knows the moment a session stops being valid — it
// publishes these after the revoking DB write commits:
//
//   auth.tokenRevoked          — RevokeRefreshToken (used by Logout)
//   auth.sessionRevoked        — self-service "revoke this session"
//   auth.sessionRevokedByAdmin — admin Security Center revoke
//
// This subscriber is the missing consumer: on any of the three it force-
// disconnects every socket the user holds, on EVERY gateway replica — via
// `io.in(userId).disconnectSockets(true)`, not the per-replica
// SocketRegistry. A revocation event is delivered to every replica
// (deliverNew fan-out, same strategy as notifications-subscriber.ts /
// chat-subscriber.ts), but the user's actual socket lives on exactly one of
// them; sockets already join a room named after their userId on connect
// (ADS-818), so the room-based disconnect reaches it through the Redis
// adapter when bound. Without the adapter (single-replica / dev) it still
// works for the local case.
//
// This covers revocation/logout with sub-second latency. It does NOT cover
// plain token expiry or account suspension, which don't (yet) publish an
// event of their own — socket-server.ts's periodic per-socket revalidation
// is the defence-in-depth backstop for those paths.

import { randomUUID } from 'node:crypto';

import type { NatsConnection } from 'nats';
import type { Server as IOServer } from 'socket.io';
import type { Logger } from 'winston';

import { subscribe, type SubscriptionHandle } from '@adopt-dont-shop/events';

import { getRevocationDisconnectsCounter } from './metrics.js';

// Unique per gateway process so replicas fan-out independently (each sees
// every auth revocation event) rather than load-sharing — same discipline
// as notifications-subscriber.ts / chat-subscriber.ts.
const REPLICA_ID = randomUUID();

export type RegisterAuthSubscribersOptions = {
  nats: NatsConnection;
  io: IOServer;
  logger: Logger;
};

// Payload shapes mirror what service.auth publishes (session-handlers.ts /
// handlers.ts). Lives consumer-side until a typed event namespace ships via
// @adopt-dont-shop/proto.
type SessionRevokedPayload = {
  sessionId: string;
  familyId: string;
  userId: string;
};

type SessionRevokedByAdminPayload = SessionRevokedPayload & {
  revokedBy: string;
};

type TokenRevokedPayload = {
  userId: string;
  jti: string;
  tokenType: string;
};

export const registerAuthSubscribers = (
  opts: RegisterAuthSubscribersOptions
): SubscriptionHandle[] => {
  const { nats, io, logger } = opts;
  const disconnectsTotal = getRevocationDisconnectsCounter();

  const onError = (err: unknown, ctx: { subject: string }): void => {
    logger.error('auth ws subscriber failed', {
      subject: ctx.subject,
      err: (err as Error)?.message ?? String(err),
    });
  };

  // deliverNew: realtime eviction — a replica that was down should pick up
  // from "now", not replay a backlog of stale revocations on reconnect.
  const durableFor = (subject: string): string =>
    `gw-ws-${subject.replace(/\./g, '-')}-${REPLICA_ID}`;

  const evictUser = (userId: string, reason: string): void => {
    io.in(userId).disconnectSockets(true);
    // One increment per revocation EVENT, not per socket — the room
    // broadcast above may close zero, one, or several sockets for this user
    // across every replica, and that count isn't cleanly available from the
    // room-based API. See metrics.ts's module comment for the full contrast
    // with the periodic-revalidation path, which increments per socket.
    disconnectsTotal.inc({ reason });
    logger.info('socket(s) evicted — auth revocation', { userId, reason });
  };

  const subs: SubscriptionHandle[] = [];

  subs.push(
    subscribe<SessionRevokedPayload>(
      nats,
      {
        subject: 'auth.sessionRevoked',
        durable: durableFor('auth.sessionRevoked'),
        deliverNew: true,
        onError,
      },
      payload => evictUser(payload.userId, 'session_revoked')
    )
  );

  subs.push(
    subscribe<SessionRevokedByAdminPayload>(
      nats,
      {
        subject: 'auth.sessionRevokedByAdmin',
        durable: durableFor('auth.sessionRevokedByAdmin'),
        deliverNew: true,
        onError,
      },
      payload => evictUser(payload.userId, 'session_revoked_by_admin')
    )
  );

  subs.push(
    subscribe<TokenRevokedPayload>(
      nats,
      {
        subject: 'auth.tokenRevoked',
        durable: durableFor('auth.tokenRevoked'),
        deliverNew: true,
        onError,
      },
      payload => evictUser(payload.userId, 'token_revoked')
    )
  );

  logger.info('gateway auth WS subscribers registered', {
    subjects: ['auth.sessionRevoked', 'auth.sessionRevokedByAdmin', 'auth.tokenRevoked'],
  });

  return subs;
};
