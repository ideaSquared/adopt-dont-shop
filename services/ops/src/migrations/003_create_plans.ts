import type { MigrationBuilder } from 'node-pg-migrate';

// ops.plans — a write preview. Executing a write needs the plan_id of a preview
// of the identical env + rpc + request by the same operator. `request_hash` is
// the sha256 of that tuple; `used_at` makes a plan single-use.
export const up = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.createTable('plans', {
    plan_id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    operator_id: {
      type: 'uuid',
      notNull: true,
      references: 'operators(operator_id)',
      onDelete: 'CASCADE',
    },
    rpc: { type: 'text', notNull: true },
    request_hash: { type: 'char(64)', notNull: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    expires_at: { type: 'timestamptz', notNull: true },
    used_at: { type: 'timestamptz' },
  });
  pgm.createIndex('plans', 'operator_id', { name: 'plans_operator_idx' });
};

export const down = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.dropTable('plans');
};
