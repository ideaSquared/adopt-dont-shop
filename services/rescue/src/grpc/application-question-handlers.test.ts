import type { NatsConnection } from 'nats';
import type { Pool } from 'pg';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Principal } from '@adopt-dont-shop/authz';
import type { Permission, RescueId, UserId } from '@adopt-dont-shop/lib.types';

import type { HandlerDeps } from './handlers.js';
import {
  createApplicationQuestion,
  deleteApplicationQuestion,
  listApplicationQuestions,
  reorderApplicationQuestions,
  updateApplicationQuestion,
} from './application-question-handlers.js';

const RESCUE_ID = 'rsc-1';

const STAFF: Principal = {
  userId: 'usr-staff' as UserId,
  roles: ['rescue_staff'],
  permissions: ['applications.read' as Permission, 'applications.update' as Permission],
  rescueId: RESCUE_ID as RescueId,
};

const READ_ONLY_STAFF: Principal = {
  userId: 'usr-ro' as UserId,
  roles: ['rescue_staff'],
  permissions: ['applications.read' as Permission],
  rescueId: RESCUE_ID as RescueId,
};

const UNPRIVILEGED: Principal = {
  userId: 'usr-nobody' as UserId,
  roles: ['adopter'],
  permissions: [],
};

function makeMocks() {
  // withTransaction (used by update/reorder) checks out a client via
  // pool.connect(); the read-path handlers use pool.query directly.
  const client = { query: vi.fn(), release: vi.fn() };
  client.query.mockResolvedValue({ rows: [] });
  const pool = { query: vi.fn(), connect: vi.fn().mockResolvedValue(client) };
  pool.query.mockResolvedValue({ rows: [] });
  // JetStream publish routes to the same spy so publish assertions can observe
  // withTransaction's inline delivery.
  const natsPublish = vi.fn();
  const nats = { publish: natsPublish, jetstream: () => ({ publish: natsPublish }) };
  const deps: HandlerDeps = {
    pool: pool as unknown as Pool,
    nats: nats as unknown as NatsConnection,
  };
  return { deps, poolMock: pool, clientMock: client, natsMock: nats };
}

const questionRow = (overrides: Record<string, unknown> = {}) => ({
  question_id: 'q-1',
  rescue_id: RESCUE_ID,
  question_key: 'e2e_key',
  scope: 'rescue_specific',
  category: 'personal_information',
  question_type: 'text',
  question_text: 'What is your name?',
  help_text: null,
  placeholder: null,
  options: null,
  display_order: 5,
  is_enabled: true,
  is_required: false,
  created_at: new Date('2026-06-01T00:00:00Z'),
  updated_at: new Date('2026-06-01T00:00:00Z'),
  ...overrides,
});

describe('listApplicationQuestions', () => {
  let mocks: ReturnType<typeof makeMocks>;
  beforeEach(() => {
    mocks = makeMocks();
  });

  it('returns the rescue questions mapped to proto', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [questionRow()] });
    const res = await listApplicationQuestions(mocks.deps, STAFF, { rescueId: RESCUE_ID });
    expect(res.questions).toHaveLength(1);
    expect(res.questions[0].questionId).toBe('q-1');
    expect(res.questions[0].questionKey).toBe('e2e_key');
    // The query unions the core baseline (rescue_id IS NULL) with this rescue.
    const [sql, params] = mocks.poolMock.query.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain('rescue_id IS NULL OR rescue_id = $1');
    expect(params[0]).toBe(RESCUE_ID);
  });

  it('rejects a missing rescue_id with INVALID_ARGUMENT', async () => {
    await expect(listApplicationQuestions(mocks.deps, STAFF, { rescueId: '' })).rejects.toThrow(
      /rescue_id is required/
    );
  });

  it('denies a caller without applications.read for the rescue', async () => {
    await expect(
      listApplicationQuestions(mocks.deps, UNPRIVILEGED, { rescueId: RESCUE_ID })
    ).rejects.toThrow(/applications.read/);
    expect(mocks.poolMock.query).not.toHaveBeenCalled();
  });
});

describe('createApplicationQuestion', () => {
  let mocks: ReturnType<typeof makeMocks>;
  beforeEach(() => {
    mocks = makeMocks();
  });

  const validReq = {
    rescueId: RESCUE_ID,
    questionKey: 'e2e_key',
    category: 'personal_information',
    questionType: 'text',
    questionText: 'What is your name?',
    options: [],
    displayOrder: 5,
    isRequired: false,
  };

  it('inserts a rescue_specific question and returns it', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [questionRow()] });
    const res = await createApplicationQuestion(mocks.deps, STAFF, validReq);
    expect(res.question?.questionId).toBe('q-1');
    const [sql, params] = mocks.poolMock.query.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain('INSERT INTO rescue.application_questions');
    expect(sql).toContain("'rescue_specific'");
    expect(params).toContain(RESCUE_ID);
    expect(params).toContain('e2e_key');
  });

  it('requires applications.update (read-only staff is denied)', async () => {
    await expect(createApplicationQuestion(mocks.deps, READ_ONLY_STAFF, validReq)).rejects.toThrow(
      /applications.update/
    );
    expect(mocks.poolMock.query).not.toHaveBeenCalled();
  });

  it('maps a duplicate question_key (23505) to INVALID_ARGUMENT', async () => {
    mocks.poolMock.query.mockRejectedValueOnce(Object.assign(new Error('dup'), { code: '23505' }));
    await expect(createApplicationQuestion(mocks.deps, STAFF, validReq)).rejects.toThrow(
      /already exists/
    );
  });

  it('maps a bad enum value (22P02) to INVALID_ARGUMENT', async () => {
    mocks.poolMock.query.mockRejectedValueOnce(Object.assign(new Error('bad'), { code: '22P02' }));
    await expect(
      createApplicationQuestion(mocks.deps, STAFF, { ...validReq, category: 'nonsense' })
    ).rejects.toThrow(/invalid category or question_type/);
  });

  it('rejects a missing question_text', async () => {
    await expect(
      createApplicationQuestion(mocks.deps, STAFF, { ...validReq, questionText: '' })
    ).rejects.toThrow(/question_text is required/);
  });
});

describe('deleteApplicationQuestion', () => {
  let mocks: ReturnType<typeof makeMocks>;
  beforeEach(() => {
    mocks = makeMocks();
  });

  it('soft-deletes a rescue-specific question', async () => {
    mocks.poolMock.query
      .mockResolvedValueOnce({ rows: [{ rescue_id: RESCUE_ID, scope: 'rescue_specific' }] })
      .mockResolvedValueOnce({ rows: [] });
    const res = await deleteApplicationQuestion(mocks.deps, STAFF, { questionId: 'q-1' });
    expect(res.deleted).toBe(true);
    const [sql] = mocks.poolMock.query.mock.calls[1] as [string];
    expect(sql).toContain('SET deleted_at = now()');
  });

  it('refuses to delete a core question', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({
      rows: [{ rescue_id: null, scope: 'core' }],
    });
    await expect(
      deleteApplicationQuestion(mocks.deps, STAFF, { questionId: 'core-1' })
    ).rejects.toThrow(/core questions cannot be deleted/);
  });

  it('returns NOT_FOUND for an unknown question', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [] });
    await expect(
      deleteApplicationQuestion(mocks.deps, STAFF, { questionId: 'ghost' })
    ).rejects.toThrow(/not found/);
  });

  it('denies a caller without applications.update for the owning rescue', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({
      rows: [{ rescue_id: RESCUE_ID, scope: 'rescue_specific' }],
    });
    await expect(
      deleteApplicationQuestion(mocks.deps, READ_ONLY_STAFF, { questionId: 'q-1' })
    ).rejects.toThrow(/applications.update/);
  });
});

describe('updateApplicationQuestion', () => {
  let mocks: ReturnType<typeof makeMocks>;
  beforeEach(() => {
    mocks = makeMocks();
  });

  const baseReq = {
    questionId: 'q-1',
    questionText: 'What is your full name?',
    options: [],
  };

  it('writes only the supplied fields in a transaction and publishes after commit', async () => {
    const order: string[] = [];
    // First pool.query loads the row (ownership + scope); the tx UPDATE runs
    // on the client.
    mocks.poolMock.query.mockResolvedValueOnce({
      rows: [{ rescue_id: RESCUE_ID, scope: 'rescue_specific' }],
    });
    mocks.clientMock.query.mockImplementation(async (sql: string) => {
      // event_outbox INSERT/DELETE are withTransaction's plumbing.
      if (!sql.includes('event_outbox')) {
        order.push(sql.trim().split(/\s+/)[0]);
      }
      if (sql.includes('UPDATE')) {
        return { rows: [questionRow({ question_text: 'What is your full name?' })] };
      }
      return { rows: [] };
    });
    mocks.natsMock.publish.mockImplementation(() => order.push('NATS_PUBLISH'));

    const res = await updateApplicationQuestion(mocks.deps, STAFF, baseReq);

    expect(res.question?.questionText).toBe('What is your full name?');
    expect(order).toEqual(['BEGIN', 'UPDATE', 'COMMIT', 'NATS_PUBLISH']);
    // The UPDATE COALESCEs and passes the supplied text; an empty options
    // array is treated as "unset" (null).
    const updateCall = mocks.clientMock.query.mock.calls.find(c =>
      (c[0] as string).includes('UPDATE')
    ) as [string, unknown[]];
    expect(updateCall[0]).toContain('COALESCE');
    expect(updateCall[1]).toContain('What is your full name?');
    expect(updateCall[1]).toContain(null);
  });

  it('rejects a missing question_id with INVALID_ARGUMENT', async () => {
    await expect(
      updateApplicationQuestion(mocks.deps, STAFF, { ...baseReq, questionId: '' })
    ).rejects.toThrow(/question_id is required/);
    expect(mocks.poolMock.query).not.toHaveBeenCalled();
  });

  it('returns NOT_FOUND for an unknown question', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [] });
    await expect(
      updateApplicationQuestion(mocks.deps, STAFF, { ...baseReq, questionId: 'ghost' })
    ).rejects.toThrow(/not found/);
    expect(mocks.poolMock.connect).not.toHaveBeenCalled();
  });

  it('refuses to edit a core question with FAILED_PRECONDITION', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({
      rows: [{ rescue_id: null, scope: 'core' }],
    });
    await expect(
      updateApplicationQuestion(mocks.deps, STAFF, { ...baseReq, questionId: 'core-1' })
    ).rejects.toMatchObject({ code: 'FAILED_PRECONDITION' });
    expect(mocks.poolMock.connect).not.toHaveBeenCalled();
  });

  it('denies a caller without applications.update for the owning rescue', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({
      rows: [{ rescue_id: RESCUE_ID, scope: 'rescue_specific' }],
    });
    await expect(updateApplicationQuestion(mocks.deps, READ_ONLY_STAFF, baseReq)).rejects.toThrow(
      /applications.update/
    );
    expect(mocks.poolMock.connect).not.toHaveBeenCalled();
  });

  it('maps a bad enum value (22P02) to INVALID_ARGUMENT', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({
      rows: [{ rescue_id: RESCUE_ID, scope: 'rescue_specific' }],
    });
    mocks.clientMock.query.mockImplementation(async (sql: string) => {
      if (sql.includes('UPDATE')) {
        throw Object.assign(new Error('bad'), { code: '22P02' });
      }
      return { rows: [] };
    });
    await expect(
      updateApplicationQuestion(mocks.deps, STAFF, { ...baseReq, category: 'nonsense' })
    ).rejects.toThrow(/invalid category or question_type/);
  });
});

describe('reorderApplicationQuestions', () => {
  let mocks: ReturnType<typeof makeMocks>;
  beforeEach(() => {
    mocks = makeMocks();
  });

  it('rewrites display_order to each id index in a transaction and publishes', async () => {
    const order: string[] = [];
    // Ownership check returns both ids as rescue-owned.
    mocks.poolMock.query
      .mockResolvedValueOnce({ rows: [{ question_id: 'q-1' }, { question_id: 'q-2' }] })
      // Final ordered read.
      .mockResolvedValueOnce({
        rows: [
          questionRow({ question_id: 'q-2', display_order: 0 }),
          questionRow({ question_id: 'q-1', display_order: 1 }),
        ],
      });
    mocks.clientMock.query.mockImplementation(async (sql: string) => {
      if (!sql.includes('event_outbox')) {
        order.push(sql.trim().split(/\s+/)[0]);
      }
      return { rows: [] };
    });
    mocks.natsMock.publish.mockImplementation(() => order.push('NATS_PUBLISH'));

    const res = await reorderApplicationQuestions(mocks.deps, STAFF, {
      rescueId: RESCUE_ID,
      questionIds: ['q-2', 'q-1'],
    });

    expect(res.questions.map(q => q.questionId)).toEqual(['q-2', 'q-1']);
    // One UPDATE per id, wrapped by BEGIN/COMMIT, publish after commit.
    expect(order).toEqual(['BEGIN', 'UPDATE', 'UPDATE', 'COMMIT', 'NATS_PUBLISH']);
    const updateCalls = mocks.clientMock.query.mock.calls.filter(c =>
      (c[0] as string).includes('UPDATE')
    ) as Array<[string, unknown[]]>;
    // display_order = index: q-2 → 0, q-1 → 1.
    expect(updateCalls[0][1]).toEqual(['q-2', 0, 'usr-staff', RESCUE_ID]);
    expect(updateCalls[1][1]).toEqual(['q-1', 1, 'usr-staff', RESCUE_ID]);
  });

  it('rejects an empty question_ids list with INVALID_ARGUMENT', async () => {
    await expect(
      reorderApplicationQuestions(mocks.deps, STAFF, { rescueId: RESCUE_ID, questionIds: [] })
    ).rejects.toThrow(/question_ids must not be empty/);
    expect(mocks.poolMock.query).not.toHaveBeenCalled();
  });

  it('rejects a missing rescue_id with INVALID_ARGUMENT', async () => {
    await expect(
      reorderApplicationQuestions(mocks.deps, STAFF, { rescueId: '', questionIds: ['q-1'] })
    ).rejects.toThrow(/rescue_id is required/);
  });

  it('rejects an id that does not belong to the rescue with NOT_FOUND', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [{ question_id: 'q-1' }] });
    await expect(
      reorderApplicationQuestions(mocks.deps, STAFF, {
        rescueId: RESCUE_ID,
        questionIds: ['q-1', 'not-mine'],
      })
    ).rejects.toThrow(/does not belong to rescue/);
    expect(mocks.poolMock.connect).not.toHaveBeenCalled();
  });

  it('denies a caller without applications.update for the rescue', async () => {
    await expect(
      reorderApplicationQuestions(mocks.deps, READ_ONLY_STAFF, {
        rescueId: RESCUE_ID,
        questionIds: ['q-1'],
      })
    ).rejects.toThrow(/applications.update/);
    expect(mocks.poolMock.query).not.toHaveBeenCalled();
  });
});
