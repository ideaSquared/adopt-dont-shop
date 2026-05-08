import type { QueryInterface } from 'sequelize';
import { runInTransaction } from './_helpers';

/**
 * ADS-444: Promote `ip_rules.cidr` from VARCHAR(64) to native Postgres `CIDR`.
 *
 * VARCHAR storage means no DB-level format validation and no ability to use
 * Postgres's CIDR containment operators (`>>`, `<<=`, `&&`) when the runtime
 * gateway moves from per-rule scans to a single indexed containment query.
 * Switching to `CIDR` enforces format on insert and unlocks GIST/SP-GiST
 * indexes for fast subnet membership lookups.
 *
 * Cast `varchar -> cidr` is implicit when every existing value parses; if any
 * row is malformed the cast aborts and the migration rolls back inside the
 * transaction (ADS-403). Operators must clean stragglers in advance.
 *
 * The down-migration restores VARCHAR(64). Casting `cidr -> varchar` always
 * succeeds, so no data is lost on rollback.
 */
export default {
  up: async (queryInterface: QueryInterface) => {
    // Wrap the whole DDL in a transaction so a malformed row aborts the
    // entire migration rather than leaving the column half-converted.
    await runInTransaction(queryInterface, async t => {
      await queryInterface.sequelize.query(
        'ALTER TABLE ip_rules ALTER COLUMN cidr TYPE CIDR USING cidr::CIDR',
        { transaction: t }
      );
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await runInTransaction(queryInterface, async t => {
      await queryInterface.sequelize.query(
        'ALTER TABLE ip_rules ALTER COLUMN cidr TYPE VARCHAR(64) USING cidr::TEXT',
        { transaction: t }
      );
    });
  },
};
