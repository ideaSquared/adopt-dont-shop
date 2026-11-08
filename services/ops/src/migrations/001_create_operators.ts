import type { MigrationBuilder } from 'node-pg-migrate';

// ops.operators — one row per developer who has logged in. `github_id` is the
// stable GitHub account id (logins can be renamed, and a released login can be
// taken by someone else), so it is the identity key and `github_login` is NOT
// globally unique. It is NULL for the dev-only local login, which has no GitHub
// identity and is keyed by login instead (partial unique index below).
export const up = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.createTable('operators', {
    operator_id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    github_login: { type: 'varchar(39)', notNull: true },
    github_id: { type: 'bigint', unique: true },
    name: { type: 'text' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    last_seen_at: { type: 'timestamptz' },
  });
  pgm.createIndex('operators', 'github_login', {
    name: 'operators_local_login_key',
    unique: true,
    where: 'github_id IS NULL',
  });
};

export const down = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.dropTable('operators');
};
