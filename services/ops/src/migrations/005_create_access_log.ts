import type { MigrationBuilder } from 'node-pg-migrate';

// ops.access_log — append-only, hash-chained record of every invoke (ok or
// error). hash = sha256(prev_hash || canonical row json); the chain is computed
// in application code (src/access-chain.ts) under an advisory lock.
//
// Immutability is enforced in the database with no escape hatch: row triggers
// reject UPDATE and DELETE and a statement trigger rejects TRUNCATE. There is
// deliberately no session setting, role check or flag that bypasses them.
export const up = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.createTable('access_log', {
    id: { type: 'bigserial', primaryKey: true },
    at: { type: 'timestamptz', notNull: true },
    operator_id: { type: 'uuid', notNull: true },
    rpc: { type: 'text', notNull: true },
    kind: { type: 'text', notNull: true },
    mode: { type: 'text', notNull: true },
    outcome: { type: 'text', notNull: true },
    error_code: { type: 'text' },
    plan_id: { type: 'uuid' },
    unlock_id: { type: 'uuid' },
    revealed_fields: { type: 'text[]', notNull: true, default: '{}' },
    request_hash: { type: 'char(64)' },
    prev_hash: { type: 'char(64)', notNull: true },
    hash: { type: 'char(64)', notNull: true, unique: true },
  });
  pgm.createIndex('access_log', ['operator_id', { name: 'id', sort: 'DESC' }], {
    name: 'access_log_operator_idx',
  });

  pgm.createFunction(
    'access_log_reject_mutation',
    [],
    { returns: 'trigger', language: 'plpgsql', replace: true },
    `BEGIN
  RAISE EXCEPTION 'ops.access_log is append-only (% rejected)', TG_OP
    USING ERRCODE = 'restrict_violation';
END;`
  );
  pgm.createTrigger('access_log', 'access_log_no_update_delete', {
    when: 'BEFORE',
    operation: ['UPDATE', 'DELETE'],
    level: 'ROW',
    function: 'access_log_reject_mutation',
  });
  pgm.createTrigger('access_log', 'access_log_no_truncate', {
    when: 'BEFORE',
    operation: 'TRUNCATE',
    level: 'STATEMENT',
    function: 'access_log_reject_mutation',
  });
};

export const down = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.dropTrigger('access_log', 'access_log_no_truncate');
  pgm.dropTrigger('access_log', 'access_log_no_update_delete');
  pgm.dropFunction('access_log_reject_mutation', []);
  pgm.dropTable('access_log');
};
