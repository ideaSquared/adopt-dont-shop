/**
 * Add `idempotency_key` to email_queue to make scheduled-report email
 * sends idempotent on BullMQ retry.
 *
 * The reports.worker render-and-email handler loops over a recipients
 * array and calls emailService.sendEmail for each one. If the worker
 * crashes after sending to recipients [0..2] of [0..4], BullMQ retries
 * the entire job — and the first three recipients get duplicate emails
 * while the last two finally get the original.
 *
 * Fix: callers that need idempotency (reports.worker) compute a stable
 * key per (schedule, recipient, format, dispatch-window) tuple. The
 * email service uses findOrCreate on that key. The second attempt with
 * the same key short-circuits ("already sent") instead of re-queueing.
 *
 * Other senders (password-reset, transactional notifications) pass no
 * key — column stays NULL and the uniqueness predicate does not apply,
 * so existing call sites are unaffected.
 *
 * Index is partial (WHERE idempotency_key IS NOT NULL) so the bulk of
 * email_queue rows — which have no key — don't bloat the index, and
 * Postgres can still allow many concurrent NULL rows. Built
 * CONCURRENTLY because email_queue is a hot, append-only table.
 */
import { DataTypes, type QueryInterface } from 'sequelize';
import { createIndexConcurrently, dropIndexConcurrently, runInTransaction } from './_helpers';

const INDEX_NAME = 'email_queue_idempotency_key_uidx';

export default {
  up: async (queryInterface: QueryInterface): Promise<void> => {
    await runInTransaction(queryInterface, async t => {
      await queryInterface.addColumn(
        'email_queue',
        'idempotency_key',
        {
          type: DataTypes.STRING(64),
          allowNull: true,
        },
        { transaction: t }
      );
    });
    await createIndexConcurrently(queryInterface.sequelize, {
      name: INDEX_NAME,
      table: 'email_queue',
      columns: ['idempotency_key'],
      unique: true,
      where: 'idempotency_key IS NOT NULL',
    });
  },

  down: async (queryInterface: QueryInterface): Promise<void> => {
    await dropIndexConcurrently(queryInterface.sequelize, INDEX_NAME);
    await runInTransaction(queryInterface, async t => {
      await queryInterface.removeColumn('email_queue', 'idempotency_key', { transaction: t });
    });
  },
};
