/**
 * Transactional bulk-insert helper for demo seeders.
 *
 * Uses bulkCreate with ignoreDuplicates so re-running a partial seed
 * does not error on rows that already exist. Wraps the insert in a
 * transaction so a mid-batch failure does not leave the table half-populated.
 */

import type { Model, ModelStatic, Transaction } from 'sequelize';
import sequelize from '../../sequelize';

type CreationAttributes<M extends Model> = M extends Model<infer _A, infer C> ? C : never;

export async function bulkInsert<M extends Model>(
  model: ModelStatic<M>,
  rows: ReadonlyArray<CreationAttributes<M>>,
  options: { transaction?: Transaction; chunkSize?: number } = {}
): Promise<void> {
  if (rows.length === 0) {
    return;
  }

  const run = async (transaction: Transaction): Promise<void> => {
    const chunkSize = options.chunkSize ?? 500;
    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize);
      await model.bulkCreate(chunk as never, {
        ignoreDuplicates: true,
        transaction,
        validate: false,
        hooks: false,
      });
    }
  };

  if (options.transaction) {
    await run(options.transaction);
    return;
  }

  await sequelize.transaction(run);
}
