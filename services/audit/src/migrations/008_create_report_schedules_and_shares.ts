import type { MigrationBuilder } from 'node-pg-migrate';

// Report schedules + shares — backs the SPA's report builder
// "schedule" (recurring email delivery config) and "share" (token-link
// access) surfaces. Both FK to saved_reports since that table lives in
// this same service/schema (intra-service FK, unlike rescue_id/user_id
// elsewhere in this service which cross schema boundaries).
//
// Schedules: one row per saved report (UpsertReportSchedule is an
// upsert keyed on saved_report_id). next_run_at/last_run_at/last_status/
// last_error are left NULL at creation — there is no cron-evaluation
// worker yet, so nothing computes or reads them until a delivery
// pipeline exists.
//
// Shares: only the token-link variant is implemented at the API layer
// (CreateReportShare). share_type/shared_with_user_id are modelled here
// so the row shape matches the frontend's reportShareSchema, but only
// 'token' is ever written today. The plaintext token is never stored —
// only its hash, mirroring API-key handling.

export const up = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.createType('report_schedule_format', ['pdf', 'csv', 'inline-html']);
  pgm.createType('report_share_type', ['user', 'token']);
  pgm.createType('report_share_permission', ['view', 'edit']);

  pgm.createTable('saved_report_schedules', {
    schedule_id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    saved_report_id: {
      type: 'uuid',
      notNull: true,
      unique: true,
      references: 'saved_reports',
      onDelete: 'CASCADE',
    },
    cron: { type: 'varchar(120)', notNull: true },
    timezone: { type: 'varchar(64)', notNull: true, default: 'UTC' },
    recipients: { type: 'jsonb', notNull: true, default: '[]' },
    format: { type: 'report_schedule_format', notNull: true, default: 'pdf' },
    is_enabled: { type: 'boolean', notNull: true, default: true },
    last_run_at: { type: 'timestamptz' },
    next_run_at: { type: 'timestamptz' },
    last_status: { type: 'varchar(20)' },
    last_error: { type: 'text' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  pgm.createTable('saved_report_shares', {
    share_id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    saved_report_id: {
      type: 'uuid',
      notNull: true,
      references: 'saved_reports',
      onDelete: 'CASCADE',
    },
    share_type: { type: 'report_share_type', notNull: true },
    shared_with_user_id: { type: 'uuid' },
    permission: { type: 'report_share_permission', notNull: true, default: 'view' },
    token_hash: { type: 'varchar(128)' },
    expires_at: { type: 'timestamptz' },
    revoked_at: { type: 'timestamptz' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.createIndex('saved_report_shares', 'saved_report_id', {
    name: 'saved_report_shares_report_idx',
  });
  pgm.createIndex('saved_report_shares', 'token_hash', {
    name: 'saved_report_shares_token_hash_idx',
  });
};

export const down = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.dropTable('saved_report_shares');
  pgm.dropTable('saved_report_schedules');
  pgm.dropType('report_share_permission');
  pgm.dropType('report_share_type');
  pgm.dropType('report_schedule_format');
};
