import { describe, expect, it, vi } from 'vitest';

import {
  ApplicationsV1,
  type SaveDraftAnswersRequest,
  type SubmitDraftRequest,
} from '@adopt-dont-shop/proto';

import { HandlerError, type HandlerDeps } from './adapter.js';
import { makeStartDraft, saveDraftAnswers, submitDraft } from './handlers.js';
import type { PetsClient } from './pets-client.js';

function makePrincipal(
  overrides: Partial<{
    userId: string;
    permissions: string[];
    roles: string[];
    rescueId: string;
  }> = {}
) {
  return {
    userId: overrides.userId ?? 'usr-1',
    roles: overrides.roles ?? ['adopter'],
    permissions: overrides.permissions ?? ['applications.create', 'applications.update'],
    rescueId: overrides.rescueId,
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
function draftCreatedRow(aggregateId: string, adopterId = 'usr-1', rescueId = '') {
  return {
    event_type: 'draftCreated',
    version: 1,
    event_data: {
      type: 'draftCreated',
      applicationId: aggregateId,
      adopterId,
      petId: 'pet-1',
      rescueId,
      at: '2026-06-01T12:00:00.000Z',
    },
  };
}

// Event rows that fold to an `under_review` aggregate (v3): draftCreated →
// draftSubmitted → reviewStarted.
function underReviewRows(aggregateId: string, adopterId = 'usr-1', rescueId = 'rescue-1') {
  return [
    draftCreatedRow(aggregateId, adopterId, rescueId),
    {
      event_type: 'draftSubmitted',
      version: 2,
      event_data: {
        type: 'draftSubmitted',
        applicationId: aggregateId,
        at: '2026-06-02T12:00:00.000Z',
      },
    },
    {
      event_type: 'reviewStarted',
      version: 3,
      event_data: {
        type: 'reviewStarted',
        applicationId: aggregateId,
        at: '2026-06-03T12:00:00.000Z',
      },
    },
  ];
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
    // Idempotency key is per-event (aggregate:version), not the bare
    // aggregate id — the bare id would collide across every event of the
    // same aggregate under JetStream Nats-Msg-Id de-dup. Post-command
    // version is 2 (draftCreated v1 + draftAnswersSaved v2).
    expect(publish.mock.calls[0][0]).toMatchObject({
      type: 'applications.draftUpdated',
      id: 'app-1:2',
    });
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

  it('denies a different adopter editing another user’s draft', async () => {
    // Draft is owned by usr-1; usr-2 holds applications.update but is not
    // the owner and belongs to no rescue.
    const { deps } = makeDeps([draftCreatedRow('app-1', 'usr-1')]);
    await expect(
      saveDraftAnswers(deps, makePrincipal({ userId: 'usr-2' }), {
        applicationId: 'app-1',
        expectedVersion: 1,
        answersPatchJson: '{"hasYard":true}',
      } as SaveDraftAnswersRequest)
    ).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
  });

  // ── ADS-1007: rescue staff must not rewrite an unsubmitted draft ──

  const rescueStaff = () =>
    makePrincipal({
      userId: 'usr-staff',
      roles: ['rescue_staff'],
      permissions: ['applications.update'],
      rescueId: 'rescue-1',
    });

  it('denies rescue staff editing an adopter’s unsubmitted draft', async () => {
    // Draft owned by usr-1 and addressed to rescue-1. Under the old OR-scope
    // the rescue-1 staff principal would have been allowed; now a `draft`
    // is owner-only.
    const { deps } = makeDeps([draftCreatedRow('app-1', 'usr-1', 'rescue-1')]);
    await expect(
      saveDraftAnswers(deps, rescueStaff(), {
        applicationId: 'app-1',
        expectedVersion: 1,
        answersPatchJson: '{"hasFencedYard":false}',
      } as SaveDraftAnswersRequest)
    ).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
  });

  it('allows the owning adopter to edit their own draft', async () => {
    const { deps } = makeDeps([draftCreatedRow('app-1', 'usr-1', 'rescue-1')]);
    const res = await saveDraftAnswers(deps, makePrincipal({ userId: 'usr-1' }), {
      applicationId: 'app-1',
      expectedVersion: 1,
      answersPatchJson: '{"hasYard":true}',
    } as SaveDraftAnswersRequest);
    expect(res.application.applicationId).toBe('app-1');
  });

  it('allows rescue staff to edit answers once the application is under_review', async () => {
    // The intended follow-up-questions path: rescue-1 staff may amend answers
    // after review has started.
    const { deps } = makeDeps(underReviewRows('app-1', 'usr-1', 'rescue-1'));
    const res = await saveDraftAnswers(deps, rescueStaff(), {
      applicationId: 'app-1',
      expectedVersion: 3,
      answersPatchJson: '{"followUp":"answered"}',
    } as SaveDraftAnswersRequest);
    expect(res.application.applicationId).toBe('app-1');
  });

  it('denies a non-owning adopter in both draft and under_review', async () => {
    const draftDeps = makeDeps([draftCreatedRow('app-1', 'usr-1', 'rescue-1')]);
    await expect(
      saveDraftAnswers(draftDeps.deps, makePrincipal({ userId: 'usr-2' }), {
        applicationId: 'app-1',
        expectedVersion: 1,
        answersPatchJson: '{"hasYard":true}',
      } as SaveDraftAnswersRequest)
    ).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });

    const reviewDeps = makeDeps(underReviewRows('app-1', 'usr-1', 'rescue-1'));
    await expect(
      saveDraftAnswers(reviewDeps.deps, makePrincipal({ userId: 'usr-2' }), {
        applicationId: 'app-1',
        expectedVersion: 3,
        answersPatchJson: '{"hasYard":true}',
      } as SaveDraftAnswersRequest)
    ).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
  });
});

describe('makeStartDraft', () => {
  function makePetsClient(getPet: ReturnType<typeof vi.fn>): PetsClient {
    return { getPet, close: vi.fn() } as unknown as PetsClient;
  }

  it('throws PERMISSION_DENIED when the caller is not the adopter', async () => {
    const { deps } = makeDeps([]);
    const startDraft = makeStartDraft(makePetsClient(vi.fn()));
    await expect(
      startDraft(deps, makePrincipal({ userId: 'usr-1' }), { adopterId: 'usr-2', petId: 'pet-1' })
    ).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
  });

  it('throws INVALID_ARGUMENT on missing pet_id', async () => {
    const { deps } = makeDeps([]);
    const startDraft = makeStartDraft(makePetsClient(vi.fn()));
    await expect(
      startDraft(deps, makePrincipal(), { adopterId: 'usr-1', petId: '' })
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
  });

  it('resolves pet → rescue, creates the draft, publishes applications.draftCreated', async () => {
    const getPet = vi.fn().mockResolvedValue({ pet: { petId: 'pet-1', rescueId: 'rsc-1' } });
    const { deps } = makeDeps([]);
    const startDraft = makeStartDraft(makePetsClient(getPet));

    const res = await startDraft(deps, makePrincipal(), { adopterId: 'usr-1', petId: 'pet-1' });

    expect(res.application.status).toBe(ApplicationsV1.ApplicationStatus.APPLICATION_STATUS_DRAFT);
    expect(res.application.adopterId).toBe('usr-1');
    expect(res.application.petId).toBe('pet-1');
    expect(res.application.rescueId).toBe('rsc-1');
    expect(res.application.applicationId).not.toBe('');

    // The pet lookup forwarded the adopter's identity as metadata.
    const metadata = getPet.mock.calls[0][1];
    expect(metadata.get('x-user-id')).toEqual(['usr-1']);

    const publish = (deps as { _publish?: ReturnType<typeof vi.fn> })._publish!;
    expect(publish.mock.calls[0][0]).toMatchObject({ type: 'applications.draftCreated' });
  });

  it('maps a pets NOT_FOUND (grpc code 5) onto INVALID_ARGUMENT', async () => {
    const getPet = vi.fn().mockRejectedValue({ code: 5 });
    const { deps } = makeDeps([]);
    const startDraft = makeStartDraft(makePetsClient(getPet));
    await expect(
      startDraft(deps, makePrincipal(), { adopterId: 'usr-1', petId: 'pet-x' })
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
  });

  it('rejects a pet with no owning rescue', async () => {
    const getPet = vi.fn().mockResolvedValue({ pet: { petId: 'pet-1' } });
    const { deps } = makeDeps([]);
    const startDraft = makeStartDraft(makePetsClient(getPet));
    await expect(
      startDraft(deps, makePrincipal(), { adopterId: 'usr-1', petId: 'pet-1' })
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
  });

  // ADS-1167 — a second open application for the same (adopter, pet) trips
  // the applications_user_pet_unique partial index inside projectReadModel.
  // That's a duplicate, not a server error: map it to ALREADY_EXISTS (the
  // gateway maps that to HTTP 409).
  it('maps a duplicate open application to ALREADY_EXISTS', async () => {
    const getPet = vi.fn().mockResolvedValue({ pet: { petId: 'pet-1', rescueId: 'rsc-1' } });
    // The read-model INSERT (projectReadModel) raises the partial unique
    // violation; the event append succeeds first.
    const query = vi.fn().mockImplementation((sql: string) => {
      if (sql.includes('INSERT INTO applications (')) {
        return Promise.reject(
          Object.assign(new Error('dup'), {
            code: '23505',
            constraint: 'applications_user_pet_unique',
          })
        );
      }
      return Promise.resolve({ rows: [] });
    });
    const deps = { pool: { query }, nats: {} } as unknown as HandlerDeps;
    const startDraft = makeStartDraft(makePetsClient(getPet));
    await expect(
      startDraft(deps, makePrincipal(), { adopterId: 'usr-1', petId: 'pet-1' })
    ).rejects.toMatchObject({ code: 'ALREADY_EXISTS' });
  });

  it('does not mask an unrelated unique violation as ALREADY_EXISTS', async () => {
    const getPet = vi.fn().mockResolvedValue({ pet: { petId: 'pet-1', rescueId: 'rsc-1' } });
    // A 23505 on a DIFFERENT constraint must not be swallowed as a duplicate
    // open application — it propagates as INTERNAL.
    const query = vi.fn().mockImplementation((sql: string) => {
      if (sql.includes('INSERT INTO applications (')) {
        return Promise.reject(
          Object.assign(new Error('dup'), { code: '23505', constraint: 'some_other_index' })
        );
      }
      return Promise.resolve({ rows: [] });
    });
    const deps = { pool: { query }, nats: {} } as unknown as HandlerDeps;
    const startDraft = makeStartDraft(makePetsClient(getPet));
    await expect(
      startDraft(deps, makePrincipal(), { adopterId: 'usr-1', petId: 'pet-1' })
    ).rejects.not.toMatchObject({ code: 'ALREADY_EXISTS' });
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
    // Post-command version is 2 (draftCreated v1 + draftSubmitted v2).
    expect(publish.mock.calls[0][0]).toMatchObject({
      type: 'applications.submitted',
      id: 'app-1:2',
    });
  });

  it('denies a different adopter submitting another user’s draft', async () => {
    const { deps } = makeDeps([draftCreatedRow('app-1', 'usr-1')]);
    await expect(
      submitDraft(deps, makePrincipal({ userId: 'usr-2' }), {
        applicationId: 'app-1',
        expectedVersion: 1,
      } as SubmitDraftRequest)
    ).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
  });

  // ADS-1164 — a stale expected_version is an optimistic-concurrency
  // conflict, not a server error: it must surface as FAILED_PRECONDITION
  // (the gateway maps that to HTTP 409), not INTERNAL/500.
  it('maps a stale expected_version to FAILED_PRECONDITION', async () => {
    // Aggregate is at version 1 (draftCreated); the client expected 0.
    const { deps } = makeDeps([draftCreatedRow('app-1')]);
    await expect(
      submitDraft(deps, makePrincipal(), { applicationId: 'app-1', expectedVersion: 0 })
    ).rejects.toMatchObject({ code: 'FAILED_PRECONDITION' });
  });

  // ── ADS-1225: rescue staff must not force-transition an adopter's draft ──

  it('denies rescue staff submitting an adopter’s unsubmitted draft', async () => {
    // Draft owned by usr-1 and addressed to rescue-1. Under the old
    // owner-OR-rescue scope, the rescue-1 staff principal would have been
    // allowed to force the draft → submitted transition without the
    // adopter's consent; now a `draft` is owner-only.
    const { deps } = makeDeps([draftCreatedRow('app-1', 'usr-1', 'rescue-1')]);
    await expect(
      submitDraft(
        deps,
        makePrincipal({
          userId: 'usr-staff',
          roles: ['rescue_staff'],
          permissions: ['applications.update'],
          rescueId: 'rescue-1',
        }),
        { applicationId: 'app-1', expectedVersion: 1 } as SubmitDraftRequest
      )
    ).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
  });

  it('allows the owning adopter to submit their own draft addressed to a rescue', async () => {
    const { deps } = makeDeps([draftCreatedRow('app-1', 'usr-1', 'rescue-1')]);
    const res = await submitDraft(deps, makePrincipal({ userId: 'usr-1' }), {
      applicationId: 'app-1',
      expectedVersion: 1,
    } as SubmitDraftRequest);
    expect(res.application.status).toBe(
      ApplicationsV1.ApplicationStatus.APPLICATION_STATUS_SUBMITTED
    );
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
