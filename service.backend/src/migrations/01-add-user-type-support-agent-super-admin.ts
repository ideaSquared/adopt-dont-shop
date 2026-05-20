/**
 * Add `super_admin` and `support_agent` values to the `enum_users_user_type`
 * Postgres enum.
 *
 * Postgres only allows new enum values to be added via `ALTER TYPE ... ADD
 * VALUE`. Removing values requires re-creating the enum type, so the down
 * migration is intentionally not provided — rolling back is operationally
 * dangerous on a populated table.
 */
import type { QueryInterface } from 'sequelize';

const ENUM_NAME = 'enum_users_user_type';
const NEW_VALUES = ['super_admin', 'support_agent'] as const;

export default {
  up: async (queryInterface: QueryInterface) => {
    for (const value of NEW_VALUES) {
      await queryInterface.sequelize.query(
        `ALTER TYPE "${ENUM_NAME}" ADD VALUE IF NOT EXISTS '${value}';`
      );
    }
  },

  down: async () => {
    // Postgres does not support removing enum values without recreating the
    // type. Skipping rollback — restore from backup if you need to drop the
    // values, since any row using them would block the type rewrite.
  },
};
