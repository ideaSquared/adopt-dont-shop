import type { MigrationBuilder } from 'node-pg-migrate';

// ops.unlocks — break-glass PII unlocks. Self-approved, time-boxed, scoped to a
// subject (or 'any'). `subject_id` is NULL exactly when subject_type = 'any'.
export const up = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.createTable('unlocks', {
    unlock_id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    operator_id: {
      type: 'uuid',
      notNull: true,
      references: 'operators(operator_id)',
      onDelete: 'CASCADE',
    },
    subject_type: { type: 'text', notNull: true },
    subject_id: { type: 'text' },
    reason: { type: 'text', notNull: true },
    ticket: { type: 'text', notNull: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    expires_at: { type: 'timestamptz', notNull: true },
    revoked_at: { type: 'timestamptz' },
  });
  pgm.addConstraint('unlocks', 'unlocks_subject_type_check', {
    check: "subject_type IN ('user', 'rescue', 'application', 'any')",
  });
  pgm.addConstraint('unlocks', 'unlocks_subject_shape_check', {
    check: "(subject_type = 'any') = (subject_id IS NULL)",
  });
  pgm.createIndex('unlocks', 'operator_id', { name: 'unlocks_operator_idx' });
};

export const down = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.dropTable('unlocks');
};
