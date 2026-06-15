import { describe, expect, it, vi } from 'vitest';

import {
  ModerationV1,
  type AppealSanctionRequest,
  type IssueSanctionRequest,
  type ListUserSanctionsRequest,
} from '@adopt-dont-shop/proto';

import { HandlerError, type HandlerDeps } from './adapter.js';
import { appealSanction, issueSanction, listUserSanctions } from './sanction-handlers.js';

function makePrincipal(
  overrides: Partial<{ userId: string; permissions: string[]; roles: string[] }> = {}
) {
  return {
    userId: overrides.userId ?? 'mod-1',
    roles: overrides.roles ?? ['moderator'],
    permissions: overrides.permissions ?? ['moderation.sanctions.manage'],
    rescueId: undefined,
  } as unknown as Parameters<typeof issueSanction>[1];
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

function sanctionRow(overrides: Record<string, unknown> = {}) {
  return {
    sanction_id: 'sanc-1',
    user_id: 'usr-2',
    sanction_type: 'temporary_ban',
    reason: 'harassment',
    description: 'Abusive behaviour',
    is_active: true,
    start_date: new Date('2026-06-01T12:00:00.000Z'),
    end_date: new Date('2026-06-08T12:00:00.000Z'),
    duration: 7,
    issued_by: 'mod-1',
    report_id: null,
    moderator_action_id: null,
    appealed_at: null,
    appeal_reason: null,
    appeal_status: null,
    created_at: new Date('2026-06-01T12:00:00.000Z'),
    updated_at: new Date('2026-06-01T12:00:00.000Z'),
    ...overrides,
  };
}

const VALID_ISSUE: IssueSanctionRequest = {
  userId: 'usr-2',
  sanctionType: ModerationV1.SanctionType.SANCTION_TYPE_TEMPORARY_BAN,
  reason: ModerationV1.SanctionReason.SANCTION_REASON_HARASSMENT,
  description: 'Abusive behaviour',
  duration: 7,
};

describe('issueSanction', () => {
  it('throws PERMISSION_DENIED without moderation.sanctions.manage', async () => {
    const { deps } = makeDeps([]);
    await expect(
      issueSanction(deps, makePrincipal({ permissions: [] }), VALID_ISSUE)
    ).rejects.toBeInstanceOf(HandlerError);
  });

  it.each([
    ['userId', { ...VALID_ISSUE, userId: '' }],
    ['description', { ...VALID_ISSUE, description: '' }],
    [
      'sanctionType',
      { ...VALID_ISSUE, sanctionType: ModerationV1.SanctionType.SANCTION_TYPE_UNSPECIFIED },
    ],
    ['reason', { ...VALID_ISSUE, reason: ModerationV1.SanctionReason.SANCTION_REASON_UNSPECIFIED }],
  ])('throws INVALID_ARGUMENT on missing %s', async (_field, req) => {
    const { deps } = makeDeps([]);
    await expect(
      issueSanction(deps, makePrincipal(), req as IssueSanctionRequest)
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
  });

  it('derives issued_by_role from the principal roles', async () => {
    const { deps, query } = makeDeps([{ rows: [sanctionRow()] }]);
    await issueSanction(deps, makePrincipal({ roles: ['admin'] }), VALID_ISSUE);
    // issued_by_role param at index 8 (0-based).
    expect(query.mock.calls[0][1][8]).toBe('ADMIN');
  });

  it('uses SUPER_ADMIN role when the principal is a super_admin', async () => {
    const { deps, query } = makeDeps([{ rows: [sanctionRow()] }]);
    await issueSanction(deps, makePrincipal({ roles: ['super_admin'] }), VALID_ISSUE);
    expect(query.mock.calls[0][1][8]).toBe('SUPER_ADMIN');
  });

  it('derives end_date from a duration; permanent ban leaves it NULL', async () => {
    const withDuration = makeDeps([{ rows: [sanctionRow()] }]);
    await issueSanction(withDuration.deps, makePrincipal(), VALID_ISSUE);
    expect(withDuration.query.mock.calls[0][1][5]).not.toBeNull(); // end_date

    const permanent = makeDeps([{ rows: [sanctionRow({ end_date: null, duration: null })] }]);
    await issueSanction(permanent.deps, makePrincipal(), {
      ...VALID_ISSUE,
      sanctionType: ModerationV1.SanctionType.SANCTION_TYPE_PERMANENT_BAN,
      duration: undefined,
    });
    expect(permanent.query.mock.calls[0][1][5]).toBeNull();
  });

  it('publishes moderation.sanctionIssued', async () => {
    const { deps } = makeDeps([{ rows: [sanctionRow()] }]);
    await issueSanction(deps, makePrincipal(), VALID_ISSUE);
    const publish = (deps as { _publish?: ReturnType<typeof vi.fn> })._publish!;
    expect(publish.mock.calls[0][0]).toMatchObject({ type: 'moderation.sanctionIssued' });
  });
});

describe('listUserSanctions', () => {
  it('throws INVALID_ARGUMENT on missing user_id', async () => {
    const { deps } = makeDeps([]);
    await expect(
      listUserSanctions(deps, makePrincipal(), { userId: '' } as ListUserSanctionsRequest)
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
  });

  it('allows a user to list their OWN sanctions without admin permission', async () => {
    const { deps } = makeDeps([{ rows: [sanctionRow({ user_id: 'usr-2' })] }]);
    const res = await listUserSanctions(deps, makePrincipal({ userId: 'usr-2', permissions: [] }), {
      userId: 'usr-2',
    });
    expect(res.sanctions).toHaveLength(1);
  });

  it("throws PERMISSION_DENIED listing another user's sanctions without admin", async () => {
    const { deps } = makeDeps([]);
    await expect(
      listUserSanctions(deps, makePrincipal({ userId: 'usr-1', permissions: [] }), {
        userId: 'usr-2',
      })
    ).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
  });

  it('defaults to active-only; include_inactive returns full history', async () => {
    const activeOnly = makeDeps([{ rows: [] }]);
    await listUserSanctions(activeOnly.deps, makePrincipal(), { userId: 'usr-2' });
    expect(activeOnly.query.mock.calls[0][0]).toContain('is_active = true');

    const all = makeDeps([{ rows: [] }]);
    await listUserSanctions(all.deps, makePrincipal(), { userId: 'usr-2', includeInactive: true });
    expect(all.query.mock.calls[0][0]).not.toContain('is_active = true');
  });
});

describe('appealSanction', () => {
  it('throws INVALID_ARGUMENT on missing appeal_reason', async () => {
    const { deps } = makeDeps([]);
    await expect(
      appealSanction(deps, makePrincipal(), {
        sanctionId: 'sanc-1',
        appealReason: '',
      } as AppealSanctionRequest)
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
  });

  it('throws NOT_FOUND on a missing sanction', async () => {
    const { deps } = makeDeps([{ rows: [] }]);
    await expect(
      appealSanction(deps, makePrincipal({ userId: 'usr-2' }), {
        sanctionId: 'gone',
        appealReason: 'I was provoked',
      })
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it("throws PERMISSION_DENIED appealing another user's sanction", async () => {
    const { deps } = makeDeps([{ rows: [sanctionRow({ user_id: 'usr-2' })] }]);
    await expect(
      appealSanction(deps, makePrincipal({ userId: 'usr-99' }), {
        sanctionId: 'sanc-1',
        appealReason: 'not mine',
      })
    ).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
  });

  it('throws INVALID_ARGUMENT when the sanction already has an appeal', async () => {
    const { deps } = makeDeps([
      { rows: [sanctionRow({ user_id: 'usr-2', appeal_status: 'pending' })] },
    ]);
    await expect(
      appealSanction(deps, makePrincipal({ userId: 'usr-2' }), {
        sanctionId: 'sanc-1',
        appealReason: 'again',
      })
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
  });

  it('records the appeal + publishes moderation.sanctionAppealed', async () => {
    const { deps } = makeDeps([
      { rows: [sanctionRow({ user_id: 'usr-2' })] }, // SELECT FOR UPDATE
      {
        rows: [
          sanctionRow({ user_id: 'usr-2', appeal_status: 'pending', appeal_reason: 'provoked' }),
        ],
      }, // UPDATE RETURNING
    ]);
    const res = await appealSanction(deps, makePrincipal({ userId: 'usr-2' }), {
      sanctionId: 'sanc-1',
      appealReason: 'provoked',
    });
    expect(res.sanction.appealStatus).toBe('pending');
    const publish = (deps as { _publish?: ReturnType<typeof vi.fn> })._publish!;
    expect(publish.mock.calls[0][0]).toMatchObject({ type: 'moderation.sanctionAppealed' });
  });

  it('lets a super_admin appeal on a user behalf', async () => {
    const { deps } = makeDeps([
      { rows: [sanctionRow({ user_id: 'usr-2' })] },
      { rows: [sanctionRow({ user_id: 'usr-2', appeal_status: 'pending' })] },
    ]);
    const res = await appealSanction(
      deps,
      makePrincipal({ userId: 'sa-1', roles: ['super_admin'] }),
      {
        sanctionId: 'sanc-1',
        appealReason: 'support escalation',
      }
    );
    expect(res.sanction.appealStatus).toBe('pending');
  });
});
