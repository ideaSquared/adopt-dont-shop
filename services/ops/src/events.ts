import { randomUUID } from 'node:crypto';

import type { DomainEvent } from '@adopt-dont-shop/events';

// `ops.actionTaken` events, in the AuditEventPayload shape services/audit
// consumes (services/audit/src/nats/event-types.ts). audit_events.aggregate_id
// is a uuid, so every event names a uuid aggregate: the unlock, the plan, or the
// operator. Payloads carry names and ids only, never revealed values.

type ActionInput = {
  operatorId: string;
  aggregateType: 'unlock' | 'plan' | 'operator';
  aggregateId: string;
  action: string;
  details: Record<string, unknown>;
  now: Date;
};

const actionTaken = (input: ActionInput): DomainEvent => ({
  type: 'ops.actionTaken',
  id: `ops.actionTaken.${randomUUID()}`,
  payload: {
    eventId: randomUUID(),
    service: 'service.ops',
    subject: 'ops.actionTaken',
    aggregateType: input.aggregateType,
    aggregateId: input.aggregateId,
    actorUserId: input.operatorId,
    action: input.action,
    outcome: 'success',
    occurredAt: input.now.toISOString(),
    payload: input.details,
  },
});

export const unlockCreatedEvent = (params: {
  operatorId: string;
  unlockId: string;
  subjectType: string;
  subjectId: string | null;
  ticket: string;
  ttlMinutes: number;
  reason: string;
  now: Date;
}): DomainEvent =>
  actionTaken({
    operatorId: params.operatorId,
    aggregateType: 'unlock',
    aggregateId: params.unlockId,
    action: 'unlock.created',
    details: {
      subjectType: params.subjectType,
      subjectId: params.subjectId,
      ticket: params.ticket,
      ttlMinutes: params.ttlMinutes,
      // Operator-written justification; revealed field values never appear here.
      reason: params.reason,
    },
    now: params.now,
  });

export const piiRevealedEvent = (params: {
  operatorId: string;
  rpc: string;
  unlockId: string;
  revealedFields: readonly string[];
  now: Date;
}): DomainEvent =>
  actionTaken({
    operatorId: params.operatorId,
    aggregateType: 'operator',
    aggregateId: params.operatorId,
    action: 'pii.revealed',
    details: {
      rpc: params.rpc,
      unlockId: params.unlockId,
      revealedFields: params.revealedFields,
    },
    now: params.now,
  });

export const writeExecutedEvent = (params: {
  operatorId: string;
  rpc: string;
  planId: string;
  requestHash: string;
  now: Date;
}): DomainEvent =>
  actionTaken({
    operatorId: params.operatorId,
    aggregateType: 'plan',
    aggregateId: params.planId,
    action: 'write.executed',
    details: { rpc: params.rpc, requestHash: params.requestHash },
    now: params.now,
  });

export const sessionOpenedEvent = (params: {
  operatorId: string;
  login: string;
  authMode: 'github' | 'local';
  sessionId: string;
  expiresAt: Date;
  now: Date;
}): DomainEvent =>
  actionTaken({
    operatorId: params.operatorId,
    aggregateType: 'operator',
    aggregateId: params.operatorId,
    action: 'login',
    // Never the session token or its hash.
    details: {
      login: params.login,
      authMode: params.authMode,
      sessionId: params.sessionId,
      expiresAt: params.expiresAt.toISOString(),
    },
    now: params.now,
  });

export const sessionRevokedEvent = (params: {
  operatorId: string;
  login: string;
  sessionId: string;
  now: Date;
}): DomainEvent =>
  actionTaken({
    operatorId: params.operatorId,
    aggregateType: 'operator',
    aggregateId: params.operatorId,
    action: 'logout',
    details: { login: params.login, sessionId: params.sessionId },
    now: params.now,
  });
