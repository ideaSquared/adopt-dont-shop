// Audit trail for application review decisions. Unlike review-handlers.test.ts
// (which stubs withTransaction), this runs the real withTransaction against a
// fake pool so "published only on commit" is exercised end to end.
import { describe, expect, it, vi } from 'vitest';

import { makeNatsDouble } from '@adopt-dont-shop/test-utils';

import type { HandlerDeps } from './adapter.js';
import { approve, reject, withdraw } from './review-handlers.js';

type Principal = Parameters<typeof approve>[1];

const principal = {
  userId: 'staff-1',
  roles: ['rescue_staff'],
  permissions: ['applications.approve', 'applications.reject', 'applications.update'],
  rescueId: 'rsc-1',
} as unknown as Principal;

function ev(type: string, version: number, extra: Record<string, unknown> = {}) {
  return {
    event_type: type,
    version,
    event_data: { type, applicationId: 'app-1', at: `2026-06-0${version}T12:00:00.000Z`, ...extra },
  };
}

const submittedStream = () => [
  ev('draftCreated', 1, { adopterId: 'usr-1', petId: 'pet-1', rescueId: 'rsc-1' }),
  ev('draftSubmitted', 2),
];

const decidableStream = () => [
  ...submittedStream(),
  ev('reviewStarted', 3, { actorUserId: 'staff-1', note: null }),
  ev('homeVisitScheduled', 4, {
    scheduledAt: '2026-06-10T14:00:00.000Z',
    actorUserId: 'staff-1',
    note: null,
  }),
  ev('homeVisitCompleted', 5, { outcome: 'passed', actorUserId: 'staff-1', notes: null }),
];

// A pool whose transaction client serves the event stream on the first read.
// `failOn` makes any statement containing that text throw, to force a rollback.
function setup(eventRows: unknown[], failOn?: string) {
  const statements: string[] = [];
  let loaded = false;
  const query = vi.fn(async (sql: string) => {
    statements.push(sql);
    if (failOn !== undefined && sql.includes(failOn)) {
      throw new Error('boom');
    }
    if (!loaded && sql.includes('application_events')) {
      loaded = true;
      return { rows: eventRows };
    }
    return { rows: [] };
  });
  const client = { query, release: vi.fn() };
  const pool = { query, connect: async () => client } as unknown as HandlerDeps['pool'];
  const nats = makeNatsDouble();
  return { deps: { pool, nats: nats.connection } as HandlerDeps, nats, statements };
}

function auditEvents(nats: ReturnType<typeof makeNatsDouble>) {
  const decoder = new TextDecoder();
  return nats.publishSpy.mock.calls
    .filter(([subject]) => subject === 'applications.actionTaken')
    .map(
      ([, data]) =>
        JSON.parse(decoder.decode(data as Uint8Array)) as {
          id: string;
          payload: Record<string, unknown>;
        }
    );
}

describe('application review audit trail', () => {
  it('approve publishes one applications.actionTaken on commit', async () => {
    const { deps, nats } = setup(decidableStream());
    await approve(deps, principal, { applicationId: 'app-1', notes: 'private note' });

    const events = auditEvents(nats);
    expect(events).toHaveLength(1);
    expect(events[0].payload).toMatchObject({
      eventId: expect.stringMatching(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
      ),
      service: 'service.applications',
      subject: 'applications.actionTaken',
      aggregateType: 'application',
      aggregateId: 'app-1',
      actorUserId: 'staff-1',
      action: 'approve',
      outcome: 'success',
      payload: { adopterId: 'usr-1', petId: 'pet-1', rescueId: 'rsc-1' },
    });
    expect(JSON.stringify(events[0])).not.toContain('private note');
  });

  it('reject records the reason', async () => {
    const { deps, nats } = setup(decidableStream());
    await reject(deps, principal, { applicationId: 'app-1', reason: 'home unsuitable' });

    expect(auditEvents(nats)[0].payload).toMatchObject({
      action: 'reject',
      actorUserId: 'staff-1',
      payload: { petId: 'pet-1', reason: 'home unsuitable' },
    });
  });

  it('withdraw by the owning adopter records the adopter as actor', async () => {
    const adopter = {
      userId: 'usr-1',
      roles: ['adopter'],
      permissions: ['applications.update'],
    } as unknown as Principal;
    const { deps, nats } = setup(submittedStream());
    await withdraw(deps, adopter, { applicationId: 'app-1', reason: 'found another pet' });

    expect(auditEvents(nats)[0].payload).toMatchObject({
      action: 'withdraw',
      actorUserId: 'usr-1',
      payload: { reason: 'found another pet' },
    });
  });

  it('gives each decision its own message id, versioned by the aggregate', async () => {
    const approved = setup(decidableStream());
    await approve(approved.deps, principal, { applicationId: 'app-1' });
    const rejected = setup(decidableStream());
    await reject(rejected.deps, principal, { applicationId: 'app-1', reason: 'no' });

    const [a] = auditEvents(approved.nats);
    const [r] = auditEvents(rejected.nats);
    expect(a.id).toBe('applications.actionTaken.approve.app-1:6');
    expect(r.id).toBe('applications.actionTaken.reject.app-1:6');
    expect(a.id).not.toBe(r.id);
  });

  it('publishes nothing when the write rolls back', async () => {
    const { deps, nats, statements } = setup(decidableStream(), 'INSERT INTO applications');
    await expect(approve(deps, principal, { applicationId: 'app-1' })).rejects.toThrow('boom');

    expect(statements).toContain('ROLLBACK');
    expect(nats.publishSpy).not.toHaveBeenCalled();
  });

  it('publishes nothing when the decision is refused', async () => {
    const { deps, nats } = setup(submittedStream());
    await expect(approve(deps, principal, { applicationId: 'app-1' })).rejects.toMatchObject({
      code: 'INVALID_ARGUMENT',
    });
    expect(nats.publishSpy).not.toHaveBeenCalled();
  });
});
