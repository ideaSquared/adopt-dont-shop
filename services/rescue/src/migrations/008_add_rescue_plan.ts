import type { MigrationBuilder } from 'node-pg-migrate';

// Subscription plan columns on `rescues`.
//
// The admin Plan tab (app.admin RescueDetailModal/PlanTab) sets a rescue's
// subscription tier + optional expiry. The baseline rescues table carried
// no plan column, so this adds:
//   - plan             — 'free' | 'growth' | 'professional' (default 'free')
//   - plan_expires_at  — optional expiry timestamp (NULL = no expiry)
//
// plan is a plain varchar with a CHECK constraint rather than a Postgres
// ENUM: the canonical tier list lives in @adopt-dont-shop/lib.types
// (RescuePlan) and a varchar + CHECK is cheaper to evolve than an ENUM
// (ALTER TYPE ... ADD VALUE can't run in a transaction).

const PLAN_VALUES = ['free', 'growth', 'professional'];

export const up = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.addColumns('rescues', {
    plan: { type: 'varchar(32)', notNull: true, default: 'free' },
    plan_expires_at: { type: 'timestamptz' },
  });

  pgm.addConstraint('rescues', 'rescues_plan_check', {
    check: `plan IN (${PLAN_VALUES.map(v => `'${v}'`).join(', ')})`,
  });
};

export const down = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.dropConstraint('rescues', 'rescues_plan_check');
  pgm.dropColumns('rescues', ['plan', 'plan_expires_at']);
};
