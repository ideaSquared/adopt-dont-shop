// Mappers between the audit.audit_events.outcome string values and the
// AuditOutcome proto enum integers. Same shape as the moderation +
// matching + rescue enum-maps. Single enum for this service (just
// `outcome` — service / subject / action / aggregate_type are
// free-form strings in the audit log).

import { AuditV1 } from '@adopt-dont-shop/proto';

// ===== AuditOutcome ==================================================

export type AuditOutcomeDb = 'success' | 'denied' | 'failure';

const OUTCOME_TO_DB: Record<AuditV1.AuditOutcome, AuditOutcomeDb | null> = {
  [AuditV1.AuditOutcome.AUDIT_OUTCOME_UNSPECIFIED]: null,
  [AuditV1.AuditOutcome.AUDIT_OUTCOME_SUCCESS]: 'success',
  [AuditV1.AuditOutcome.AUDIT_OUTCOME_DENIED]: 'denied',
  [AuditV1.AuditOutcome.AUDIT_OUTCOME_FAILURE]: 'failure',
  [AuditV1.AuditOutcome.UNRECOGNIZED]: null,
};

const DB_TO_OUTCOME: Record<AuditOutcomeDb, AuditV1.AuditOutcome> = {
  success: AuditV1.AuditOutcome.AUDIT_OUTCOME_SUCCESS,
  denied: AuditV1.AuditOutcome.AUDIT_OUTCOME_DENIED,
  failure: AuditV1.AuditOutcome.AUDIT_OUTCOME_FAILURE,
};

export function outcomeToDb(proto: AuditV1.AuditOutcome): AuditOutcomeDb {
  const db = OUTCOME_TO_DB[proto];
  if (!db) {
    throw new Error(`invalid AuditOutcome proto value: ${proto}`);
  }
  return db;
}

export function outcomeFromDb(db: string): AuditV1.AuditOutcome {
  const proto = DB_TO_OUTCOME[db as AuditOutcomeDb];
  if (!proto) {
    throw new Error(`unknown audit_events.outcome value: ${db}`);
  }
  return proto;
}

// ===== Exhaustiveness =================================================

export const ALL_OUTCOMES: ReadonlyArray<AuditOutcomeDb> = ['success', 'denied', 'failure'];
