// Consumer-driven contract: notifications → chat.messageCreated (NATS event)
//
// service.notifications fans a "new message" notification out to every chat
// participant except the sender (src/nats/subscribers.ts). It reads
// participantUserIds and senderUserId to pick the recipients, and messageId,
// chatId and body for the notification itself. This contract pins exactly
// those fields.
//
// Provider verification: services/chat/test/contracts/chat-events.provider.test.ts.
// See ADR 0005.

import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { MatchersV3, MessageConsumerPact, synchronousBodyHandler } from '@pact-foundation/pact';

import type { ChatMessageCreatedEvent } from '../../src/nats/event-types.js';
import { buildChatMessageReceivedCreate } from '../../src/nats/subscribers.js';
import { eventBody } from './event-body.js';

const { eachLike, like } = MatchersV3;

// Repo-root pacts/ directory: test/contracts/ → test/ → notifications/ → services/ → root/ → pacts/
const PACT_DIR = resolve(__dirname, '../../../../pacts');

const pact = new MessageConsumerPact({
  consumer: 'service.notifications',
  provider: 'service.chat',
  dir: PACT_DIR,
  logLevel: 'warn',
  pactfileWriteMode: 'update',
});

describe('notifications consumer → chat: chat.messageCreated', () => {
  it('notifies the other participants of chat.messageCreated', () => {
    return pact
      .given('an adopter sends a message in a chat with rescue staff')
      .expectsToReceive('chat.messageCreated event')
      .withContent({
        messageId: like('msg-001'),
        chatId: like('chat-001'),
        senderUserId: like('usr-adopter'),
        body: like('Is Rex still available?'),
        participantUserIds: eachLike('usr-staff'),
      })
      .withMetadata({ contentType: 'application/json' })
      .verify(
        synchronousBodyHandler(body => {
          const event = eventBody<ChatMessageCreatedEvent>('chat.messageCreated', body, [
            'messageId',
            'chatId',
            'senderUserId',
            'body',
          ]);
          expect(Array.isArray(event.participantUserIds)).toBe(true);
          const recipients = event.participantUserIds.filter(id => id !== event.senderUserId);
          expect(recipients).toEqual(['usr-staff']);

          const create = buildChatMessageReceivedCreate(event, 'usr-staff');
          expect(create.message).toBe('Is Rex still available?');
          expect(create.relatedEntityId).toBe('msg-001');
          expect(JSON.parse(create.dataJson)).toEqual({
            chatId: 'chat-001',
            messageId: 'msg-001',
            senderUserId: 'usr-adopter',
          });
        })
      );
  });
});
