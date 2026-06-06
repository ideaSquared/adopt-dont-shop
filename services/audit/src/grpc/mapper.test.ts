import { describe, expect, it } from 'vitest';

import { AuditV1 } from '@adopt-dont-shop/proto';

import { rowToProto, type AuditEventRow } from './mapper.js';

function baseRow(overrides: Partial<AuditEventRow> = {}): AuditEventRow {
  return {
    event_id: '11111111-1111-1111-1111-111111111111',
    service: 'service.auth',
    subject: 'auth.userLoggedIn',
    aggregate_type: 'user',
    aggregate_id: '22222222-2222-2222-2222-222222222222',
    actor_user_id: '33333333-3333-3333-3333-333333333333',
    actor_email_snapshot: 'user@example.com',
    action: 'login',
    outcome: 'success',
    occurred_at: new Date('2026-06-01T12:00:00.000Z'),
    recorded_at: new Date('2026-06-01T12:00:01.500Z'),
    payload: { source: 'web', ip: '1.2.3.4' },
    ip_address: '1.2.3.4',
    user_agent: 'Mozilla/5.0',
    ...overrides,
  };
}

describe('rowToProto', () => {
  it('translates a fully-populated row to the AuditEvent proto', () => {
    const proto = rowToProto(baseRow());
    expect(proto).toEqual({
      eventId: '11111111-1111-1111-1111-111111111111',
      service: 'service.auth',
      subject: 'auth.userLoggedIn',
      aggregateType: 'user',
      aggregateId: '22222222-2222-2222-2222-222222222222',
      action: 'login',
      outcome: AuditV1.AuditOutcome.AUDIT_OUTCOME_SUCCESS,
      occurredAt: '2026-06-01T12:00:00.000Z',
      recordedAt: '2026-06-01T12:00:01.500Z',
      payloadJson: '{"source":"web","ip":"1.2.3.4"}',
      actorUserId: '33333333-3333-3333-3333-333333333333',
      actorEmailSnapshot: 'user@example.com',
      ipAddress: '1.2.3.4',
      userAgent: 'Mozilla/5.0',
    });
  });

  it('omits actor_user_id from the proto when the column is NULL (system event)', () => {
    const proto = rowToProto(
      baseRow({ actor_user_id: null, actor_email_snapshot: null, subject: 'pets.adopted' })
    );
    expect(proto.actorUserId).toBeUndefined();
    expect(proto.actorEmailSnapshot).toBeUndefined();
  });

  it('omits ip_address / user_agent when NULL (cron-originated event)', () => {
    const proto = rowToProto(baseRow({ ip_address: null, user_agent: null }));
    expect(proto.ipAddress).toBeUndefined();
    expect(proto.userAgent).toBeUndefined();
  });

  it('stringifies the JSONB payload', () => {
    const proto = rowToProto(baseRow({ payload: { complex: { nested: [1, 2, 3] } } }));
    expect(proto.payloadJson).toBe('{"complex":{"nested":[1,2,3]}}');
  });

  it('handles a NULL payload by emitting "{}"', () => {
    const proto = rowToProto(baseRow({ payload: null }));
    expect(proto.payloadJson).toBe('{}');
  });

  it.each([
    ['success', AuditV1.AuditOutcome.AUDIT_OUTCOME_SUCCESS],
    ['denied', AuditV1.AuditOutcome.AUDIT_OUTCOME_DENIED],
    ['failure', AuditV1.AuditOutcome.AUDIT_OUTCOME_FAILURE],
  ] as const)('maps outcome %s to %i', (db, proto) => {
    const event = rowToProto(baseRow({ outcome: db }));
    expect(event.outcome).toBe(proto);
  });

  it('throws on an unknown outcome (schema drift guard)', () => {
    expect(() => rowToProto(baseRow({ outcome: 'partial' }))).toThrowError();
  });

  it('serialises timestamps with millisecond precision', () => {
    const proto = rowToProto(
      baseRow({
        occurred_at: new Date('2026-06-01T12:00:00.123Z'),
        recorded_at: new Date('2026-06-01T12:00:01.987Z'),
      })
    );
    expect(proto.occurredAt).toBe('2026-06-01T12:00:00.123Z');
    expect(proto.recordedAt).toBe('2026-06-01T12:00:01.987Z');
  });
});
