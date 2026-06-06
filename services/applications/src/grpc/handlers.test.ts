import { describe, expect, it, vi } from 'vitest';

import {
  ApplicationsV1,
  type SaveDraftAnswersRequest,
  type SubmitDraftRequest,
} from '@adopt-dont-shop/proto';

import { HandlerError, type HandlerDeps } from './adapter.js';
import { saveDraftAnswers, submitDraft } from './handlers.js';

function makePrincipal(
  overrides: Partial<{ userId: string; permissions: string[]; roles: string[] }> = {}
) {
  return {
    userId: overrides.userId ?? 'usr-1',
    roles: overrides.roles ?? ['adopter'],
    permissions: overrides.permissions ?? ['applications.create', 'applications.update'],
    rescueId: undefined,
  } as unknown as Parameters<typeof submitDraft>[1];
}

// The event-store helpers run SQL through the transaction client. We
// drive a scripted query mock: each handler's loadAggregate is the
// first query, then appendEvents INSERTs, then projectReadModel.
function makeDeps(eventRows: Array<unknown>): {
  deps: HandlerDeps;
  query: ReturnType<typeof vi.fn>;
} {
  const query = vi.fn();
  // First call = loadAggregate SELECT. Return the scripted event rows.
  query.mockResolvedValueOnce({ rows: eventRows });
  // Every subsequent call (INSERTs, UPSERT) resolves empty.
  query.mockResolvedValue({ rows: [] });
  const pool = { query } as unknown as HandlerDeps['pool'];
  return { deps: { pool, nats: {} } as unknown as HandlerDeps, query };
}

vi.mock('@adopt-dont-shop/events', async () => {
  const actual =
    await vi.importActual<typeof import('@adopt-dont-shop/events')>('@adopt-dont-shop/events');
  return {
    ...actual,
    withTransaction: async (
      deps: { pool: { query: ReturnType<typeof vi.fn> } },
      fn: (scope: {
        client: { query: ReturnType<typeof vi.fn> };
        publish: ReturnType<typeof vi.fn>;
      }) => Promise<unknown>
    ) => {
      const publish = vi.fn();
      const client = { query: deps.pool.query };
      const result = await fn({ client, publish });
      (deps as { _publish?: ReturnType<typeof vi.fn> })._publish = publish;
      return result;
    },
  };
});

// A draftCreated event row for an aggregate already in 'draft' state at
// version 1.
function draftCreatedRow(aggregateId: string, adopterId = 'usr-1') {
  return {
    event_type: 'draftCreated',
    version: 1,
    event_data: {
      type: 'draftCreated',
      applicationId: aggregateId,
      adopterId,
      petId: 'pet-1',
      rescueId: '',
      at: '2026-06-01T12:00:00.000Z',
    },
  };
}

describe('saveDraftAnswers', () => {
  it('throws PERMISSION_DENIED without applications.update', async () => {
    const { deps } = makeDeps([]);
    await expect(
      saveDraftAnswers(deps, makePrincipal({ permissions: [] }), {
        applicationId: 'app-1',
        expectedVersion: 1,
        answersPatchJson: '{}',
      } as SaveDraftAnswersRequest)
    ).rejects.toBeInstanceOf(HandlerError);
  });

  it('throws INVALID_ARGUMENT on missing application_id', async () => {
    const { deps } = makeDeps([]);
    await expect(
      saveDraftAnswers(deps, makePrincipal(), {
        applicationId: '',
        expectedVersion: 1,
        answersPatchJson: '{}',
      } as SaveDraftAnswersRequest)
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
  });

  it('throws INVALID_ARGUMENT on malformed answers_patch_json', async () => {
    const { deps } = makeDeps([draftCreatedRow('app-1')]);
    await expect(
      saveDraftAnswers(deps, makePrincipal(), {
        applicationId: 'app-1',
        expectedVersion: 1,
        answersPatchJson: 'not-json',
      } as SaveDraftAnswersRequest)
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
  });

  it('throws INVALID_ARGUMENT when references_json is not an array', async () => {
    const { deps } = makeDeps([draftCreatedRow('app-1')]);
    await expect(
      saveDraftAnswers(deps, makePrincipal(), {
        applicationId: 'app-1',
        expectedVersion: 1,
        answersPatchJson: '{}',
        referencesJson: '{"not":"array"}',
      })
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
  });

  it('saves an answers patch + publishes applications.draftUpdated', async () => {
    const { deps } = makeDeps([draftCreatedRow('app-1')]);
    const res = await saveDraftAnswers(deps, makePrincipal(), {
      applicationId: 'app-1',
      expectedVersion: 1,
      answersPatchJson: '{"hasYard":true}',
    } as SaveDraftAnswersRequest);
    expect(res.application.applicationId).toBe('app-1');
    const data = JSON.parse(res.application.answersJson) as Record<string, unknown>;
    expect(data.hasYard).toBe(true);
    const publish = (deps as { _publish?: ReturnType<typeof vi.fn> })._publish!;
    expect(publish.mock.calls[0][0]).toMatchObject({ type: 'applications.draftUpdated' });
  });

  it('accepts a valid references_json array', async () => {
    const { deps } = makeDeps([draftCreatedRow('app-1')]);
    const res = await saveDraftAnswers(deps, makePrincipal(), {
      applicationId: 'app-1',
      expectedVersion: 1,
      answersPatchJson: '{}',
      referencesJson: '[{"name":"Jane","email":"j@e.com","relationship":"friend"}]',
    });
    const refs = JSON.parse(res.application.referencesJson) as Array<Record<string, string>>;
    expect(refs[0]).toMatchObject({ name: 'Jane', email: 'j@e.com', relationship: 'friend' });
  });
});

describe('submitDraft', () => {
  it('throws PERMISSION_DENIED without applications.update', async () => {
    const { deps } = makeDeps([]);
    await expect(
      submitDraft(deps, makePrincipal({ permissions: [] }), {
        applicationId: 'app-1',
        expectedVersion: 1,
      } as SubmitDraftRequest)
    ).rejects.toBeInstanceOf(HandlerError);
  });

  it('throws INVALID_ARGUMENT on missing application_id', async () => {
    const { deps } = makeDeps([]);
    await expect(
      submitDraft(deps, makePrincipal(), {
        applicationId: '',
        expectedVersion: 1,
      } as SubmitDraftRequest)
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
  });

  it('submits a draft + publishes applications.submitted', async () => {
    const { deps } = makeDeps([draftCreatedRow('app-1')]);
    const res = await submitDraft(deps, makePrincipal(), {
      applicationId: 'app-1',
      expectedVersion: 1,
    } as SubmitDraftRequest);
    expect(res.application.status).toBe(
      ApplicationsV1.ApplicationStatus.APPLICATION_STATUS_SUBMITTED
    );
    const publish = (deps as { _publish?: ReturnType<typeof vi.fn> })._publish!;
    expect(publish.mock.calls[0][0]).toMatchObject({ type: 'applications.submitted' });
  });

  it('surfaces a domain ILLEGAL_TRANSITION as INVALID_ARGUMENT (double submit)', async () => {
    // An already-submitted aggregate: draftCreated (v1) + draftSubmitted
    // (v2). Submitting again is an illegal transition.
    const { deps } = makeDeps([
      draftCreatedRow('app-1'),
      {
        event_type: 'draftSubmitted',
        version: 2,
        event_data: {
          type: 'draftSubmitted',
          applicationId: 'app-1',
          at: '2026-06-01T12:05:00.000Z',
        },
      },
    ]);
    await expect(
      submitDraft(deps, makePrincipal(), { applicationId: 'app-1', expectedVersion: 2 })
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
  });
});
