import type { MigrationBuilder } from 'node-pg-migrate';

// Per-table baseline — moderator_actions.
//
// Direct port of service.backend's 00-baseline-047-moderator-actions.ts,
// with 08-add-moderator-actions-acknowledged-at.ts folded in (the
// monolith's current state). Append-only (paranoid: false) — no
// deleted_at. Cross-schema FKs (moderator_id, target_user_id,
// reversed_by, created_by, updated_by reference auth.users) are
// declared as plain uuid. report_id is intra-schema and can FK to
// reports — keeping it soft because moderator_actions exist
// without an originating report (auto-flag, content scan, etc.).

export const up = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.createType('moderator_action_target_entity_type', [
    'user',
    'rescue',
    'pet',
    'application',
    'message',
    'conversation',
  ]);
  pgm.createType('moderator_action_type', [
    'warning_issued',
    'content_removed',
    'user_suspended',
    'user_banned',
    'account_restricted',
    'content_flagged',
    'report_dismissed',
    'escalation',
    'appeal_reviewed',
    'no_action',
  ]);
  pgm.createType('moderator_action_severity', ['low', 'medium', 'high', 'critical']);

  pgm.createTable('moderator_actions', {
    action_id: { type: 'uuid', primaryKey: true },
    moderator_id: { type: 'uuid', notNull: true },
    report_id: { type: 'uuid' },
    target_entity_type: { type: 'moderator_action_target_entity_type', notNull: true },
    target_entity_id: { type: 'varchar(255)', notNull: true },
    target_user_id: { type: 'uuid' },
    action_type: { type: 'moderator_action_type', notNull: true },
    severity: { type: 'moderator_action_severity', notNull: true },
    reason: { type: 'varchar(500)', notNull: true },
    description: { type: 'text' },
    metadata: { type: 'jsonb', notNull: true, default: pgm.func(`'{}'::jsonb`) },
    duration: { type: 'integer' },
    expires_at: { type: 'timestamptz' },
    is_active: { type: 'boolean', notNull: true, default: true },
    reversed_by: { type: 'uuid' },
    reversed_at: { type: 'timestamptz' },
    reversal_reason: { type: 'text' },
    notification_sent: { type: 'boolean', notNull: true, default: false },
    internal_notes: { type: 'text' },
    acknowledged_at: { type: 'timestamptz' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    created_by: { type: 'uuid' },
    updated_by: { type: 'uuid' },
    version: { type: 'integer', notNull: true, default: 0 },
  });

  pgm.createIndex('moderator_actions', 'moderator_id', {
    name: 'moderator_actions_moderator_id_idx',
  });
  pgm.createIndex('moderator_actions', 'report_id', { name: 'moderator_actions_report_id_idx' });
  pgm.createIndex('moderator_actions', ['target_entity_type', 'target_entity_id'], {
    name: 'moderator_actions_target_entity_idx',
  });
  pgm.createIndex('moderator_actions', 'target_user_id', {
    name: 'moderator_actions_target_user_id_idx',
  });
  pgm.createIndex('moderator_actions', 'action_type', {
    name: 'moderator_actions_action_type_idx',
  });
  pgm.createIndex('moderator_actions', 'severity', { name: 'moderator_actions_severity_idx' });
  pgm.createIndex('moderator_actions', 'is_active', { name: 'moderator_actions_is_active_idx' });
  pgm.createIndex('moderator_actions', 'expires_at', { name: 'moderator_actions_expires_at_idx' });
  pgm.createIndex('moderator_actions', 'reversed_by', {
    name: 'moderator_actions_reversed_by_idx',
  });
  pgm.createIndex('moderator_actions', 'created_at', { name: 'moderator_actions_created_at_idx' });
  pgm.createIndex('moderator_actions', 'created_by', { name: 'moderator_actions_created_by_idx' });
  pgm.createIndex('moderator_actions', 'updated_by', { name: 'moderator_actions_updated_by_idx' });
};

export const down = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.dropTable('moderator_actions');
  pgm.dropType('moderator_action_target_entity_type');
  pgm.dropType('moderator_action_type');
  pgm.dropType('moderator_action_severity');
};
