/**
 * ADS-601: create the `foster_placements` table.
 *
 * The `FosterPlacement` model (commit 3590d66, "feat(foster): add foster
 * placement coordination") was shipped without a matching migration, so
 * any environment that has run migrations is missing the table and all
 * `/api/v1/foster/placements` requests fail with "relation does not exist".
 *
 * Frozen `createTable` body matches `models/FosterPlacement.ts`:
 *   - paranoid + timestamped + underscored
 *   - 4 standard indexes (pet_id, foster_user_id, rescue_id, status)
 *   - 1 partial unique index enforcing one ACTIVE placement per pet,
 *     soft-deletes excluded so historical rows do not block a new
 *     placement after the previous one is cancelled or completed.
 *
 * FK references are declared inline; the parent tables (pets, users,
 * rescues) already exist when this forward migration runs.
 */
import { DataTypes, type QueryInterface } from 'sequelize';
import {
  assertDestructiveDownAcknowledged,
  dropEnumTypeIfExists,
  runInTransaction,
  tableExists,
} from './_helpers';

const MIGRATION_KEY = '03-create-foster-placements';

const FOSTER_PLACEMENT_STATUSES = ['active', 'completed', 'cancelled'] as const;

export default {
  up: async (queryInterface: QueryInterface) => {
    // ADS-784: idempotency guard. `00-baseline.ts` sync() already creates this
    // table on a clean DB and sorts before this migration, so without the guard
    // db:migrate aborts re-creating it. No-op when the table already exists;
    // creates it on a truly fresh object. (Deliberate, approved edit to an
    // existing migration — it never worked from a clean DB.)
    if (await tableExists(queryInterface, 'foster_placements')) {
      return;
    }
    await runInTransaction(queryInterface, async transaction => {
      await queryInterface.createTable(
        'foster_placements',
        {
          placement_id: {
            type: DataTypes.UUID,
            primaryKey: true,
            allowNull: false,
          },
          pet_id: {
            type: DataTypes.UUID,
            allowNull: false,
            references: { model: 'pets', key: 'pet_id' },
            onDelete: 'CASCADE',
          },
          foster_user_id: {
            type: DataTypes.UUID,
            allowNull: false,
            references: { model: 'users', key: 'user_id' },
            onDelete: 'RESTRICT',
          },
          rescue_id: {
            type: DataTypes.UUID,
            allowNull: false,
            references: { model: 'rescues', key: 'rescue_id' },
            onDelete: 'CASCADE',
          },
          start_date: {
            type: DataTypes.DATE,
            allowNull: false,
          },
          end_date: {
            type: DataTypes.DATE,
            allowNull: true,
          },
          status: {
            type: DataTypes.ENUM(...FOSTER_PLACEMENT_STATUSES),
            allowNull: false,
            defaultValue: 'active',
          },
          notes: {
            type: DataTypes.TEXT,
            allowNull: true,
          },
          created_at: {
            type: DataTypes.DATE,
            allowNull: false,
          },
          updated_at: {
            type: DataTypes.DATE,
            allowNull: false,
          },
          deleted_at: {
            type: DataTypes.DATE,
            allowNull: true,
          },
        },
        { transaction }
      );

      await queryInterface.addIndex('foster_placements', {
        fields: ['pet_id'],
        name: 'foster_placements_pet_id_idx',
        transaction,
      });
      await queryInterface.addIndex('foster_placements', {
        fields: ['foster_user_id'],
        name: 'foster_placements_foster_user_id_idx',
        transaction,
      });
      await queryInterface.addIndex('foster_placements', {
        fields: ['rescue_id'],
        name: 'foster_placements_rescue_id_idx',
        transaction,
      });
      await queryInterface.addIndex('foster_placements', {
        fields: ['status'],
        name: 'foster_placements_status_idx',
        transaction,
      });
      await queryInterface.addIndex('foster_placements', {
        fields: ['pet_id'],
        name: 'foster_placements_active_pet_unique',
        unique: true,
        where: { status: 'active', deleted_at: null },
        transaction,
      });
    });
  },

  down: async (queryInterface: QueryInterface) => {
    assertDestructiveDownAcknowledged(MIGRATION_KEY);
    await runInTransaction(queryInterface, async transaction => {
      await queryInterface.dropTable('foster_placements', { transaction });
    });
    await dropEnumTypeIfExists(queryInterface.sequelize, 'enum_foster_placements_status');
  },
};
