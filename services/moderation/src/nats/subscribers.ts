// Phase 8.4 — cross-service NATS subscribers for content scanning and
// auto-report triggers. Mirrors services/notifications/src/nats/subscribers.ts:
// each handler scans the event's free text via the content-scanner; if it
// trips, file a report via the canonical FileReport handler with the
// SYSTEM_PRINCIPAL, so the row is indistinguishable from a user-filed
// report at the storage layer (same UNIQUE constraints, same audit
// trail) and the moderator queue picks it up automatically.
//
// Subjects consumed (the three the audit + ADR called out):
//   - chat.messageCreated       → scan message content
//   - pets.created              → scan listing description(s)
//   - applications.submitted    → scan adopter-supplied free text
//
// Discipline:
//   - Subscribers share queue group 'moderation-workers' so replicas
//     share the load.
//   - @adopt-dont-shop/events.subscribe wraps each callback with
//     poison-pill protection: a thrown handler is reported via onError
//     and the loop continues — the scanner's own errors don't kill the
//     stream.
//   - Idempotency at the report level: FileReport's table has a
//     UNIQUE (reporter_id, reported_entity_type, reported_entity_id)
//     filtered partial index in the schema, so re-delivering the same
//     event from the same SYSTEM_USER_ID is a no-op (the SQL UPSERT
//     returns the existing row).

import type { NatsConnection } from 'nats';
import type { Logger } from 'winston';

import { subscribe, type SubscriptionHandle } from '@adopt-dont-shop/events';

import { ModerationV1, type FileReportRequest } from '@adopt-dont-shop/proto';

import { type HandlerDeps } from '../grpc/adapter.js';
import { fileReport } from '../grpc/handlers.js';

import type {
  ApplicationSubmittedEvent,
  ChatMessageCreatedEvent,
  PetCreatedEvent,
} from './event-types.js';
import { scanContent, type ScanCategory, type ScanSeverity } from './content-scanner.js';
import { SYSTEM_PRINCIPAL } from './system-principal.js';

export type RegisterSubscribersOptions = {
  nats: NatsConnection;
  deps: HandlerDeps;
  logger: Logger;
};

// Durable-consumer name prefix — all replicas bind the same durable per
// subject so JetStream load-shares each event across the moderation pool.
const DURABLE_PREFIX = 'moderation-workers';

const durableFor = (subject: string): string => `${DURABLE_PREFIX}-${subject.replace(/\./g, '-')}`;

// Map the scanner's category onto the proto ReportCategory enum.
const CATEGORY_TO_PROTO: Record<ScanCategory, ModerationV1.ReportCategory> = {
  scam: ModerationV1.ReportCategory.REPORT_CATEGORY_SCAM,
  spam: ModerationV1.ReportCategory.REPORT_CATEGORY_SPAM,
  harassment: ModerationV1.ReportCategory.REPORT_CATEGORY_HARASSMENT,
  inappropriate_content: ModerationV1.ReportCategory.REPORT_CATEGORY_INAPPROPRIATE_CONTENT,
};

// Map the scanner's per-hit severity onto the proto Severity enum.
const SEVERITY_TO_PROTO: Record<ScanSeverity, ModerationV1.Severity> = {
  low: ModerationV1.Severity.SEVERITY_LOW,
  medium: ModerationV1.Severity.SEVERITY_MEDIUM,
  high: ModerationV1.Severity.SEVERITY_HIGH,
  critical: ModerationV1.Severity.SEVERITY_CRITICAL,
};

export const registerSubscribers = (opts: RegisterSubscribersOptions): SubscriptionHandle[] => {
  const { nats, deps, logger } = opts;
  const onError = (err: unknown, ctx: { subject: string }): void => {
    logger.error('moderation subscriber failed', {
      subject: ctx.subject,
      err: (err as Error)?.message ?? String(err),
    });
  };

  const subscriptions: SubscriptionHandle[] = [];

  subscriptions.push(
    subscribe<ChatMessageCreatedEvent>(
      nats,
      { subject: 'chat.messageCreated', durable: durableFor('chat.messageCreated'), onError },
      async event => {
        const hit = scanContent(event.content);
        if (hit === null) {
          return;
        }
        await fileAutoReport(deps, {
          reportedEntityType: ModerationV1.ReportEntityType.REPORT_ENTITY_TYPE_MESSAGE,
          reportedEntityId: event.messageId,
          reportedUserId: event.senderId,
          category: CATEGORY_TO_PROTO[hit.category],
          severity: SEVERITY_TO_PROTO[hit.severity],
          title: `Auto-report: ${hit.reason}`,
          description: `Chat message ${event.messageId} from sender ${String(event.senderId)} matched the moderation scanner: ${hit.reason}. The content was: "${truncate(event.content, 300)}"`,
        });
      }
    )
  );

  subscriptions.push(
    subscribe<PetCreatedEvent>(
      nats,
      { subject: 'pets.created', durable: durableFor('pets.created'), onError },
      async event => {
        const text = [event.shortDescription, event.longDescription]
          .filter((s): s is string => typeof s === 'string' && s.length > 0)
          .join('\n');
        const hit = scanContent(text);
        if (hit === null) {
          return;
        }
        await fileAutoReport(deps, {
          reportedEntityType: ModerationV1.ReportEntityType.REPORT_ENTITY_TYPE_PET,
          reportedEntityId: event.petId,
          category: CATEGORY_TO_PROTO[hit.category],
          severity: SEVERITY_TO_PROTO[hit.severity],
          title: `Auto-report: pet listing — ${hit.reason}`,
          description: `Pet listing ${event.petId} (rescue ${event.rescueId ?? 'unknown'}) matched the moderation scanner: ${hit.reason}. Description excerpt: "${truncate(text, 300)}"`,
        });
      }
    )
  );

  subscriptions.push(
    subscribe<ApplicationSubmittedEvent>(
      nats,
      { subject: 'applications.submitted', durable: durableFor('applications.submitted'), onError },
      async event => {
        const text = [event.message, event.whyAdopt]
          .filter((s): s is string => typeof s === 'string' && s.length > 0)
          .join('\n');
        const hit = scanContent(text);
        if (hit === null) {
          return;
        }
        await fileAutoReport(deps, {
          reportedEntityType: ModerationV1.ReportEntityType.REPORT_ENTITY_TYPE_APPLICATION,
          reportedEntityId: event.applicationId,
          reportedUserId: event.adopterId,
          category: CATEGORY_TO_PROTO[hit.category],
          severity: SEVERITY_TO_PROTO[hit.severity],
          title: `Auto-report: application — ${hit.reason}`,
          description: `Adoption application ${event.applicationId} from adopter ${String(event.adopterId)} matched the moderation scanner: ${hit.reason}. Text excerpt: "${truncate(text, 300)}"`,
        });
      }
    )
  );

  logger.info('moderation NATS subscribers registered', {
    subjects: subscriptions.length,
    durablePrefix: DURABLE_PREFIX,
  });

  return subscriptions;
};

// File a report via the canonical handler with the SYSTEM principal.
// Defaults metadataJson to '{}' so the proto's required string field
// is satisfied (the scanner doesn't currently emit metadata).
async function fileAutoReport(
  deps: HandlerDeps,
  partial: Omit<FileReportRequest, 'metadataJson'>
): Promise<void> {
  const req: FileReportRequest = { ...partial, metadataJson: '{}' };
  await fileReport(deps, SYSTEM_PRINCIPAL, req);
}

function truncate(s: string, max: number): string {
  return s.length <= max ? s : `${s.slice(0, max)}…`;
}
