// Provider verification: service.gateway → gdpr.erasureRequested publisher
//
// Reads the pact file written by
// services/notifications/test/contracts/notifications-gdpr-erasure-requested.consumer.test.ts
// and proves that the gateway publishes a gdpr.erasureRequested payload that
// matches all shapes expected by service.notifications (the consumer).
//
// The gateway's GDPR route publishes a GdprErasureRequestedPayload from
// @adopt-dont-shop/events. We prove the shape by constructing example payloads
// that match both the TypeScript type and the pact interaction descriptions.
//
// See ADR 0005 for the message-level modelling rationale.

import { resolve } from 'node:path';
import { describe, it, expect } from 'vitest';
import { MessageProviderPact, providerWithMetadata } from '@pact-foundation/pact';
import type { GdprErasureRequestedPayload } from '@adopt-dont-shop/events';

// Repo-root pacts/ directory: test/contracts/ → test/ → gateway/ → services/ → root/ → pacts/
const PACT_DIR = resolve(__dirname, '../../../../pacts');

// ---------------------------------------------------------------------------
// Message providers — one per interaction description in the pact file
// ---------------------------------------------------------------------------

// "gdpr.erasureRequested event with all fields"
// State: 'a registered user who has requested GDPR erasure'
const provideGdprErasureAllFields = (): GdprErasureRequestedPayload => ({
  userId: 'user-to-erase-001',
  email: 'user@example.com',
  correlationId: 'corr-abc-123',
  requestedAt: '2026-06-18T10:00:00.000Z',
  reason: 'User requested account deletion',
});

// "gdpr.erasureRequested event with only required fields"
// State: 'a user whose email could not be resolved at erasure time'
const provideGdprErasureRequiredOnly = (): GdprErasureRequestedPayload => ({
  userId: 'user-to-erase-002',
  correlationId: 'corr-def-456',
  requestedAt: '2026-06-18T11:00:00.000Z',
});

// ---------------------------------------------------------------------------
// Verification suite
// ---------------------------------------------------------------------------

describe('service.gateway — provider verification for gdpr.erasureRequested event', () => {
  it('fulfils all interactions declared by service.notifications consumer', async () => {
    const verifier = new MessageProviderPact({
      provider: 'service.gateway',
      logLevel: 'warn',
      pactUrls: [resolve(PACT_DIR, 'service.notifications-service.gateway.json')],
      messageProviders: {
        'gdpr.erasureRequested event with all fields': provideGdprErasureAllFields,
        'gdpr.erasureRequested event with only required fields': provideGdprErasureRequiredOnly,
      },
    });

    await expect(verifier.verify()).resolves.not.toThrow();
  });
});
