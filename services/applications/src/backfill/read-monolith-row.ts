// Pure adapter: a raw row read from the monolith's public.applications
// table (joined with aggregated answers/references) → the
// MonolithApplicationInput the mapping consumes.
//
// Kept separate + pure so the SQL-shape → domain-input translation is
// testable without a database. The script (run-backfill.ts) owns the
// actual query; this owns the row-shape contract.
//
// Timestamps arrive from pg as Date objects (or null); we normalise to
// ISO-8601 strings here so the event `at` fields are plain strings.

import type { Reference } from '../domain/index.js';

import {
  type MonolithApplicationInput,
  type MonolithApplicationStatus,
} from './map-monolith-application.js';

// The raw row shape the backfill query yields. snake_case to match the
// monolith's column names. answers / references arrive pre-aggregated
// as jsonb (see run-backfill.ts query).
export type MonolithApplicationRow = {
  application_id: string;
  user_id: string;
  pet_id: string;
  rescue_id: string;
  status: string;
  created_at: Date;
  submitted_at: Date | null;
  reviewed_at: Date | null;
  decision_at: Date | null;
  actioned_by: string | null;
  rejection_reason: string | null;
  withdrawal_reason: string | null;
  // Aggregated { question_key: answer_value } map. null when the
  // application has no answer rows.
  answers: Record<string, unknown> | null;
  // Aggregated reference list. null when the application has no
  // reference rows. Each element carries the monolith reference's
  // name / email / relationship — the only fields the domain's
  // Reference type models.
  references: ReadonlyArray<RawReference> | null;
};

type RawReference = {
  name: string;
  email: string | null;
  relationship: string;
};

// The monolith's 4 collapsed statuses. Any other value is a data
// integrity surprise the script surfaces rather than silently mapping.
const KNOWN_STATUSES: ReadonlySet<string> = new Set([
  'submitted',
  'approved',
  'rejected',
  'withdrawn',
]);

export function isKnownStatus(status: string): status is MonolithApplicationStatus {
  return KNOWN_STATUSES.has(status);
}

const toIso = (value: Date | null): string | null => (value === null ? null : value.toISOString());

// Drop reference rows that don't carry the required name/relationship —
// the domain Reference type needs both. email is optional in the domain
// (string), so a null monolith email becomes an empty string.
const toReference = (raw: RawReference): Reference => ({
  name: raw.name,
  email: raw.email ?? '',
  relationship: raw.relationship,
});

// Throws on an unknown status — the caller (script) catches and reports
// the offending application id rather than guessing a mapping.
export function rowToInput(row: MonolithApplicationRow): MonolithApplicationInput {
  if (!isKnownStatus(row.status)) {
    throw new Error(
      `application ${row.application_id} has unmappable status '${row.status}' (expected one of submitted|approved|rejected|withdrawn)`
    );
  }

  return {
    applicationId: row.application_id,
    userId: row.user_id,
    petId: row.pet_id,
    rescueId: row.rescue_id,
    status: row.status,
    answers: row.answers ?? {},
    references: (row.references ?? []).map(toReference),
    createdAt: row.created_at.toISOString(),
    submittedAt: toIso(row.submitted_at),
    reviewedAt: toIso(row.reviewed_at),
    decidedAt: toIso(row.decision_at),
    actionedBy: row.actioned_by,
    rejectionReason: row.rejection_reason,
    withdrawalReason: row.withdrawal_reason,
  };
}
