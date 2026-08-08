import { describe, expect, it, vi } from 'vitest';

import { HandlerError, type HandlerDeps } from './adapter.js';
import { updateReferenceCheck } from './reference-check-handlers.js';

function makePrincipal(
  overrides: Partial<{
    userId: string;
    roles: string[];
    permissions: string[];
    rescueId: string;
  }> = {}
) {
  return {
    userId: overrides.userId ?? 'staff-1',
    roles: overrides.roles ?? ['rescue_staff'],
    permissions: overrides.permissions ?? ['applications.review'],
    rescueId: overrides.rescueId ?? 'rsc-1',
  } as unknown as Parameters<typeof updateReferenceCheck>[1];
}

function makeDeps(): { deps: HandlerDeps; query: ReturnType<typeof vi.fn> } {
  const query = vi.fn();
  const pool = { query } as unknown as HandlerDeps['pool'];
  return { deps: { pool, nats: {} } as unknown as HandlerDeps, query };
}

const applicationRow = {
  rescue_id: 'rsc-1',
  documents: {
    references: [
      { name: 'Ada Lovelace', email: 'ada@example.com', relationship: 'friend' },
      { name: 'Grace Hopper', email: 'grace@example.com', relationship: 'colleague' },
    ],
  },
};

const checkRow = {
  reference_id: 'ref-0',
  application_id: 'app-1',
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  relationship: 'friend',
  status: 'contacted',
  notes: 'left a voicemail',
  contacted_at: new Date('2026-06-05T10:00:00.000Z'),
  contacted_by: 'staff-1',
};

describe('updateReferenceCheck', () => {
  it('throws INVALID_ARGUMENT when application_id is empty', async () => {
    const { deps, query } = makeDeps();
    await expect(
      updateReferenceCheck(deps, makePrincipal(), { applicationId: '', referenceId: 'ref-0' })
    ).rejects.toBeInstanceOf(HandlerError);
    expect(query).not.toHaveBeenCalled();
  });

  it('throws INVALID_ARGUMENT when reference_id is empty', async () => {
    const { deps, query } = makeDeps();
    await expect(
      updateReferenceCheck(deps, makePrincipal(), { applicationId: 'app-1', referenceId: '' })
    ).rejects.toBeInstanceOf(HandlerError);
    expect(query).not.toHaveBeenCalled();
  });

  it('throws INVALID_ARGUMENT on an unrecognised status', async () => {
    const { deps, query } = makeDeps();
    await expect(
      updateReferenceCheck(deps, makePrincipal(), {
        applicationId: 'app-1',
        referenceId: 'ref-0',
        status: 'bogus',
      })
    ).rejects.toBeInstanceOf(HandlerError);
    expect(query).not.toHaveBeenCalled();
  });

  it('throws NOT_FOUND when the application does not exist', async () => {
    const { deps, query } = makeDeps();
    query.mockResolvedValueOnce({ rows: [] });
    await expect(
      updateReferenceCheck(deps, makePrincipal(), {
        applicationId: 'missing',
        referenceId: 'ref-0',
      })
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('denies rescue staff of a different rescue', async () => {
    const { deps, query } = makeDeps();
    query.mockResolvedValueOnce({ rows: [applicationRow] });
    await expect(
      updateReferenceCheck(deps, makePrincipal({ rescueId: 'rsc-9' }), {
        applicationId: 'app-1',
        referenceId: 'ref-0',
      })
    ).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
  });

  it('seeds name/email/relationship from the stored references list on first touch', async () => {
    const { deps, query } = makeDeps();
    query
      .mockResolvedValueOnce({ rows: [applicationRow] })
      .mockResolvedValueOnce({ rows: [checkRow] });

    const res = await updateReferenceCheck(deps, makePrincipal(), {
      applicationId: 'app-1',
      referenceId: 'ref-0',
      status: 'contacted',
      notes: 'left a voicemail',
    });

    const [upsertSql, upsertParams] = query.mock.calls[1];
    expect(upsertSql).toContain('INSERT INTO application_reference_checks');
    expect(upsertParams).toEqual([
      'app-1',
      'ref-0',
      'Ada Lovelace',
      'ada@example.com',
      'friend',
      'contacted',
      'left a voicemail',
      null,
      'staff-1',
    ]);
    expect(res.reference).toEqual({
      referenceId: 'ref-0',
      applicationId: 'app-1',
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      relationship: 'friend',
      status: 'contacted',
      notes: 'left a voicemail',
      contactedAt: '2026-06-05T10:00:00.000Z',
      contactedBy: 'staff-1',
    });
  });

  it('falls back to empty name/email/relationship for an unmatched reference id', async () => {
    const { deps, query } = makeDeps();
    query.mockResolvedValueOnce({ rows: [applicationRow] }).mockResolvedValueOnce({
      rows: [{ ...checkRow, reference_id: 'ref-9', name: '', email: '', relationship: '' }],
    });

    await updateReferenceCheck(deps, makePrincipal(), {
      applicationId: 'app-1',
      referenceId: 'ref-9',
      status: 'pending',
    });

    const [, upsertParams] = query.mock.calls[1];
    expect(upsertParams.slice(2, 5)).toEqual(['', '', '']);
  });
});
