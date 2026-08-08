// gRPC handlers for AuthService.{RecordConsent,GetConsentStatus} — the
// legal-consent store (ADS-1137).
//
// Self-scoped: identity always comes from the authenticated principal
// (x-user-id metadata), never the request body, so a user can only ever
// record or read their own consent. The store is append-only — every
// acceptance is a new row; GetConsentStatus returns the newest row per
// document type via DISTINCT ON.

import { randomUUID } from 'node:crypto';

import type { Principal } from '@adopt-dont-shop/authz';
import { withTransaction } from '@adopt-dont-shop/events';
import {
  type GetConsentStatusRequest,
  type GetConsentStatusResponse,
  type RecordConsentRequest,
  type RecordConsentResponse,
} from '@adopt-dont-shop/proto';

import { HandlerError, type HandlerDeps } from './handlers.js';

// The closed set of legally-tracked documents. Mirrors the
// consent_document_type pg enum (migration 031).
const DOCUMENT_TYPES = ['terms', 'privacy', 'cookies'] as const;
type DocumentType = (typeof DOCUMENT_TYPES)[number];

const isDocumentType = (value: string): value is DocumentType =>
  (DOCUMENT_TYPES as readonly string[]).includes(value);

type ConsentEventRow = {
  document_type: DocumentType;
  version: string;
  analytics_consent: boolean | null;
  created_at: Date;
};

// --- RecordConsent ----------------------------------------------------

export async function recordConsent(
  deps: HandlerDeps,
  principal: Principal,
  req: RecordConsentRequest
): Promise<RecordConsentResponse> {
  const userId = principal.userId as string;
  if (!userId) {
    throw new HandlerError('UNAUTHENTICATED', 'authentication required');
  }

  const decisions = req.decisions ?? [];
  if (decisions.length === 0) {
    throw new HandlerError('INVALID_ARGUMENT', 'at least one consent decision is required');
  }
  for (const decision of decisions) {
    if (!isDocumentType(decision.documentType)) {
      throw new HandlerError(
        'INVALID_ARGUMENT',
        `unknown document_type '${decision.documentType}'`
      );
    }
    if (!decision.version) {
      throw new HandlerError(
        'INVALID_ARGUMENT',
        `version is required for '${decision.documentType}'`
      );
    }
  }

  await withTransaction(deps, async ({ client, publish }) => {
    for (const decision of decisions) {
      await client.query(
        `
        INSERT INTO consent_events
          (consent_event_id, user_id, document_type, version,
           analytics_consent, ip_address, user_agent)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        `,
        [
          randomUUID(),
          userId,
          decision.documentType,
          decision.version,
          decision.analyticsConsent ?? null,
          req.ipAddress ?? null,
          req.userAgent ?? null,
        ]
      );
    }

    // Legally load-bearing — leave a forensic trail in audit_events.
    publish({
      type: 'auth.actionTaken',
      id: `auth.actionTaken.${randomUUID()}`,
      payload: {
        eventId: randomUUID(),
        service: 'service.auth',
        subject: 'auth.actionTaken',
        aggregateType: 'user',
        aggregateId: userId,
        actorUserId: userId,
        action: 'consent.record',
        outcome: 'success',
        occurredAt: new Date().toISOString(),
        payload: {
          documents: decisions.map(decision => ({
            documentType: decision.documentType,
            version: decision.version,
            analyticsConsent: decision.analyticsConsent ?? null,
          })),
        },
        ipAddress: req.ipAddress,
        userAgent: req.userAgent,
      },
    });
  });

  return { recorded: decisions.length };
}

// --- GetConsentStatus -------------------------------------------------

export async function getConsentStatus(
  deps: HandlerDeps,
  principal: Principal,
  _req: GetConsentStatusRequest
): Promise<GetConsentStatusResponse> {
  const userId = principal.userId as string;
  if (!userId) {
    throw new HandlerError('UNAUTHENTICATED', 'authentication required');
  }

  const { rows } = await deps.pool.query<ConsentEventRow>(
    `
    SELECT DISTINCT ON (document_type)
      document_type, version, analytics_consent, created_at
    FROM consent_events
    WHERE user_id = $1
    ORDER BY document_type, created_at DESC
    `,
    [userId]
  );

  return {
    records: rows.map(row => ({
      documentType: row.document_type,
      version: row.version,
      acceptedAt: row.created_at.toISOString(),
      analyticsConsent: row.analytics_consent ?? undefined,
    })),
  };
}
