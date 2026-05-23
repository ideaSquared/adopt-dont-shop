/**
 * Add a per-chat monotonic `sequence` column to messages so message
 * ordering is deterministic regardless of Socket.IO arrival order or
 * created_at tie-breaks.
 *
 * Per cross-app audit (third UX pass): chat messages had no total order —
 * two near-simultaneous sends could share a created_at value (millisecond
 * resolution) and ordering then fell back to insertion-order of the
 * Postgres rows, which is not guaranteed across replicas. A per-chat
 * integer sequence gives each message a deterministic position the
 * frontend can sort on after de-duping arrivals from REST + socket.
 *
 * Backfill: existing rows are renumbered with ROW_NUMBER() over
 * (chat_id, created_at, message_id) − 1 so the first message in a chat
 * starts at 0. The composite (chat_id, message_id) tiebreak makes the
 * backfill deterministic across re-runs (we never re-run, but a partial
 * migration that fails after column-add and before index-create can be
 * retried safely).
 *
 * Concurrency on new writes: the chat.service.sendMessage transaction
 * acquires `SELECT ... FOR UPDATE` on the chat row before computing the
 * next sequence. The unique `(chat_id, sequence)` index is a belt-and-
 * braces guard — if any future write path forgets to take the lock, the
 * unique violation surfaces the bug loudly rather than silently
 * corrupting message order.
 *
 * Index is built CONCURRENTLY (after the addColumn transaction commits)
 * to avoid a ShareLock on the messages table — consistent with the
 * project-wide pattern in `_helpers.ts`.
 */
import { DataTypes, type QueryInterface } from 'sequelize';
import {
  assertDestructiveDownAcknowledged,
  createIndexConcurrently,
  dropIndexConcurrently,
  runInTransaction,
} from './_helpers';

const INDEX_NAME = 'messages_chat_sequence_uidx';

export default {
  up: async (queryInterface: QueryInterface): Promise<void> => {
    await runInTransaction(queryInterface, async t => {
      // Step 1: add the column with a default of 0 so the addColumn does
      // not require a rewrite of the whole table while old rows still
      // sit at 0. We backfill real values in step 2 inside the same
      // transaction.
      await queryInterface.addColumn(
        'messages',
        'sequence',
        {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        { transaction: t }
      );

      // Step 2: backfill. ROW_NUMBER() partitioned by chat_id, ordered by
      // (created_at, message_id) so messages keep their existing visible
      // order. The -1 makes the first message in each chat sequence 0,
      // matching the COALESCE(MAX+1, 0) write path.
      await queryInterface.sequelize.query(
        `
          WITH numbered AS (
            SELECT
              message_id,
              ROW_NUMBER() OVER (
                PARTITION BY chat_id
                ORDER BY created_at, message_id
              ) - 1 AS seq
            FROM messages
          )
          UPDATE messages
          SET sequence = numbered.seq
          FROM numbered
          WHERE messages.message_id = numbered.message_id
        `,
        { transaction: t }
      );

      // Step 3: drop the default. New writes must supply an explicit
      // value computed under the per-chat lock — leaving the default at
      // 0 would let a forgotten field silently insert duplicate-0 rows
      // until the unique index rejected the second one.
      await queryInterface.sequelize.query(
        'ALTER TABLE messages ALTER COLUMN sequence DROP DEFAULT',
        { transaction: t }
      );
    });

    // Step 4: composite unique index (chat_id, sequence). Built outside
    // the transaction because CREATE INDEX CONCURRENTLY cannot run
    // inside one — same constraint that drives the helpers' shape.
    await createIndexConcurrently(queryInterface.sequelize, {
      name: INDEX_NAME,
      table: 'messages',
      columns: ['chat_id', 'sequence'],
      unique: true,
    });
  },

  down: async (queryInterface: QueryInterface): Promise<void> => {
    assertDestructiveDownAcknowledged('08-add-message-sequence');
    await dropIndexConcurrently(queryInterface.sequelize, INDEX_NAME);
    await runInTransaction(queryInterface, async t => {
      await queryInterface.removeColumn('messages', 'sequence', { transaction: t });
    });
  },
};
