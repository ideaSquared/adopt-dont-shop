import type { DomainEvent } from '@adopt-dont-shop/events';
import type { SubjectType } from '@adopt-dont-shop/ops-contract';

import type { AccessLogEntry } from './access-chain.js';

export type OperatorRecord = {
  operatorId: string;
  login: string;
  name: string | null;
};

export type SessionRecord = {
  sessionId: string;
  expiresAt: Date;
  operator: OperatorRecord;
};

export type PlanRecord = {
  planId: string;
  operatorId: string;
  rpc: string;
  requestHash: string;
  expiresAt: Date;
  usedAt: Date | null;
};

export type UnlockRecord = {
  unlockId: string;
  operatorId: string;
  subjectType: SubjectType;
  subjectId: string | null;
  reason: string;
  ticket: string;
  createdAt: Date;
  expiresAt: Date;
};

export type NewUnlock = UnlockRecord;

export type HistoryRecord = Pick<
  AccessLogEntry,
  'at' | 'rpc' | 'kind' | 'mode' | 'outcome' | 'errorCode' | 'revealedFields'
>;

// Persistence port for service.ops. The Postgres implementation is pg-store.ts;
// tests use an in-memory fake. Methods that stage a domain event take it as an
// argument so the implementation can write the row and the event atomically
// (event_outbox, via withTransaction).
export type OpsStore = {
  upsertOperator(
    input: { login: string; githubId: number | null; name: string | null },
    now: Date
  ): Promise<OperatorRecord>;
  touchOperator(operatorId: string, now: Date): Promise<void>;

  createSession(
    input: { operatorId: string; tokenHash: string; expiresAt: Date },
    now: Date
  ): Promise<void>;
  // Live sessions only: not revoked, not expired.
  findSession(tokenHash: string, now: Date): Promise<SessionRecord | null>;
  revokeSession(sessionId: string, now: Date): Promise<void>;

  createPlan(plan: Omit<PlanRecord, 'usedAt'>, now: Date): Promise<void>;
  findPlan(planId: string): Promise<PlanRecord | null>;
  // Atomically consumes the plan; false when it was already used.
  markPlanUsed(planId: string, now: Date): Promise<boolean>;

  createUnlock(unlock: NewUnlock, event: DomainEvent): Promise<void>;
  listActiveUnlocks(operatorId: string, now: Date): Promise<UnlockRecord[]>;
  revokeUnlock(operatorId: string, unlockId: string, now: Date): Promise<boolean>;
  revokeAllUnlocks(operatorId: string, now: Date): Promise<void>;

  // Appends one hash-chained row and publishes `events` in the same transaction.
  appendAccessLog(entry: AccessLogEntry, events: readonly DomainEvent[]): Promise<void>;
  listHistory(operatorId: string, limit: number): Promise<HistoryRecord[]>;
};
