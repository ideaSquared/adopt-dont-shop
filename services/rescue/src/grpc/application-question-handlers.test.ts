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
  const pool = { query: vi.fn() };
  pool.query.mockResolvedValue({ rows: [] });
  const nats = { publish: vi.fn(), jetstream: () => ({ publish: vi.fn() }) };
  const deps: HandlerDeps = {
    pool: pool as unknown as Pool,
    nats: nats as unknown as NatsConnection,
  };
  return { deps, poolMock: pool };
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
