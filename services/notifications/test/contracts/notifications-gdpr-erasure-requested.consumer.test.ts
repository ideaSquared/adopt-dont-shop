// Consumer-driven contract: notifications → gdpr.erasureRequested (NATS event)
//
// service.notifications subscribes to the NATS subject `gdpr.erasureRequested`
// and calls eraseNotifications(...) inside a DB transaction. This test
// documents the payload shape service.notifications expects to receive.
//
// MessageConsumerPact maps naturally to NATS subjects: one message = one
// subject delivery. The gateway publishes the event; every participating
// service (including notifications) consumes it. The consumer here is
// service.notifications; the provider is whichever service publishes the
// event (in practice, service.gateway via the GDPR route). See ADR 0005.
//
// The pact file is written to ../../pacts/. Provider verification is in
// services/gateway/test/contracts/ (the gateway is the publisher and must
// fulfil the consumer expectations for this event shape).

import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { MessageConsumerPact, synchronousBodyHandler } from '@pact-foundation/pact';
import type { GdprErasureRequestedPayload } from '@adopt-dont-shop/events';

// Repo-root pacts/ directory: test/contracts/ → test/ → notifications/ → services/ → root/ → pacts/
const PACT_DIR = resolve(__dirname, '../../../../pacts');

const pact = new MessageConsumerPact({
  consumer: 'service.notifications',
  provider: 'service.gateway',
  dir: PACT_DIR,
  logLevel: 'warn',
  pactfileWriteMode: 'update',
});

// ---------------------------------------------------------------------------
// Assertion handler
// ---------------------------------------------------------------------------

// Validates the fields that eraseNotifications() and the GDPR saga subscriber
// actually access. If the publisher drifts (e.g. drops `correlationId`), the
// assertion fails and the pact breaks.
function assertGdprErasureRequested(body: unknown): GdprErasureRequestedPayload {
  if (typeof body !== 'object' || body === null) {
    throw new Error(`gdpr.erasureRequested: body must be an object, got: ${JSON.stringify(body)}`);
  }
  const payload = body as Record<string, unknown>;

  if (typeof payload['userId'] !== 'string' || payload['userId'] === '') {
    throw new Error('gdpr.erasureRequested: userId must be a non-empty string');
  }
  if (typeof payload['correlationId'] !== 'string' || payload['correlationId'] === '') {
    throw new Error('gdpr.erasureRequested: correlationId must be a non-empty string');
  }
  if (typeof payload['requestedAt'] !== 'string' || payload['requestedAt'] === '') {
    throw new Error('gdpr.erasureRequested: requestedAt must be a non-empty ISO-8601 string');
  }
  // email is optional — presence check only when set
  if ('email' in payload && typeof payload['email'] !== 'string') {
    throw new Error('gdpr.erasureRequested: email must be a string when present');
  }
  // reason is optional
  if ('reason' in payload && typeof payload['reason'] !== 'string') {
    throw new Error('gdpr.erasureRequested: reason must be a string when present');
  }

  return payload as unknown as GdprErasureRequestedPayload;
}

// ---------------------------------------------------------------------------
// Contract interactions
// ---------------------------------------------------------------------------

describe('notifications consumer → gateway: gdpr.erasureRequested', () => {
  // 1. Full payload (all optional fields present)
  it('can consume a gdpr.erasureRequested event with all fields', () => {
    const fullPayload: GdprErasureRequestedPayload = {
      userId: 'user-to-erase-001',
      email: 'user@example.com',
      correlationId: 'corr-abc-123',
      requestedAt: '2026-06-18T10:00:00.000Z',
      reason: 'User requested account deletion',
    };

    return pact
      .given('a registered user who has requested GDPR erasure')
      .expectsToReceive('gdpr.erasureRequested event with all fields')
      .withContent(fullPayload)
      .withMetadata({ contentType: 'application/json' })
      .verify(
        synchronousBodyHandler(body => {
          const payload = assertGdprErasureRequested(body);
          expect(payload.userId).toBe('user-to-erase-001');
          expect(payload.email).toBe('user@example.com');
          expect(payload.correlationId).toBe('corr-abc-123');
          expect(payload.requestedAt).toBe('2026-06-18T10:00:00.000Z');
          expect(payload.reason).toBe('User requested account deletion');
        })
      );
  });

  // 2. Minimal payload (only required fields)
  it('can consume a gdpr.erasureRequested event with only required fields', () => {
    const minimalPayload: GdprErasureRequestedPayload = {
      userId: 'user-to-erase-002',
      correlationId: 'corr-def-456',
      requestedAt: '2026-06-18T11:00:00.000Z',
    };

    return pact
      .given('a user whose email could not be resolved at erasure time')
      .expectsToReceive('gdpr.erasureRequested event with only required fields')
      .withContent(minimalPayload)
      .withMetadata({ contentType: 'application/json' })
      .verify(
        synchronousBodyHandler(body => {
          const payload = assertGdprErasureRequested(body);
          expect(payload.userId).toBe('user-to-erase-002');
          expect(payload.correlationId).toBe('corr-def-456');
          expect(payload.email).toBeUndefined();
          expect(payload.reason).toBeUndefined();
        })
      );
  });
});
