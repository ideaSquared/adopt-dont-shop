import type { MigrationBuilder } from 'node-pg-migrate';

// Per-table baseline — applications (read model).
//
// Projection of application_events into the current-state shape every
// query path needs. The projector folds the event stream after each
// successful append; this table is the answer to "what's the current
// state of application X" without replaying events on every read.
//
// Diverges from the monolith's applications table in one important
// way: the `status` enum now carries the FULL Phase 5.2 domain
// lifecycle (draft → submitted → under_review → home_visit_scheduled
// → home_visit_completed → approved | rejected | withdrawn → adopted),
// not the monolith's collapsed 4-state version (submitted | approved
// | rejected | withdrawn). The expanded states are what events.proto
// (Phase 5.3a) ships in ApplicationStatus.
//
// Most monolith columns are carried verbatim — even the auxiliary
// columns (priority, stage, score, tags, etc.) — so the gateway's
// REST → gRPC translation in Phase 5.3d doesn't need a shape change
// at the SPA layer. Cross-schema FK targets (user_id, pet_id,
// rescue_id, actioned_by, created_by, updated_by) declared as plain
// uuid.

export const up = async (pgm: MigrationBuilder): Promise<void> => {
  // The full Phase 5.2 lifecycle — matches services/applications/src/
  // domain/types.ts and the proto ApplicationStatus enum.
  pgm.createType('application_status', [
    'draft',
    'submitted',
    'under_review',
    'home_visit_scheduled',
    'home_visit_completed',
    'approved',
    'rejected',
    'withdrawn',
    'adopted',
  ]);
  pgm.createType('application_priority', ['low', 'normal', 'high', 'urgent']);
  pgm.createType('application_stage', [
    'pending',
    'reviewing',
    'visiting',
    'deciding',
    'resolved',
    'withdrawn',
  ]);
  pgm.createType('application_outcome', ['approved', 'rejected', 'withdrawn']);

  pgm.createTable('applications', {
    application_id: { type: 'uuid', primaryKey: true },
    user_id: { type: 'uuid', notNull: true },
    pet_id: { type: 'uuid', notNull: true },
    rescue_id: { type: 'uuid', notNull: true },
    status: { type: 'application_status', notNull: true, default: 'draft' },
    priority: { type: 'application_priority', notNull: true, default: 'normal' },
    stage: { type: 'application_stage', notNull: true, default: 'pending' },
    final_outcome: { type: 'application_outcome' },
    // Lifecycle timestamps. Stamped by the projector when the matching
    // event lands; null until then.
    review_started_at: { type: 'timestamptz' },
    visit_scheduled_at: { type: 'timestamptz' },
    visit_completed_at: { type: 'timestamptz' },
    resolved_at: { type: 'timestamptz' },
    withdrawal_reason: { type: 'text' },
    rejection_reason: { type: 'text' },
    actioned_by: { type: 'uuid' },
    actioned_at: { type: 'timestamptz' },
    // Documents + answers blob — schema-less because the per-rescue
    // application_questions vary. Carries the same JSONB shape the
    // monolith ships.
    documents: { type: 'jsonb', notNull: true, default: pgm.func(`'[]'::jsonb`) },
    requires_coppa_consent: { type: 'boolean', notNull: true, default: false },
    parental_consent_given_at: { type: 'timestamptz' },
    references_consented: { type: 'boolean', notNull: true, default: false },
    interview_notes: { type: 'text' },
    home_visit_notes: { type: 'text' },
    score: { type: 'integer' },
    tags: { type: 'text[]' },
    notes: { type: 'text' },
    submitted_at: { type: 'timestamptz' },
    reviewed_at: { type: 'timestamptz' },
    decision_at: { type: 'timestamptz' },
    expires_at: { type: 'timestamptz' },
    follow_up_date: { type: 'timestamptz' },
    created_by: { type: 'uuid' },
    updated_by: { type: 'uuid' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    deleted_at: { type: 'timestamptz' },
    // Matches the (aggregate_id, version) HEAD in application_events.
    // The projector bumps this in lockstep with each append; lets
    // single-row reads detect a stale read model fast.
    version: { type: 'integer', notNull: true, default: 0 },
  });

  // Query-pattern indexes — matches the monolith's set.
  pgm.createIndex('applications', 'user_id', { name: 'applications_user_id_idx' });
  pgm.createIndex('applications', 'pet_id', { name: 'applications_pet_id_idx' });
  pgm.createIndex('applications', 'rescue_id', { name: 'applications_rescue_id_idx' });
  pgm.createIndex('applications', 'actioned_by', { name: 'applications_actioned_by_idx' });
  pgm.createIndex('applications', 'status', { name: 'applications_status_idx' });
  pgm.createIndex('applications', 'priority', { name: 'applications_priority_idx' });
  pgm.createIndex('applications', 'created_at', { name: 'applications_created_at_idx' });
  pgm.createIndex('applications', 'submitted_at', { name: 'applications_submitted_at_idx' });
  pgm.createIndex('applications', 'expires_at', { name: 'applications_expires_at_idx' });
  pgm.createIndex('applications', 'follow_up_date', { name: 'applications_follow_up_idx' });
  // Partial unique — one open application per (user, pet) at a time.
  // Closed-out applications (rejected / withdrawn / soft-deleted) don't
  // count against this constraint.
  pgm.sql(
    `CREATE UNIQUE INDEX applications_user_pet_unique
       ON applications (user_id, pet_id)
       WHERE deleted_at IS NULL
         AND status NOT IN ('rejected', 'withdrawn');`
  );
  // Compound idx for the rescue inbox hot path — list applications
  // by status, newest first, per rescue.
  pgm.sql(
    `CREATE INDEX applications_rescue_status_created_idx
       ON applications (rescue_id, status, created_at DESC);`
  );
  pgm.createIndex('applications', 'deleted_at', { name: 'applications_deleted_at_idx' });
  pgm.createIndex('applications', 'created_by', { name: 'applications_created_by_idx' });
  pgm.createIndex('applications', 'updated_by', { name: 'applications_updated_by_idx' });
};

export const down = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.dropTable('applications');
  pgm.dropType('application_status');
  pgm.dropType('application_priority');
  pgm.dropType('application_stage');
  pgm.dropType('application_outcome');
};
