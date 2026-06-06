import { describe, expect, it, vi } from 'vitest';

import {
  MatchingV1,
  type EndSessionRequest,
  type StartSessionRequest,
} from '@adopt-dont-shop/proto';

import { HandlerError, type HandlerDeps } from './adapter.js';
import { endSession, startSession } from './handlers.js';

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
