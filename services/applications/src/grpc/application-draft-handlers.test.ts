import { describe, expect, it, vi } from 'vitest';

import { HandlerError, type HandlerDeps } from './adapter.js';
import {
  deleteApplicationDraft,
  getApplicationDraft,
  saveApplicationDraft,
} from './application-draft-handlers.js';

function makePrincipal(
  overrides: Partial<{ userId: string; roles: string[]; permissions: string[] }> = {}
) {
  return {
    userId: overrides.userId ?? 'usr-1',
    roles: overrides.roles ?? ['adopter'],
    permissions: overrides.permissions ?? ['applications.read', 'applications.update'],
  } as unknown as Parameters<typeof getApplicationDraft>[1];
}

function makeDeps(): { deps: HandlerDeps; query: ReturnType<typeof vi.fn> } {
  const query = vi.fn();
  const pool = { query } as unknown as HandlerDeps['pool'];
  return { deps: { pool, nats: {} } as unknown as HandlerDeps, query };
}

describe('getApplicationDraft', () => {
  it('throws PERMISSION_DENIED without applications.read', async () => {
    const { deps } = makeDeps();
    await expect(
      getApplicationDraft(deps, makePrincipal({ permissions: [] }), { petId: 'pet-1' })
    ).rejects.toBeInstanceOf(HandlerError);
  });

  it('throws INVALID_ARGUMENT when pet_id is empty', async () => {
    const { deps, query } = makeDeps();
    await expect(getApplicationDraft(deps, makePrincipal(), { petId: '' })).rejects.toBeInstanceOf(
      HandlerError
    );
    expect(query).not.toHaveBeenCalled();
  });

  it('returns found=false when the adopter has no draft for the pet', async () => {
    const { deps, query } = makeDeps();
    query.mockResolvedValueOnce({ rows: [] });

    const res = await getApplicationDraft(deps, makePrincipal(), { petId: 'pet-1' });

    expect(res.found).toBe(false);
    expect(res.answersJson).toBe('');
  });

  it('returns the stored draft with answers + timestamps when found', async () => {
    const { deps, query } = makeDeps();
    const updatedAt = new Date('2026-06-20T10:00:00.000Z');
    const expiresAt = new Date('2026-07-20T10:00:00.000Z');
    query.mockResolvedValueOnce({
      rows: [{ answers: { q1: 'a' }, updated_at: updatedAt, expires_at: expiresAt }],
    });

    const res = await getApplicationDraft(deps, makePrincipal(), { petId: 'pet-1' });

    expect(res.found).toBe(true);
    expect(JSON.parse(res.answersJson)).toEqual({ q1: 'a' });
    expect(res.updatedAt).toBe('2026-06-20T10:00:00.000Z');
    expect(res.expiresAt).toBe('2026-07-20T10:00:00.000Z');
  });

  it('scopes the read to the calling principal and the requested pet', async () => {
    const { deps, query } = makeDeps();
    query.mockResolvedValueOnce({ rows: [] });

    await getApplicationDraft(deps, makePrincipal({ userId: 'usr-9' }), { petId: 'pet-7' });

    expect(query.mock.calls[0][1]).toEqual(['usr-9', 'pet-7']);
  });
});

describe('saveApplicationDraft', () => {
  it('throws PERMISSION_DENIED without applications.update', async () => {
    const { deps } = makeDeps();
    await expect(
      saveApplicationDraft(deps, makePrincipal({ permissions: ['applications.read'] }), {
        petId: 'pet-1',
        answersJson: '{}',
      })
    ).rejects.toBeInstanceOf(HandlerError);
  });

  it('throws INVALID_ARGUMENT when pet_id is empty', async () => {
    const { deps, query } = makeDeps();
    await expect(
      saveApplicationDraft(deps, makePrincipal(), { petId: '', answersJson: '{}' })
    ).rejects.toBeInstanceOf(HandlerError);
    expect(query).not.toHaveBeenCalled();
  });

  it('throws INVALID_ARGUMENT when answers_json is not a JSON object', async () => {
    const { deps, query } = makeDeps();
    await expect(
      saveApplicationDraft(deps, makePrincipal(), { petId: 'pet-1', answersJson: '[1,2]' })
    ).rejects.toBeInstanceOf(HandlerError);
    expect(query).not.toHaveBeenCalled();
  });

  it('upserts the draft scoped to the principal + pet and returns the saved row', async () => {
    const { deps, query } = makeDeps();
    const updatedAt = new Date('2026-06-20T10:00:00.000Z');
    const expiresAt = new Date('2026-07-20T10:00:00.000Z');
    query.mockResolvedValueOnce({
      rows: [{ answers: { q1: 'a' }, updated_at: updatedAt, expires_at: expiresAt }],
    });

    const res = await saveApplicationDraft(deps, makePrincipal({ userId: 'usr-9' }), {
      petId: 'pet-7',
      answersJson: JSON.stringify({ q1: 'a' }),
    });

    const [sql, params] = query.mock.calls[0];
    expect(sql).toContain('INSERT INTO application_drafts');
    expect(sql).toContain('ON CONFLICT');
    expect(params[1]).toBe('usr-9');
    expect(params[2]).toBe('pet-7');
    expect(JSON.parse(params[3])).toEqual({ q1: 'a' });
    expect(JSON.parse(res.answersJson)).toEqual({ q1: 'a' });
    expect(res.updatedAt).toBe('2026-06-20T10:00:00.000Z');
    expect(res.expiresAt).toBe('2026-07-20T10:00:00.000Z');
  });

  it('treats an empty answers_json as an empty object', async () => {
    const { deps, query } = makeDeps();
    query.mockResolvedValueOnce({
      rows: [{ answers: {}, updated_at: new Date('2026-06-20T10:00:00.000Z'), expires_at: null }],
    });

    await saveApplicationDraft(deps, makePrincipal(), { petId: 'pet-1', answersJson: '' });

    expect(JSON.parse(query.mock.calls[0][1][3])).toEqual({});
  });
});

describe('deleteApplicationDraft', () => {
  it('throws PERMISSION_DENIED without applications.update', async () => {
    const { deps } = makeDeps();
    await expect(
      deleteApplicationDraft(deps, makePrincipal({ permissions: [] }), { petId: 'pet-1' })
    ).rejects.toBeInstanceOf(HandlerError);
  });

  it('deletes the draft scoped to the principal + pet (idempotent — no NOT_FOUND)', async () => {
    const { deps, query } = makeDeps();
    query.mockResolvedValueOnce({ rowCount: 0 });

    const res = await deleteApplicationDraft(deps, makePrincipal({ userId: 'usr-9' }), {
      petId: 'pet-7',
    });

    expect(res).toEqual({});
    const [sql, params] = query.mock.calls[0];
    expect(sql).toContain('DELETE FROM application_drafts');
    expect(params).toEqual(['usr-9', 'pet-7']);
  });
});
