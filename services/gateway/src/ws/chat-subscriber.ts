// NATS → Socket.IO fan-out for chat.* domain events.
//
// service.chat publishes chat.messageCreated / chat.messageRead /
// chat.reactionAdded / chat.reactionRemoved on the bus after every
// committed write. Each event payload includes `participantUserIds`
// so this subscriber can fan to every active member of the chat on
// THIS gateway replica without calling back into the chat service.
//
// SPA-facing event shapes (kebab-case names match the existing
// notification:* convention from notifications-subscriber):
//
//   socket.emit('chat:message:created', { messageId, chatId, senderUserId, body })
//   socket.emit('chat:message:read',    { chatId, userId, upToMessageId })
//   socket.emit('chat:reaction:added',  { messageId, chatId, userId, emoji })
//   socket.emit('chat:reaction:removed',{ messageId, chatId, userId, emoji })
//
// Same no-queue-group fan-out strategy as the notifications subscriber:
// each replica subscribes independently so every replica sees every
// event; the replica that holds a participant's socket emits, others
// no-op via the empty registry lookup.
//
// chat.created is intentionally NOT fanned here — the SPA doesn't need
// to react to a chat being opened in real-time (the user that opened it
// already has the response; the other participant picks it up on their
// next ListChats refresh / chat-list re-fetch).

import type { NatsConnection, Subscription } from 'nats';
import type { Logger } from 'winston';

import { subscribe } from '@adopt-dont-shop/events';

import type { SocketRegistry } from './socket-registry.js';

export type RegisterChatSubscribersOptions = {
  nats: NatsConnection;
  registry: SocketRegistry;
  logger: Logger;
};

// Common base: every chat.* event carries the participants so the
// gateway can multiplex without a chat-service round-trip.
type ChatEventBase = { participantUserIds: string[] };

type MessageCreatedPayload = ChatEventBase & {
  messageId: string;
  chatId: string;
  senderUserId: string;
  body: string;
};

type MessageReadPayload = ChatEventBase & {
  chatId: string;
  userId: string;
  upToMessageId: string;
};

type ReactionPayload = ChatEventBase & {
  messageId: string;
  chatId: string;
  userId: string;
  emoji: string;
};

// Strip the `participantUserIds` field before emitting to clients —
// the SPA doesn't need to see the fan-out list and including it would
// leak participant identity to anyone with a socket in any chat.
const stripParticipants = <T extends ChatEventBase>(p: T): Omit<T, 'participantUserIds'> => {
  const { participantUserIds: _ignored, ...rest } = p;
  void _ignored;
  return rest;
};

const fanToParticipants = <T extends ChatEventBase>(
  registry: SocketRegistry,
  payload: T,
  eventName: string
): void => {
  const emitPayload = stripParticipants(payload);
  // Dedupe — a participant could (theoretically) appear twice in the
  // event payload. Defensive only; the chat handler should already
  // emit a unique list.
  const seen = new Set<string>();
  for (const userId of payload.participantUserIds) {
    if (seen.has(userId)) {
      continue;
    }
    seen.add(userId);
    for (const socket of registry.socketsFor(userId)) {
      socket.emit(eventName, emitPayload);
    }
  }
};

export const registerChatSubscribers = (opts: RegisterChatSubscribersOptions): Subscription[] => {
  const { nats, registry, logger } = opts;

  const onError = (err: unknown, ctx: { subject: string }): void => {
    logger.error('chat ws subscriber failed', {
      subject: ctx.subject,
      err: (err as Error)?.message ?? String(err),
    });
  };

  const subs: Subscription[] = [];

  subs.push(
    subscribe<MessageCreatedPayload>(nats, { subject: 'chat.messageCreated', onError }, payload =>
      fanToParticipants(registry, payload, 'chat:message:created')
    )
  );

  subs.push(
    subscribe<MessageReadPayload>(nats, { subject: 'chat.messageRead', onError }, payload =>
      fanToParticipants(registry, payload, 'chat:message:read')
    )
  );

  subs.push(
    subscribe<ReactionPayload>(nats, { subject: 'chat.reactionAdded', onError }, payload =>
      fanToParticipants(registry, payload, 'chat:reaction:added')
    )
  );

  subs.push(
    subscribe<ReactionPayload>(nats, { subject: 'chat.reactionRemoved', onError }, payload =>
      fanToParticipants(registry, payload, 'chat:reaction:removed')
    )
  );

  logger.info('gateway chat WS subscribers registered', {
    subjects: [
      'chat.messageCreated',
      'chat.messageRead',
      'chat.reactionAdded',
      'chat.reactionRemoved',
    ],
  });

  return subs;
};
