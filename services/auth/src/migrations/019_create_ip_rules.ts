import type { MigrationBuilder } from 'node-pg-migrate';

// Security Center IP allow/block rules. A rule is keyed by CIDR; `type`
// decides whether matching it allows or blocks the request. Evaluated by
// the gateway's connecting-IP middleware (not yet wired — this migration
// only lays down storage + the admin CRUD surface). `is_active` lets an
// admin soft-disable a rule without losing its history; `expires_at` is
// optional and, when set in the past, the rule is treated as inactive by
// the read path without a background sweep job.

export const up = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.createType('ip_rule_type', ['allow', 'block']);

  pgm.createTable('ip_rules', {
    ip_rule_id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    type: { type: 'ip_rule_type', notNull: true },
    cidr: { type: 'varchar(64)', notNull: true },
    label: { type: 'varchar(255)' },
    is_active: { type: 'boolean', notNull: true, default: true },
    expires_at: { type: 'timestamptz' },
    created_by: { type: 'uuid' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  pgm.createIndex('ip_rules', 'cidr', { name: 'ip_rules_cidr_idx' });
  pgm.createIndex('ip_rules', 'type', { name: 'ip_rules_type_idx' });
};

export const down = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.dropTable('ip_rules');
  pgm.dropType('ip_rule_type');
};
