import type { NatsConnection } from 'nats';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ModerationV1, type FileReportRequest } from '@adopt-dont-shop/proto';

import type { HandlerDeps } from '../grpc/adapter.js';

// Capture the handler each subscribe() call registers so the behaviour
// tests can drive a domain event straight through the real subscriber
// closure (scan → category/severity map → fileAutoReport) without a live
// JetStream consumer. The poison-pill / ack machinery itself lives in (and
// is tested by) @adopt-dont-shop/events; here we verify the moderation
// wiring on top of it.
type Captured = {
  subject: string;
  durable: string;
  handler: (event: unknown) => Promise<void> | void;
};
const captured: Captured[] = [];

vi.mock('@adopt-dont-shop/events', () => ({
  subscribe: vi.fn(
    (
      _nats: unknown,
      opts: { subject: string; durable: string },
      handler: (event: unknown) => Promise<void> | void
    ) => {
      captured.push({ subject: opts.subject, durable: opts.durable, handler });
      return { drain: vi.fn() };
    }
  ),
}));

// Spy on the canonical FileReport handler the subscribers delegate to.
const fileReportMock = vi.fn(async () => ({ report: undefined }));
vi.mock('../grpc/handlers.js', () => ({
  fileReport: (...args: unknown[]) => fileReportMock(...args),
}));

const { registerSubscribers } = await import('./subscribers.js');
const { SYSTEM_PRINCIPAL } = await import('./system-principal.js');

const deps = { pool: {}, nats: {} } as unknown as HandlerDeps;
const logger = {
  info: () => undefined,
  error: () => undefined,
  warn: () => undefined,
  debug: () => undefined,
  silly: () => undefined,
} as unknown as Parameters<typeof registerSubscribers>[0]['logger'];

const nats = {} as unknown as NatsConnection;

const handlerFor = (subject: string): ((event: unknown) => Promise<void> | void) => {
  const entry = captured.find(c => c.subject === subject);
  if (entry === undefined) {
    throw new Error(`no handler registered for ${subject}`);
  }
  return entry.handler;
};

describe('registerSubscribers', () => {
  beforeEach(() => {
    captured.length = 0;
    fileReportMock.mockClear();
  });

  it('subscribes chat.messageCreated + pets.created + applications.submitted', () => {
    const subs = registerSubscribers({ nats, deps, logger });

    expect(subs).toHaveLength(3);
    expect(captured.map(c => c.subject)).toEqual([
      'chat.messageCreated',
      'pets.created',
      'applications.submitted',
    ]);
    // All replicas bind the same durable per subject so JetStream load-shares.
    for (const c of captured) {
      expect(c.durable).toMatch(/^moderation-workers-/);
    }
  });

  it('files an auto-report carrying the scanner severity + category when content trips', async () => {
    registerSubscribers({ nats, deps, logger });

    // 'go kill yourself' is a harassment term → high severity in the scanner.
    await handlerFor('chat.messageCreated')({
      messageId: 'msg-1',
      chatId: 'chat-1',
      senderId: 'usr-sender',
      content: 'go kill yourself',
    });

    expect(fileReportMock).toHaveBeenCalledTimes(1);
    const [, principal, req] = fileReportMock.mock.calls[0] as [
      unknown,
      unknown,
      FileReportRequest,
    ];
    // Filed as the SYSTEM principal so the row is indistinguishable from a
    // user report at the storage layer (and hits the auto-report unique index).
    expect(principal).toBe(SYSTEM_PRINCIPAL);
    expect(req.reportedEntityType).toBe(ModerationV1.ReportEntityType.REPORT_ENTITY_TYPE_MESSAGE);
    expect(req.reportedEntityId).toBe('msg-1');
    expect(req.category).toBe(ModerationV1.ReportCategory.REPORT_CATEGORY_HARASSMENT);
    expect(req.severity).toBe(ModerationV1.Severity.SEVERITY_HIGH);
  });

  it('carries a distinct (medium) severity through for a spam-grade hit', async () => {
    registerSubscribers({ nats, deps, logger });

    // A bare URL is spam → medium severity. Proves severity is not hard-coded.
    await handlerFor('pets.created')({
      petId: 'pet-1',
      rescueId: 'res-1',
      longDescription: 'adopt me at https://example.com',
    });

    expect(fileReportMock).toHaveBeenCalledTimes(1);
    const [, , req] = fileReportMock.mock.calls[0] as [unknown, unknown, FileReportRequest];
    expect(req.category).toBe(ModerationV1.ReportCategory.REPORT_CATEGORY_SPAM);
    expect(req.severity).toBe(ModerationV1.Severity.SEVERITY_MEDIUM);
  });

  it('files nothing when the content is clean', async () => {
    registerSubscribers({ nats, deps, logger });

    await handlerFor('applications.submitted')({
      applicationId: 'app-1',
      adopterId: 'usr-a',
      petId: 'pet-1',
      rescueId: 'res-1',
      submittedAt: '2026-06-15T00:00:00Z',
      message: 'We have a lovely fenced garden and two children.',
      whyAdopt: 'We have always wanted to give a dog a loving home.',
    });

    expect(fileReportMock).not.toHaveBeenCalled();
  });
});
