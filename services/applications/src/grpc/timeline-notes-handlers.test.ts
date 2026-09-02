import { describe, expect, it, vi } from 'vitest';

import { HandlerError, type HandlerDeps } from './adapter.js';
import { addTimelineNote, listTimelineNotes } from './timeline-notes-handlers.js';

function makePrincipal(
  overrides: Partial<{
    userId: string;
    roles: string[];
    permissions: string[];
    rescueId: string;
  }> = {}
) {
  return {
    userId: overrides.userId ?? 'usr-1',
    roles: overrides.roles ?? ['adopter'],
    permissions: overrides.permissions ?? ['applications.read', 'applications.update'],
    ...(overrides.rescueId !== undefined ? { rescueId: overrides.rescueId } : {}),
  } as unknown as Parameters<typeof addTimelineNote>[1];
}

function makeDeps(): { deps: HandlerDeps; query: ReturnType<typeof vi.fn> } {
  const query = vi.fn();
  const pool = { query } as unknown as HandlerDeps['pool'];
  return { deps: { pool, nats: {} } as unknown as HandlerDeps, query };
}

function ownerRow(overrides: Partial<{ user_id: string; rescue_id: string; status: string }> = {}) {
  return {
    user_id: overrides.user_id ?? 'usr-1',
    rescue_id: overrides.rescue_id ?? 'rsc-1',
    status: overrides.status ?? 'submitted',
  };
}

const noteRow = {
  note_id: 'note-1',
  application_id: 'app-1',
  title: 'Called applicant',
  description: 'Left a voicemail',
  note_type: 'general',
  metadata: { note_type: 'general' },
  created_by: 'usr-1',
  created_at: new Date('2026-06-05T10:00:00.000Z'),
};

describe('addTimelineNote', () => {
  it('throws INVALID_ARGUMENT when application_id is empty', async () => {
    const { deps, query } = makeDeps();
    await expect(
      addTimelineNote(deps, makePrincipal(), { applicationId: '', title: 't', description: 'd' })
    ).rejects.toBeInstanceOf(HandlerError);
    expect(query).not.toHaveBeenCalled();
  });

  it('throws INVALID_ARGUMENT when title is empty', async () => {
    const { deps, query } = makeDeps();
    await expect(
      addTimelineNote(deps, makePrincipal(), {
        applicationId: 'app-1',
        title: '',
        description: 'd',
      })
    ).rejects.toBeInstanceOf(HandlerError);
    expect(query).not.toHaveBeenCalled();
  });

  it('throws NOT_FOUND when the application does not exist', async () => {
    const { deps, query } = makeDeps();
    query.mockResolvedValueOnce({ rows: [] });
    await expect(
      addTimelineNote(deps, makePrincipal(), {
        applicationId: 'missing',
        title: 't',
        description: 'd',
      })
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('denies an adopter who is not the application owner', async () => {
    const { deps, query } = makeDeps();
    query.mockResolvedValueOnce({ rows: [ownerRow({ user_id: 'someone-else' })] });
    await expect(
      addTimelineNote(deps, makePrincipal({ userId: 'usr-1' }), {
        applicationId: 'app-1',
        title: 't',
        description: 'd',
      })
    ).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
  });

  it('throws INVALID_ARGUMENT when metadata_json is not valid JSON', async () => {
    const { deps, query } = makeDeps();
    query.mockResolvedValueOnce({ rows: [ownerRow()] });
    await expect(
      addTimelineNote(deps, makePrincipal(), {
        applicationId: 'app-1',
        title: 't',
        description: 'd',
        metadataJson: 'not json',
      })
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
  });

  it('inserts a note defaulting note_type to general', async () => {
    const { deps, query } = makeDeps();
    query.mockResolvedValueOnce({ rows: [ownerRow()] }).mockResolvedValueOnce({ rows: [noteRow] });

    const res = await addTimelineNote(deps, makePrincipal(), {
      applicationId: 'app-1',
      title: 'Called applicant',
      description: 'Left a voicemail',
    });

    const [insertSql, params] = query.mock.calls[1];
    expect(insertSql).toContain('INSERT INTO application_timeline_notes');
    expect(params[4]).toBe('general');
    expect(res.note).toEqual({
      noteId: 'note-1',
      applicationId: 'app-1',
      title: 'Called applicant',
      description: 'Left a voicemail',
      noteType: 'general',
      metadataJson: JSON.stringify({ note_type: 'general' }),
      createdBy: 'usr-1',
      createdAt: '2026-06-05T10:00:00.000Z',
    });
  });

  it('lets rescue staff add a note for their rescue', async () => {
    const { deps, query } = makeDeps();
    query
      .mockResolvedValueOnce({ rows: [ownerRow({ user_id: 'other', rescue_id: 'rsc-9' })] })
      .mockResolvedValueOnce({
        rows: [{ ...noteRow, note_type: 'review', created_by: 'staff-1' }],
      });

    const res = await addTimelineNote(
      deps,
      makePrincipal({ userId: 'staff-1', roles: ['rescue_staff'], rescueId: 'rsc-9' }),
      { applicationId: 'app-1', title: 't', description: 'd', noteType: 'review' }
    );

    expect(res.note?.noteType).toBe('review');
  });

  // ADS-1272: a draft application is private to the owning adopter — rescue
  // staff of the pet's rescue must not add notes to it until it is submitted.
  it('denies rescue staff adding a note to a draft application', async () => {
    const { deps, query } = makeDeps();
    query.mockResolvedValueOnce({
      rows: [ownerRow({ user_id: 'other', rescue_id: 'rsc-9', status: 'draft' })],
    });
    await expect(
      addTimelineNote(
        deps,
        makePrincipal({ userId: 'staff-1', roles: ['rescue_staff'], rescueId: 'rsc-9' }),
        { applicationId: 'app-1', title: 't', description: 'd' }
      )
    ).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
    // Never reaches the INSERT.
    expect(query).toHaveBeenCalledTimes(1);
  });

  it('lets the owning adopter add a note to their own draft', async () => {
    const { deps, query } = makeDeps();
    query
      .mockResolvedValueOnce({ rows: [ownerRow({ user_id: 'usr-1', status: 'draft' })] })
      .mockResolvedValueOnce({ rows: [noteRow] });

    const res = await addTimelineNote(deps, makePrincipal({ userId: 'usr-1' }), {
      applicationId: 'app-1',
      title: 'Called applicant',
      description: 'Left a voicemail',
    });

    expect(res.note?.noteId).toBe('note-1');
  });
});

describe('listTimelineNotes', () => {
  it('throws NOT_FOUND when the application does not exist', async () => {
    const { deps, query } = makeDeps();
    query.mockResolvedValueOnce({ rows: [] });
    await expect(
      listTimelineNotes(deps, makePrincipal(), { applicationId: 'missing' })
    ).rejects.toBeInstanceOf(HandlerError);
  });

  it('denies an adopter who is not the application owner', async () => {
    const { deps, query } = makeDeps();
    query.mockResolvedValueOnce({ rows: [ownerRow({ user_id: 'someone-else' })] });
    await expect(
      listTimelineNotes(deps, makePrincipal({ userId: 'usr-1' }), { applicationId: 'app-1' })
    ).rejects.toBeInstanceOf(HandlerError);
  });

  it('lets the owning adopter list their notes, oldest first', async () => {
    const { deps, query } = makeDeps();
    query.mockResolvedValueOnce({ rows: [ownerRow()] }).mockResolvedValueOnce({ rows: [noteRow] });

    const res = await listTimelineNotes(deps, makePrincipal(), { applicationId: 'app-1' });

    expect(res.notes).toHaveLength(1);
    expect(res.notes[0].noteId).toBe('note-1');
  });

  // ADS-1261: timeline notes on a draft application are private to the owning adopter.
  it('denies rescue staff reading timeline notes on a draft application', async () => {
    const { deps, query } = makeDeps();
    query.mockResolvedValueOnce({ rows: [ownerRow({ status: 'draft' })] });
    await expect(
      listTimelineNotes(
        deps,
        makePrincipal({ userId: 'staff-1', roles: ['rescue_staff'], rescueId: 'rsc-1' }),
        { applicationId: 'app-1' }
      )
    ).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
    expect(query).toHaveBeenCalledTimes(1);
  });

  it('lets the owning adopter read timeline notes on their own draft', async () => {
    const { deps, query } = makeDeps();
    query
      .mockResolvedValueOnce({ rows: [ownerRow({ user_id: 'usr-1', status: 'draft' })] })
      .mockResolvedValueOnce({ rows: [noteRow] });
    const res = await listTimelineNotes(deps, makePrincipal({ userId: 'usr-1' }), {
      applicationId: 'app-1',
    });
    expect(res.notes).toHaveLength(1);
  });
});
