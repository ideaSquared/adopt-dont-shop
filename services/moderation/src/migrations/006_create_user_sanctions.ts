import type { MigrationBuilder } from 'node-pg-migrate';

// Per-table baseline — user_sanctions.
//
// Direct port of service.backend's 00-baseline-049-user-sanctions.ts.
// Append-only sanction history (paranoid: false) — lifting a sanction
// is a new row, not a soft-delete on the original. Cross-schema FKs
// (user_id, issued_by, appeal_resolved_by, revoked_by, created_by,
// updated_by reference auth.users) declared as plain uuid.
// report_id / moderator_action_id are intra-schema soft pointers
// (sanctions exist with or without an originating report or action).

export const up = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.createType('user_sanction_type', [
    'warning',
    'restriction',
    'temporary_ban',
    'permanent_ban',
    'messaging_restriction',
    'posting_restriction',
    'application_restriction',
  ]);
  pgm.createType('user_sanction_reason', [
    'harassment',
    'spam',
    'inappropriate_content',
    'terms_violation',
    'scam_attempt',
    'false_information',
    'animal_welfare_concern',
    'repeated_violations',
    'other',
  ]);
  pgm.createType('user_sanction_issued_by_role', ['ADMIN', 'MODERATOR', 'SUPER_ADMIN']);
  pgm.createType('user_sanction_appeal_status', ['pending', 'approved', 'rejected']);

  pgm.createTable('user_sanctions', {
    sanction_id: { type: 'uuid', primaryKey: true },
    user_id: { type: 'uuid', notNull: true },
    sanction_type: { type: 'user_sanction_type', notNull: true },
    reason: { type: 'user_sanction_reason', notNull: true },
    description: { type: 'text', notNull: true },
    is_active: { type: 'boolean', notNull: true, default: true },
    start_date: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    end_date: { type: 'timestamptz' },
    duration: { type: 'integer' },
    issued_by: { type: 'uuid', notNull: true },
    issued_by_role: { type: 'user_sanction_issued_by_role', notNull: true },
    report_id: { type: 'uuid' },
    moderator_action_id: { type: 'uuid' },
    metadata: { type: 'jsonb', notNull: true, default: pgm.func(`'{}'::jsonb`) },
    appealed_at: { type: 'timestamptz' },
    appeal_reason: { type: 'text' },
    appeal_status: { type: 'user_sanction_appeal_status' },
    appeal_resolved_by: { type: 'uuid' },
    appeal_resolved_at: { type: 'timestamptz' },
    appeal_resolution: { type: 'text' },
    revoked_by: { type: 'uuid' },
    revoked_at: { type: 'timestamptz' },
    revocation_reason: { type: 'text' },
    notification_sent: { type: 'boolean', notNull: true, default: false },
    internal_notes: { type: 'text' },
    warning_count: { type: 'integer', default: 0 },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    created_by: { type: 'uuid' },
    updated_by: { type: 'uuid' },
    version: { type: 'integer', notNull: true, default: 0 },
  });

  pgm.createIndex('user_sanctions', 'user_id', { name: 'user_sanctions_user_id_idx' });
  pgm.createIndex('user_sanctions', 'sanction_type', { name: 'user_sanctions_sanction_type_idx' });
  pgm.createIndex('user_sanctions', 'reason', { name: 'user_sanctions_reason_idx' });
  pgm.createIndex('user_sanctions', 'is_active', { name: 'user_sanctions_is_active_idx' });
  pgm.createIndex('user_sanctions', 'start_date', { name: 'user_sanctions_start_date_idx' });
  pgm.createIndex('user_sanctions', 'end_date', { name: 'user_sanctions_end_date_idx' });
  pgm.createIndex('user_sanctions', 'issued_by', { name: 'user_sanctions_issued_by_idx' });
  pgm.createIndex('user_sanctions', 'report_id', { name: 'user_sanctions_report_id_idx' });
  pgm.createIndex('user_sanctions', 'moderator_action_id', {
    name: 'user_sanctions_moderator_action_id_idx',
  });
  pgm.createIndex('user_sanctions', 'appeal_resolved_by', {
    name: 'user_sanctions_appeal_resolved_by_idx',
  });
  pgm.createIndex('user_sanctions', 'revoked_by', { name: 'user_sanctions_revoked_by_idx' });
  pgm.createIndex('user_sanctions', 'appeal_status', { name: 'user_sanctions_appeal_status_idx' });
  pgm.createIndex('user_sanctions', 'created_at', { name: 'user_sanctions_created_at_idx' });
  // Compound idx for the active-sanctions-by-user hot path
  // (GET /api/v1/auth/sanctions/active equivalent).
  pgm.createIndex('user_sanctions', ['user_id', 'is_active', 'end_date'], {
    name: 'user_sanctions_user_active_end_idx',
  });
  pgm.createIndex('user_sanctions', 'created_by', { name: 'user_sanctions_created_by_idx' });
  pgm.createIndex('user_sanctions', 'updated_by', { name: 'user_sanctions_updated_by_idx' });
};

export const down = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.dropTable('user_sanctions');
  pgm.dropType('user_sanction_type');
  pgm.dropType('user_sanction_reason');
  pgm.dropType('user_sanction_issued_by_role');
  pgm.dropType('user_sanction_appeal_status');
};
