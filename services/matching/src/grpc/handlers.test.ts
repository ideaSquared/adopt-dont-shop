import { describe, expect, it, vi } from 'vitest';

import {
  MatchingV1,
  type EndSessionRequest,
  type ListSwipeHistoryRequest,
  type RecordSwipeRequest,
  type StartSessionRequest,
} from '@adopt-dont-shop/proto';

import { HandlerError, type HandlerDeps } from './adapter.js';
import { encodeSwipeHistoryCursor } from './cursor.js';
import { endSession, listSwipeHistory, recordSwipe, startSession } from './handlers.js';

function makePrincipal(
  overrides: Partial<{ userId: string; permissions: string[]; roles: string[] }> = {}
) {
  return {
    userId: overrides.userId ?? 'usr-1',
    roles: overrides.roles ?? ['adopter'],
    permissions: overrides.permissions ?? ['pets.read'],
    rescueId: undefined,
  } as unknown as Parameters<typeof startSession>[1];
}

function makeDeps(steps: Array<unknown>): {
  deps: HandlerDeps;
  query: ReturnType<typeof vi.fn>;
} {
  const queryMock = vi.fn();
  for (const step of steps) {
    queryMock.mockResolvedValueOnce(step);
  }
  const pool = {
    connect: vi.fn().mockResolvedValue({
      query: queryMock,
      release: vi.fn(),
    }),
    query: queryMock,
  } as unknown as HandlerDeps['pool'];
  const deps: HandlerDeps = { pool, nats: {} } as unknown as HandlerDeps;
  return { deps, query: queryMock };
}

// The handlers wrap withTransaction internally. Since withTransaction
// is from @adopt-dont-shop/events we patch the import once via
// vi.mock so the handler tests get a deterministic scope.
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
      // Expose the publish mock back on deps for tests to assert against.
      (deps as { _publish?: ReturnType<typeof vi.fn> })._publish = publish;
      return result;
    },
  };
});

function sessionRow(overrides: Record<string, unknown> = {}) {
  return {
    session_id: 'sess-1',
    user_id: 'usr-1',
    start_time: new Date('2026-06-01T12:00:00.000Z'),
    end_time: null,
    total_swipes: 0,
    likes: 0,
    passes: 0,
    super_likes: 0,
    filters: { species: 'dog' },
    ip_address: '1.2.3.4',
    user_agent: 'Mozilla/5.0',
    device_type: 'mobile',
    is_active: true,
    created_at: new Date('2026-06-01T12:00:00.000Z'),
    updated_at: new Date('2026-06-01T12:00:00.000Z'),
    ...overrides,
  };
}

describe('startSession', () => {
  it('throws PERMISSION_DENIED when principal lacks pets.read', async () => {
    const { deps } = makeDeps([]);
    await expect(
      startSession(deps, makePrincipal({ permissions: [] }), {} as StartSessionRequest)
    ).rejects.toBeInstanceOf(HandlerError);
  });

  it('returns existing active session as created=false (idempotency)', async () => {
    const { deps } = makeDeps([
      { rows: [sessionRow()] }, // SELECT existing — found
    ]);
    const res = await startSession(deps, makePrincipal(), {} as StartSessionRequest);
    expect(res.created).toBe(false);
    expect(res.session.sessionId).toBe('sess-1');
    // No publish on idempotent path.
    expect((deps as { _publish?: ReturnType<typeof vi.fn> })._publish?.mock.calls.length ?? 0).toBe(
      0
    );
  });

  it('creates a new session when none exist and publishes matching.sessionStarted', async () => {
    const { deps } = makeDeps([
      { rows: [] }, // SELECT existing — empty
      { rows: [sessionRow({ session_id: 'sess-new' })] }, // INSERT returning
    ]);
    const res = await startSession(deps, makePrincipal(), {
      deviceType: MatchingV1.DeviceType.DEVICE_TYPE_MOBILE,
      filtersJson: '{"species":"dog"}',
    } as StartSessionRequest);
    expect(res.created).toBe(true);
    expect(res.session.sessionId).toBe('sess-new');
    const publish = (deps as { _publish?: ReturnType<typeof vi.fn> })._publish!;
    expect(publish).toHaveBeenCalledTimes(1);
    expect(publish.mock.calls[0][0]).toMatchObject({
      type: 'matching.sessionStarted',
    });
  });

  it('coerces UNSPECIFIED device_type to "unknown"', async () => {
    const { deps } = makeDeps([{ rows: [] }, { rows: [sessionRow()] }]);
    await startSession(deps, makePrincipal(), {} as StartSessionRequest);
    // INSERT call's deviceType param at index 5.
    const insertCall = deps.pool.query as unknown as ReturnType<typeof vi.fn>;
    expect(insertCall.mock.calls[1][1][5]).toBe('unknown');
  });

  it('throws INVALID_ARGUMENT on malformed filters_json', async () => {
    const { deps } = makeDeps([{ rows: [] }]);
    await expect(
      startSession(deps, makePrincipal(), { filtersJson: 'not-json' } as StartSessionRequest)
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
  });

  it('throws INVALID_ARGUMENT when filters_json encodes an array instead of object', async () => {
    const { deps } = makeDeps([{ rows: [] }]);
    await expect(
      startSession(deps, makePrincipal(), { filtersJson: '[1,2,3]' } as StartSessionRequest)
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
  });

  it('empty filters_json normalises to "{}"', async () => {
    const { deps } = makeDeps([{ rows: [] }, { rows: [sessionRow()] }]);
    await startSession(deps, makePrincipal(), { filtersJson: '' } as StartSessionRequest);
    const insertCall = deps.pool.query as unknown as ReturnType<typeof vi.fn>;
    expect(insertCall.mock.calls[1][1][2]).toBe('{}');
  });
});

describe('endSession', () => {
  it('throws INVALID_ARGUMENT on missing session_id', async () => {
    const { deps } = makeDeps([]);
    await expect(
      endSession(deps, makePrincipal(), { sessionId: '' } as EndSessionRequest)
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
  });

  it('throws NOT_FOUND when session does not exist', async () => {
    const { deps } = makeDeps([{ rows: [] }]);
    await expect(endSession(deps, makePrincipal(), { sessionId: 'gone' })).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });

  it('returns existing closed session without firing event (idempotent)', async () => {
    const { deps } = makeDeps([{ rows: [sessionRow({ is_active: false })] }]);
    const res = await endSession(deps, makePrincipal(), { sessionId: 'sess-1' });
    expect(res.session.isActive).toBe(false);
    const publish = (deps as { _publish?: ReturnType<typeof vi.fn> })._publish!;
    expect(publish.mock.calls.length).toBe(0);
  });

  it('closes an active session and publishes matching.sessionEnded', async () => {
    const { deps } = makeDeps([
      { rows: [sessionRow()] }, // SELECT FOR UPDATE
      {
        rows: [sessionRow({ end_time: new Date('2026-06-01T13:00:00.000Z'), is_active: false })],
      }, // UPDATE RETURNING
    ]);
    const res = await endSession(deps, makePrincipal(), { sessionId: 'sess-1' });
    expect(res.session.isActive).toBe(false);
    expect(res.session.endTime).toBe('2026-06-01T13:00:00.000Z');
    const publish = (deps as { _publish?: ReturnType<typeof vi.fn> })._publish!;
    expect(publish.mock.calls[0][0]).toMatchObject({
      type: 'matching.sessionEnded',
    });
  });
});

function swipeRow(overrides: Record<string, unknown> = {}) {
  return {
    swipe_action_id: 'swp-1',
    session_id: 'sess-1',
    pet_id: 'pet-1',
    user_id: 'usr-1',
    action: 'like',
    timestamp: new Date('2026-06-01T12:01:00.000Z'),
    response_time: 800,
    device_type: 'mobile',
    ...overrides,
  };
}

describe('recordSwipe', () => {
  it('throws INVALID_ARGUMENT on missing session_id', async () => {
    const { deps } = makeDeps([]);
    await expect(
      recordSwipe(deps, makePrincipal(), {
        sessionId: '',
        petId: 'pet-1',
        action: MatchingV1.SwipeAction.SWIPE_ACTION_LIKE,
      } as RecordSwipeRequest)
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
  });

  it('throws INVALID_ARGUMENT on missing pet_id', async () => {
    const { deps } = makeDeps([]);
    await expect(
      recordSwipe(deps, makePrincipal(), {
        sessionId: 'sess-1',
        petId: '',
        action: MatchingV1.SwipeAction.SWIPE_ACTION_LIKE,
      } as RecordSwipeRequest)
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
  });

  it('throws INVALID_ARGUMENT on UNSPECIFIED action', async () => {
    const { deps } = makeDeps([]);
    await expect(
      recordSwipe(deps, makePrincipal(), {
        sessionId: 'sess-1',
        petId: 'pet-1',
        action: MatchingV1.SwipeAction.SWIPE_ACTION_UNSPECIFIED,
      } as RecordSwipeRequest)
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
  });

  it('throws NOT_FOUND when session does not exist', async () => {
    const { deps } = makeDeps([{ rows: [] }]);
    await expect(
      recordSwipe(deps, makePrincipal(), {
        sessionId: 'gone',
        petId: 'pet-1',
        action: MatchingV1.SwipeAction.SWIPE_ACTION_LIKE,
      })
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('throws PERMISSION_DENIED when principal is not the session owner', async () => {
    const { deps } = makeDeps([{ rows: [sessionRow({ user_id: 'someone-else' })] }]);
    await expect(
      recordSwipe(deps, makePrincipal(), {
        sessionId: 'sess-1',
        petId: 'pet-1',
        action: MatchingV1.SwipeAction.SWIPE_ACTION_LIKE,
      })
    ).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
  });

  it('throws INVALID_ARGUMENT on a closed session', async () => {
    const { deps } = makeDeps([{ rows: [sessionRow({ is_active: false })] }]);
    await expect(
      recordSwipe(deps, makePrincipal(), {
        sessionId: 'sess-1',
        petId: 'pet-1',
        action: MatchingV1.SwipeAction.SWIPE_ACTION_LIKE,
      })
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
  });

  it('records a like + ticks total_swipes + likes counters', async () => {
    const { deps, query } = makeDeps([
      { rows: [sessionRow()] }, // SELECT FOR UPDATE
      { rows: [swipeRow()] }, // INSERT swipe_actions
      { rows: [sessionRow({ total_swipes: 1, likes: 1 })] }, // UPDATE session
    ]);
    const res = await recordSwipe(deps, makePrincipal(), {
      sessionId: 'sess-1',
      petId: 'pet-1',
      action: MatchingV1.SwipeAction.SWIPE_ACTION_LIKE,
    });
    expect(res.action.action).toBe(MatchingV1.SwipeAction.SWIPE_ACTION_LIKE);
    expect(res.session.totalSwipes).toBe(1);
    expect(res.session.likes).toBe(1);
    // UPDATE SQL should bump the likes column.
    const updateSql = query.mock.calls[2][0] as string;
    expect(updateSql).toContain('likes = likes + 1');
    const publish = (deps as { _publish?: ReturnType<typeof vi.fn> })._publish!;
    expect(publish.mock.calls[0][0]).toMatchObject({ type: 'matching.swipeRecorded' });
  });

  it('records an info action without bumping like/pass/super_like counters', async () => {
    const { deps, query } = makeDeps([
      { rows: [sessionRow()] },
      { rows: [swipeRow({ action: 'info' })] },
      { rows: [sessionRow({ total_swipes: 1 })] },
    ]);
    await recordSwipe(deps, makePrincipal(), {
      sessionId: 'sess-1',
      petId: 'pet-1',
      action: MatchingV1.SwipeAction.SWIPE_ACTION_INFO,
    });
    const updateSql = query.mock.calls[2][0] as string;
    expect(updateSql).toContain('total_swipes = total_swipes + 1');
    expect(updateSql).not.toContain('likes = likes + 1');
    expect(updateSql).not.toContain('passes = passes + 1');
    expect(updateSql).not.toContain('super_likes = super_likes + 1');
  });

  it('records a super_like by bumping the super_likes counter', async () => {
    const { deps, query } = makeDeps([
      { rows: [sessionRow()] },
      { rows: [swipeRow({ action: 'super_like' })] },
      { rows: [sessionRow({ total_swipes: 1, super_likes: 1 })] },
    ]);
    await recordSwipe(deps, makePrincipal(), {
      sessionId: 'sess-1',
      petId: 'pet-1',
      action: MatchingV1.SwipeAction.SWIPE_ACTION_SUPER_LIKE,
    });
    const updateSql = query.mock.calls[2][0] as string;
    expect(updateSql).toContain('super_likes = super_likes + 1');
  });
});

describe('listSwipeHistory', () => {
  it('throws PERMISSION_DENIED when principal lacks pets.read', async () => {
    const { deps } = makeDeps([]);
    await expect(
      listSwipeHistory(deps, makePrincipal({ permissions: [] }), {} as ListSwipeHistoryRequest)
    ).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
  });

  it('returns the calling principal own swipe history scoped to their user_id', async () => {
    const { deps, query } = makeDeps([{ rows: [swipeRow()] }]);
    const res = await listSwipeHistory(deps, makePrincipal(), {} as ListSwipeHistoryRequest);
    expect(res.actions).toHaveLength(1);
    // First param is the principal user_id.
    expect(query.mock.calls[0][1][0]).toBe('usr-1');
  });

  it('filters by action when actionFilter is set', async () => {
    const { deps, query } = makeDeps([{ rows: [] }]);
    await listSwipeHistory(deps, makePrincipal(), {
      actionFilter: MatchingV1.SwipeAction.SWIPE_ACTION_SUPER_LIKE,
    } as ListSwipeHistoryRequest);
    const sql = query.mock.calls[0][0] as string;
    expect(sql).toContain('action = $2');
    expect(query.mock.calls[0][1][1]).toBe('super_like');
  });

  it('emits nextCursor when there are more rows than limit', async () => {
    const eleven = Array.from({ length: 11 }, (_, i) =>
      swipeRow({
        swipe_action_id: `swp-${i}`,
        timestamp: new Date(2026, 5, 1, 12, 0, 0, i),
      })
    );
    const { deps } = makeDeps([{ rows: eleven }]);
    const res = await listSwipeHistory(deps, makePrincipal(), {
      limit: 10,
    } as ListSwipeHistoryRequest);
    expect(res.actions).toHaveLength(10);
    expect(res.nextCursor).toBeDefined();
  });

  it('omits nextCursor when results fit in one page', async () => {
    const { deps } = makeDeps([{ rows: [swipeRow()] }]);
    const res = await listSwipeHistory(deps, makePrincipal(), {} as ListSwipeHistoryRequest);
    expect(res.nextCursor).toBeUndefined();
  });

  it('throws INVALID_ARGUMENT on a malformed cursor', async () => {
    const { deps } = makeDeps([]);
    await expect(
      listSwipeHistory(deps, makePrincipal(), { cursor: '!!!' } as ListSwipeHistoryRequest)
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
  });

  it('decodes a valid cursor and applies it to the WHERE clause', async () => {
    const { deps, query } = makeDeps([{ rows: [] }]);
    const cursor = encodeSwipeHistoryCursor({
      timestamp: '2026-06-01T12:00:00.000Z',
      swipeActionId: 'swp-x',
    });
    await listSwipeHistory(deps, makePrincipal(), { cursor } as ListSwipeHistoryRequest);
    const sql = query.mock.calls[0][0] as string;
    expect(sql).toContain('timestamp <');
    expect(sql).toContain('swipe_action_id <');
  });
});
