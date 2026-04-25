import { InitOptions, Model } from 'sequelize';
import { getUuidType } from '../sequelize';
import { getUserId } from '../utils/request-context';

/**
 * Standard audit columns added to every transactional model:
 *
 *   created_by  UUID NULL  — the userId of whoever inserted the row.
 *                            Set automatically by the beforeCreate hook from
 *                            the AsyncLocalStorage request context. Null for
 *                            system-created rows (seeders, jobs).
 *   updated_by  UUID NULL  — same idea, refreshed on every UPDATE.
 *
 * Plus model-level `version: true` for optimistic concurrency:
 *   - Sequelize adds a `version` column (default 0) and rewrites every
 *     model.save / model.update with `WHERE id = ? AND version = ?`.
 *   - A stale write throws OptimisticLockError instead of silently winning.
 *   - Keeps `Model.increment` callers honest too — they pass through the
 *     same lock check.
 *
 * Helpers below let each model opt in with two lines: spread the column
 * defs into init's first arg, spread the options into init's second arg.
 */

export const auditColumns = {
  created_by: {
    type: getUuidType(),
    allowNull: true,
    references: { model: 'users', key: 'user_id' },
    onDelete: 'SET NULL' as const,
  },
  updated_by: {
    type: getUuidType(),
    allowNull: true,
    references: { model: 'users', key: 'user_id' },
    onDelete: 'SET NULL' as const,
  },
};

/**
 * Hooks that stamp created_by / updated_by from the request context.
 * Composed (not replaced) with any model-specific hooks — Sequelize merges
 * them by name when both define the same hook.
 */
const stampCreatedBy = (instance: Model): void => {
  const userId = getUserId();
  // Don't overwrite an explicitly-set value (services that need to attribute
  // a create to a different actor — e.g. admin acting on behalf of a user —
  // can pass created_by directly).
  if (userId && !instance.getDataValue('created_by')) {
    instance.setDataValue('created_by', userId);
  }
  if (userId && !instance.getDataValue('updated_by')) {
    instance.setDataValue('updated_by', userId);
  }
};

const stampUpdatedBy = (instance: Model): void => {
  const userId = getUserId();
  if (userId) {
    instance.setDataValue('updated_by', userId);
  }
};

/**
 * Merge audit hooks into an existing init options block. Preserves any
 * model-specific beforeCreate / beforeUpdate the model already declares.
 *
 * Typed as `InitOptions<any>` because Sequelize's hook callback types are
 * generic over the model class — model-specific options literals widen
 * cleanly to this signature on the way in and the way out.
 */
export const withAuditHooks = <M extends Model>(options: InitOptions<M>): InitOptions<M> => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const existing: any = options.hooks ?? {};
  return {
    ...options,
    version: true,
    hooks: {
      ...existing,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      beforeCreate: async (instance: Model, opts: any) => {
        stampCreatedBy(instance);
        if (existing.beforeCreate) {
          await existing.beforeCreate(instance, opts);
        }
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      beforeUpdate: async (instance: Model, opts: any) => {
        stampUpdatedBy(instance);
        if (existing.beforeUpdate) {
          await existing.beforeUpdate(instance, opts);
        }
      },
    },
  };
};

/**
 * Indexes covering the FK columns added above. Each transactional model
 * spreads these into its `indexes` array.
 */
export const auditIndexes = (tableName: string) => [
  { fields: ['created_by'], name: `${tableName}_created_by_idx` },
  { fields: ['updated_by'], name: `${tableName}_updated_by_idx` },
];
