// Consumer-driven contracts: service.moderation's auto-report scanners
//
// service.moderation scans new pet listings, chat messages and submitted
// applications for scam / spam text and files a system auto-report
// (src/nats/subscribers.ts). Each of these consumers once read fields its
// producer never sent, so the scanner saw empty text and never fired.
//
// Every interaction below drives the Pact example through the REAL registered
// subscriber (captured from registerSubscribers) and asserts the report it
// files: the scanned text must trip the scanner, and the report must point at
// the right entity and user. A subscriber that reads the wrong field fails here.
//
// Provider verification:
//   pets.created           services/pets/test/contracts/pets-events.provider.test.ts
//   chat.messageCreated    services/chat/test/contracts/chat-events.provider.test.ts
//   applications.submitted services/applications/test/contracts/applications-events.provider.test.ts
// See ADR 0005.

import { resolve } from 'node:path';
import type { NatsConnection } from 'nats';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MatchersV3, MessageConsumerPact, asynchronousBodyHandler } from '@pact-foundation/pact';

import { ModerationV1, type FileReportRequest } from '@adopt-dont-shop/proto';

import type { HandlerDeps } from '../../src/grpc/adapter.js';

const { like } = MatchersV3;

// Capture each subscriber the service registers, so the Pact example runs
// through the real subscriber closure instead of a live JetStream consumer.
const captured = vi.hoisted(() => new Map<string, (event: unknown) => Promise<void> | void>());
vi.mock('@adopt-dont-shop/events', () => ({
  subscribe: vi.fn(
    (
      _nats: unknown,
      opts: { subject: string },
      handler: (event: unknown) => Promise<void> | void
    ) => {
      captured.set(opts.subject, handler);
      return { drain: vi.fn() };
    }
  ),
}));

// The canonical FileReport handler the scanners delegate to.
const fileReportMock = vi.hoisted(() =>
  vi.fn(async (..._args: unknown[]) => ({ report: undefined }))
);
vi.mock('../../src/grpc/handlers.js', () => ({
  fileReport: (...args: unknown[]) => fileReportMock(...args),
}));

const { registerSubscribers } = await import('../../src/nats/subscribers.js');

// Repo-root pacts/ directory: test/contracts/ → test/ → moderation/ → services/ → root/ → pacts/
const PACT_DIR = resolve(__dirname, '../../../../pacts');

const SCAM_TEXT = 'Send a deposit by wire transfer to reserve him today.';

const consumerPact = (provider: string) =>
  new MessageConsumerPact({
    consumer: 'service.moderation',
    provider,
    dir: PACT_DIR,
    logLevel: 'warn',
    pactfileWriteMode: 'update',
  });

const logger = {
  info: () => undefined,
  error: () => undefined,
  warn: () => undefined,
  debug: () => undefined,
} as unknown as Parameters<typeof registerSubscribers>[0]['logger'];

// Run a message through the registered subscriber for `subject` and return
// the FileReport request it made.
async function reportFiledFor(subject: string, body: unknown): Promise<FileReportRequest> {
  const handler = captured.get(subject);
  if (handler === undefined) {
    throw new Error(`moderation registered no subscriber for ${subject}`);
  }
  await handler(body);
  expect(fileReportMock).toHaveBeenCalledTimes(1);
  // fileReport(deps, principal, req): the subscriber passes a FileReportRequest third.
  const [, , req] = fileReportMock.mock.calls[0] as [unknown, unknown, FileReportRequest];
  return req;
}

describe('moderation consumer contracts', () => {
  beforeEach(() => {
    captured.clear();
    fileReportMock.mockClear();
    registerSubscribers({
      // Only fileReport (mocked above) would touch these.
      deps: { pool: {}, nats: {} } as unknown as HandlerDeps,
      nats: {} as unknown as NatsConnection,
      logger,
    });
  });

  it('pets.created: reports a listing whose descriptions trip the scanner', () => {
    return consumerPact('service.pets')
      .given('a rescue lists a pet with descriptions')
      .expectsToReceive('pets.created event with descriptions')
      .withContent({
        petId: like('pet-001'),
        rescueId: like('rescue-001'),
        shortDescription: like('Friendly lab'),
        longDescription: like(SCAM_TEXT),
      })
      .withMetadata({ contentType: 'application/json' })
      .verify(
        asynchronousBodyHandler(async body => {
          const req = await reportFiledFor('pets.created', body);
          expect(req.reportedEntityType).toBe(ModerationV1.ReportEntityType.REPORT_ENTITY_TYPE_PET);
          expect(req.reportedEntityId).toBe('pet-001');
        })
      );
  });

  it('chat.messageCreated: reports a message whose body trips the scanner, against its sender', () => {
    return consumerPact('service.chat')
      .given('an adopter sends a message in a chat with rescue staff')
      .expectsToReceive('chat.messageCreated event with a message body')
      .withContent({
        messageId: like('msg-001'),
        senderUserId: like('usr-adopter'),
        body: like(SCAM_TEXT),
      })
      .withMetadata({ contentType: 'application/json' })
      .verify(
        asynchronousBodyHandler(async body => {
          const req = await reportFiledFor('chat.messageCreated', body);
          expect(req.reportedEntityType).toBe(
            ModerationV1.ReportEntityType.REPORT_ENTITY_TYPE_MESSAGE
          );
          expect(req.reportedEntityId).toBe('msg-001');
          expect(req.reportedUserId).toBe('usr-adopter');
        })
      );
  });

  it('applications.submitted: reports an application whose why-adopt answer trips the scanner, against its adopter', () => {
    return consumerPact('service.applications')
      .given('an adopter submits an application with a why-adopt answer')
      .expectsToReceive('applications.submitted event with a why-adopt answer')
      .withContent({
        applicationId: like('app-001'),
        adopterId: like('usr-adopter'),
        whyAdopt: like(SCAM_TEXT),
      })
      .withMetadata({ contentType: 'application/json' })
      .verify(
        asynchronousBodyHandler(async body => {
          const req = await reportFiledFor('applications.submitted', body);
          expect(req.reportedEntityType).toBe(
            ModerationV1.ReportEntityType.REPORT_ENTITY_TYPE_APPLICATION
          );
          expect(req.reportedEntityId).toBe('app-001');
          expect(req.reportedUserId).toBe('usr-adopter');
        })
      );
  });
});
