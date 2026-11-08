import type { NatsConnection } from 'nats';
import type { Pool } from 'pg';

import { withTransaction } from '@adopt-dont-shop/events';
import type { SubjectType } from '@adopt-dont-shop/ops-contract';

import { chainEntry, GENESIS_HASH } from './access-chain.js';
import type {
  HistoryRecord,
  OperatorRecord,
  OpsStore,
  PlanRecord,
  SessionRecord,
  UnlockRecord,
} from './store.js';

// Arbitrary constant: serialises access_log appends so prev_hash is always the
// true predecessor even with concurrent invokes.
const ACCESS_LOG_LOCK_KEY = 7_302_024;

type OperatorRow = { operator_id: string; github_login: string; name: string | null };
type SessionRow = OperatorRow & { session_id: string; expires_at: Date };
type PlanRow = {
  plan_id: string;
  operator_id: string;
  rpc: string;
  request_hash: string;
  expires_at: Date;
  used_at: Date | null;
};
type UnlockRow = {
  unlock_id: string;
  operator_id: string;
  subject_type: SubjectType;
  subject_id: string | null;
  reason: string;
  ticket: string;
  created_at: Date;
  expires_at: Date;
};
type HistoryRow = {
  at: Date;
  rpc: string;
  kind: 'read' | 'write';
  mode: 'run' | 'preview' | 'execute';
  outcome: 'ok' | 'error';
  error_code: string | null;
  revealed_fields: string[];
};

const toOperator = (row: OperatorRow): OperatorRecord => ({
  operatorId: row.operator_id,
  login: row.github_login,
  name: row.name,
});

const toUnlock = (row: UnlockRow): UnlockRecord => ({
  unlockId: row.unlock_id,
  operatorId: row.operator_id,
  subjectType: row.subject_type,
  subjectId: row.subject_id,
  reason: row.reason,
  ticket: row.ticket,
  createdAt: row.created_at,
  expiresAt: row.expires_at,
});

const toPlan = (row: PlanRow): PlanRecord => ({
  planId: row.plan_id,
  operatorId: row.operator_id,
  rpc: row.rpc,
  requestHash: row.request_hash,
  expiresAt: row.expires_at,
  usedAt: row.used_at,
});

export const createPgStore = (pool: Pool, nats: NatsConnection): OpsStore => ({
  async upsertOperator(input, now) {
    const { rows } = await pool.query<OperatorRow>(
      `INSERT INTO operators (github_login, github_id, name, last_seen_at)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (github_login) DO UPDATE
         SET github_id = COALESCE(EXCLUDED.github_id, operators.github_id),
             name = EXCLUDED.name,
             last_seen_at = EXCLUDED.last_seen_at
       RETURNING operator_id, github_login, name`,
      [input.login, input.githubId, input.name, now]
    );
    return toOperator(rows[0]);
  },

  async touchOperator(operatorId, now) {
    await pool.query(`UPDATE operators SET last_seen_at = $2 WHERE operator_id = $1`, [
      operatorId,
      now,
    ]);
  },

  async createSession(input, now) {
    await pool.query(
      `INSERT INTO sessions (operator_id, token_hash, created_at, expires_at)
       VALUES ($1, $2, $3, $4)`,
      [input.operatorId, input.tokenHash, now, input.expiresAt]
    );
  },

  async findSession(tokenHash, now): Promise<SessionRecord | null> {
    const { rows } = await pool.query<SessionRow>(
      `SELECT s.session_id, s.expires_at, o.operator_id, o.github_login, o.name
         FROM sessions s JOIN operators o USING (operator_id)
        WHERE s.token_hash = $1 AND s.revoked_at IS NULL AND s.expires_at > $2`,
      [tokenHash, now]
    );
    const row = rows[0];
    return row
      ? { sessionId: row.session_id, expiresAt: row.expires_at, operator: toOperator(row) }
      : null;
  },

  async revokeSession(sessionId, now) {
    await pool.query(
      `UPDATE sessions SET revoked_at = $2 WHERE session_id = $1 AND revoked_at IS NULL`,
      [sessionId, now]
    );
  },

  async createPlan(plan, now) {
    await pool.query(
      `INSERT INTO plans (plan_id, operator_id, rpc, request_hash, created_at, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [plan.planId, plan.operatorId, plan.rpc, plan.requestHash, now, plan.expiresAt]
    );
  },

  async findPlan(planId) {
    const { rows } = await pool.query<PlanRow>(
      `SELECT plan_id, operator_id, rpc, request_hash, expires_at, used_at
         FROM plans WHERE plan_id = $1`,
      [planId]
    );
    return rows[0] ? toPlan(rows[0]) : null;
  },

  async markPlanUsed(planId, now) {
    const { rowCount } = await pool.query(
      `UPDATE plans SET used_at = $2 WHERE plan_id = $1 AND used_at IS NULL`,
      [planId, now]
    );
    return rowCount === 1;
  },

  async createUnlock(unlock, event) {
    await withTransaction({ pool, nats }, async ({ client, publish }) => {
      await client.query(
        `INSERT INTO unlocks
           (unlock_id, operator_id, subject_type, subject_id, reason, ticket, created_at, expires_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          unlock.unlockId,
          unlock.operatorId,
          unlock.subjectType,
          unlock.subjectId,
          unlock.reason,
          unlock.ticket,
          unlock.createdAt,
          unlock.expiresAt,
        ]
      );
      publish(event);
    });
  },

  async listActiveUnlocks(operatorId, now) {
    const { rows } = await pool.query<UnlockRow>(
      `SELECT unlock_id, operator_id, subject_type, subject_id, reason, ticket, created_at, expires_at
         FROM unlocks
        WHERE operator_id = $1 AND revoked_at IS NULL AND expires_at > $2
        ORDER BY created_at`,
      [operatorId, now]
    );
    return rows.map(toUnlock);
  },

  async revokeUnlock(operatorId, unlockId, now) {
    const { rowCount } = await pool.query(
      `UPDATE unlocks SET revoked_at = $3
        WHERE unlock_id = $2 AND operator_id = $1 AND revoked_at IS NULL AND expires_at > $3`,
      [operatorId, unlockId, now]
    );
    return rowCount === 1;
  },

  async revokeAllUnlocks(operatorId, now) {
    await pool.query(
      `UPDATE unlocks SET revoked_at = $2
        WHERE operator_id = $1 AND revoked_at IS NULL AND expires_at > $2`,
      [operatorId, now]
    );
  },

  async appendAccessLog(entry, events) {
    await withTransaction({ pool, nats }, async ({ client, publish }) => {
      await client.query('SELECT pg_advisory_xact_lock($1)', [ACCESS_LOG_LOCK_KEY]);
      const last = await client.query<{ hash: string }>(
        `SELECT hash FROM access_log ORDER BY id DESC LIMIT 1`
      );
      const chained = chainEntry(last.rows[0]?.hash ?? GENESIS_HASH, entry);
      await client.query(
        `INSERT INTO access_log
           (at, operator_id, rpc, kind, mode, outcome, error_code, plan_id, unlock_id,
            revealed_fields, request_hash, prev_hash, hash)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
        [
          chained.at,
          chained.operatorId,
          chained.rpc,
          chained.kind,
          chained.mode,
          chained.outcome,
          chained.errorCode,
          chained.planId,
          chained.unlockId,
          [...chained.revealedFields],
          chained.requestHash,
          chained.prevHash,
          chained.hash,
        ]
      );
      events.forEach(event => publish(event));
    });
  },

  async listHistory(operatorId, limit): Promise<HistoryRecord[]> {
    const { rows } = await pool.query<HistoryRow>(
      `SELECT at, rpc, kind, mode, outcome, error_code, revealed_fields
         FROM access_log WHERE operator_id = $1 ORDER BY id DESC LIMIT $2`,
      [operatorId, limit]
    );
    return rows.map(row => ({
      at: row.at.toISOString(),
      rpc: row.rpc,
      kind: row.kind,
      mode: row.mode,
      outcome: row.outcome,
      errorCode: row.error_code,
      revealedFields: row.revealed_fields,
    }));
  },
});
