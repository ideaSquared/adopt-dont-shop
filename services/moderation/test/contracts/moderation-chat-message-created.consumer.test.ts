// Consumer-driven contract: moderation → chat.messageCreated (NATS event)
//
// service.moderation scans every chat message for scam / spam patterns
// (src/nats/subscribers.ts). The chat.messageCreated handler reads messageId
// (the reported entity), senderUserId (the reported user) and body (the text
// it scans). It once read senderId / content, fields chat never published, so
// the scanner saw empty text and never fired. This contract pins exactly the
// fields the handler reads.
//
// Provider verification: services/chat/test/contracts/chat-events.provider.test.ts.
// See ADR 0005.

import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { MatchersV3, MessageConsumerPact, synchronousBodyHandler } from '@pact-foundation/pact';

import { scanContent } from '../../src/nats/content-scanner.js';

const { like } = MatchersV3;

// Repo-root pacts/ directory: test/contracts/ → test/ → moderation/ → services/ → root/ → pacts/
const PACT_DIR = resolve(__dirname, '../../../../pacts');

const pact = new MessageConsumerPact({
  consumer: 'service.moderation',
  provider: 'service.chat',
  dir: PACT_DIR,
  logLevel: 'warn',
  pactfileWriteMode: 'update',
});

type ScannedMessage = { messageId: string; senderUserId: string; body: string };

// The fields the chat.messageCreated handler reads, checked the way it uses them.
function assertMessageCreated(payload: unknown): ScannedMessage {
  if (typeof payload !== 'object' || payload === null) {
    throw new Error(`chat.messageCreated: body must be an object, got: ${JSON.stringify(payload)}`);
  }
  // Narrowed to a non-null object above; each field is still checked individually.
  const { messageId, senderUserId, body } = payload as Record<string, unknown>;
  if (typeof messageId !== 'string' || messageId === '') {
    throw new Error('chat.messageCreated: messageId must be a non-empty string');
  }
  if (typeof senderUserId !== 'string' || senderUserId === '') {
    throw new Error('chat.messageCreated: senderUserId must be a non-empty string');
  }
  if (typeof body !== 'string') {
    throw new Error('chat.messageCreated: body must be a string');
  }
  return { messageId, senderUserId, body };
}

describe('moderation consumer → chat: chat.messageCreated', () => {
  it('scans the message body and reports its sender from chat.messageCreated', () => {
    return pact
      .given('an adopter sends a message in a chat with rescue staff')
      .expectsToReceive('chat.messageCreated event with a message body')
      .withContent({
        messageId: like('msg-001'),
        senderUserId: like('usr-adopter'),
        body: like('Send a deposit by wire transfer to reserve him today.'),
      })
      .withMetadata({ contentType: 'application/json' })
      .verify(
        synchronousBodyHandler(payload => {
          const event = assertMessageCreated(payload);
          // The scanner sees the message text the event carries.
          expect(scanContent(event.body)).not.toBeNull();
        })
      );
  });
});
