import { describe, expect, it, vi } from 'vitest';

import {
  ModerationV1,
  type AddEvidenceRequest,
  type ListModeratorActionsRequest,
  type LogModeratorActionRequest,
} from '@adopt-dont-shop/proto';

import { addEvidence, listModeratorActions, logModeratorAction } from './action-handlers.js';
import { HandlerError, type HandlerDeps } from './adapter.js';
import { encodeCursor } from './cursor.js';

function makePrincipal(
  overrides: Partial<{ userId: string; permissions: string[]; roles: string[] }> = {}
) {
  return {
    userId: overrides.userId ?? 'mod-1',
    roles: overrides.roles ?? ['moderator'],
    permissions: overrides.permissions ?? ['moderation.actions.manage'],
    rescueId: undefined,
  } as unknown as Parameters<typeof addEvidence>[1];
}

function makeDeps(steps: Array<unknown>): {
  deps: HandlerDeps;
  query: ReturnType<typeof vi.fn>;
} {
  const queryMock = vi.fn();
  for (const step of steps) {
    queryMock.mockResolvedValueOnce(step);
  }
  const pool = { query: queryMock } as unknown as HandlerDeps['pool'];
  const deps: HandlerDeps = { pool, nats: {} } as unknown as HandlerDeps;
  return { deps, query: queryMock };
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

function actionRow(overrides: Record<string, unknown> = {}) {
  return {
    action_id: 'act-1',
    moderator_id: 'mod-1',
    report_id: 'rpt-1',
    target_entity_type: 'user',
    target_entity_id: 'usr-2',
    target_user_id: 'usr-2',
    action_type: 'warning_issued',
    severity: 'medium',
    reason: 'First infraction',
    description: null,
    metadata: {},
    duration: null,
    expires_at: null,
    is_active: true,
    acknowledged_at: null,
    created_at: new Date('2026-06-01T12:00:00.000Z'),
    updated_at: new Date('2026-06-01T12:00:00.000Z'),
    ...overrides,
  };
}

function evidenceRow(overrides: Record<string, unknown> = {}) {
  return {
    evidence_id: 'ev-1',
    parent_type: 'report',
    parent_id: 'rpt-1',
    type: 'screenshot',
    content: 's3://x/abc.png',
    description: null,
    uploaded_at: new Date('2026-06-01T12:30:00.000Z'),
    ...overrides,
  };
}

const VALID_LOG_REQ: LogModeratorActionRequest = {
  targetEntityType: ModerationV1.ReportEntityType.REPORT_ENTITY_TYPE_USER,
  targetEntityId: 'usr-2',
  actionType: ModerationV1.ModeratorActionType.MODERATOR_ACTION_TYPE_WARNING_ISSUED,
  severity: ModerationV1.Severity.SEVERITY_MEDIUM,
  reason: 'First infraction',
};

describe('logModeratorAction', () => {
  it('throws PERMISSION_DENIED without moderation.actions.manage', async () => {
    const { deps } = makeDeps([]);
    await expect(
      logModeratorAction(deps, makePrincipal({ permissions: [] }), VALID_LOG_REQ)
    ).rejects.toBeInstanceOf(HandlerError);
  });

  it.each([
    ['targetEntityId', { ...VALID_LOG_REQ, targetEntityId: '' }],
    ['reason', { ...VALID_LOG_REQ, reason: '' }],
    [
      'actionType',
      {
        ...VALID_LOG_REQ,
        actionType: ModerationV1.ModeratorActionType.MODERATOR_ACTION_TYPE_UNSPECIFIED,
      },
    ],
    ['severity', { ...VALID_LOG_REQ, severity: ModerationV1.Severity.SEVERITY_UNSPECIFIED }],
  ])('throws INVALID_ARGUMENT on missing %s', async (_field, req) => {
    const { deps } = makeDeps([]);
    await expect(
      logModeratorAction(deps, makePrincipal(), req as LogModeratorActionRequest)
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
  });

  it('inserts an action with NULL expires_at when no duration (permanent)', async () => {
    const { deps, query } = makeDeps([{ rows: [actionRow()] }]);
    await logModeratorAction(deps, makePrincipal(), VALID_LOG_REQ);
    // expires_at param is index 12 (0-based) in the INSERT.
    expect(query.mock.calls[0][1][12]).toBeNull();
  });

  it('derives expires_at from a duration in days', async () => {
    const { deps, query } = makeDeps([{ rows: [actionRow({ duration: 7 })] }]);
    await logModeratorAction(deps, makePrincipal(), { ...VALID_LOG_REQ, duration: 7 });
    expect(query.mock.calls[0][1][12]).not.toBeNull();
  });

  it('publishes moderation.actionLogged', async () => {
    const { deps } = makeDeps([{ rows: [actionRow()] }]);
    await logModeratorAction(deps, makePrincipal(), VALID_LOG_REQ);
    const publish = (deps as { _publish?: ReturnType<typeof vi.fn> })._publish!;
    expect(publish.mock.calls[0][0]).toMatchObject({ type: 'moderation.actionLogged' });
  });
});

describe('listModeratorActions', () => {
  it('throws PERMISSION_DENIED without moderation.actions.manage', async () => {
    const { deps } = makeDeps([]);
    await expect(
      listModeratorActions(
        deps,
        makePrincipal({ permissions: [] }),
        {} as ListModeratorActionsRequest
      )
    ).rejects.toBeInstanceOf(HandlerError);
  });

  it('filters by target_user / report / action_type', async () => {
    const { deps, query } = makeDeps([{ rows: [] }]);
    await listModeratorActions(deps, makePrincipal(), {
      targetUserId: 'usr-2',
      reportId: 'rpt-1',
      actionType: ModerationV1.ModeratorActionType.MODERATOR_ACTION_TYPE_USER_BANNED,
    } as ListModeratorActionsRequest);
    const sql = query.mock.calls[0][0] as string;
    expect(sql).toContain('target_user_id = $1');
    expect(sql).toContain('report_id = $2');
    expect(sql).toContain('action_type = $3');
  });

  it('emits nextCursor when more rows than limit', async () => {
    const eleven = Array.from({ length: 11 }, (_, i) =>
      actionRow({ action_id: `a-${i}`, created_at: new Date(2026, 5, 1, 12, 0, 0, i) })
    );
    const { deps } = makeDeps([{ rows: eleven }]);
    const res = await listModeratorActions(deps, makePrincipal(), {
      limit: 10,
    } as ListModeratorActionsRequest);
    expect(res.actions).toHaveLength(10);
    expect(res.nextCursor).toBeDefined();
  });

  it('decodes a cursor into the WHERE clause', async () => {
    const { deps, query } = makeDeps([{ rows: [] }]);
    const cursor = encodeCursor({ createdAt: '2026-06-01T12:00:00.000Z', id: 'a-x' });
    await listModeratorActions(deps, makePrincipal(), { cursor } as ListModeratorActionsRequest);
    const sql = query.mock.calls[0][0] as string;
    expect(sql).toContain('created_at <');
    expect(sql).toContain('action_id <');
  });
});

describe('addEvidence', () => {
  it('throws PERMISSION_DENIED without moderation.actions.manage', async () => {
    const { deps } = makeDeps([]);
    await expect(
      addEvidence(deps, makePrincipal({ permissions: [] }), {
        parentType: ModerationV1.EvidenceParentType.EVIDENCE_PARENT_TYPE_REPORT,
        parentId: 'rpt-1',
        type: ModerationV1.EvidenceType.EVIDENCE_TYPE_SCREENSHOT,
        content: 's3://x',
      } as AddEvidenceRequest)
    ).rejects.toBeInstanceOf(HandlerError);
  });

  it.each([
    [
      'parentId',
      {
        parentType: ModerationV1.EvidenceParentType.EVIDENCE_PARENT_TYPE_REPORT,
        parentId: '',
        type: ModerationV1.EvidenceType.EVIDENCE_TYPE_SCREENSHOT,
        content: 's3://x',
      },
    ],
    [
      'content',
      {
        parentType: ModerationV1.EvidenceParentType.EVIDENCE_PARENT_TYPE_REPORT,
        parentId: 'rpt-1',
        type: ModerationV1.EvidenceType.EVIDENCE_TYPE_SCREENSHOT,
        content: '',
      },
    ],
    [
      'parentType',
      {
        parentType: ModerationV1.EvidenceParentType.EVIDENCE_PARENT_TYPE_UNSPECIFIED,
        parentId: 'rpt-1',
        type: ModerationV1.EvidenceType.EVIDENCE_TYPE_SCREENSHOT,
        content: 's3://x',
      },
    ],
  ])('throws INVALID_ARGUMENT on missing %s', async (_field, req) => {
    const { deps } = makeDeps([]);
    await expect(
      addEvidence(deps, makePrincipal(), req as AddEvidenceRequest)
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
  });

  it('inserts evidence + publishes moderation.evidenceAdded', async () => {
    const { deps } = makeDeps([{ rows: [evidenceRow()] }]);
    const res = await addEvidence(deps, makePrincipal(), {
      parentType: ModerationV1.EvidenceParentType.EVIDENCE_PARENT_TYPE_REPORT,
      parentId: 'rpt-1',
      type: ModerationV1.EvidenceType.EVIDENCE_TYPE_SCREENSHOT,
      content: 's3://x/abc.png',
    });
    expect(res.evidence.evidenceId).toBe('ev-1');
    const publish = (deps as { _publish?: ReturnType<typeof vi.fn> })._publish!;
    expect(publish.mock.calls[0][0]).toMatchObject({ type: 'moderation.evidenceAdded' });
  });
});
